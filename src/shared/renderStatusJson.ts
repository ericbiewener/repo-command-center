import type { PersistedStatusRecord, RepoInfo, StatusPathInfo, StatusUpdatePayload } from "./types";

export const buildStatusRecord = (args: {
  payload: StatusUpdatePayload;
  repoInfo: RepoInfo;
  pathInfo: StatusPathInfo;
  updatedAt: string;
}): PersistedStatusRecord => ({
  schema_version: 1,
  workstream_id: args.pathInfo.workstreamId,
  repo_name: args.repoInfo.repoName,
  repo_path: args.repoInfo.repoRoot,
  repo_remote: args.repoInfo.repoRemote,
  branch: args.repoInfo.branch,
  agent: args.payload.agent,
  status: args.payload.status,
  updated_at: args.updatedAt,
  body_markdown: args.payload.bodyMarkdown.trimEnd(),
  ...(args.payload.title ? { title: args.payload.title } : {}),
  ...(args.payload.summary ? { summary: args.payload.summary } : {}),
  ...(args.payload.priority ? { priority: args.payload.priority } : {}),
});

export const renderStatusJson = (args: {
  payload: StatusUpdatePayload;
  repoInfo: RepoInfo;
  pathInfo: StatusPathInfo;
  updatedAt: string;
}) => `${JSON.stringify(buildStatusRecord(args), null, 2)}\n`;
