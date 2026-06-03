import type { Workstream } from "../../shared/types";

export type WorkstreamBranchGroup = {
  branch: string;
  items: Workstream[];
};

export type WorkstreamRepoGroup = {
  repoKey: string;
  repoName: string;
  items: Workstream[];
  branches: WorkstreamBranchGroup[];
};

const createIndexes = () => Object.create(null) as Record<string, number>;

const getRepoGroupKey = (workstream: Workstream) =>
  workstream.repoRemote
    ? `remote:${workstream.repoRemote}`
    : workstream.repoName
      ? `repo-name:${workstream.repoName.toLowerCase()}`
      : `status-file:${workstream.statusFilePath}`;

const getRepoLabel = (workstream: Workstream) => workstream.repoName || "Unknown repo";

const getBranchLabel = (workstream: Workstream) => workstream.branch || "Unknown branch";

export const groupWorkstreams = (workstreams: Workstream[]) => {
  const repoIndexes = createIndexes();
  const branchIndexesByRepo: Record<string, Record<string, number>> = Object.create(null);
  const repos: WorkstreamRepoGroup[] = [];

  workstreams.forEach((workstream) => {
    const repoKey = getRepoGroupKey(workstream);
    const repoIndex = Object.hasOwn(repoIndexes, repoKey)
      ? repoIndexes[repoKey]
      : repos.push({
          repoKey,
          repoName: getRepoLabel(workstream),
          items: [],
          branches: [],
        }) - 1;
    const repo = repos[repoIndex];
    const branchIndexes = branchIndexesByRepo[repoKey] ?? createIndexes();
    const branch = getBranchLabel(workstream);
    const branchIndex = Object.hasOwn(branchIndexes, branch)
      ? branchIndexes[branch]
      : repo.branches.push({ branch, items: [] }) - 1;

    repoIndexes[repoKey] = repoIndex;
    branchIndexesByRepo[repoKey] = branchIndexes;
    branchIndexes[branch] = branchIndex;
    repo.items.push(workstream);
    repo.branches[branchIndex].items.push(workstream);
  });

  return repos;
};
