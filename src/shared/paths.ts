import os from "node:os";
import path from "node:path";

export const getStatusBaseDir = () => path.join(os.homedir(), ".ai-work-status");

export const getStatusReposDir = () => path.join(getStatusBaseDir(), "repos");

export const getServerInfoPath = () => path.join(getStatusBaseDir(), "server.json");

export const getSettingsPath = () => path.join(getStatusBaseDir(), "settings.json");
