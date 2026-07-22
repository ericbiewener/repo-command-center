import type { ResolvedCustomAction } from "../shared/settings";
import type {
  AppInfo,
  DashboardFocusRequest,
  Workstream,
  WorkstreamGitInfo,
} from "../shared/types";

declare global {
  interface Window {
    appApi: {
      listWorkstreams: (gitInfoCache?: Record<string, WorkstreamGitInfo>) => Promise<Workstream[]>;
      getAppInfo: () => Promise<AppInfo>;
      hideWindow: () => Promise<{ ok: true }>;
      getCustomActions: () => Promise<ResolvedCustomAction[]>;
      openExternal: (url: string) => Promise<void>;
      executeCustomAction: (
        actionIndex: number,
        repoPath: string,
        branch: string,
      ) => Promise<{ ok: true } | { ok: false; error: string }>;
      executeAction: (
        repoPath: string,
        branch: string,
      ) => Promise<{ ok: true } | { ok: false; error: string }>;
      executeDeleteAction: (
        repoPath: string,
        branch: string,
      ) => Promise<{ ok: true } | { ok: false; error: string }>;
      executeDeleteActionSecondary: (
        repoPath: string,
        branch: string,
      ) => Promise<{ ok: true } | { ok: false; error: string }>;
      createWorktree: (params: {
        repoPath: string;
        branch: string;
        prompt?: string;
        agent?: "claude" | "codex";
      }) => Promise<{ ok: true } | { ok: false; error: string }>;
      onWorkstreamsUpdated: (callback: () => void) => () => void;
      onDashboardShown: (callback: () => void) => () => void;
      onFocusRequested: (callback: (request: DashboardFocusRequest) => void) => () => void;
      onDevLog: (callback: (entry: unknown) => void) => () => void;
      refreshPrStatus: () => Promise<{ ok: true }>;
    };
  }
}
