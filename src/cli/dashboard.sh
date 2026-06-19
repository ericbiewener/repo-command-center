#!/usr/bin/env bash
# Source this script to cd to the selected workstream's repo.
# Add to .zshrc: alias aw='source /abs/path/to/src/cli/dashboard.sh'
#
# The Node dashboard renders its TUI on stderr (visible in terminal)
# and writes the selected path to stdout, which this script captures.

_dashboard_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
_selected="$(FORCE_COLOR=1 node "$_dashboard_dir/../../dist/cli/view.js")"
[[ -n "$_selected" ]] && eval "$_selected"

unset _dashboard_dir _selected
