# Build Spec: AI Work Command Center v1

## Overview

Build a macOS Electron menu bar application that acts as a lightweight command center for tracking active AI-assisted coding workstreams.

The app should display active AI workstreams based on structured status files stored under the user’s home directory. Agents should not manually write those Markdown files directly. Instead, agents should call a CLI helper that submits structured status updates. When the Electron app is running, the CLI should send the update to the app’s local API. The Electron app should validate the payload, derive the canonical status file path, and write the Markdown file. If the Electron app is not running, the CLI should use the same shared logic to write the status file directly.

Version 1 should provide one action button per workstream:

* Open repo in VS Code

The app should run as a macOS menu bar application and be toggleable via a global keyboard shortcut.

---

## Product Goal

The user often has many AI-assisted coding workstreams happening across multiple repositories and branches. The main bottleneck is context switching.

This app should answer:

* What AI-assisted workstreams have I been working on?
* What repo and branch is each workstream tied to?
* What was the current status when the AI agent last updated it?
* Which workstreams are blocked, ready for review, running, paused, or done?
* What is the next recommended action?
* How can I quickly jump back into the repo?

For v1, the only action is:

* Open the associated repo in VS Code

Future versions may add:

* Open/focus terminal
* Resume Claude Code session
* Resume Codex session
* Copy resume prompt
* Edit status in the app
* Show Git diffs
* Archive workstreams
* Launch new agent sessions

Do not implement future features in v1 unless they are trivial and do not complicate the foundation.

---

## Core Design Change

Earlier versions of the plan had agents write Markdown status files directly.

This version changes that.

Agents should submit structured status updates through a CLI:

```bash
ai-work-status update --repo . --agent claude --status blocked --body-file /tmp/status.md
```

or:

```bash
cat <<'EOF' | ai-work-status update --repo . --agent claude --status blocked --title "Figma annotation strategy"
## Current goal

Decide where Figma annotation data should live.

## Next recommended action

Ask Eric to choose between Figma metadata, a knowledge base, or a hybrid.
EOF
```

The CLI should:

1. Determine the current repo path.
2. Send a structured payload to the Electron app’s local API if the app is running.
3. If the Electron app is not running, directly write the status file using shared logic.

The Electron app should:

1. Validate the payload.
2. Determine repo name and current Git branch.
3. Derive a stable workstream ID.
4. Derive the canonical status file path.
5. Render YAML frontmatter + Markdown body.
6. Write the Markdown status file.
7. Refresh the UI.

This creates a single contract for status updates and avoids malformed YAML or inconsistent paths.

---

## High-Level Requirements

Build an Electron app using web technology.

The app must:

1. Run as a macOS menu bar application.
2. Show/hide a compact dashboard window when the menu bar icon is clicked.
3. Show/hide the same dashboard using a global keyboard shortcut.
4. Start a localhost-only API server from the Electron main process.
5. Write a runtime server info file containing port, token, and PID.
6. Accept structured status update payloads through the local API.
7. Validate status update payloads.
8. Write canonical Markdown status files under `~/.ai-work-status/`.
9. Read Markdown status files from `~/.ai-work-status/`.
10. Parse YAML frontmatter from each status file.
11. Render one card per valid status file.
12. Group or filter workstreams by `status`.
13. Sort workstreams by `updated_at` descending.
14. Show the Markdown body of each status file in the UI.
15. Provide a button to open the associated repository in VS Code.
16. Provide a manual refresh button.
17. Handle missing, malformed, or incomplete status files gracefully.
18. Include a CLI helper named `ai-work-status`.
19. Include shared status-writing logic used by both Electron and the CLI fallback path.
20. Include example agent instructions for Claude Code, Codex, or another coding agent.

---

## Explicit Non-Goals for v1

Do not implement these in v1:

* Do not scan repositories by modification time.
* Do not infer active work from directory mtimes.
* Do not inspect Git dirty state.
* Do not run `git status` for display purposes.
* Do not show Git diffs.
* Do not create branches.
* Do not create worktrees.
* Do not manage tmux, Warp, iTerm, Terminal, or shell tabs.
* Do not resume Claude sessions.
* Do not resume Codex sessions.
* Do not build a full database.
* Do not sync to cloud.
* Do not edit status files in the renderer UI.
* Do not implement notifications.
* Do not implement a generic command runner.
* Do not expose arbitrary shell execution through IPC or HTTP.
* Do not package for distribution unless the local dev version is complete.

The status files are the durable storage layer.

The Electron app and CLI own the write path.

---

## Recommended Tech Stack

Use:

* Electron
* TypeScript
* React
* Vite or electron-vite
* Node.js APIs from Electron main process
* IPC between Electron main and renderer
* Local HTTP API bound to `127.0.0.1`
* CLI script written in TypeScript or JavaScript
* YAML frontmatter parsing
* Markdown rendering

