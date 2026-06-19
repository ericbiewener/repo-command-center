import path from "node:path";
import { describe, expect, test } from "vitest";
import { getRepoNameFromRemote, getWorkstreamGitStatus } from "./gitInfo";

describe("getRepoNameFromRemote", () => {
  test("derives repo names from common remote URL formats", () => {
    expect(getRepoNameFromRemote("git@github.com:example/figma-service.git")).toBe("figma-service");
    expect(getRepoNameFromRemote("https://github.com/example/command-center.git")).toBe(
      "command-center",
    );
    expect(getRepoNameFromRemote("/Users/eric/repos/local.git")).toBe("local");
  });
});

describe("getWorkstreamGitStatus", () => {
  test("returns null for empty repoPath", async () => {
    expect(await getWorkstreamGitStatus("")).toBeNull();
  });

  test("returns null for whitespace-only repoPath", async () => {
    expect(await getWorkstreamGitStatus("   ")).toBeNull();
  });

  test("returns git status object for a valid repo path", async () => {
    const repoRoot = path.resolve(".");
    const result = await getWorkstreamGitStatus(repoRoot);
    expect(result).not.toBeNull();
    expect(typeof result?.uncommittedCount).toBe("number");
    expect(result?.unpushedCount === null || typeof result?.unpushedCount === "number").toBe(true);
  });
});
