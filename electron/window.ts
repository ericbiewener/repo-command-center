import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, type Rectangle, screen } from "electron";

type DashboardWindowOptions = {
  onBlurHide?: () => void;
  showOnReady?: boolean;
  shouldHideOnBlur?: () => boolean;
  alwaysOnTop?: boolean;
};

type DashboardWindowState = Rectangle & {
  isMaximized: boolean;
};

const defaultWindowBounds = {
  width: 520,
  height: 720,
};

const getWindowStatePath = () => path.join(app.getPath("userData"), "dashboard-window-state.json");

const isFiniteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);

const isDashboardWindowState = (value: unknown): value is DashboardWindowState => {
  const state = value && typeof value === "object" ? (value as Record<string, unknown>) : null;

  return state
    ? isFiniteNumber(state.x) &&
        isFiniteNumber(state.y) &&
        isFiniteNumber(state.width) &&
        isFiniteNumber(state.height) &&
        typeof state.isMaximized === "boolean"
    : false;
};

const readDashboardWindowState = () => {
  try {
    const state = JSON.parse(fs.readFileSync(getWindowStatePath(), "utf8"));

    return isDashboardWindowState(state) ? state : null;
  } catch {
    return null;
  }
};

const writeDashboardWindowState = (state: DashboardWindowState) => {
  try {
    fs.mkdirSync(path.dirname(getWindowStatePath()), { recursive: true });
    fs.writeFileSync(getWindowStatePath(), `${JSON.stringify(state, null, 2)}\n`);
  } catch (error: unknown) {
    console.warn(
      "Could not save dashboard window state.",
      error instanceof Error ? error.message : error,
    );
  }
};

const getRestorableBounds = (state: DashboardWindowState | null) => {
  if (!state) {
    return defaultWindowBounds;
  }

  const bounds = {
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
  };
  const workArea = screen.getDisplayMatching(bounds).workArea;
  const isVisible =
    bounds.x < workArea.x + workArea.width &&
    bounds.x + bounds.width > workArea.x &&
    bounds.y < workArea.y + workArea.height &&
    bounds.y + bounds.height > workArea.y;

  return isVisible ? bounds : defaultWindowBounds;
};

export const createDashboardWindow = (options: DashboardWindowOptions = {}) => {
  const savedState = readDashboardWindowState();
  const window = new BrowserWindow({
    ...getRestorableBounds(savedState),
    minWidth: 420,
    minHeight: 520,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    resizable: true,
    alwaysOnTop: options.alwaysOnTop ?? true,
    title: "AI Workstreams",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const saveWindowState = () => {
    const bounds = window.isMaximized() ? window.getNormalBounds() : window.getBounds();

    writeDashboardWindowState({
      ...bounds,
      isMaximized: window.isMaximized(),
    });
  };

  window.on("close", (event) => {
    if (!window.isDestroyed()) {
      event.preventDefault();
      saveWindowState();
      window.hide();
    }
  });

  window.on("blur", () => {
    if (options.shouldHideOnBlur && !options.shouldHideOnBlur()) return;
    saveWindowState();
    window.hide();
    options.onBlurHide?.();
  });
  window.on("focus", () => window.webContents.send("dashboard:shown"));
  window.on("hide", saveWindowState);
  window.on("move", saveWindowState);
  window.on("resize", saveWindowState);
  window.on("maximize", saveWindowState);
  window.on("unmaximize", saveWindowState);
  window.once("ready-to-show", () => {
    if (savedState?.isMaximized ?? true) {
      window.maximize();
    }

    if (options.showOnReady) {
      window.show();
      window.focus();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
};
