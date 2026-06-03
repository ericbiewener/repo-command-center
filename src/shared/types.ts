export const agentKinds = ["claude", "codex", "other"] as const;

export const statusUpdateStatuses = [
  "running",
  "blocked",
  "ready_for_review",
  "paused",
  "done",
] as const;

export const priorityLevels = ["low", "medium", "high"] as const;

export type StatusUpdatePayload = {
  repoPath: string;
  agent: (typeof agentKinds)[number];
  status: (typeof statusUpdateStatuses)[number];
  bodyMarkdown: string;
  title?: string;
  summary?: string;
  priority?: (typeof priorityLevels)[number];
};

export type RepoInfo = {
  repoRoot: string;
  repoName: string;
  branch: string;
  repoIdSource: string;
};

export type StatusPathInfo = {
  repoKey: string;
  branchKey: string;
  workstreamId: string;
  statusFilePath: string;
};

export type PersistedStatusRecord = {
  schema_version: 1;
  workstream_id: string;
  repo_name: string;
  repo_path: string;
  branch: string;
  agent: StatusUpdatePayload["agent"];
  status: StatusUpdatePayload["status"];
  updated_at: string;
  body_markdown: string;
  title?: string;
  summary?: string;
  priority?: StatusUpdatePayload["priority"];
};

export type WorkstreamStatus =
  | "running"
  | "blocked"
  | "ready_for_review"
  | "paused"
  | "done"
  | "other"
  | "invalid";

export type AgentKind = "claude" | "codex" | "other" | "unknown";

export type Workstream = {
  id: string;
  title?: string;
  summary?: string;
  repoName: string;
  repoPath: string;
  branch: string;
  agent: AgentKind;
  status: WorkstreamStatus;
  rawStatus: string;
  priority?: "low" | "medium" | "high" | string;
  updatedAt: string;
  updatedAtEpoch: number | null;
  statusFilePath: string;
  markdownBody: string;
  isValid: boolean;
  validationErrors: string[];
};

export type ServerInfo = {
  port: number;
  token: string;
  pid: number;
  startedAt: string;
};

export type AppInfo = {
  shortcutRegistered: boolean;
  statusRoot: string;
  localApi: {
    running: boolean;
    port?: number;
  };
};
