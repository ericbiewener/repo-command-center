import type { AppInfo, Workstream } from "../shared/types";

declare global {
  interface Window {
    appApi: {
      listWorkstreams: () => Promise<Workstream[]>;
      openInVSCode: (repoPath: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      getAppInfo: () => Promise<AppInfo>;
      hideWindow: () => Promise<{ ok: true }>;
      onWorkstreamsUpdated: (callback: () => void) => () => void;
      onDashboardShown: (callback: () => void) => () => void;
    };
  }
}