Suggested libraries:

```txt
electron
typescript
react
react-dom
vite or electron-vite
gray-matter
react-markdown
zod
commander
nanoid or crypto
```

Optional but useful:

```txt
lucide-react
date-fns
execa
```

Styling can be plain CSS, CSS modules, Tailwind, or another lightweight approach.

Prefer simplicity and maintainability over framework complexity.

---

## Conceptual Architecture

```txt
AI agent
  |
  | calls
  v
ai-work-status CLI
  |
  | if Electron app is running
  v
Electron local API server
  |
  | validates + writes
  v
~/.ai-work-status/repos/<repo-key>/branches/<branch-key>.md
  |
  | read by
  v
Electron renderer UI
```

Fallback path:

```txt
AI agent
  |
  | calls
  v
ai-work-status CLI
  |
  | if Electron app is not running
  v
shared status writer
  |
  | writes directly
  v
~/.ai-work-status/repos/<repo-key>/branches/<branch-key>.md
```

Both Electron and CLI must use the same shared logic for:

* Payload validation
* Repo metadata discovery
* Branch discovery
* Workstream ID generation
* Status path generation
* Markdown rendering
* File writing

Do not duplicate these rules in two places.

---

## Source of Truth

The canonical durable data lives in Markdown files under:

```txt
~/.ai-work-status/
```

Expected structure:

```txt
~/.ai-work-status/
  repos/
    <repo-key>/
      branches/
        <branch-key>.md
  server.json
```

Example:

```txt
~/.ai-work-status/
  repos/
    figma-service--a1b2c3d4e5/
      branches/
        ai-dev-resource-spike.md
    business-components--f6g7h8i9j0/
      branches/
        ai-js-payload-audit.md
  server.json
```

The app should recursively read:

```txt
~/.ai-work-status/repos/**/*.md
```

---

## Runtime Server Info File

When the Electron app starts its local API server, it should write:

```txt
~/.ai-work-status/server.json
```

Example:

```json
{
  "port": 47321,
  "token": "random-long-secret-token",
  "pid": 12345,
  "startedAt": "2026-05-31T18:22:10.000Z"
}
```

The CLI should read this file to know how to contact the Electron app.

Rules:

* Bind the API server only to `127.0.0.1`.
* Never bind to `0.0.0.0`.
* Generate a fresh random token on app start.
* Require `Authorization: Bearer <token>` for write endpoints.
* If the server info file is missing, stale, invalid, or unreachable, the CLI should use fallback direct-write mode.
* On app quit, remove `server.json` if possible.
* If removal fails, the CLI should still detect stale server info by connection failure or PID mismatch.

---

## Local API

The Electron main process should start a small local HTTP server.

Use Node’s built-in `http` module unless another tiny dependency is justified.

Bind to:

```txt
127.0.0.1
```

Use a random available port.

Write that port to `~/.ai-work-status/server.json`.

### API Endpoints

#### `GET /api/health`

Returns:

```json
{
  "ok": true,
  "app": "ai-work-command-center",
  "version": "1.0.0"
}
```

This endpoint may require auth or may be unauthenticated. Simpler is acceptable.

#### `POST /api/status/update`

Requires:

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

Accepts a structured status update payload.

Returns success response:

```json
{
  "ok": true,
  "statusFilePath": "/Users/eric/.ai-work-status/repos/figma-service--a1b2c3d4e5/branches/ai-dev-resource-spike.md",
  "workstreamId": "figma-service__ai-dev-resource-spike"
}
```

Returns failure response:

```json
{
  "ok": false,
  "error": "Missing required field: bodyMarkdown"
}
```

---

## Status Update Payload

Define this shared TypeScript type:

```ts
export type StatusUpdatePayload = {
  repoPath: string;

  agent: "claude" | "codex" | "other";
  status: "running" | "blocked" | "ready_for_review" | "paused" | "done";

  bodyMarkdown: string;

  title?: string;
  summary?: string;
  priority?: "low" | "medium" | "high";
};
```

### Required Fields

#### `repoPath`

Absolute or relative path to the repository.

If relative, resolve from the CLI’s current working directory.

The app should canonicalize this to the Git repo root.

#### `agent`

The agent submitting the update.

Expected values:

```txt
claude
codex
other
```

#### `status`

Canonical workstream status.

Expected values:

```txt
running
blocked
ready_for_review
paused
done
```

#### `bodyMarkdown`

Markdown body of the status update.

This should include sections like:

```md
## Current goal

## What changed

## Tests/checks run

## Known issues

## Next recommended action
```

### Optional Fields

#### `title`

Human-readable display title.

