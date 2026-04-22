#!/usr/bin/env node

"use strict";

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const PLATFORM_MAP = {
  darwin: "osx",
  linux: "linux",
  win32: "win",
};

const ARCH_MAP = {
  x64: "x64",
  arm64: "arm64",
};

function getBinaryPath() {
  const platform = PLATFORM_MAP[process.platform];
  const arch = ARCH_MAP[process.arch];

  if (!platform || !arch) {
    console.error(
      `Unsupported platform: ${process.platform}-${process.arch}\n` +
        `Run 'npm rebuild @flowconsole/cli' or download the binary manually.`
    );
    process.exit(1);
  }

  const rid = `${platform}-${arch}`;
  const binaryName = process.platform === "win32" ? "fc.exe" : "fc";
  const binaryPath = path.join(__dirname, "..", "binaries", rid, binaryName);

  if (!fs.existsSync(binaryPath)) {
    console.error(
      `FlowConsole CLI binary not found at ${binaryPath}\n` +
        `Run 'npm rebuild @flowconsole/cli' to download it, or set\n` +
        `FLOWCONSOLE_CLI_DOWNLOAD_URL to a custom mirror.`
    );
    process.exit(1);
  }

  return binaryPath;
}

const binaryPath = getBinaryPath();

try {
  const result = execFileSync(binaryPath, process.argv.slice(2), {
    stdio: "inherit",
    env: process.env,
  });
} catch (err) {
  // execFileSync throws on non-zero exit code when stdio is inherit
  if (err.status != null) {
    process.exitCode = err.status;
  } else {
    console.error(`Failed to execute FlowConsole CLI: ${err.message}`);
    process.exitCode = 1;
  }
}
