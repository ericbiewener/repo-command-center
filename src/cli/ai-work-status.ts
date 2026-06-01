#!/usr/bin/env node
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { readServerInfo } from "../shared/serverInfo";
import { formatValidationError, validateStatusUpdatePayload } from "../shared/statusSchema";
import type { StatusUpdatePayload } from "../shared/types";
import { writeStatusFile } from "../shared/writeStatusFile";

type UpdateOptions = {
  repo?: string;
  agent?: string;
  status?: string;
  title?: string;
  summary?: string;
  priority?: string;
  bodyFile?: string;
  json?: boolean;
  direct?: boolean;
};

const readStdin = () =>
  new Promise<string>((resolve, reject) => {
    let input = "";

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
    process.stdin.on("error", reject);

    if (process.stdin.isTTY) {
      resolve("");
    }
  });

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const readPayload = async (options: UpdateOptions) => {
  const rawInput = options.json
    ? await readStdin()
    : options.bodyFile
      ? await fs.readFile(path.resolve(options.bodyFile), "utf8")
      : await readStdin();
  const parsed = options.json ? JSON.parse(rawInput) : {};
  const payload = {
    ...parsed,
    repoPath: path.resolve(String(parsed.repoPath ?? options.repo ?? process.cwd())),
    agent: parsed.agent ?? options.agent,
    status: parsed.status ?? options.status,
    title: parsed.title ?? options.title,
    summary: parsed.summary ?? options.summary,
    priority: parsed.priority ?? options.priority,
    bodyMarkdown: options.json ? parsed.bodyMarkdown : rawInput,
  };

  return validateStatusUpdatePayload(payload);
};

const writeViaApi = async (payload: StatusUpdatePayload) => {
  const serverInfo = await readServerInfo().catch(() => null);

  if (!serverInfo || !isProcessAlive(serverInfo.pid)) {
    return {
      ok: false as const,
      unavailable: true as const,
      error: "Electron app is not running.",
    };
  }

  const response = await fetch(`http://127.0.0.1:${serverInfo.port}/api/status/update`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverInfo.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    json: async () => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  }));

  if (!response.ok && response.status === 400) {
    const body = await response.json();
    assert(false, body.error ?? "Electron API rejected the update.");
  }

  if (!response.ok) {
    return {
      ok: false as const,
      unavailable: true as const,
      error: "Electron API is unavailable.",
    };
  }

  const body = await response.json();
  assert(body.ok, body.error ?? "Electron API rejected the update.");

  return {
    ok: true as const,
    statusFilePath: body.statusFilePath as string,
    workstreamId: body.workstreamId as string,
  };
};

const printSuccess = (prefix: string, statusFilePath: string) => {
  console.log(`${prefix}:\n  ${statusFilePath}`);
};

const runUpdate = async (options: UpdateOptions) => {
  const payload = await readPayload(options);

  if (!options.direct) {
    const apiResult = await writeViaApi(payload);

    if (apiResult.ok) {
      printSuccess("Updated AI work status", apiResult.statusFilePath);
      return;
    }
  }

  const result = await writeStatusFile(payload);
  printSuccess(
    options.direct
      ? "Wrote AI work status directly"
      : "Electron app not available. Wrote status file directly",
    result.statusFilePath,
  );
};

const program = new Command();

program.name("ai-work-status").description("Submit AI workstream status updates.").version("1.0.0");

program
  .command("update")
  .description("Create or update a workstream status file.")
  .option("--repo <path>", "Repository path", ".")
  .option("--agent <agent>", "Agent kind: claude, codex, or other")
  .option("--status <status>", "Status: running, blocked, ready_for_review, paused, or done")
  .option("--title <title>", "Display title")
  .option("--summary <summary>", "One-line summary")
  .option("--priority <priority>", "Priority: low, medium, or high")
  .option("--body-file <path>", "Read Markdown body from a file")
  .option("--json", "Read the full JSON payload from stdin")
  .option("--direct", "Skip the Electron API and write directly")
  .action((options: UpdateOptions) => {
    runUpdate(options).catch((error: unknown) => {
      console.error(`Error: ${formatValidationError(error)}`);
      process.exitCode = 1;
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(`Error: ${formatValidationError(error)}`);
  process.exitCode = 1;
});
