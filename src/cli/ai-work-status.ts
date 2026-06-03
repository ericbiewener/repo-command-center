#!/usr/bin/env node
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { validateStatusUpdatePayload } from "../shared/statusSchema";
import { writeStatusFile } from "../shared/writeStatusFile";
import { yargsInit } from "./yargs";

const {
  _: positional,
  repo,
  agent,
  status,
  title,
  summary,
  priority,
  bodyFile,
  json,
} = yargsInit({
  repo: { type: "string", description: "Repository path", default: "." },
  agent: { type: "string", description: "Agent kind: claude, codex, or other" },
  status: {
    type: "string",
    description: "Status: running, blocked, ready_for_review, paused, or done",
  },
  title: { type: "string", description: "Display title" },
  summary: { type: "string", description: "One-line summary" },
  priority: { type: "string", description: "Priority: low, medium, or high" },
  bodyFile: {
    type: "string",
    description: "Read Markdown body from a file",
  },
  json: {
    type: "boolean",
    description: "Read the full JSON payload from stdin",
  },
})
  .command("update", "Create or update a workstream status file.")
  .demandCommand(1, "Specify a command (e.g. update)")
  .parseSync();

assert(positional[0] === "update", `Unknown command: ${String(positional[0])}`);

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

const readPayload = async () => {
  const rawInput = json
    ? await readStdin()
    : bodyFile
      ? await fs.readFile(path.resolve(bodyFile), "utf8")
      : await readStdin();
  const parsed = json ? JSON.parse(rawInput) : {};
  const payload = {
    ...parsed,
    repoPath: path.resolve(String(parsed.repoPath ?? repo ?? process.cwd())),
    agent: parsed.agent ?? agent,
    status: parsed.status ?? status,
    title: parsed.title ?? title,
    summary: parsed.summary ?? summary,
    priority: parsed.priority ?? priority,
    bodyMarkdown: json ? parsed.bodyMarkdown : rawInput,
  };

  return validateStatusUpdatePayload(payload);
};

const payload = await readPayload();
await writeStatusFile(payload);
