#!/usr/bin/env bash
set -euo pipefail

ENTRIES=(
  src/cli/ai-work-status.ts
  src/cli/delete-workstream.ts
  src/cli/select-action.ts
)

OUTPUTS=(
  dist/cli/ai-work-status.js
  dist/cli/delete-workstream.js
  dist/cli/select-action.js
)

sync_launcher() {
  cp scripts/ai-work-status-launcher.sh dist/cli/ai-work-status
  chmod +x "${OUTPUTS[@]}" dist/cli/ai-work-status
}

if [[ "${1:-}" == "--sync-launcher" ]]; then
  sync_launcher
  exit 0
fi

if [[ "${1:-}" == "--watch" ]]; then
  tsup "${ENTRIES[@]}" --format esm --platform node --target node20 --out-dir dist/cli --clean --watch --onSuccess "scripts/build-cli.sh --sync-launcher"
else
  tsup "${ENTRIES[@]}" --format esm --platform node --target node20 --out-dir dist/cli --clean
  sync_launcher
fi
