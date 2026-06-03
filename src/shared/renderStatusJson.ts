import {
  generatedStatus,
  type PersistedStatusRecord,
  type RepoInfo,
  type StatusPathInfo,
  type StatusUpdatePayload,
} from "./types";

export const buildStatusRecord = (args: {
  payload: StatusUpdatePayload;
  repoInfo: RepoInfo;
  pathInfo: StatusPathInfo;
  updatedAt: string;
}): PersistedStatusRecord => ({
  workstreamId: args.pathInfo.workstreamId,
  repoName: args.repoInfo.repoName,
  repoPath: args.repoInfo.repoRoot,
  repoRemote: args.repoInfo.repoRemote,
  branch: args.repoInfo.branch,
  agent: args.payload.agent,
  status: generatedStatus,
  updatedAt: args.updatedAt,
  ...(args.payload.title ? { title: args.payload.title } : {}),
  ...(args.payload.summary ? { summary: args.payload.summary } : {}),
  nextRecommendedAction: args.payload.nextRecommendedAction,
});

export const renderStatusJson = (args: {
  payload: StatusUpdatePayload;
  repoInfo: RepoInfo;
  pathInfo: StatusPathInfo;
  updatedAt: string;
}) => `${JSON.stringify(buildStatusRecord(args), null, 2)}\n`;
