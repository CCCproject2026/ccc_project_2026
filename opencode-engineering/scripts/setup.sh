#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OPENCODE_BIN=${OPENCODE_BIN:-$(command -v opencode 2>/dev/null || true)}
if [ -z "$OPENCODE_BIN" ] && [ -x "$HOME/node_modules/.bin/opencode" ]; then
  OPENCODE_BIN="$HOME/node_modules/.bin/opencode"
fi
if [ -z "$OPENCODE_BIN" ]; then
  echo "OpenCode CLI not found. Install using https://opencode.ai/docs/" >&2
  exit 1
fi
echo "OpenCode environment: $ROOT"
echo "No global files are copied or overwritten. Start OpenCode from this directory for project-local settings."
"$OPENCODE_BIN" --version
python3 "$ROOT/scripts/validate.py"