#### `summary`

One-line summary.

#### `priority`

Expected values:

```txt
low
medium
high
```

---

## Data the App Should Derive

The agent should not have to provide:

* `repo_name`
* `branch`
* `workstream_id`
* `updated_at`
* `status_file_path`
* `repo_key`
* `branch_key`

The app or shared writer should derive those.

### Derived Fields

#### `repo_name`

From Git root basename.

Example:

```txt
figma-service
```

#### `branch`

From:

```bash
git -C <repo> branch --show-current
```

If detached:

```txt
detached-<short-sha>
```

#### `repo_id_source`

Prefer:

```bash
git -C <repo> config --get remote.origin.url
```

Fallback:

```txt
absolute repo root path
```

#### `repo_key`

Use:

```txt
<slugified-repo-name>--<short-hash-of-repo-id-source>
```

Example:

```txt
figma-service--a1b2c3d4e5
```

#### `branch_key`

Slugified branch.

Example:

```txt
ai/dev-resource-spike
```

becomes:

```txt
ai-dev-resource-spike
```

#### `workstream_id`

Use:

```txt
<repo-name>__<branch-key>
```

Example:

```txt
figma-service__ai-dev-resource-spike
```

#### `updated_at`

Use current local or UTC ISO timestamp.

Prefer ISO 8601.

Example:

```txt
2026-05-31T18:22:10.000Z
```

---

## Generated Status File Format

The app should generate Markdown files with YAML frontmatter.

Example generated file:

```md
---
workstream_id: figma-service__ai-dev-resource-spike
repo_name: figma-service
repo_path: /Users/eric/code/figma-service
branch: ai/dev-resource-spike
agent: claude
status: blocked
updated_at: 2026-05-31T18:22:10.000Z
title: Figma annotation strategy
summary: Blocked on choosing where annotation data should live.
priority: medium
---

## Current goal

Decide how Figma annotation data should be represented.

## What changed

Investigated Figma dev resources and found limitations.

## Tests/checks run

No automated tests yet.

## Known issues

Need a decision on source of truth.

## Next recommended action

Ask Eric to choose between Figma metadata, a knowledge base, or a hybrid.
```

The app should generate frontmatter consistently.

Do not ask agents to manually write YAML.

---

## CLI: `ai-work-status`

Create a CLI command named:

```txt
ai-work-status
```

It should support at least:

```bash
ai-work-status update
```

### CLI Usage

Supported examples:

```bash
ai-work-status update --repo . --agent claude --status running --body-file ./status.md
```

```bash
ai-work-status update --repo . --agent codex --status ready_for_review --title "JS payload audit" --summary "Initial audit complete" --body-file /tmp/status.md
```

```bash
cat <<'EOF' | ai-work-status update --repo . --agent claude --status blocked --title "Figma annotation strategy"
## Current goal

Decide where Figma annotation data should live.

## What changed

Explored Figma dev resources and component metadata options.

## Tests/checks run

No automated tests.

## Known issues

Need product/architecture decision.

## Next recommended action

Ask Eric whether detached instances must keep annotations.
EOF
```

### CLI Options

Implement:

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

#### `--repo`

Defaults to current working directory.

#### `--body-file`

If provided, read Markdown body from this file.

If not provided, read Markdown body from stdin.

#### `--json`

Optional mode where stdin is a full JSON payload.

Example:

```bash
cat <<'JSON' | ai-work-status update --json
{
  "repoPath": ".",
  "agent": "claude",
  "status": "blocked",
  "title": "Figma annotation strategy",
  "summary": "Blocked on source of truth decision.",
  "bodyMarkdown": "## Current goal\n\nDecide where annotations should live."
}
JSON
```

#### `--direct`

Skip the Electron local API and write directly using shared logic.

This is useful for debugging.

### CLI Behavior

Default behavior:

1. Build and validate `StatusUpdatePayload`.
2. Try to read `~/.ai-work-status/server.json`.
3. Try to contact the Electron app local API.
4. If API update succeeds, print success.
5. If API update fails because app is unavailable, fall back to direct write.
6. If validation fails, print a clear error and exit non-zero.
7. If direct write fails, print a clear error and exit non-zero.

Example success output:

```txt
Updated AI work status:
  /Users/eric/.ai-work-status/repos/figma-service--a1b2c3d4e5/branches/ai-dev-resource-spike.md
```

Example fallback output:

```txt
Electron app not available. Wrote status file directly:
  /Users/eric/.ai-work-status/repos/figma-service--a1b2c3d4e5/branches/ai-dev-resource-spike.md
```

---

## Shared Core Module

Create shared functions used by both Electron and CLI.

Suggested files:

