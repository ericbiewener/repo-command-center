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
let lastBlurHideAt = 0;

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL);

const refreshWorkstreams = () => {
  dashboardWindow?.webContents.send("workstreams:updated");
};

const showDashboard = () => {
  dashboardWindow?.show();
  dashboardWindow?.focus();
};

const createAndShowDashboard = () => {
  dashboardWindow = createDashboardWindow({
    onBlurHide: () => {
      lastBlurHideAt = Date.now();
    },
  });
  showDashboard();
};

const toggleDashboard = () => {
  dashboardWindow?.isVisible()
    ? dashboardWindow.hide()
    : Date.now() - lastBlurHideAt > 300
      ? showDashboard()
      : undefined;
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
  if (!isDevelopment) {
    app.dock?.hide();
  }

  dashboardWindow = createDashboardWindow({
    onBlurHide: () => {
      lastBlurHideAt = Date.now();
    },
    showOnReady: isDevelopment,
  });
  tray = createTray(toggleDashboard, refreshWorkstreams);
  shortcutRegistered = globalShortcut.register("CommandOrControl+Alt+Space", showDashboard);

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
      console.log(
        `AI Work Command Center running. Local API: http://127.0.0.1:${server.info.port}`,
      );
      console.log(
        isDevelopment
          ? "Development mode: dashboard opens automatically. Use the tray icon to toggle it or Command+Option+Space to show it."
          : "Use the tray icon to toggle the dashboard or Command+Option+Space to show it.",
      );
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
