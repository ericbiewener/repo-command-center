#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATUS_SCRIPT="$SCRIPT_ROOT/../../dist/cli/ai-work-status.js"
REPO="${REPO:-$(git rev-parse --show-toplevel)}"
AGENT="${AGENT:-claude}"

node "$STATUS_SCRIPT" update --repo "$REPO" --agent "$AGENT" ${TITLE:+--title "$TITLE"} ${SUMMARY:+--summary "$SUMMARY"}
