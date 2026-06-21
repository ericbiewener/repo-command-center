# AI Work Command Center

A macOS Electron menu bar app for tracking active AI-assisted coding workstreams. Agents submit structured updates through the `ai-work-status` CLI, and the app renders durable JSON status files from `~/.ai-work-status/`.

## How It Works

```txt
AI agent -> ai-work-status CLI -> Electron local API -> ~/.ai-work-status/repos/**/*.json -> dashboard
```

If the Electron app is not running, the CLI writes the same canonical JSON file directly with the shared status writer.

## Install

```bash
pnpm install
```

## Run the App

```bash
pnpm dev
```

The app starts as a menu bar app. Click the menu bar icon to toggle the dashboard, or press `Command+Option+Space` to show it.

## Build

```bash
pnpm build
```

## Install the CLI

```bash
pnpm build:cli
mkdir -p ~/bin
cp dist/cli/ai-work-status.js ~/bin/ai-work-status
```

Ensure `~/bin` is on `PATH`.

## Submit a Status Update

From inside a Git repository:

```bash
ai-work-status update \
  --repo . \
  --agent codex \
  --title "Initial implementation" \
  --summary "Implemented the Electron app shell and started the app in dev mode." \
  --nextRecommendedAction "Review the UI and confirm status cards render correctly."
```

Useful options:

```txt
--repo <path>
--agent <claude|codex|other>
--title <title>
--summary <summary>
--nextRecommendedAction <action>
```

## Agent Setup

Share [examples/AGENT_STATUS_INSTRUCTIONS.md](examples/AGENT_STATUS_INSTRUCTIONS.md) with coding agents. Agents should call `ai-work-status update` and should not manually write files under `~/.ai-work-status/`.

## Storage

Status files are written under:

```txt
~/.ai-work-status/repos/<repo-key>/branches/<branch-key>.json
```

Each file contains generated JSON metadata and structured update fields, including `next_recommended_action`.

## Local API

When the Electron app starts, it creates a localhost-only API server bound to `127.0.0.1` and writes:

```txt
~/.ai-work-status/server.json
```

The write endpoint is:

```txt
POST /api/status/update
```

It requires:

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

The API validates payloads and uses the shared status writer. It does not expose arbitrary shell execution.

## VS Code

Each card has an action to open the associated repository in VS Code. The app tries:

```bash
code <repoPath>
```

If `code` is unavailable, it falls back to:

```bash
open -a "Visual Studio Code" <repoPath>
```

## Settings

Options are read from `~/.ai-work-status/settings.json`.

### Electron App

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `windowMode` | `"menubar"` \| `"dock"` | `"dock"` | `"menubar"` hides the Dock icon and shows a tray icon; the window auto-hides when it loses focus. `"dock"` runs the app as a regular Dock app. |
| `prPollIntervalSeconds` | number | `60` | How often (in seconds) to poll GitHub for PR and CI status. |
| `customActions` | array | `[]` | Buttons added to each workstream card. Each entry has `title` (string), `icon` (optional path to an image file), and `command` (string). The command is spawned with the repo path appended as the last argument. |
| `worktreeCreateCommand` | string | — | Shell command to create a git worktree. Run with `WORKTREE_PATH` and `BRANCH_NAME` env vars set. If omitted, defaults to `git worktree add -b <branch> <path>`. |
| `claudeCommand` | string | `"claude"` | Command used to launch the Claude agent when creating a worktree with a prompt. |
| `codexCommand` | string | `"codex"` | Command used to launch the Codex agent when creating a worktree with a prompt. |
| `notificationClickCommand` | string | — | Shell command to run when an agent-done notification is clicked. If omitted or the command exits non-zero, the dashboard is shown instead. |

**Example:**

```json
{
  "windowMode": "menubar",
  "prPollIntervalSeconds": 30,
  "worktreeCreateCommand": "git fetch origin main && git worktree add -b $BRANCH_NAME $WORKTREE_PATH origin/main",
  "claudeCommand": "claude --dangerously-skip-permissions",
  "notificationClickCommand": "open -a 'AI Work Command Center'",
  "customActions": [
    { "title": "Open Terminal", "icon": "/path/to/terminal.png", "command": "open -a Terminal" }
  ]
}
```

### CLI (`ai-work-status view`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `action` | string | — | Shell command written to stdout when a workstream is selected. `$1` is replaced with the repo path. Required for the select action to work. |
| `deleteAction` | string | — | Shell command written to stdout instead of deleting files when a workstream is deleted. `$1` is replaced with the repo path. If omitted, files are deleted directly. |
| `multiline` | boolean | `false` | Show the full summary text across multiple lines in the TUI. |

**Example:**

```json
{
  "action": "cd $1",
  "deleteAction": "rm -rf $1",
  "multiline": true
}
```

## Verification Checklist

1. Run `pnpm install`.
2. Run `pnpm dev`.
3. Submit a status update from a Git repo with `ai-work-status update`.
4. Confirm the dashboard refreshes and shows the workstream.
5. Quit the Electron app.
6. Submit another update.
7. Confirm the CLI falls back to direct writing.
8. Restart the app and confirm both statuses render.

## Current Limitations

- No Git dirty-state display.
- No diff viewer.
- No terminal or agent session resume.
- No status editing in the renderer.
- No notifications.
- No packaging workflow beyond local build output.
