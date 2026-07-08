import { describe, expect, test } from "vitest";
import {
  isWorkstreamSelectionRequest,
  parseDashboardFocusRequest,
  resolveSelectedStatusFilePath,
} from "./dashboardFocus";
import type { Workstream } from "./types";

const makeWorkstream = (overrides: Partial<Workstream>): Workstream => ({
  id: "repo__feature-1",
  repoName: "repo",
  repoPath: "/tmp/repo",
  repoRemote: "git@github.com:example/repo.git",
  branch: "feature-1",
  agent: "codex",
  status: "done",
  rawStatus: "done",
  updatedAt: "2026-06-28T12:00:00.000Z",
  updatedAtEpoch: Date.parse("2026-06-28T12:00:00.000Z"),
  statusFilePath: "/tmp/status/feature-1.json",
  isValid: true,
  validationErrors: [],
  gitStatus: null,
  prInfo: null,
  ...overrides,
});

describe("dashboard focus helpers", () => {
  test("accepts selectors with at least one non-empty field", () => {
    expect(isWorkstreamSelectionRequest({ repoPath: "/tmp/repo", branch: "feature-1" })).toBe(true);
    expect(isWorkstreamSelectionRequest({ repoPath: "   " })).toBe(false);
    expect(isWorkstreamSelectionRequest({ nope: "x" })).toBe(false);
  });

  test("parses focus requests and discards invalid selectors", () => {
    expect(
      parseDashboardFocusRequest({ selectWorkstream: { repoPath: "/tmp/repo", branch: "main" } }),
    ).toEqual({
      selectWorkstream: { repoPath: "/tmp/repo", branch: "main" },
    });
    expect(parseDashboardFocusRequest({ selectWorkstream: { repoPath: "   " } })).toEqual({});
  });

  test("finds the matching workstream by selector", () => {
    const workstreams = [
      makeWorkstream({
        id: "repo__feature-2",
        branch: "feature-2",
        statusFilePath: "/tmp/status/feature-2.json",
      }),
      makeWorkstream({ id: "repo__feature-1", branch: "feature-1" }),
    ];

    expect(
      resolveSelectedStatusFilePath(workstreams, {
        selectWorkstream: { repoPath: "/tmp/repo", branch: "feature-1" },
      }),
    ).toBe("/tmp/status/feature-1.json");
    expect(
      resolveSelectedStatusFilePath(workstreams, {
        selectWorkstream: { repoPath: "/tmp/repo", branch: "missing" },
      }),
    ).toBeNull();
  });
});
