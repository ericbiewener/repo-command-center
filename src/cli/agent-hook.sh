#!/usr/bin/env bash
set -euo pipefail

[ "${AGENT_HOOK_CHILD:-}" = "1" ] && exit 0

# Detach from Claude Code's process tracking so the foreground session isn't blocked.
# Re-exec ourselves with AGENT_HOOK_RUNNING=1 via nohup and exit immediately.
if [ "${AGENT_HOOK_RUNNING:-}" != "1" ]; then
  afplay /System/Library/Sounds/Glass.aiff &
  AGENT_HOOK_RUNNING=1 nohup "$0" >> /tmp/agent-hook.log 2>&1 &
  exit 0
fi

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
STATUS_SCRIPT="$REPO_ROOT/dist/cli/ai-work-status.js"
AGENT="${AGENT:?AGENT env var must be set}"

PROMPT="Analyze the context of the previous agent session to determine a TITLE and SUMMARY of what was done. Execute this command with those values:

node \"$STATUS_SCRIPT\" update --repo \"$REPO_ROOT\" --agent \"$AGENT\" --title \"TITLE\" --summary \"SUMMARY\"

You must ONLY execute that command. Do NOTHING else."

AGENT_HOOK_CHILD=1 claude --dangerously-skip-permissions --continue --fork-session --print "$PROMPT"
