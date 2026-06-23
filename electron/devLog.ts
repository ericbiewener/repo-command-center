import type { ExecFileOptions, SpawnOptions } from "node:child_process";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { WebContents } from "electron";

const _execFileAsync = promisify(execFile);

let _wc: WebContents | null = null;

export const initDevLog = (wc: WebContents) => {
  _wc = wc;
};

export type DevLogEntry =
  | { type: "exec"; cmd: string; args: string[]; stdout: string; stderr: string }
  | { type: "exec:error"; cmd: string; args: string[]; error: string }
  | { type: "spawn"; cmd: string; args: string[] }
  | {
      type: "spawn:done";
      cmd: string;
      args: string[];
      stdout: string;
      stderr: string;
      exitCode: number | null;
    };

const sendLog = (entry: DevLogEntry) => _wc?.send("dev:log", entry);

export const loggedExecFileAsync = async (
  cmd: string,
  args: string[],
  opts?: ExecFileOptions,
): Promise<{ stdout: string; stderr: string }> => {
  try {
    const result = (await _execFileAsync(cmd, args, opts)) as { stdout: string; stderr: string };
    sendLog({
      type: "exec",
      cmd,
      args,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    });
    return result;
  } catch (err) {
    sendLog({ type: "exec:error", cmd, args, error: String(err) });
    throw err;
  }
};

export const logSpawn = (cmd: string, args: string[]) => sendLog({ type: "spawn", cmd, args });

export const loggedSpawn = (cmd: string, args: string[], opts?: Omit<SpawnOptions, "stdio">) => {
  sendLog({ type: "spawn", cmd, args });
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
  child.once("close", (code) =>
    sendLog({
      type: "spawn:done",
      cmd,
      args,
      stdout: Buffer.concat(stdoutChunks).toString().trim(),
      stderr: Buffer.concat(stderrChunks).toString().trim(),
      exitCode: code,
    }),
  );
  return child;
};
