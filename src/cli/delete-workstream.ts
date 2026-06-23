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

const deleteArg = process.argv[2];
assert(deleteArg, "Usage: delete-workstream <path-or-branch>");

type BranchRow = { group: WorkstreamRepoGroup; branch: WorkstreamBranchGroup };

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

const resolvedArg = path.resolve(deleteArg);
const isDir = await fs
  .stat(resolvedArg)
  .then((s) => s.isDirectory())
  .catch(() => false);

let rows: BranchRow[];
if (isDir) {
  rows = groups.flatMap((group) =>
    group.branches
      .filter((b) => b.items.some((w) => path.resolve(w.repoPath) === resolvedArg))
      .map((branch) => ({ group, branch })),
  );
} else {
  rows = groups.flatMap((group) =>
    group.branches.filter((b) => b.branch === deleteArg).map((branch) => ({ group, branch })),
  );
}

if (rows.length === 0) {
  process.stderr.write(`No workstreams found matching: ${deleteArg}\n`);
  process.exit(1);
}

if (rows.length > 1) {
  process.stderr.write(
    `Multiple workstreams match "${deleteArg}":\n${rows.map((r) => `  ${r.group.repoName} / ${r.branch.branch}`).join("\n")}\n`,
  );
  process.exit(1);
}

const row = rows[0];
assert(row);
await deleteWorkstreamFiles(row.branch.items);
process.stderr.write(`Deleted ${row.group.repoName} / ${row.branch.branch}\n`);
