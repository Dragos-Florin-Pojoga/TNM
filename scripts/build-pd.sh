#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv"
BUILD_DIR="$PROJECT_DIR/src/audio/build"

echo "=== Compiling PureData Patch to WASM ==="

if [ ! -d "$VENV_DIR" ] || [ ! -f "$VENV_DIR/bin/hvcc" ]; then
  echo "Toolchain not found. Running setup first..."
  bash "$SCRIPT_DIR/setup.sh"
fi

source "$VENV_DIR/bin/activate"

echo "Running hvcc..."
rm -rf "$BUILD_DIR"
hvcc "$PROJECT_DIR/src/audio/maze_audio.pd" -n maze_audio -o "$BUILD_DIR" -g js

echo "Patching generated JS for 9-channel output..."
node "$SCRIPT_DIR/patch-wasm-output.js" "$BUILD_DIR/js"

echo "Copying artifacts to public/"
mkdir -p "$PROJECT_DIR/public"
cp "$BUILD_DIR/js/maze_audio"* "$PROJECT_DIR/public/"

echo ""
echo "=== PD→WASM compilation complete ==="
echo "Artifacts in: public/maze_audio.js, public/maze_audio_AudioLibWorklet.js"
