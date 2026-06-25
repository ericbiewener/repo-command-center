# Variable naming chosen to make collissions with user's shell env vars less likely.
_COMMAND_CENTER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

_COMMAND_CENTER_EXTRA_PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin"
PATH="$_COMMAND_CENTER_EXTRA_PATH:${PATH:-}"
export PATH

_command_center_find_node() {
  local home_dir
  local node_version
  local candidate

  home_dir="${HOME:-}"
  node_version=""
  if [ -f "$_COMMAND_CENTER_ROOT/.nvmrc" ]; then
    node_version="$(tr -d '[:space:]' < "$_COMMAND_CENTER_ROOT/.nvmrc")"
  fi

  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  for candidate in \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "$home_dir/.volta/bin/node" \
    "$home_dir/.asdf/shims/node" \
    "$home_dir/.local/share/fnm/node-versions/$node_version/installation/bin/node" \
    "$home_dir/.nvm/versions/node/$node_version/bin/node"; do
    if [ -x "$candidate" ]; then
      printf "%s\n" "$candidate"
      return 0
    fi
  done

  if [ -z "$home_dir" ]; then
    return 0
  fi

  find \
    "$home_dir/.local/share/fnm/node-versions" \
    "$home_dir/.nvm/versions/node" \
    -path "*/bin/node" \
    -type f \
    2>/dev/null | while IFS= read -r candidate; do
    if [ -x "$candidate" ]; then
      printf "%s\n" "$candidate"
      break
    fi
  done
}

_COMMAND_CENTER_NODE="$(_command_center_find_node)"
if [ -z "$_COMMAND_CENTER_NODE" ]; then
  printf "Unable to find node. Install Node.js or add it to PATH.\n" >&2
  return 1 2>/dev/null || exit 1
fi
