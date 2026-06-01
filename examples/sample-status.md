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