```txt
src/shared/statusSchema.ts
src/shared/gitInfo.ts
src/shared/statusPath.ts
src/shared/renderStatusMarkdown.ts
src/shared/writeStatusFile.ts
src/shared/readStatusFiles.ts
```

### Required Shared Functions

#### `validateStatusUpdatePayload`

```ts
function validateStatusUpdatePayload(input: unknown): StatusUpdatePayload
```

Use `zod` or equivalent.

#### `getRepoInfo`

```ts
type RepoInfo = {
  repoRoot: string;
  repoName: string;
  branch: string;
  repoIdSource: string;
};

async function getRepoInfo(repoPath: string): Promise<RepoInfo>
```

Uses Git commands.

#### `computeStatusPath`

```ts
type StatusPathInfo = {
  repoKey: string;
  branchKey: string;
  workstreamId: string;
  statusFilePath: string;
};

function computeStatusPath(repoInfo: RepoInfo): StatusPathInfo
```

#### `renderStatusMarkdown`

```ts
function renderStatusMarkdown(args: {
  payload: StatusUpdatePayload;
  repoInfo: RepoInfo;
  pathInfo: StatusPathInfo;
  updatedAt: string;
}): string
```

#### `writeStatusFile`

```ts
async function writeStatusFile(payload: StatusUpdatePayload): Promise<{
  statusFilePath: string;
  workstreamId: string;
}>
```

This should:

1. Validate payload.
2. Get repo info.
3. Compute path.
4. Render Markdown.
5. Create parent directory.
6. Write file atomically if practical.
7. Return path info.

#### `readStatusFiles`

```ts
async function readStatusFiles(): Promise<Workstream[]>
```

Used by Electron to render the dashboard.

---

## Workstream Type

Define a shared TypeScript type for status files read by the app.

```ts
export type WorkstreamStatus =
  | "running"
  | "blocked"
  | "ready_for_review"
  | "paused"
  | "done"
  | "other"
  | "invalid";

export type AgentKind = "claude" | "codex" | "other" | "unknown";

export type Workstream = {
  id: string;

  title?: string;
  summary?: string;

  repoName: string;
  repoPath: string;
  branch: string;

  agent: AgentKind;
  status: WorkstreamStatus;
  rawStatus: string;

  priority?: "low" | "medium" | "high" | string;

  updatedAt: string;
  updatedAtEpoch: number | null;

  statusFilePath: string;
  markdownBody: string;

  isValid: boolean;
  validationErrors: string[];
};
```

---

## Status File Reading / Parsing Logic

Implement:

```ts
async function listWorkstreams(statusRoot: string): Promise<Workstream[]>
```

Default root:

```ts
path.join(os.homedir(), ".ai-work-status", "repos")
```

Behavior:

1. If the root does not exist, return an empty array.
2. Recursively find all `.md` files.
3. For each file:

   * Read as UTF-8.
   * Parse frontmatter.
   * Validate required fields.
   * Normalize status.
   * Normalize agent.
   * Parse `updated_at`.
   * Derive `id`.
   * Return a `Workstream`.
4. Sort by `updatedAtEpoch` descending.
5. Invalid files should still be returned with `status: "invalid"` and validation errors.
6. Do not crash the whole scan because one file is malformed.

---

## Required Frontmatter Fields in Stored Files

Stored files should contain:

```yaml
workstream_id: string
repo_name: string
repo_path: string
branch: string
agent: claude | codex | other
status: running | blocked | ready_for_review | paused | done
updated_at: string
```

Optional:

```yaml
title: string
summary: string
priority: low | medium | high
```

The reader should tolerate missing optional fields.

The reader should flag missing required fields as validation errors.

---

## Status Normalization

Normalize status values from status files:

```ts
function normalizeStatus(value: unknown): WorkstreamStatus {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "running":
    case "in_progress":
    case "in-progress":
      return "running";

    case "blocked":
      return "blocked";

    case "ready_for_review":
    case "ready-for-review":
    case "ready for review":
    case "review":
      return "ready_for_review";

    case "paused":
    case "idle":
      return "paused";

    case "done":
    case "complete":
    case "completed":
      return "done";

    default:
      return "other";
  }
}
```

Invalid files should use:

```ts
status: "invalid"
```

---

## Agent Normalization

Normalize agent values from status files:

```ts
function normalizeAgent(value: unknown): AgentKind {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "claude":
    case "claude-code":
    case "claude_code":
      return "claude";

    case "codex":
      return "codex";

    case "other":
      return "other";

    default:
      return "unknown";
  }
}
```

---

## Slug and Hash Rules

Use consistent path-safe slugs.

Example slug function:

```ts
function slug(value: string): string {
  return (
    value
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unnamed"
  );
}
```

Use SHA-1 or SHA-256 hash of repo identity source and take first 10 chars.

