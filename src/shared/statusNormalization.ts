import type { AgentKind, WorkstreamStatus } from "./types";

export const normalizeStatus = (value: unknown): WorkstreamStatus => {
  switch (
    String(value ?? "")
      .trim()
      .toLowerCase()
  ) {
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
};

export const normalizeAgent = (value: unknown): AgentKind => {
  switch (
    String(value ?? "")
      .trim()
      .toLowerCase()
  ) {
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
};
