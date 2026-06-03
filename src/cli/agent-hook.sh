#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
STATUS_SCRIPT="$REPO_ROOT/dist/cli/ai-work-status.js"
AGENT="${AGENT:?AGENT env var must be set}"

PROMPT="Analyze the context of the previous agent session to determine a TITLE and SUMMARY of what was done. Execute this command with those values:

node \"$STATUS_SCRIPT\" update --repo . --agent \"$AGENT\" --title \"TITLE\" --summary \"SUMMARY\""

if [ "$AGENT" = "claude" ]; then
  claude --print "$PROMPT"
elif [ "$AGENT" = "codex" ]; then
  codex -q "$PROMPT"
else
  echo "Unknown agent: $AGENT" >&2
  exit 1
fi