Example:

```ts
repoKey = `${slug(repoName)}--${hash(repoIdSource).slice(0, 10)}`
branchKey = slug(branch)
workstreamId = `${slug(repoName)}__${branchKey}`
```

---

## Electron App Behavior

### Menu Bar App

The app should appear as a menu bar app on macOS.

It should:

* Create a tray/menu bar icon.
* Not show a normal persistent Dock window if reasonably possible.
* Open a compact dashboard window when the tray icon is clicked.
* Hide the dashboard window when the tray icon is clicked again.
* Provide a quit action.

Preferred behavior:

```txt
Click menu bar icon:
  if window hidden -> show window
  if window visible -> hide window
```

### Global Keyboard Shortcut

Register a global shortcut.

Default shortcut:

```txt
CommandOrControl+Alt+Space
```

On macOS this is:

```txt
Command+Option+Space
```

The shortcut should toggle the dashboard window.

If registration fails:

* Continue running.
* Show a visible warning in the UI.
* Log the failure.
* Do not crash.

### Dashboard Window

Suggested size:

```txt
width: 520
height: 720
```

Suggested behavior:

* Always on top when opened.
* Hideable.
* Resizable optional.
* Should feel like a command palette / popover rather than a full window.
* Search input should focus when window opens.
* `Esc` should hide the window.

---

## Electron Main Process Responsibilities

The Electron main process should:

1. Create the tray icon.
2. Create the dashboard window.
3. Register the global shortcut.
4. Start the local API server.
5. Write `~/.ai-work-status/server.json`.
6. Remove `server.json` on quit when possible.
7. Handle renderer IPC:

   * `workstreams:list`
   * `vscode:open`
   * `app:info`
8. Read files from `~/.ai-work-status/repos/`.
9. Parse frontmatter.
10. Validate status files.
11. Open VS Code via child process.
12. Log errors.

---

## Renderer UI Requirements

The UI should show:

1. Header
2. Search input
3. Refresh button
4. Status groups
5. Workstream cards
6. Empty state
7. Error/warning section for malformed files
8. Warning if global shortcut failed
9. Optional API server status indicator

### Header

Display:

```txt
AI Workstreams
```

Also show count:

```txt
7 active
```

“Active” means all parsed status files except `status: done`, unless the user toggles “show done.”

### Search

Add a client-side search box.

Search should match against:

* repo name
* branch
* title
* summary
* agent
* status
* Markdown body
* repo path

### Groups

Group cards by status in this order:

1. Blocked
2. Ready for Review
3. Running
4. Paused
5. Done
6. Other
7. Invalid / Needs Fix

Only show a group if it has cards.

### Workstream Card

Each card should display:

* Title
* Repo name
* Branch
* Agent
* Status
* Updated time
* Markdown body preview or rendered body
* Repo path
* Button: Open in VS Code

Preferred card layout:

```txt
[status badge] [agent badge] [updated relative time]

Title or repo/branch
repo_name
branch

Markdown body preview...

[Open in VS Code]
```

### Markdown Body

Render the Markdown body.

For v1, it is acceptable to render either:

* Full Markdown body inside each card
* Collapsed preview with expansion

Simpler is fine.

### Empty State

If no status files exist, show:

```txt
No AI workstream status files found.

Expected files under:

~/.ai-work-status/repos/**/*.md

Use `ai-work-status update` from inside a Git repo to create one.
```

### Error State

If the app cannot read the status directory, show a friendly error.

If the directory does not exist, treat it as empty state, not as a crash.

---

## IPC Contract

The renderer should not directly access Node filesystem APIs.

Expose a small API through Electron preload.

Example:

```ts
export type AppApi = {
  listWorkstreams(): Promise<Workstream[]>;

  openInVSCode(
    repoPath: string
  ): Promise<{ ok: true } | { ok: false; error: string }>;

  getAppInfo(): Promise<{
    shortcutRegistered: boolean;
    statusRoot: string;
    localApi: {
      running: boolean;
      port?: number;
    };
  }>;
};
```

In preload:

```ts
contextBridge.exposeInMainWorld("appApi", {
  listWorkstreams: () => ipcRenderer.invoke("workstreams:list"),
  openInVSCode: (repoPath: string) => ipcRenderer.invoke("vscode:open", repoPath),
  getAppInfo: () => ipcRenderer.invoke("app:info"),
});
```

---

## Opening VS Code

Implement IPC handler:

```ts
ipcMain.handle("vscode:open", async (_event, repoPath: string) => {
  // validate repoPath
  // run `code <repoPath>`
});
```

Use Node child process:

```ts
import { spawn } from "node:child_process";

function openInVSCode(repoPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("code", [repoPath], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", reject);

    child.unref();
    resolve();
  });
}
```

