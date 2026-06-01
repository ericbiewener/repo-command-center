import { ipcMain } from "electron";
import { listWorkstreams } from "../src/shared/readStatusFiles";
import type { AppInfo } from "../src/shared/types";
import { openInVSCode } from "./openVSCode";

type IpcOptions = {
  getAppInfo: () => AppInfo;
  hideWindow: () => void;
};

export const registerIpc = (options: IpcOptions) => {
  ipcMain.handle("workstreams:list", () => listWorkstreams());
  ipcMain.handle("vscode:open", async (_event, repoPath: unknown) => {
    if (typeof repoPath !== "string" || !repoPath.trim()) {
      return { ok: false, error: "Missing repository path." };
    }

    return openInVSCode(repoPath)
      .then(() => ({ ok: true as const }))
      .catch((error: unknown) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      }));
  });
  ipcMain.handle("app:info", options.getAppInfo);
  ipcMain.handle("window:hide", () => {
    options.hideWindow();
    return { ok: true };
  });
};
