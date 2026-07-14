#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTENTS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_EXECUTABLE="$CONTENTS_DIR/MacOS/Grove"
CLI_SCRIPT="$SCRIPT_DIR/ai-work-status.js"

exec env ELECTRON_RUN_AS_NODE=1 "$APP_EXECUTABLE" "$CLI_SCRIPT" "$@"
