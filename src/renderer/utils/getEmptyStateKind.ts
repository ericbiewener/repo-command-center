import type { Workstream } from "../../shared/types";

export type EmptyStateKind = "no-files" | "done-hidden" | "no-matches";

type GetEmptyStateKindOptions = {
  workstreams: Workstream[];
  query: string;
  showDone: boolean;
};

export const getEmptyStateKind = ({ workstreams, query, showDone }: GetEmptyStateKindOptions) =>
  workstreams.length === 0
    ? "no-files"
    : query.trim()
      ? "no-matches"
      : !showDone && workstreams.every((workstream) => workstream.status === "done")
        ? "done-hidden"
        : "no-matches";
