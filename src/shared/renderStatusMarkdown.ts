import type { RepoInfo, StatusPathInfo, StatusUpdatePayload } from "./types";

const yamlValue = (value: string) => JSON.stringify(value);

export const renderStatusMarkdown = (args: {
  payload: StatusUpdatePayload;
  repoInfo: RepoInfo;
  pathInfo: StatusPathInfo;
  updatedAt: string;
}) => {
  const frontmatter: Record<string, string | undefined> = {
    workstream_id: args.pathInfo.workstreamId,
    repo_name: args.repoInfo.repoName,
    repo_path: args.repoInfo.repoRoot,
    branch: args.repoInfo.branch,
    agent: args.payload.agent,
    status: args.payload.status,
    updated_at: args.updatedAt,
    title: args.payload.title,
    summary: args.payload.summary,
    priority: args.payload.priority,
  };
  const yaml = Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${yamlValue(value ?? "")}`)
    .join("\n");
  const body = args.payload.bodyMarkdown.trimEnd();

  return `---\n${yaml}\n---\n\n${body}\n`;
};
