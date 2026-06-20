import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appApi", {
  listWorkstreams: () => ipcRenderer.invoke("workstreams:list"),
  openInVSCode: (repoPath: string) => ipcRenderer.invoke("vscode:open", repoPath),
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  hideWindow: () => ipcRenderer.invoke("window:hide"),
  getCustomActions: () => ipcRenderer.invoke("settings:getCustomActions"),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  executeCustomAction: (actionIndex: number, repoPath: string) =>
    ipcRenderer.invoke("customActions:execute", actionIndex, repoPath),
  createWorktree: (params: {
    repoPath: string;
    branch: string;
    prompt?: string;
    agent?: "claude" | "codex";
  }) => ipcRenderer.invoke("worktree:create", params),
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
  refreshPrStatus: () => ipcRenderer.invoke("pr:forceRefresh"),
});
