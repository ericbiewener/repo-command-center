import type { Workstream, WorkstreamStatus } from "../../shared/types";

export const statusOrder: WorkstreamStatus[] = [
  "blocked",
  "ready_for_review",
  "running",
  "paused",
  "done",
  "other",
  "invalid",
];

export const statusLabels: Record<WorkstreamStatus, string> = {
  blocked: "Blocked",
  ready_for_review: "Ready for Review",
  running: "Running",
  paused: "Paused",
  done: "Done",
  other: "Other",
  invalid: "Invalid / Needs Fix",
};

export const groupWorkstreams = (workstreams: Workstream[]) =>
  statusOrder
    .map((status) => ({
      status,
      label: statusLabels[status],
      items: workstreams.filter((workstream) => workstream.status === status),
    }))
    .filter((group) => group.items.length > 0);
