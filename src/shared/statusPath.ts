import crypto from "node:crypto";
import path from "node:path";
import { getStatusReposDir } from "./paths";
import type { RepoInfo, StatusPathInfo } from "./types";

export const slug = (value: string) =>
  value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unnamed";

const hash = (value: string) => crypto.createHash("sha1").update(value).digest("hex").slice(0, 10);

export const computeStatusPath = (repoInfo: RepoInfo): StatusPathInfo => {
  const repoKey = `${slug(repoInfo.repoName)}--${hash(repoInfo.repoIdSource)}`;
  const branchKey = slug(repoInfo.branch);
  const workstreamId = `${slug(repoInfo.repoName)}__${branchKey}`;
  const statusFilePath = path.join(getStatusReposDir(), repoKey, "branches", `${branchKey}.json`);

  return {
    repoKey,
    branchKey,
    workstreamId,
    statusFilePath,
  };
};
