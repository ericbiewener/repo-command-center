import path from "node:path";
import { BrowserWindow } from "electron";

export const createDashboardWindow = () => {
  const window = new BrowserWindow({
    width: 520,
    height: 720,
    minWidth: 420,
    minHeight: 520,
    show: false,
    frame: true,
    resizable: true,
    alwaysOnTop: true,
    title: "AI Workstreams",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.on("close", (event) => {
    if (!window.isDestroyed()) {
      event.preventDefault();
      window.hide();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
};
