import fuzzysort from "fuzzysort";
import type { Workstream } from "../../shared/types";

export const filterWorkstreams = (workstreams: Workstream[], query: string) =>
  query.trim()
    ? fuzzysort
        .go(query, workstreams, { key: ({ repoName, branch }) => `${repoName} ${branch}` })
        .map((result) => result.obj)
    : workstreams;
