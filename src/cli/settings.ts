import fs from "node:fs/promises";
import { getSettingsPath } from "../shared/paths.js";

export type Settings = {
  action?: string;
  multiline?: boolean;
};

export const readSettings = async (): Promise<Settings> => {
  try {
    const raw = await fs.readFile(getSettingsPath(), "utf8");
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
};
