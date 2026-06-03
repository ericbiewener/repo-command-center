# AI Work Command Center

A macOS Electron menu bar app for tracking active AI-assisted coding workstreams. Agents submit structured updates through the `ai-work-status` CLI, and the app renders durable JSON status files from `~/.ai-work-status/`.

## How It Works

```txt
AI agent -> ai-work-status CLI -> Electron local API -> ~/.ai-work-status/repos/**/*.json -> dashboard
```

If the Electron app is not running, the CLI writes the same canonical Markdown file directly with the shared status writer.

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
cat <<'EOF' | ai-work-status update --repo . --agent codex --status running --title "Initial implementation"
## Current goal

Build the first version of the command center.

## What changed

Implemented the Electron app shell.

## Tests/checks run

Started app in dev mode.

## Known issues

No known issues.

## Next recommended action

Review the UI and confirm status cards render correctly.
EOF
```

Useful options:

```txt
--repo <path>
--agent <claude|codex|other>
--status <running|blocked|ready_for_review|paused|done>
--title <title>
--summary <summary>
--priority <low|medium|high>
--body-file <path>
--json
--direct
```

## Agent Setup

Share [examples/AGENT_STATUS_INSTRUCTIONS.md](examples/AGENT_STATUS_INSTRUCTIONS.md) with coding agents. Agents should call `ai-work-status update` and should not manually write files under `~/.ai-work-status/`.

## Storage

Status files are written under:

```txt
~/.ai-work-status/repos/<repo-key>/branches/<branch-key>.json
```

Each file contains generated JSON metadata and the submitted Markdown body as `body_markdown`.

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
