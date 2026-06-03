import assert from "node:assert";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { RepoInfo } from "./types";

const execFileAsync = promisify(execFile);

const git = async (args: string[], cwd: string) => {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
};

const tryGit = async (args: string[], cwd: string) => git(args, cwd).catch(() => "");

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
