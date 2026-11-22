#!/usr/bin/env bash
# CuBlocky server for Linux - quick installer.
#
# Downloads the latest Linux x64 build from GitHub Releases, unpacks it and
# creates a launcher. The build is self-contained, so no .NET runtime or other
# dependencies are required; only curl and tar (already present on most distros).
#
# Usage:
#   ./install-linux.sh                 # latest release (stable or night build)
#   ./install-linux.sh N-a883f3f       # a specific tag
#   CUBLOCKY_HOME=/opt/CuBlocky ./install-linux.sh
#   CUBLOCKY_URL=http://localhost:6000 ./run.sh
set -euo pipefail

REPO="mouse114514/CuBlocky"
TAG="${1:-${CUBLOCKY_VERSION:-latest}}"
DEST="${CUBLOCKY_HOME:-$HOME/CuBlocky}"

case "$(uname -m)" in
  x86_64|amd64) ;;
  *) echo "error: only x86_64 is supported (got $(uname -m))" >&2; exit 1 ;;
esac

for tool in curl tar; do
  command -v "$tool" >/dev/null 2>&1 || { echo "error: $tool is required" >&2; exit 1; }
done

if [ "$TAG" = "latest" ]; then
  API_URL="https://api.github.com/repos/$REPO/releases/latest"
else
  API_URL="https://api.github.com/repos/$REPO/releases/tags/$TAG"
fi

echo "Looking up CuBlocky $TAG ..."
ASSET_URL="$(curl -fsSL "$API_URL" \
  | grep -o 'https://[^"]*linux-x64[^"]*\.tar\.gz' \
  | head -n 1 || true)"

if [ -z "$ASSET_URL" ]; then
  echo "error: no linux-x64 asset in $TAG. Night builds may be Windows-only." >&2
  echo "       Try a stable tag such as v0.2.2:  $0 v0.2.2" >&2
  exit 1
fi

mkdir -p "$DEST"
echo "Downloading $ASSET_URL"
curl -fL "$ASSET_URL" | tar -xz -C "$DEST"
chmod +x "$DEST/CuBlocky.Server"

cat > "$DEST/run.sh" <<'LAUNCHER'
#!/usr/bin/env bash
cd "$(dirname "$0")"
exec ./CuBlocky.Server --urls "${CUBLOCKY_URL:-http://localhost:5099}"
LAUNCHER
chmod +x "$DEST/run.sh"

echo
echo "Installed to: $DEST"
echo "Start with:   $DEST/run.sh"
echo "Browser:      ${CUBLOCKY_URL:-http://localhost:5099}"
echo "Data folder:  \${CUBLOCKY_DATA_DIR:-\$HOME/.local/share/CuBlocky}"