Before calling `code`, verify:

```ts
fs.existsSync(repoPath)
```

If `code` fails because it is not installed or not on PATH, show a helpful UI error:

```txt
Could not open VS Code. Make sure the `code` command is installed and available on PATH.
```

Optional fallback:

```bash
open -a "Visual Studio Code" "<repoPath>"
```

Prefer `code` first.

---

## Security Requirements

Use Electron security best practices:

* Do not enable Node integration in the renderer.
* Use a preload script.
* Use `contextBridge`.
* Validate IPC input.
* Do not expose arbitrary shell execution to the renderer.
* Do not expose arbitrary shell execution through the local HTTP API.
* Bind local API only to `127.0.0.1`.
* Require bearer token for write endpoints.
* Do not allow CORS broadly.
* Accept only JSON payloads.
* Limit request body size.
* Renderer should only be able to call approved actions:

  * list workstreams
  * open repo in VS Code
  * get app info

BrowserWindow should use:

```ts
webPreferences: {
  preload: path.join(__dirname, "preload.js"),
  contextIsolation: true,
  nodeIntegration: false,
}
```

Do not expose a generic `runCommand` IPC method.

Do not expose a generic HTTP endpoint that executes commands.

---

## Suggested Project Structure

```txt
ai-work-command-center/
  package.json
  tsconfig.json
  electron.vite.config.ts
  README.md

  electron/
    main.ts
    preload.ts
    tray.ts
    window.ts
    ipc.ts
    localApiServer.ts
    openVSCode.ts

  src/
    cli/
      ai-work-status.ts

    renderer/
      main.tsx
      App.tsx
      App.css
      components/
        Header.tsx
        SearchBox.tsx
        StatusGroup.tsx
        WorkstreamCard.tsx
        EmptyState.tsx
        ErrorPanel.tsx
      utils/
        formatDate.ts
        groupWorkstreams.ts

    shared/
      types.ts
      statusSchema.ts
      gitInfo.ts
      statusPath.ts
      renderStatusMarkdown.ts
      writeStatusFile.ts
      readStatusFiles.ts
      statusNormalization.ts
      serverInfo.ts

  examples/
    AGENT_STATUS_INSTRUCTIONS.md
    sample-status.md
```

Adapt this structure to the selected Electron starter as needed.

---

## Suggested Visual Design

Aim for a compact command-center feel.

Style characteristics:

* Clean card layout.
* Strong hierarchy.
* Small badges for status and agent.
* Minimal visual noise.
* Fast to scan.
* Dark mode is acceptable.
* Light mode is acceptable.
* Do not over-invest in visual polish.

Suggested colors by status:

```txt
blocked: red/orange
ready_for_review: purple/blue
running: green/blue
paused: gray
done: gray/green
invalid: red
```

---

## Refresh Behavior

On app open:

* Load workstreams.

When clicking Refresh:

* Re-read status files.

When API receives a status update:

* Write the status file.
* Notify renderer if window exists.
* Refresh the UI or trigger a reload.

Optional:

* Refresh every 30 seconds while window is visible.

Do not implement heavy filesystem watchers in v1 unless trivial.

---

## Keyboard Behavior

When dashboard is open:

* `Esc` hides the window.
* Search input should be focused automatically when the window opens.

Global shortcut:

```txt
CommandOrControl+Alt+Space
```

Should toggle visibility.

---

## Tray/Menu Behavior

The menu bar icon should:

* Toggle the window on click.

Context menu can include:

```txt
Refresh
Quit
```

If context menu complicates things, include a small quit button in the UI for v1.

---

## Handling Done Workstreams

By default:

* Hide `status: done` workstreams from active count.
* It is acceptable to show done workstreams in a Done group at the bottom.

Optional:

* Add “Show done” toggle.

Do not delete status files automatically.

---

## Malformed File Handling

If a Markdown file:

* Cannot be read
* Has invalid frontmatter
* Is missing required fields
* Has invalid `updated_at`

Then:

* Return a `Workstream` with `isValid: false`.
* Set `status: "invalid"`.
* Include validation errors.
* Show it in an “Invalid / Needs Fix” group.

The UI should make it clear which file needs fixing.

Example:

```txt
Invalid status file
~/.ai-work-status/repos/foo/branches/bar.md

Missing required field: repo_path
Missing required field: updated_at
```

---

## Sample Status File

Create:

```txt
examples/sample-status.md
```

Content:

