#!/usr/bin/env bash
# Force-uninstall @flowconsole/cli from the active npm global prefix.
#
# `npm uninstall -g @flowconsole/cli` sometimes fails on macOS with
# ENOTEMPTY because the postinstall step populates binaries/<rid>/ and
# npm's rename-based removal trips over it. This script tries the clean
# path first, then falls back to rm -rf on the package directory and
# its bin symlinks. Idempotent: exits 0 even if nothing is installed.
#
# Usage:
#   packages/cli/scripts/uninstall.sh

set -euo pipefail

PKG_NAME="@flowconsole/cli"
BINS=(fc fcon flowconsole)

NPM_PREFIX="$(npm prefix -g)"
PKG_DIR="$NPM_PREFIX/lib/node_modules/$PKG_NAME"
SCOPE_DIR="$NPM_PREFIX/lib/node_modules/@flowconsole"
BIN_DIR="$NPM_PREFIX/bin"

if [ ! -d "$PKG_DIR" ] && ! command -v fcon >/dev/null 2>&1; then
  echo "==> $PKG_NAME is not installed globally; nothing to do."
  exit 0
fi

echo "==> Trying npm uninstall -g $PKG_NAME"
if npm uninstall -g "$PKG_NAME" 2>/dev/null; then
  echo "    npm uninstall succeeded."
else
  echo "    npm uninstall failed; falling back to manual cleanup."
fi

if [ -d "$PKG_DIR" ]; then
  echo "==> Removing $PKG_DIR"
  rm -rf "$PKG_DIR"
fi

for bin in "${BINS[@]}"; do
  link="$BIN_DIR/$bin"
  if [ -L "$link" ] || [ -e "$link" ]; then
    echo "==> Removing $link"
    rm -f "$link"
  fi
done

if [ -d "$SCOPE_DIR" ] && [ -z "$(ls -A "$SCOPE_DIR" 2>/dev/null)" ]; then
  echo "==> Removing empty scope dir $SCOPE_DIR"
  rmdir "$SCOPE_DIR"
fi

echo "Done."
