#!/bin/bash
# Pre-build: Copy all app content into electron/ for packaging
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 Pre-build: Copying app content for packaging..."

# Clean previous copies
rm -rf "$SCRIPT_DIR/office-executive" "$SCRIPT_DIR/office-gameboy" "$SCRIPT_DIR/office-gameboy-color" "$SCRIPT_DIR/office-sims" "$SCRIPT_DIR/office-simcity" "$SCRIPT_DIR/src" "$SCRIPT_DIR/dashboard.html" "$SCRIPT_DIR/lib"

# Copy office themes
for theme in executive gameboy gameboy-color sims simcity; do
  if [ -d "$ROOT_DIR/office-$theme" ]; then
    cp -R "$ROOT_DIR/office-$theme" "$SCRIPT_DIR/office-$theme"
    echo "  ✅ office-$theme"
  fi
done

# Copy shared src modules
cp -R "$ROOT_DIR/src" "$SCRIPT_DIR/src"
echo "  ✅ src/"

# Copy dashboard
if [ -f "$ROOT_DIR/dashboard.html" ]; then
  cp "$ROOT_DIR/dashboard.html" "$SCRIPT_DIR/dashboard.html"
  echo "  ✅ dashboard.html"
fi

# Copy lib if exists
if [ -d "$ROOT_DIR/lib" ]; then
  cp -R "$ROOT_DIR/lib" "$SCRIPT_DIR/lib"
  echo "  ✅ lib/"
fi

# Copy sprites if referenced
if [ -d "$ROOT_DIR/sprites" ]; then
  cp -R "$ROOT_DIR/sprites" "$SCRIPT_DIR/sprites"
  echo "  ✅ sprites/"
fi

echo "✅ Pre-build complete!"
