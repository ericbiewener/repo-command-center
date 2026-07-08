import type { DashboardFocusRequest, Workstream, WorkstreamSelectionRequest } from "./types";

const selectorKeys = ["statusFilePath", "workstreamId", "repoPath", "branch"] as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isWorkstreamSelectionRequest = (
  value: unknown,
): value is WorkstreamSelectionRequest => {
  const selector = value && typeof value === "object" ? (value as Record<string, unknown>) : null;

  return selector
    ? selectorKeys.some((key) => isNonEmptyString(selector[key])) &&
        selectorKeys.every((key) => selector[key] === undefined || isNonEmptyString(selector[key]))
    : false;
};

export const parseDashboardFocusRequest = (value: unknown): DashboardFocusRequest => {
  const request = value && typeof value === "object" ? (value as Record<string, unknown>) : null;

  return isWorkstreamSelectionRequest(request?.selectWorkstream)
    ? { selectWorkstream: request.selectWorkstream }
    : {};
};

const matchesSelector = (workstream: Workstream, selector: WorkstreamSelectionRequest) =>
  (!selector.statusFilePath || workstream.statusFilePath === selector.statusFilePath) &&
  (!selector.workstreamId || workstream.id === selector.workstreamId) &&
  (!selector.repoPath || workstream.repoPath === selector.repoPath) &&
  (!selector.branch || workstream.branch === selector.branch);

export const resolveSelectedStatusFilePath = (
  workstreams: Workstream[],
  request: DashboardFocusRequest | null | undefined,
) => {
  const selector = request?.selectWorkstream;

  return selector
    ? (workstreams.find((workstream) => matchesSelector(workstream, selector))?.statusFilePath ??
        null)
    : null;
};
