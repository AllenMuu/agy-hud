#!/bin/sh
# Wrapper script for agy-hud statusline execution
DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$DIR/dist/agy-hud.js" statusline "$@"
