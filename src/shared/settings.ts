import fs from "node:fs/promises";
import { getSettingsPath } from "./paths.js";

export type Settings = {
  action?: string;
  deleteAction?: string;
  multiline?: boolean;
  worktreeCreateCommand?: string;
  claudeCommand?: string;
  codexCommand?: string;
  notificationClickCommand?: string;
  prPollIntervalSeconds?: number;
  customActions?: ReadonlyArray<{ title: string; icon?: string; command: string }>;
  windowMode?: "menubar" | "dock";
};

export type ResolvedCustomAction = { title: string; iconDataUri?: string; command: string };

export const readSettings = async () => {
  try {
    const raw = await fs.readFile(getSettingsPath(), "utf8");
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
};
