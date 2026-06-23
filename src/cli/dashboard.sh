#!/usr/bin/env bash
# Source this script to cd to the selected workstream's repo.
# Add to .zshrc: alias aw='source /abs/path/to/src/cli/dashboard.sh'
#
# The Node dashboard renders its TUI on stderr (visible in terminal)
# and writes the selected path to stdout, which this script captures.

# shellcheck source=./_root.sh
source "$(dirname "${BASH_SOURCE[0]:-$0}")/_root.sh"
_selected="$(FORCE_COLOR=1 node "$_COMMAND_CENTER_ROOT/dist/cli/view.js")"
[[ -n "$_selected" ]] && eval "$_selected"

unset _COMMAND_CENTER_ROOT _selected
