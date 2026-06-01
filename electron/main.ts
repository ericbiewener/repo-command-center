import { app, type BrowserWindow, globalShortcut, type Tray } from "electron";
import { getStatusBaseDir } from "../src/shared/paths";
import type { ServerInfo } from "../src/shared/types";
import { registerIpc } from "./ipc";
import { startLocalApiServer } from "./localApiServer";
import { createTray } from "./tray";
import { createDashboardWindow } from "./window";

let dashboardWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let shortcutRegistered = false;
let localApiInfo: ServerInfo | null = null;
let closeLocalApi: (() => Promise<void>) | null = null;

const refreshWorkstreams = () => {
  dashboardWindow?.webContents.send("workstreams:updated");
};

const showDashboard = () => {
  dashboardWindow?.show();
  dashboardWindow?.focus();
  dashboardWindow?.webContents.send("dashboard:shown");
};

const createAndShowDashboard = () => {
  dashboardWindow = createDashboardWindow();
  showDashboard();
};

const toggleDashboard = () => {
  dashboardWindow?.isVisible() ? dashboardWindow.hide() : showDashboard();
};

const getAppInfo = () => ({
  shortcutRegistered,
  statusRoot: getStatusBaseDir(),
  localApi: localApiInfo
    ? {
        running: true,
        port: localApiInfo.port,
      }
    : {
        running: false,
      },
});

app.whenReady().then(async () => {
  app.dock?.hide();

  dashboardWindow = createDashboardWindow();
  tray = createTray(toggleDashboard, refreshWorkstreams);
  shortcutRegistered = globalShortcut.register("CommandOrControl+Alt+Space", toggleDashboard);

  if (!shortcutRegistered) {
    console.warn("Could not register global shortcut CommandOrControl+Alt+Space.");
  }

  registerIpc({
    getAppInfo,
    hideWindow: () => dashboardWindow?.hide(),
  });

  await startLocalApiServer(refreshWorkstreams)
    .then((server) => {
      localApiInfo = server.info;
      closeLocalApi = server.close;
    })
    .catch((error: unknown) => {
      console.error("Could not start local API server.", error);
    });
});

app.on("activate", () => {
  dashboardWindow ? showDashboard() : createAndShowDashboard();
});

app.on("window-all-closed", () => undefined);

app.on("before-quit", () => {
  dashboardWindow?.removeAllListeners("close");
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
  void closeLocalApi?.();
});
