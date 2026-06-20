import type { ResolvedCustomAction } from "../shared/settings";
import type { AppInfo, Workstream } from "../shared/types";

declare global {
  interface Window {
    appApi: {
      listWorkstreams: () => Promise<Workstream[]>;
      openInVSCode: (repoPath: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      getAppInfo: () => Promise<AppInfo>;
      hideWindow: () => Promise<{ ok: true }>;
      getCustomActions: () => Promise<ResolvedCustomAction[]>;
      openExternal: (url: string) => Promise<void>;
      executeCustomAction: (
        actionIndex: number,
        repoPath: string,
      ) => Promise<{ ok: true } | { ok: false; error: string }>;
      createWorktree: (params: {
        repoPath: string;
        branch: string;
        prompt?: string;
        agent?: "claude" | "codex";
      }) => Promise<{ ok: true } | { ok: false; error: string }>;
      onWorkstreamsUpdated: (callback: () => void) => () => void;
      onDashboardShown: (callback: () => void) => () => void;
      refreshPrStatus: () => Promise<{ ok: true }>;
    };
  }
}
