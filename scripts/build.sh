#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Audio-Maze Full Build ==="

bash "$SCRIPT_DIR/setup.sh"
bash "$SCRIPT_DIR/build-pd.sh"

echo "=== Vite Production Build ==="
cd "$(dirname "$SCRIPT_DIR")"
npm install
npm run build

echo ""
echo "=== Full build complete ==="
echo "Output: dist/"
