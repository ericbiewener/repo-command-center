import { describe, expect, test } from "vitest";
import { computeStatusPath, slug } from "./statusPath";
import type { RepoInfo } from "./types";

describe("status path", () => {
  test("creates path-safe slugs", () => {
    expect(slug(" ai/dev resource spike ")).toBe("ai-dev-resource-spike");
    expect(slug("")).toBe("unnamed");
  });

  test("computes stable repo and branch path info", () => {
    const repoInfo: RepoInfo = {
      repoRoot: "/Users/eric/code/figma-service",
      repoName: "figma-service",
      branch: "ai/dev-resource-spike",
      repoIdSource: "git@github.com:example/figma-service.git",
    };
    const pathInfo = computeStatusPath(repoInfo);

    expect(pathInfo.repoKey).toMatch(/^figma-service--[a-f0-9]{10}$/);
    expect(pathInfo.branchKey).toBe("ai-dev-resource-spike");
    expect(pathInfo.workstreamId).toBe("figma-service__ai-dev-resource-spike");
    expect(pathInfo.statusFilePath).toContain("/.ai-work-status/repos/figma-service--");
  });
});
