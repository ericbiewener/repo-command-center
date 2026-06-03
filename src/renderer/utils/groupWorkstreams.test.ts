import { describe, expect, test } from "vitest";
import type { Workstream } from "../../shared/types";
import { groupWorkstreams } from "./groupWorkstreams";

const makeWorkstream = (overrides: Partial<Workstream> = {}) =>
  ({
    id: "command-center__main",
    repoName: "command-center",
    repoPath: "/Users/eric/code/command-center",
    repoRemote: "git@github.com:example/command-center.git",
    branch: "main",
    agent: "codex",
    status: "running",
    rawStatus: "running",
    updatedAt: "2026-06-03T16:48:22.866Z",
    updatedAtEpoch: 1_780_506_502_866,
    statusFilePath:
      "/Users/eric/.ai-work-status/repos/command-center--aaaaaaaaaa/branches/main.json",
    markdownBody: "## Current goal\n\nFix it.",
    isValid: true,
    validationErrors: [],
    ...overrides,
  }) satisfies Workstream;

describe("groupWorkstreams", () => {
  test("groups by repo remote before branch instead of worktree path", () => {
    const groups = groupWorkstreams([
      makeWorkstream(),
      makeWorkstream({
        id: "command-center__feature",
        repoName: "command-center-feature",
        repoPath: "/Users/eric/code/command-center-feature",
        branch: "feature",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/command-center-feature--bbbbbbbbbb/branches/feature.json",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[0]?.branches.map((group) => group.branch)).toEqual(["main", "feature"]);
  });

  test("keeps workstreams with the same repo and branch together", () => {
    const groups = groupWorkstreams([
      makeWorkstream(),
      makeWorkstream({
        id: "command-center-copy__main",
        repoName: "command-center-copy",
        repoPath: "/Users/eric/code/command-center-copy",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/command-center-copy--bbbbbbbbbb/branches/main.json",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.branches).toHaveLength(1);
    expect(groups[0]?.branches[0]?.items).toHaveLength(2);
  });

  test("groups repos without remotes by repo name", () => {
    const groups = groupWorkstreams([
      makeWorkstream({
        repoRemote: "",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/command-center--aaaaaaaaaa/branches/main.json",
      }),
      makeWorkstream({
        id: "command-center-copy__main",
        repoPath: "/Users/eric/code/command-center-copy",
        repoRemote: "",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/command-center-copy--aaaaaaaaaa/branches/main.json",
      }),
    ]);

    expect(groups).toHaveLength(1);
  });
});
