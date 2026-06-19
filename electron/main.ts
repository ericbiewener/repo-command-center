import type { ChildProcess } from "node:child_process";
import { app, type BrowserWindow, globalShortcut, Notification, type Tray } from "electron";
import { getStatusBaseDir } from "../src/shared/paths";
import { readSettings } from "../src/shared/settings";
import type { ServerInfo, Workstream } from "../src/shared/types";
import { registerIpc } from "./ipc";
import { startLocalApiServer } from "./localApiServer";
import { createPrPoller } from "./prPoller";
import { createTray } from "./tray";
import { createDashboardWindow } from "./window";

let dashboardWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let shortcutRegistered = false;
let localApiInfo: ServerInfo | null = null;
let closeLocalApi: (() => Promise<void>) | null = null;
let lastBlurHideAt = 0;
let lastShowAt = 0;

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL);

// Shared mutable reference so the IPC handler and poller stay in sync
const cachedWorkstreams: { value: Workstream[] } = { value: [] };

// Active agent process handles — supports concurrent creates
const activeAgents: Array<{ process: ChildProcess; branch: string }> = [];

const refreshWorkstreams = () => {
  dashboardWindow?.webContents.send("workstreams:updated");
};

const showDashboard = () => {
  lastShowAt = Date.now();
  app.focus({ steal: true });
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

const prPoller = createPrPoller(refreshWorkstreams);

// Leading-edge debounce for dashboard:shown PR/CI refresh
let prRefreshTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedPrRefresh = () => {
  if (prRefreshTimer) return;
  prRefreshTimer = setTimeout(() => {
    prRefreshTimer = null;
    void prPoller.fetchAll(cachedWorkstreams.value);
  }, 2_000);
};

app.whenReady().then(async () => {
  const settings = await readSettings();
  const isDock = settings.windowMode === "dock";

  if (!isDock) {
    app.dock?.hide();
  }

  dashboardWindow = createDashboardWindow({
    alwaysOnTop: !isDock,
    onBlurHide: isDock
      ? undefined
      : () => {
          lastBlurHideAt = Date.now();
        },
    shouldHideOnBlur: isDock ? () => false : () => Date.now() - lastShowAt > 500,
    showOnReady: isDevelopment || isDock,
  });

  // Refresh PR/CI when dashboard is brought to foreground (debounced)
  dashboardWindow.on("focus", debouncedPrRefresh);

  tray = createTray(toggleDashboard, refreshWorkstreams);
  shortcutRegistered = globalShortcut.register("CommandOrControl+Alt+Space", showDashboard);

  if (!shortcutRegistered) {
    console.warn("Could not register global shortcut CommandOrControl+Alt+Space.");
  }

  registerIpc({
    getAppInfo,
    hideWindow: () => dashboardWindow?.hide(),
    prPoller,
    cachedWorkstreams,
    onAgentSpawned: ({ process: agentProcess, branch }) => {
      const handle = { process: agentProcess, branch };
      activeAgents.push(handle);

      agentProcess.once("close", async () => {
        const idx = activeAgents.indexOf(handle);
        if (idx !== -1) activeAgents.splice(idx, 1);

        if (!Notification.isSupported()) return;

        const notification = new Notification({
          title: "Agent done",
          body: `Branch: ${branch}`,
        });

        notification.once("click", () => {
          const clickCmd = readSettings().then((s) => s.notificationClickCommand);
          void clickCmd.then((cmd) => {
            if (cmd) {
              const { spawn } =
                require("node:child_process") as typeof import("node:child_process");
              const child = spawn("sh", ["-c", cmd], { stdio: "ignore" });
              child.once("close", (code: number | null) => {
                if (code !== 0) showDashboard();
              });
              child.once("error", () => showDashboard());
              child.unref();
            } else {
              showDashboard();
            }
          });
        });

        notification.show();
      });
    },
  });

  // Start PR/CI polling after settings are loaded; delay first tick until workstreams are cached
  const pollIntervalMs = (settings.prPollIntervalSeconds ?? 60) * 1_000;
  const stopPolling = prPoller.startPolling(() => cachedWorkstreams.value, pollIntervalMs);

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

  return stopPolling;
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
