export const agentKinds = ["claude", "codex", "other"] as const;

export const generatedStatus = "done" as const;

export type StatusUpdatePayload = {
  repoPath: string;
  agent: (typeof agentKinds)[number];
  title?: string;
  summary?: string;
};

export type RepoInfo = {
  repoRoot: string;
  repoName: string;
  branch: string;
  repoRemote: string;
  repoIdSource: string;
};

export type StatusPathInfo = {
  repoKey: string;
  branchKey: string;
  workstreamId: string;
  statusFilePath: string;
};

export type PersistedStatusRecord = {
  workstreamId: string;
  repoName: string;
  repoPath: string;
  repoRemote: string;
  branch: string;
  agent: StatusUpdatePayload["agent"];
  status: typeof generatedStatus;
  updatedAt: string;
  title?: string;
  summary?: string;
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

export type PrInfo =
  | {
      number: number;
      url: string;
      ciStatus: "passing" | "failing" | "pending" | "error";
      merged: boolean;
    }
  | { fetchError: string };

export type Workstream = {
  id: string;
  title?: string;
  summary?: string;
  repoName: string;
  repoPath: string;
  repoRemote: string;
  branch: string;
  agent: AgentKind;
  status: WorkstreamStatus;
  rawStatus: string;
  updatedAt: string;
  updatedAtEpoch: number | null;
  modifiedAtEpoch: number | null;
  statusFilePath: string;
  isValid: boolean;
  validationErrors: string[];
  gitStatus: { uncommittedCount: number; unpushedCount: number | null } | null;
  prInfo: PrInfo | null;
};

export type WorkstreamGitInfo = Pick<Workstream, "gitStatus" | "modifiedAtEpoch">;

export type WorkstreamSelectionRequest = {
  statusFilePath?: string;
  workstreamId?: string;
  repoPath?: string;
  branch?: string;
};

export type DashboardFocusRequest = {
  selectWorkstream?: WorkstreamSelectionRequest;
};

export type ServerInfo = {
  port: number;
  token: string;
  pid: number;
  startedAt: string;
};

export type AppInfo = {
  statusRoot: string;
  localApi: {
    running: boolean;
    port?: number;
  };
};