```md
---
workstream_id: figma-service__ai-dev-resource-spike
repo_name: figma-service
repo_path: /Users/eric/code/figma-service
branch: ai/dev-resource-spike
agent: claude
status: blocked
updated_at: 2026-05-31T10:42:00-07:00
priority: medium
title: Figma dev resource annotation strategy
summary: Blocked on choosing where reusable component annotations should live.
---

## Current goal

Figure out a durable way to attach component metadata to Figma-originated design data so the downstream AI mapping pipeline can retrieve it.

## What changed

- Investigated dev resource availability.
- Identified limitations when consuming library components from another file.
- Started considering a separate component annotation knowledge base.

## Tests/checks run

No automated tests yet.

## Known issues

Need a decision on whether detached instances must keep their annotations.

## Next recommended action

Choose whether the source of truth should be Figma metadata, a knowledge base, or a hybrid.
```

---

## Agent Instruction File

Create:

```txt
examples/AGENT_STATUS_INSTRUCTIONS.md
```

Content:

````md
# AI Workstream Status Instructions

Before stopping work, update the AI workstream status.

Do not manually write status files.

Use the `ai-work-status` CLI.

## Basic command

From inside the repository, run:

```bash
cat <<'EOF' | ai-work-status update --repo . --agent claude --status running
## Current goal

Describe the current goal.

## What changed

Describe the important changes made.

## Tests/checks run

List tests, checks, or manual verification performed.

## Known issues

List blockers, risks, or unresolved questions.

## Next recommended action

Give Eric one specific next action.
EOF
````

For Codex, use:

```bash
cat <<'EOF' | ai-work-status update --repo . --agent codex --status running
## Current goal

...

## Next recommended action

...
EOF
```

## Status values

Use one of:

```txt
running
blocked
ready_for_review
paused
done
```

## Good status update rules

Keep the update concise but sufficient for Eric to resume work later.

Always include:

* Current goal
* What changed
* Tests/checks run
* Known issues
* Next recommended action

The most important section is:

```md
## Next recommended action
```

Make it specific and action-oriented.

## Do not do this

Do not write directly to:

```txt
~/.ai-work-status/
```

Do not create status files inside the repository.

Do not create `.local/status.md`.

Do not manually construct YAML frontmatter.

The CLI and app handle canonical storage.

````

---

## README Requirements

Create a README with:

1. What the app does.
2. How the status update flow works.
3. How to install dependencies.
4. How to run the app in dev mode.
5. How to install the `ai-work-status` CLI.
6. How to configure agents.
7. How to verify VS Code opening works.
8. How the Electron local API works.
9. Current limitations.

Example commands:

```bash
pnpm install
pnpm dev
````

Install CLI:

```bash
pnpm build:cli
mkdir -p ~/bin
cp dist/cli/ai-work-status ~/bin/ai-work-status
chmod +x ~/bin/ai-work-status
```

Ensure `~/bin` is on PATH.

Example status update:

