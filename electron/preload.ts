import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appApi", {
  listWorkstreams: () => ipcRenderer.invoke("workstreams:list"),
  openInVSCode: (repoPath: string) => ipcRenderer.invoke("vscode:open", repoPath),
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  hideWindow: () => ipcRenderer.invoke("window:hide"),
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
});
