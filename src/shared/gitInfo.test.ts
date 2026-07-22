import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { getRepoNameFromRemote, getWorkstreamGitInfo, getWorkstreamGitStatus } from "./gitInfo";

const execFileAsync = promisify(execFile);

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

  test("uses working tree file times when they are newer than the latest commit", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "grove-git-info-test-"));
    const trackedPath = path.join(repoRoot, "tracked.txt");
    const untrackedPath = path.join(repoRoot, "untracked.txt");
    const runGit = (args: string[], env?: NodeJS.ProcessEnv) =>
      execFileAsync("git", args, { cwd: repoRoot, env: { ...process.env, ...env } });

    await runGit(["init"]);
    await fs.writeFile(trackedPath, "original\n", "utf8");
    await runGit(["add", "tracked.txt"]);
    await runGit(
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "Initial"],
      {
        GIT_AUTHOR_DATE: "2020-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2020-01-01T00:00:00Z",
      },
    );
    await fs.writeFile(trackedPath, "changed\n", "utf8");
    await fs.writeFile(untrackedPath, "new\n", "utf8");
    const expectedModifiedAtEpoch = Date.parse("2030-01-02T03:04:05Z");
    await fs.utimes(
      untrackedPath,
      expectedModifiedAtEpoch / 1_000,
      expectedModifiedAtEpoch / 1_000,
    );

    const result = await getWorkstreamGitInfo(repoRoot);

    expect(result.gitStatus?.uncommittedCount).toBe(2);
    expect(result.modifiedAtEpoch).toBe(expectedModifiedAtEpoch);
  });

  test("ignores file times updated by switching branches", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "grove-branch-switch-test-"));
    const trackedPath = path.join(repoRoot, "tracked.txt");
    const runGit = (args: string[], env?: NodeJS.ProcessEnv) =>
      execFileAsync("git", args, { cwd: repoRoot, env: { ...process.env, ...env } });
    const commitEnv = {
      GIT_AUTHOR_DATE: "2020-01-01T00:00:00Z",
      GIT_COMMITTER_DATE: "2020-01-01T00:00:00Z",
    };

    await runGit(["init", "--initial-branch=main"]);
    await fs.writeFile(trackedPath, "main\n", "utf8");
    await runGit(["add", "tracked.txt"]);
    await runGit(
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "Main"],
      commitEnv,
    );
    await runGit(["switch", "-c", "feature"]);
    await fs.writeFile(trackedPath, "feature\n", "utf8");
    await runGit(
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-am", "Feature"],
      commitEnv,
    );
    await runGit(["switch", "main"]);

    const result = await getWorkstreamGitInfo(repoRoot);

    expect((await fs.stat(trackedPath)).mtimeMs).toBeGreaterThan(
      Date.parse(commitEnv.GIT_COMMITTER_DATE),
    );
    expect(result.gitStatus?.uncommittedCount).toBe(0);
    expect(result.modifiedAtEpoch).toBe(Date.parse(commitEnv.GIT_COMMITTER_DATE));
  });
});
