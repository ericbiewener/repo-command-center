#!/usr/bin/env node
import assert from "node:assert";
import path from "node:path";
import { validateStatusUpdatePayload } from "../shared/statusSchema";
import { writeStatusFile } from "../shared/writeStatusFile";
import { yargsInit } from "./yargs";

const {
  _: positional,
  repo,
  agent,
  title,
  summary,
  nextRecommendedAction,
} = yargsInit({
  repo: { type: "string", description: "Repository path", default: "." },
  agent: { type: "string", description: "Agent kind: claude, codex, or other" },
  title: { type: "string", description: "Display title" },
  summary: { type: "string", description: "One-line summary" },
  nextRecommendedAction: {
    type: "string",
    description: "One specific next action for the user",
  },
})
  .command("update", "Create or update a workstream status file.")
  .demandCommand(1, "Specify a command (e.g. update)")
  .strictOptions()
  .parseSync();

assert(positional[0] === "update", `Unknown command: ${String(positional[0])}`);

const readPayload = () => {
  const payload = {
    repoPath: path.resolve(String(repo ?? process.cwd())),
    agent,
    title,
    summary,
    nextRecommendedAction,
  };

  return validateStatusUpdatePayload(payload);
};

const payload = readPayload();
await writeStatusFile(payload);
