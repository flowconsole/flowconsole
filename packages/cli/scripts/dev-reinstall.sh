#!/usr/bin/env bash
# Local dev helper: rebuilds the .NET SFA for the current host RID,
# refreshes packages/cli/binaries/<rid>/, repacks the npm tarball, and
# reinstalls @flowconsole/cli globally from that tarball.
#
# Usage:
#   pnpm --filter @flowconsole/cli dev:reinstall          # auto-detect host RID
#   RID=osx-arm64 packages/cli/scripts/dev-reinstall.sh   # force a specific RID
#
# Skips the postinstall download by setting FLOWCONSOLE_CLI_SKIP_DOWNLOAD=1
# (the binary is already inside the tarball under binaries/<rid>/).

set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$PKG_DIR/../.." && pwd)"
CLI_PROJECT="$REPO_ROOT/backend/src/FlowConsole.Cli/FlowConsole.Cli.csproj"

detect_rid() {
  local os arch
  case "$(uname -s)" in
    Darwin) os="osx" ;;
    Linux)  os="linux" ;;
    MINGW*|MSYS*|CYGWIN*) os="win" ;;
    *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64)  arch="x64" ;;
    *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
  esac
  echo "${os}-${arch}"
}

RID="${RID:-$(detect_rid)}"
CLI_VERSION="$(node -p "require('$PKG_DIR/package.json').cliVersion")"

echo "==> Publishing FlowConsole.Cli ($RID, version=$CLI_VERSION)"
rm -rf "$PKG_DIR/binaries/$RID"
dotnet publish "$CLI_PROJECT" \
  -r "$RID" \
  -c Release \
  -p:Version="$CLI_VERSION" \
  -o "$PKG_DIR/binaries/$RID" \
  --verbosity quiet

echo "==> Packing npm tarball"
cd "$PKG_DIR"
rm -f flowconsole-cli-*.tgz
TARBALL_NAME="$(npm pack --silent)"
TARBALL_PATH="$PKG_DIR/$TARBALL_NAME"

echo "==> Installing $TARBALL_NAME globally"
FLOWCONSOLE_CLI_SKIP_DOWNLOAD=1 npm install -g "$TARBALL_PATH"

echo "==> Smoke test"
fcon --version
echo "Done. Binaries: $PKG_DIR/binaries/$RID"
