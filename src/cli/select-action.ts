#!/usr/bin/env node
import assert from "node:assert";
import { execa } from "execa";

const repoPath = process.env.WORK_STATUS_REPO_PATH;
const branch = process.env.WORK_STATUS_BRANCH;

assert(repoPath, "WORK_STATUS_REPO_PATH not set");
assert(branch, "WORK_STATUS_BRANCH not set");

const { stdout } = await execa("git", ["-C", repoPath, "worktree", "list", "--porcelain"]);

const worktreePath = (() => {
  let currentPath = "";
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) currentPath = line.slice(9);
    else if (line === `branch refs/heads/${branch}`) return currentPath;
  }
  return null;
})();

const targetPath = worktreePath ?? repoPath;
if (!worktreePath) {
  await execa("git", ["checkout", branch], { cwd: repoPath, stdio: "inherit" });
}

process.stdout.write(`cd ${targetPath}`);
