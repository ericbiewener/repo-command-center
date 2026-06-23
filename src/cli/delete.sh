#!/usr/bin/env bash
# shellcheck source=./_root.sh
source "$(dirname "${BASH_SOURCE[0]}")/_root.sh"
  
node "$_COMMAND_CENTER_ROOT/dist/cli/view.js" --delete "$@"
