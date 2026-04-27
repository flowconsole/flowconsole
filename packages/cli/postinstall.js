#!/usr/bin/env node

"use strict";

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { execFileSync } = require("child_process");
const { pipeline } = require("stream/promises");
const zlib = require("zlib");

const PLATFORM_MAP = {
  darwin: "osx",
  linux: "linux",
  win32: "win",
};

const ARCH_MAP = {
  x64: "x64",
  arm64: "arm64",
};

const SUPPORTED_RIDS = [
  "linux-x64",
  "linux-arm64",
  "osx-x64",
  "osx-arm64",
  "win-x64",
  "win-arm64",
];

function getRid() {
  const platform = PLATFORM_MAP[process.platform];
  const arch = ARCH_MAP[process.arch];

  if (!platform || !arch) {
    const supported = SUPPORTED_RIDS.join(", ");
    console.error(
      `Unsupported platform: ${process.platform}-${process.arch}\n` +
        `Supported platforms: ${supported}\n` +
        `You can download the binary manually from the GitHub Releases page.`
    );
    process.exit(1);
  }

  return `${platform}-${arch}`;
}

function getVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
  );
  return pkg.cliVersion || "0.2.0-alpha";
}

function getDownloadBaseUrl() {
  // Allow override via env for mirrors or private registries
  if (process.env.FLOWCONSOLE_CLI_DOWNLOAD_URL) {
    return process.env.FLOWCONSOLE_CLI_DOWNLOAD_URL;
  }
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
  );
  const repoUrl =
    (pkg.repository && pkg.repository.url) || "";
  // Extract GitHub owner/repo from git URL
  const match = repoUrl.match(
    /github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/
  );
  if (match) {
    return `https://github.com/${match[1]}/releases/download`;
  }
  return "https://github.com/flowconsole/flowconsole/releases/download";
}

function fetch(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "flowconsole-cli-npm" } }, (res) => {
        // Follow redirects (GitHub releases redirect to S3)
        if (
          (res.statusCode === 301 ||
            res.statusCode === 302 ||
            res.statusCode === 307) &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) {
            reject(new Error(`Too many redirects following ${url}`));
            return;
          }
          return fetch(res.headers.location, maxRedirects - 1).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download ${url}: HTTP ${res.statusCode}`
            )
          );
          res.resume();
          return;
        }
        resolve(res);
      })
      .on("error", reject);
  });
}

async function downloadToBuffer(url) {
  const res = await fetch(url);
  const chunks = [];
  for await (const chunk of res) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function downloadAndVerify(rid, version) {
  const baseUrl = getDownloadBaseUrl();
  const tag = `cli-v${version}`;
  const isWindows = rid.startsWith("win-");
  const archiveExt = isWindows ? "zip" : "tar.gz";
  const archiveName = `fcon-${rid}.${archiveExt}`;
  const checksumName = `fcon-${rid}.sha256`;

  const archiveUrl = `${baseUrl}/${tag}/${archiveName}`;
  const checksumUrl = `${baseUrl}/${tag}/${checksumName}`;

  console.log(`Downloading FlowConsole CLI ${version} for ${rid}...`);
  console.log(`  Archive: ${archiveUrl}`);

  // Download checksum first
  let expectedChecksum;
  try {
    const checksumBuf = await downloadToBuffer(checksumUrl);
    // Format: "<hash>  <filename>" or "<hash> <filename>"
    expectedChecksum = checksumBuf.toString("utf8").trim().split(/\s+/)[0];
  } catch (err) {
    console.error(
      `Failed to download checksum file: ${err.message}\n` +
        `Cannot verify binary integrity. Aborting installation.\n` +
        `Download the binary manually from: ${archiveUrl}`
    );
    process.exit(1);
  }

  // Download archive
  const archiveBuf = await downloadToBuffer(archiveUrl);

  // Verify checksum
  const actualChecksum = createHash("sha256")
    .update(archiveBuf)
    .digest("hex");

  if (actualChecksum !== expectedChecksum) {
    console.error(
      `SHA-256 checksum mismatch!\n` +
        `  Expected: ${expectedChecksum}\n` +
        `  Actual:   ${actualChecksum}\n` +
        `The downloaded binary may be corrupted or tampered with.\n` +
        `Aborting installation.`
    );
    process.exit(1);
  }

  console.log(`  Checksum verified: ${actualChecksum.substring(0, 16)}...`);

  return { archiveBuf, isWindows };
}

function extractTarGz(buf, destDir) {
  // Write to temp file and use system tar (Node.js has no built-in tar extraction)
  const tmpFile = path.join(destDir, "_archive.tar.gz");
  fs.writeFileSync(tmpFile, buf);
  try {
    execFileSync("tar", ["xzf", tmpFile, "-C", destDir], {
      stdio: "pipe",
    });
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
  }
}

function extractZip(buf, destDir) {
  // Write to temp file and use system tools
  const tmpFile = path.join(destDir, "_archive.zip");
  fs.writeFileSync(tmpFile, buf);
  try {
    // Try unzip first (available on most systems including Windows via Git Bash)
    try {
      execFileSync("unzip", ["-o", tmpFile, "-d", destDir], {
        stdio: "pipe",
      });
    } catch (_) {
      // Fallback to PowerShell on Windows
      // Escape single quotes for PowerShell (double them inside single-quoted strings)
      const escapedTmpFile = tmpFile.replace(/'/g, "''");
      const escapedDestDir = destDir.replace(/'/g, "''");
      execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -Path '${escapedTmpFile}' -DestinationPath '${escapedDestDir}' -Force`,
        ],
        { stdio: "pipe" }
      );
    }
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
  }
}

async function main() {
  // Skip in CI if FLOWCONSOLE_CLI_SKIP_DOWNLOAD is set
  if (process.env.FLOWCONSOLE_CLI_SKIP_DOWNLOAD === "1") {
    console.log("FLOWCONSOLE_CLI_SKIP_DOWNLOAD=1, skipping binary download.");
    return;
  }

  const rid = getRid();
  const version = getVersion();
  const binDir = path.join(__dirname, "binaries", rid);

  // Check if already downloaded
  const binaryName = rid.startsWith("win-") ? "fcon.exe" : "fcon";
  const binaryPath = path.join(binDir, binaryName);
  if (fs.existsSync(binaryPath)) {
    console.log(`FlowConsole CLI binary already exists at ${binaryPath}`);
    return;
  }

  const { archiveBuf, isWindows } = await downloadAndVerify(rid, version);

  // Extract
  fs.mkdirSync(binDir, { recursive: true });

  if (isWindows) {
    extractZip(archiveBuf, binDir);
  } else {
    extractTarGz(archiveBuf, binDir);
  }

  // chmod +x on POSIX
  if (!isWindows && fs.existsSync(binaryPath)) {
    fs.chmodSync(binaryPath, 0o755);
  }

  if (!fs.existsSync(binaryPath)) {
    console.error(
      `Binary not found after extraction at ${binaryPath}.\n` +
        `Archive may have a different structure. Please report this issue.`
    );
    process.exit(1);
  }

  console.log(`FlowConsole CLI ${version} installed successfully for ${rid}.`);
}

main().catch((err) => {
  console.error(`Failed to install FlowConsole CLI: ${err.message}`);
  process.exit(1);
});
