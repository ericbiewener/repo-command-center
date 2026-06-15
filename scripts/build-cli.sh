#!/usr/bin/env bash
set -euo pipefail

ENTRIES=(
  src/cli/ai-work-status.ts
  src/cli/view.ts
  src/cli/select-action.ts
)

OUTPUTS=(
  dist/cli/ai-work-status.js
  dist/cli/view.js
  dist/cli/select-action.js
)

CHMOD="chmod +x ${OUTPUTS[*]}"

if [[ "${1:-}" == "--watch" ]]; then
  tsup "${ENTRIES[@]}" --format esm --platform node --target node20 --out-dir dist/cli --clean --watch --onSuccess "$CHMOD"
else
  tsup "${ENTRIES[@]}" --format esm --platform node --target node20 --out-dir dist/cli --clean
  $CHMOD
fi
