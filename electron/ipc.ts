import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { ipcMain, shell } from "electron";
import { listWorkstreams } from "../src/shared/readStatusFiles";
import { readSettings } from "../src/shared/settings";
import type { AppInfo, Workstream } from "../src/shared/types";
import { loadIconDataUri } from "./iconCache";
import { openInVSCode } from "./openVSCode";
import type { PrPoller } from "./prPoller";

const execFileAsync = promisify(execFile);

const BRANCH_RE = /^[a-zA-Z0-9._-]+$/;

type AgentHandle = { process: ReturnType<typeof spawn>; branch: string };

type IpcOptions = {
  getAppInfo: () => AppInfo;
  hideWindow: () => void;
  prPoller: PrPoller;
  cachedWorkstreams: { value: Workstream[] };
  onAgentSpawned: (handle: AgentHandle) => void;
};

export const registerIpc = (options: IpcOptions) => {
  ipcMain.handle("workstreams:list", async () => {
    const workstreams = await listWorkstreams();
    options.cachedWorkstreams.value = workstreams;
    return workstreams.map((ws) => ({
      ...ws,
      prInfo: options.prPoller.getCached(ws.id),
    }));
  });

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

  ipcMain.handle("settings:getCustomActions", async () => {
    const settings = await readSettings();
    const actions = settings.customActions ?? [];
    return Promise.all(
      actions.map(async (action) => ({
        title: action.title,
        iconDataUri: action.icon ? ((await loadIconDataUri(action.icon)) ?? undefined) : undefined,
        command: action.command,
      })),
    );
  });

  ipcMain.handle("shell:openExternal", async (_event, url: unknown) => {
    if (typeof url !== "string" || !url.startsWith("https://")) return;
    await shell.openExternal(url);
  });

  ipcMain.handle(
    "customActions:execute",
    async (_event, actionIndex: unknown, repoPath: unknown) => {
      if (typeof actionIndex !== "number" || typeof repoPath !== "string") {
        return { ok: false as const, error: "Invalid arguments." };
      }

      const settings = await readSettings();
      const action = (settings.customActions ?? [])[actionIndex];
      if (!action) return { ok: false as const, error: "Action not found." };

      const [cmd, ...cmdArgs] = action.command.split(/\s+/);
      if (!cmd) return { ok: false as const, error: "Empty command." };

      const child = spawn(cmd, [...cmdArgs, repoPath], { stdio: "ignore" });
      child.unref();
      return { ok: true as const };
    },
  );

  ipcMain.handle("pr:forceRefresh", async () => {
    await options.prPoller.fetchAll(options.cachedWorkstreams.value);
    return { ok: true as const };
  });

  ipcMain.handle(
    "worktree:create",
    async (_event, params: unknown): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (
        typeof params !== "object" ||
        params === null ||
        typeof (params as Record<string, unknown>).repoPath !== "string" ||
        typeof (params as Record<string, unknown>).branch !== "string"
      ) {
        return { ok: false, error: "Invalid parameters." };
      }

      const { repoPath, branch, prompt, agent } = params as {
        repoPath: string;
        branch: string;
        prompt?: string;
        agent?: "claude" | "codex";
      };

      if (!BRANCH_RE.test(branch)) {
        return { ok: false, error: `Invalid branch name: ${branch}` };
      }

      const newWorktreePath = path.join(repoPath, "..", branch);
      const resolvedWorktreePath = path.resolve(newWorktreePath);
      const expectedParent = path.resolve(repoPath, "..");

      if (!resolvedWorktreePath.startsWith(expectedParent)) {
        return { ok: false, error: "Branch name resolves outside expected directory." };
      }

      const settings = await readSettings();
      const worktreeCmd = settings.worktreeCreateCommand;

      try {
        if (worktreeCmd) {
          await new Promise<void>((resolve, reject) => {
            const child = spawn("sh", ["-c", worktreeCmd], {
              cwd: repoPath,
              env: { ...process.env, WORKTREE_PATH: resolvedWorktreePath, BRANCH_NAME: branch },
              stdio: "ignore",
            });
            child.once("close", (code) =>
              code === 0 ? resolve() : reject(new Error(`Exit code ${code}`)),
            );
            child.once("error", reject);
          });
        } else {
          await execFileAsync("git", ["worktree", "add", "-b", branch, resolvedWorktreePath], {
            cwd: repoPath,
          });
        }
      } catch (error: unknown) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      if (prompt) {
        const agentCommand =
          agent === "codex"
            ? (settings.codexCommand ?? "codex")
            : (settings.claudeCommand ?? "claude");
        const [agentCmd, ...agentArgs] = agentCommand.split(/\s+/);
        if (agentCmd) {
          const agentProcess = spawn(agentCmd, [...agentArgs, prompt], {
            cwd: resolvedWorktreePath,
            stdio: "ignore",
          });
          options.onAgentSpawned({ process: agentProcess, branch });
        }
      }

      return { ok: true };
    },
  );
};
