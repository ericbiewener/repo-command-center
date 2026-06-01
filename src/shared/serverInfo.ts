import fs from "node:fs/promises";
import { getServerInfoPath, getStatusBaseDir } from "./paths";
import type { ServerInfo } from "./types";

const isServerInfo = (input: unknown): input is ServerInfo => {
  const value = input as Partial<ServerInfo>;

  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.port === "number" &&
    typeof value.token === "string" &&
    typeof value.pid === "number" &&
    typeof value.startedAt === "string"
  );
};

const parseServerInfo = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const readServerInfo = async () => {
  const raw = await fs.readFile(getServerInfoPath(), "utf8").catch(() => "");
  const parsed = raw ? parseServerInfo(raw) : null;

  return isServerInfo(parsed) ? parsed : null;
};

export const writeServerInfo = async (info: ServerInfo) => {
  await fs.mkdir(getStatusBaseDir(), { recursive: true });
  await fs.writeFile(getServerInfoPath(), `${JSON.stringify(info, null, 2)}\n`, "utf8");
};

export const removeServerInfo = async () => {
  await fs.unlink(getServerInfoPath()).catch(() => undefined);
};