```bash
cat <<'EOF' | ai-work-status update --repo . --agent claude --status running --title "Initial implementation"
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

---

## Package Scripts

Include useful scripts.

Example:

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "build:cli": "tsup src/cli/ai-work-status.ts --format esm --platform node --out-dir dist/cli",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

Adjust based on selected tooling.

---

## Implementation Plan

### Step 1: Scaffold Electron app

Create a TypeScript Electron + React project.

Confirm:

* App launches.
* Renderer loads.
* Main/preload separation works.

### Step 2: Add shared status module

Implement shared functions:

* Validate payload
* Discover repo info
* Compute status path
* Render Markdown
* Write status file
* Read status files

### Step 3: Add CLI

Implement:

```bash
ai-work-status update
```

Support:

* Flags
* Stdin body
* Body file
* JSON stdin
* API write path
* Direct fallback write path

### Step 4: Add local API server

In Electron main process:

* Start server on `127.0.0.1`
* Pick random available port
* Generate token
* Write `~/.ai-work-status/server.json`
* Implement `POST /api/status/update`
* Use shared `writeStatusFile`

### Step 5: Add tray/menu bar behavior

Implement:

* Tray icon
* Hidden window by default
* Toggle window on tray click
* Quit action

### Step 6: Add global shortcut

Implement:

* Register shortcut on app ready
* Toggle window with shortcut
* Unregister on quit
* Show warning if registration fails

### Step 7: Implement workstream reader

Implement:

* Recursive Markdown file discovery
* Frontmatter parsing
* Validation
* Normalization
* Sorting

### Step 8: Add renderer IPC

Expose:

* `listWorkstreams`
* `openInVSCode`
* `getAppInfo`

### Step 9: Build renderer UI

Implement:

* Header
* Search
* Status groups
* Cards
* Markdown rendering
* Empty state
* Invalid files section
* Refresh button

### Step 10: Implement VS Code action

Implement:

* Open path with `code <repoPath>`
* Handle missing path
* Handle command failure

### Step 11: Add examples and README

Add:

* Agent instructions
* Sample status file
* README

### Step 12: Manual test

Test:

1. Start Electron app.
2. Run `ai-work-status update` from a Git repo.
3. Confirm Electron API handles update.
4. Confirm status file appears under `~/.ai-work-status/`.
5. Confirm UI refreshes.
6. Quit Electron app.
7. Run `ai-work-status update` again.
8. Confirm CLI fallback direct write works.
9. Restart Electron app.
10. Confirm both statuses appear.

---

## Acceptance Criteria

The project is complete for v1 when all of these are true.

### App Launch

* The app launches on macOS.
* The app appears as a menu bar app.
* The dashboard does not need to appear as a normal persistent Dock window.

### Menu Bar

* Clicking the menu bar icon toggles the dashboard.
* The dashboard appears at a sensible position.
* The app can be quit.

### Keyboard Shortcut

* Pressing the configured shortcut toggles the dashboard.
* If shortcut registration fails, the app still runs and shows a warning.

### Local API

* Electron starts a local API server bound to `127.0.0.1`.
* Electron writes `~/.ai-work-status/server.json`.
* API accepts authenticated `POST /api/status/update`.
* API rejects missing or invalid token.
* API validates payloads.
* API writes canonical status files.
* API does not expose generic command execution.

### CLI

* `ai-work-status update` works from inside a Git repo.
* CLI can read body from stdin.
* CLI can read body from `--body-file`.
* CLI can accept JSON with `--json`.
* CLI sends updates to Electron API when available.
* CLI falls back to direct write when Electron is not available.
* CLI prints clear success and error messages.

### Status File Writing

* Status files are written under:

```txt
~/.ai-work-status/repos/<repo-key>/branches/<branch-key>.md
```

* Frontmatter is generated by shared code.
* Agents do not need to manually write YAML.
* Branch-specific files are generated correctly.

### Status File Reading

* The app reads Markdown files from:

```txt
~/.ai-work-status/repos/**/*.md
```

* Valid files appear as cards.
* Invalid files do not crash the app.
* Missing status directory shows empty state.

### Parsing

* YAML frontmatter is parsed.
* Markdown body is rendered.
* Required fields are validated.
* Unknown statuses are handled gracefully.

### UI

* Cards are grouped by status.
* Cards are sorted by `updated_at` descending.
* Search filters cards.
* Refresh reloads files.

### VS Code Action

* Clicking “Open in VS Code” opens the repo path in VS Code.
* Missing or invalid repo paths show an error.
* Failure to find the `code` command shows a helpful error.

### Documentation

* README explains how to run the app.
* README explains how to install the CLI.
* README explains how agents should update status.
* Example agent instructions are included.

---

## Future-Proofing Notes

Do not implement these yet, but keep the architecture ready for them.

Future actions will likely include:

```ts
type WorkstreamAction =
  | "open-vscode"
  | "open-terminal"
  | "resume-claude"
  | "resume-codex"
  | "copy-resume-prompt"
  | "open-status-file"
  | "archive-workstream";
```

Design the card component so additional buttons can be added later without refactoring the whole UI.

Keep the `Workstream` type extensible.

Potential future frontmatter fields:

```yaml
terminal:
  provider: warp
  cwd: /Users/eric/code/figma-service
  tmux_session: ai-work
  tmux_window: figma-service__ai-dev-resource-spike

claude:
  session_name: figma-service__ai-dev-resource-spike
  session_id:

codex:
  session_id:
  mode: cli
```

Do not require these in v1.

Potential future API endpoints:

```txt
POST /api/workstreams/archive
POST /api/workstreams/open-terminal
POST /api/workstreams/resume-claude
POST /api/workstreams/resume-codex
```

Do not implement these in v1.

---

## Important Design Principles

### Keep v1 simple

The app should be useful even if all it does is:

```txt
agents submit status
app shows cards
user opens repo in VS Code
```

### App and CLI own writes

Agents should not write status files directly.

### Status files remain durable and inspectable

Even though writes go through the app/CLI, the storage should remain plain Markdown files.

### Do not over-automate

Do not try to resume agents yet.

### Avoid generic shell execution

Expose specific safe actions only.

### Make context switching cheaper

The UI should help the user quickly answer:

```txt
What was happening here?
What do I need to do next?
How do I open the repo?
```

---

## Final Deliverable

Deliver a working Electron project that can be run locally with:

```bash
pnpm install
pnpm dev
```

The app should provide a macOS menu bar command center for AI workstreams.

Agents should update workstream status by calling:

```bash
ai-work-status update
```

The CLI should send updates to the Electron app when available and fall back to direct file writing when not.

The Electron app should render those workstreams from Markdown files under:

```txt
~/.ai-work-status/
```

Each workstream card should include an action button to open the associated repo in VS Code.
