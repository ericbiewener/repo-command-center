#!/usr/bin/env bash
# shellcheck source=./_root.sh
source "$(dirname "${BASH_SOURCE[0]}")/_root.sh"

"$_COMMAND_CENTER_NODE" "$_COMMAND_CENTER_ROOT/dist/cli/delete-workstream.js" "$@"
