#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EMSDK_DIR="$PROJECT_DIR/.emsdk"
VENV_DIR="$PROJECT_DIR/.venv"

echo "=== Audio-Maze Toolchain Setup ==="

if [ ! -d "$EMSDK_DIR" ]; then
  echo "Cloning Emscripten SDK..."
  git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
  cd "$EMSDK_DIR"
  ./emsdk install latest
  ./emsdk activate latest
  cd "$PROJECT_DIR"
else
  echo "Emscripten SDK already present."
fi

source "$EMSDK_DIR/emsdk_env.sh" 2>/dev/null || true

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

if ! python3 -c "import hvcc" 2>/dev/null; then
  echo "Installing hvcc..."
  pip install hvcc
else
  echo "hvcc already installed."
fi

echo "Setting up emcc wrappers..."

cat << 'WRAPPER_EMCC' > "$VENV_DIR/bin/emcc"
#!/bin/bash
"$(dirname "$0")/../../.emsdk/upstream/emscripten/emcc" "$@"
WRAPPER_EMCC
chmod +x "$VENV_DIR/bin/emcc"

cat << 'WRAPPER_EMXX' > "$VENV_DIR/bin/em++"
#!/bin/bash
"$(dirname "$0")/../../.emsdk/upstream/emscripten/em++" "$@"
WRAPPER_EMXX
chmod +x "$VENV_DIR/bin/em++"
