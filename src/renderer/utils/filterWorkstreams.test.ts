import { describe, expect, test } from "vitest";
import type { Workstream } from "../../shared/types";
import { filterWorkstreams } from "./filterWorkstreams";

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
    modifiedAtEpoch: 1_780_506_502_866,
    statusFilePath:
      "/Users/eric/.ai-work-status/repos/command-center--aaaaaaaaaa/branches/main.json",
    isValid: true,
    validationErrors: [],
    gitStatus: null,
    prInfo: null,
    ...overrides,
  }) satisfies Workstream;

describe("filterWorkstreams", () => {
  test("returns original workstreams when query is blank", () => {
    const workstreams = [makeWorkstream(), makeWorkstream({ branch: "feature/alpha" })];

    expect(filterWorkstreams(workstreams, "")).toBe(workstreams);
    expect(filterWorkstreams(workstreams, "   ")).toBe(workstreams);
  });

  test("fuzzy matches against branch names", () => {
    const workstreams = [
      makeWorkstream({ branch: "feature/command-palette" }),
      makeWorkstream({
        id: "command-center__billing-cleanup",
        branch: "chore/billing-cleanup",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/command-center--aaaaaaaaaa/branches/billing-cleanup.json",
      }),
    ];

    expect(filterWorkstreams(workstreams, "cmd pal")).toEqual([workstreams[0]]);
    expect(filterWorkstreams(workstreams, "bill cln")).toEqual([workstreams[1]]);
  });

  test("fuzzy matches against repo names", () => {
    const workstreams = [
      makeWorkstream({ repoName: "command-center" }),
      makeWorkstream({
        id: "billing-service__main",
        repoName: "billing-service",
        repoPath: "/Users/eric/code/billing-service",
        repoRemote: "git@github.com:example/billing-service.git",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/billing-service--aaaaaaaaaa/branches/main.json",
      }),
    ];

    expect(filterWorkstreams(workstreams, "cmd ctr")).toEqual([workstreams[0]]);
    expect(filterWorkstreams(workstreams, "bill svc")).toEqual([workstreams[1]]);
  });

  test("fuzzy matches across repo and branch together", () => {
    const workstreams = [
      makeWorkstream({
        repoName: "command-center",
        branch: "feature/fuzzy-filter",
      }),
      makeWorkstream({
        id: "billing-service__feature-fuzzy-filter",
        repoName: "billing-service",
        repoPath: "/Users/eric/code/billing-service",
        repoRemote: "git@github.com:example/billing-service.git",
        branch: "feature/fuzzy-filter",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/billing-service--aaaaaaaaaa/branches/feature-fuzzy-filter.json",
      }),
    ];

    expect(filterWorkstreams(workstreams, "command fuzzy")).toEqual([workstreams[0]]);
  });

  test("returns matches in fuzzy rank order", () => {
    const workstreams = [
      makeWorkstream({
        branch: "feat/cmd-center",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/command-center--aaaaaaaaaa/branches/a.json",
      }),
      makeWorkstream({
        id: "command-center__command-center",
        branch: "feature/command-center",
        statusFilePath:
          "/Users/eric/.ai-work-status/repos/command-center--aaaaaaaaaa/branches/b.json",
      }),
    ];

    expect(filterWorkstreams(workstreams, "cmd center")).toEqual([workstreams[0], workstreams[1]]);
  });
});
