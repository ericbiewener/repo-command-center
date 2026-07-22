import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { RepoInfo, WorkstreamGitInfo } from "./types";

const execFileAsync = promisify(execFile);

const git = async (args: string[], cwd: string) => {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
};

const tryGit = async (args: string[], cwd: string) => git(args, cwd).catch(() => "");

const splitNullDelimited = (value: string) => value.split("\0").filter(Boolean);

const getPathModifiedAtEpoch = async (repoPath: string, relativePath: string) => {
  const resolvedRepoPath = path.resolve(repoPath);
  const resolvedPath = path.resolve(resolvedRepoPath, relativePath);
  const isInsideRepo =
    resolvedPath === resolvedRepoPath ||
    !path.relative(resolvedRepoPath, resolvedPath).startsWith("..");

  if (!isInsideRepo) return 0;

  const statNearestExistingPath = async (candidatePath: string): Promise<number> =>
    fs
      .lstat(candidatePath)
      .then((stats) => stats.mtimeMs)
      .catch(() =>
        candidatePath === resolvedRepoPath
          ? 0
          : statNearestExistingPath(path.dirname(candidatePath)),
      );

  return statNearestExistingPath(resolvedPath);
};

export const getWorkstreamGitInfo = async (repoPath: string): Promise<WorkstreamGitInfo> => {
  if (!repoPath.trim()) return { gitStatus: null, modifiedAtEpoch: null };

  try {
    const [porcelain, headTimestamp, changedPaths, untrackedPaths] = await Promise.all([
      git(["status", "--porcelain"], repoPath),
      tryGit(["log", "-1", "--format=%ct"], repoPath),
      tryGit(["diff", "--name-only", "-z", "HEAD"], repoPath),
      tryGit(["ls-files", "--others", "--exclude-standard", "-z"], repoPath),
    ]);
    const uncommittedCount = porcelain ? porcelain.split("\n").filter(Boolean).length : 0;
    const workingTreePaths = [
      ...splitNullDelimited(changedPaths),
      ...splitNullDelimited(untrackedPaths),
    ];
    const workingTreeModifiedAtEpoch = Math.max(
      0,
      ...(await Promise.all(
        workingTreePaths.map((filePath) => getPathModifiedAtEpoch(repoPath, filePath)),
      )),
    );
    const parsedHeadTimestamp = Number.parseInt(headTimestamp, 10);
    const headModifiedAtEpoch = Number.isNaN(parsedHeadTimestamp) ? 0 : parsedHeadTimestamp * 1_000;

    let unpushedCount: number | null = null;
    try {
      const revListOut = await git(["rev-list", "@{u}..HEAD", "--count"], repoPath);
      const parsed = Number.parseInt(revListOut, 10);
      unpushedCount = Number.isNaN(parsed) ? null : parsed;
    } catch {
      // No upstream configured — expected for new worktree branches
    }

    return {
      gitStatus: { uncommittedCount, unpushedCount },
      modifiedAtEpoch: Math.max(headModifiedAtEpoch, workingTreeModifiedAtEpoch) || null,
    };
  } catch {
    return { gitStatus: null, modifiedAtEpoch: null };
  }
};

export const getWorkstreamGitStatus = async (repoPath: string) =>
  (await getWorkstreamGitInfo(repoPath)).gitStatus;

export const getRepoNameFromRemote = (remote: string) => {
  const withoutGitSuffix = remote
    .trim()
    .replace(/\.git\/?$/, "")
    .replace(/\/+$/, "");
  const remotePath =
    withoutGitSuffix.includes("://") || withoutGitSuffix.startsWith("file:")
      ? (() => {
          try {
            return new URL(withoutGitSuffix).pathname;
          } catch {
            return withoutGitSuffix;
          }
        })()
      : withoutGitSuffix.includes(":")
        ? (withoutGitSuffix.split(":").at(-1) ?? "")
        : withoutGitSuffix;

  return path.basename(remotePath);
};

export const getRepoInfo = async (repoPath: string): Promise<RepoInfo> => {
  const resolvedPath = path.resolve(repoPath);
  const repoRoot = await git(["rev-parse", "--show-toplevel"], resolvedPath);
  assert(repoRoot, `Not a Git repository: ${resolvedPath}`);

  const branchName = await tryGit(["branch", "--show-current"], repoRoot);
  const detachedSha = branchName ? "" : await git(["rev-parse", "--short", "HEAD"], repoRoot);
  const branch = branchName || `detached-${detachedSha}`;
  const remoteOrigin = await tryGit(["config", "--get", "remote.origin.url"], repoRoot);
  const repoName = remoteOrigin ? getRepoNameFromRemote(remoteOrigin) : path.basename(repoRoot);
  const repoIdSource = remoteOrigin || repoRoot;

  return {
    repoRoot,
    repoName,
    branch,
    repoRemote: remoteOrigin,
    repoIdSource,
  };
};
