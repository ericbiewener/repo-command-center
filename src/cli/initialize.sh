#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./_root.sh
source "$(dirname "${BASH_SOURCE[0]}")/_root.sh"
STATUS_SCRIPT="$_COMMAND_CENTER_ROOT/dist/cli/ai-work-status.js"
REPO="${REPO:-$(git rev-parse --show-toplevel)}"
AGENT="${AGENT:-claude}"

node "$STATUS_SCRIPT" update --repo "$REPO" --agent "$AGENT" ${TITLE:+--title "$TITLE"} ${SUMMARY:+--summary "$SUMMARY"}
