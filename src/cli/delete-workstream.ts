#!/usr/bin/env node
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  WorkstreamBranchGroup,
  WorkstreamRepoGroup,
} from "../renderer/utils/groupWorkstreams";
import { groupWorkstreams } from "../renderer/utils/groupWorkstreams";
import { listWorkstreams } from "../shared/readStatusFiles";
import type { Workstream } from "../shared/types";
import { yargsInit } from "./yargs";

type BranchRow = { group: WorkstreamRepoGroup; branch: WorkstreamBranchGroup };

const { repoPath, repo, branch } = yargsInit({
  repoPath: {
    type: "string",
    description: "Repo directory path — deletes all workstreams for this repo",
  },
  repo: { type: "string", description: "Repo directory path (use with --branch)" },
  branch: { type: "string", description: "Branch name (use with --repo)" },
})
  .check((argv) => {
    if (argv.repoPath) return true;
    if (argv.repo && argv.branch) return true;
    throw new Error("Provide either --repoPath or both --repo and --branch");
  })
  .strictOptions()
  .parseSync();

const deleteWorkstreamFiles = async (items: Workstream[]) => {
  await Promise.all(items.map((w) => fs.unlink(w.statusFilePath)));
  const branchesDirs = [...new Set(items.map((w) => path.dirname(w.statusFilePath)))];
  await Promise.all(
    branchesDirs.map(async (branchesDir) => {
      const remaining = await fs.readdir(branchesDir).catch(() => []);
      if (!remaining.some((f) => f.endsWith(".json"))) {
        await fs.rm(path.dirname(branchesDir), { recursive: true });
      }
    }),
  );
};

const allWorkstreams = await listWorkstreams();
const groups = groupWorkstreams(allWorkstreams);

let rows: BranchRow[];
if (repoPath) {
  const resolved = path.resolve(repoPath);
  rows = groups.flatMap((group) =>
    group.branches
      .filter((b) => b.items.some((w) => path.resolve(w.repoPath) === resolved))
      .map((b) => ({ group, branch: b })),
  );
} else {
  assert(repo && branch);
  const resolvedRepo = path.resolve(repo);
  rows = groups.flatMap((group) =>
    group.branches
      .filter(
        (b) =>
          b.branch === branch && b.items.some((w) => path.resolve(w.repoPath) === resolvedRepo),
      )
      .map((b) => ({ group, branch: b })),
  );
}

if (rows.length === 0) {
  const descriptor = repoPath ? `repoPath: ${repoPath}` : `repo: ${repo}, branch: ${branch}`;
  process.stderr.write(`No workstreams found matching ${descriptor}\n`);
  process.exit(1);
}

await Promise.all(rows.map((row) => deleteWorkstreamFiles(row.branch.items)));
const deleted = rows.map((r) => `${r.group.repoName} / ${r.branch.branch}`).join(", ");
process.stdout.write(`Deleted ${deleted}\n`);
