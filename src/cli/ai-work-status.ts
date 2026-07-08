#!/usr/bin/env node
import assert from "node:assert";
import path from "node:path";
import { getRepoInfo } from "../shared/gitInfo";
import { readServerInfo } from "../shared/serverInfo";
import { validateStatusUpdatePayload } from "../shared/statusSchema";
import type { DashboardFocusRequest } from "../shared/types";
import { writeStatusFile } from "../shared/writeStatusFile";
import { yargsInit } from "./yargs";

const {
  _: positional,
  repo,
  agent,
  title,
  summary,
  branch,
} = yargsInit({
  repo: { type: "string", description: "Repository path", default: "." },
  agent: { type: "string", description: "Agent kind: claude, codex, or other" },
  title: { type: "string", description: "Display title" },
  summary: { type: "string", description: "One-line summary" },
  branch: { type: "string", description: "Branch to select when focusing the dashboard" },
})
  .command("update", "Create or update a workstream status file.")
  .command("focus", "Focus the dashboard and select a workstream.")
  .demandCommand(1, "Specify a command (e.g. update)")
  .strictOptions()
  .parseSync();

const command = String(positional[0] ?? "");

const readPayload = () => {
  const payload = {
    repoPath: path.resolve(String(repo ?? process.cwd())),
    agent,
    title,
    summary,
  };

  return validateStatusUpdatePayload(payload);
};

const focusDashboard = async () => {
  const serverInfo = await readServerInfo();

  assert(serverInfo, "Dashboard is not running.");

  const repoInfo = await getRepoInfo(path.resolve(String(repo ?? process.cwd())));
  const request: DashboardFocusRequest = {
    selectWorkstream: {
      repoPath: repoInfo.repoRoot,
      branch: typeof branch === "string" && branch.trim() ? branch.trim() : repoInfo.branch,
    },
  };

  const response = await fetch(`http://127.0.0.1:${serverInfo.port}/api/dashboard/focus`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverInfo.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json().catch(() => null)) as { error?: string } | null;

  assert(response.ok, body?.error ?? `Dashboard focus request failed with ${response.status}.`);
};

command === "update"
  ? await writeStatusFile(readPayload())
  : command === "focus"
    ? await focusDashboard()
    : assert(false, `Unknown command: ${command}`);
