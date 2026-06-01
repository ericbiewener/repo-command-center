import assert from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";

const spawnDetached = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });

export const openInVSCode = async (repoPath: string) => {
  assert(fs.existsSync(repoPath), `Repository path does not exist: ${repoPath}`);

  const codeResult = await spawnDetached("code", [repoPath])
    .then(() => true)
    .catch(() => false);

  if (codeResult) {
    return;
  }

  const openResult = await spawnDetached("open", ["-a", "Visual Studio Code", repoPath])
    .then(() => true)
    .catch(() => false);

  assert(
    openResult,
    "Could not open VS Code. Make sure the `code` command is installed and available on PATH.",
  );
};
