# AI Workstream Status Instructions

Before stopping work, update the AI workstream status.

Do not manually write status files.

Use the `ai-work-status` CLI.

## Basic command

From inside the repository, run:

```bash
ai-work-status update \
  --repo . \
  --agent claude \
  --title "Short task title" \
  --summary "One-line current state, including important changes and checks run." \
  --nextRecommendedAction "Give Eric one specific next action."
```

For Codex, use:

```bash
ai-work-status update \
  --repo . \
  --agent codex \
  --title "Short task title" \
  --summary "One-line current state, including important changes and checks run." \
  --nextRecommendedAction "Give Eric one specific next action."
```

## Good status update rules

Keep the update concise but sufficient for Eric to resume work later.

Always include:

- A short task title
- A one-line summary of the current state
- One specific next recommended action

The most important flag is:

```txt
--nextRecommendedAction
```

Make it specific and action-oriented.

## Do not do this

Do not write directly to:

```txt
~/.ai-work-status/
```

Do not create status files inside the repository.

Do not create `.local/status.md`.

Do not manually construct status JSON.

The CLI and app handle canonical storage.
