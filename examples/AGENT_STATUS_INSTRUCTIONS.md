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
```

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

- Current goal
- What changed
- Tests/checks run
- Known issues
- Next recommended action

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
