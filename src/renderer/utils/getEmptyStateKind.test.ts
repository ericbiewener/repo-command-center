import { describe, expect, test } from "vitest";
import type { Workstream } from "../../shared/types";
import { getEmptyStateKind } from "./getEmptyStateKind";

const makeWorkstream = (status: Workstream["status"], id = status) =>
  ({
    id,
    repoName: "command-center",
    repoPath: "/repo",
    repoRemote: "git@github.com:example/command-center.git",
    branch: "main",
    agent: "codex",
    status,
    rawStatus: status,
    updatedAt: "2026-06-03T16:48:22.866Z",
    updatedAtEpoch: 1_780_506_502_866,
    statusFilePath: `/status/${id}.json`,
    markdownBody: "## Current goal\n\nFix it.",
    isValid: true,
    validationErrors: [],
  }) satisfies Workstream;

describe("getEmptyStateKind", () => {
  test("reports no files when there are no workstreams", () => {
    expect(getEmptyStateKind({ workstreams: [], query: "", showDone: false })).toBe("no-files");
  });

  test("reports hidden done workstreams when completed files are filtered out", () => {
    expect(
      getEmptyStateKind({
        workstreams: [makeWorkstream("done")],
        query: "",
        showDone: false,
      }),
    ).toBe("done-hidden");
  });

  test("reports no matches when search text filters out existing workstreams", () => {
    expect(
      getEmptyStateKind({
        workstreams: [makeWorkstream("done")],
        query: "missing",
        showDone: false,
      }),
    ).toBe("no-matches");
  });
});
