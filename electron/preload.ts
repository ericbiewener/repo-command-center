import { contextBridge, ipcRenderer } from "electron";
import type { DashboardFocusRequest } from "../src/shared/types";

const invoke = async (channel: string, ...args: unknown[]) => {
  const start = Date.now();
  console.debug("[ipcRenderer.invoke]", channel, args);
  try {
    const result = await ipcRenderer.invoke(channel, ...args);
    console.debug("[ipcRenderer.invoke:success]", channel, { durationMs: Date.now() - start });
    return result;
  } catch (error) {
    console.debug("[ipcRenderer.invoke:error]", channel, {
      durationMs: Date.now() - start,
      error,
    });
    throw error;
  }
};

contextBridge.exposeInMainWorld("appApi", {
  listWorkstreams: (gitStatusCache?: object) => invoke("workstreams:list", gitStatusCache),
  getAppInfo: () => invoke("app:info"),
  hideWindow: () => invoke("window:hide"),
  getCustomActions: () => invoke("settings:getCustomActions"),
  openExternal: (url: string) => invoke("shell:openExternal", url),
  executeCustomAction: (actionIndex: number, repoPath: string, branch: string) =>
    invoke("customActions:execute", actionIndex, repoPath, branch),
  executeAction: (repoPath: string, branch: string) => invoke("action:execute", repoPath, branch),
  executeDeleteAction: (repoPath: string, branch: string) =>
    invoke("deleteAction:execute", repoPath, branch),
  executeDeleteActionSecondary: (repoPath: string, branch: string) =>
    invoke("deleteActionSecondary:execute", repoPath, branch),
  createWorktree: (params: {
    repoPath: string;
    branch: string;
    prompt?: string;
    agent?: "claude" | "codex";
  }) => invoke("worktree:create", params),
  onWorkstreamsUpdated: (callback: () => void) => {
    const listener = () => callback();

    ipcRenderer.on("workstreams:updated", listener);
    return () => ipcRenderer.off("workstreams:updated", listener);
  },
  onDashboardShown: (callback: () => void) => {
    const listener = () => callback();

    ipcRenderer.on("dashboard:shown", listener);
    return () => ipcRenderer.off("dashboard:shown", listener);
  },
  onFocusRequested: (callback: (request: DashboardFocusRequest) => void) => {
    const listener = (_: unknown, request: DashboardFocusRequest) => callback(request);

    ipcRenderer.on("dashboard:focus-requested", listener as Parameters<typeof ipcRenderer.on>[1]);
    return () =>
      ipcRenderer.off(
        "dashboard:focus-requested",
        listener as Parameters<typeof ipcRenderer.off>[1],
      );
  },
  onDevLog: (callback: (entry: unknown) => void) => {
    const listener = (_: unknown, entry: unknown) => callback(entry);

    ipcRenderer.on("dev:log", listener as Parameters<typeof ipcRenderer.on>[1]);
    return () => ipcRenderer.off("dev:log", listener as Parameters<typeof ipcRenderer.off>[1]);
  },
  refreshPrStatus: () => invoke("pr:forceRefresh"),
});
