#!/usr/bin/env bash
# Install widl + widl-cli binaries for Render deployment
# Downloads latest release from weilliptic-public/wadk and installs to $HOME/widl
set -euo pipefail

WIDL_DIR="$HOME/widl"
TMPDIR="$(mktemp -d)"
REPO="weilliptic-public/wadk"

echo "[install-widl] Creating $WIDL_DIR"
mkdir -p "$WIDL_DIR"

echo "[install-widl] Fetching latest release from GitHub"
RELEASE_JSON=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest")

# Find first linux asset URL
ASSET_URL=$(echo "$RELEASE_JSON" \
  | grep '"browser_download_url":' \
  | sed -E 's/.*"([^"]+)".*/\1/' \
  | grep -iE 'linux|elf|x86_64.*linux' \
  | head -n 1)

if [ -z "$ASSET_URL" ]; then
  echo "[install-widl] ERROR: No Linux asset found in release" >&2
  echo "[install-widl] Available assets:" >&2
  echo "$RELEASE_JSON" | grep '"browser_download_url"' >&2
  exit 1
fi

echo "[install-widl] Downloading: $ASSET_URL"
curl -L --fail -o "$TMPDIR/widl_asset" "$ASSET_URL"

# Detect and extract archive
FILE_TYPE=$(file -b "$TMPDIR/widl_asset" 2>/dev/null || echo "unknown")

if echo "$ASSET_URL $FILE_TYPE" | grep -iE '\.zip|Zip archive' >/dev/null; then
  echo "[install-widl] Extracting zip archive"
  unzip -q "$TMPDIR/widl_asset" -d "$TMPDIR/extracted"
  find "$TMPDIR/extracted" -type f \( -name "widl" -o -name "cli" -o -name "widl-cli" \) -exec cp {} "$WIDL_DIR/" \;
elif echo "$ASSET_URL $FILE_TYPE" | grep -iE '\.tar\.gz|\.tgz|gzip compressed' >/dev/null; then
  echo "[install-widl] Extracting tar.gz archive"
  tar -xzf "$TMPDIR/widl_asset" -C "$TMPDIR"
  find "$TMPDIR" -type f \( -name "widl" -o -name "cli" -o -name "widl-cli" \) -exec cp {} "$WIDL_DIR/" \;
else
  echo "[install-widl] Treating as single binary"
  cp "$TMPDIR/widl_asset" "$WIDL_DIR/widl"
fi

# Rename 'cli' to 'widl-cli' if present
if [ -f "$WIDL_DIR/cli" ] && [ ! -f "$WIDL_DIR/widl-cli" ]; then
  mv "$WIDL_DIR/cli" "$WIDL_DIR/widl-cli"
fi

# Make executable
chmod +x "$WIDL_DIR"/* 2>/dev/null || true

echo "[install-widl] ✓ Installation complete"
echo "[install-widl] Installed files:"
ls -lh "$WIDL_DIR" || true

# Test executables
if [ -f "$WIDL_DIR/widl" ]; then
  echo "[install-widl] Testing widl:"
  "$WIDL_DIR/widl" help 2>&1 | head -n 5 || echo "  (widl test failed - may need runtime deps)"
fi

if [ -f "$WIDL_DIR/widl-cli" ]; then
  echo "[install-widl] Testing widl-cli:"
  "$WIDL_DIR/widl-cli" --help 2>&1 | head -n 5 || echo "  (widl-cli test failed - may need runtime deps)"
fi

echo ""
echo "[install-widl] Set WIDL_CLI_PATH=$WIDL_DIR/widl-cli in environment"
echo "[install-widl] Or add $WIDL_DIR to PATH"

# Cleanup
rm -rf "$TMPDIR"
