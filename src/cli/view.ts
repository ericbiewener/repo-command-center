#!/usr/bin/env node
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { isCancel, select } from "@clack/prompts";
import { execa } from "execa";
import pc from "picocolors";
import type {
  WorkstreamBranchGroup,
  WorkstreamRepoGroup,
} from "../renderer/utils/groupWorkstreams";
import { groupWorkstreams } from "../renderer/utils/groupWorkstreams";
import { listWorkstreams } from "../shared/readStatusFiles";
import type { AgentKind, Workstream, WorkstreamStatus } from "../shared/types";
import { readSettings } from "./settings";
import { yargsInit } from "./yargs";

const CLEAR = "\x1b[2J\x1b[H";

const statusColors: Record<WorkstreamStatus, (s: string) => string> = {
  running: pc.blue,
  blocked: pc.red,
  ready_for_review: pc.green,
  paused: pc.yellow,
  done: pc.dim,
  other: pc.cyan,
  invalid: pc.red,
};

const colorStatus = (status: WorkstreamStatus) => statusColors[status](status.replace(/_/g, " "));

const colorAgent = (agent: AgentKind) =>
  agent === "claude" ? pc.magenta(agent) : agent === "codex" ? pc.cyan(agent) : pc.dim(agent);

const relativeTime = (updatedAt: string) => {
  const epochMs = Date.parse(updatedAt);
  if (Number.isNaN(epochMs)) return "";
  const diffMins = Math.floor((Date.now() - epochMs) / 60_000);
  return diffMins < 60
    ? `${diffMins}m ago`
    : diffMins < 1440
      ? `${Math.floor(diffMins / 60)}h ago`
      : `${Math.floor(diffMins / 1440)}d ago`;
};

const fuzzyMatch = (needle: string, haystack: string) => {
  if (!needle) return true;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  let hi = 0;
  for (const ch of n) {
    while (hi < h.length && h[hi] !== ch) hi++;
    if (hi === h.length) return false;
    hi++;
  }
  return true;
};

const COL_SEP = "    ";

const truncate = (s: string, len: number) =>
  s.length > len ? `${s.slice(0, len - 1)}…` : s.padEnd(len);

const wrapToWidth = (s: string, width: number): string[] => {
  if (!s || width <= 0) return [];
  const lines: string[] = [];
  let remaining = s.trim();
  while (remaining.length > width) {
    let breakAt = remaining.lastIndexOf(" ", width);
    if (breakAt < 1) breakAt = width;
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining) lines.push(remaining);
  return lines;
};

const toEnvKey = (camel: string) => `WORK_STATUS_${camel.replace(/([A-Z])/g, "_$1").toUpperCase()}`;

const buildEnvVars = (workstream: Workstream): Record<string, string> => {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(workstream)) {
    if (value === null || value === undefined || typeof value === "object") continue;
    vars[toEnvKey(key)] = String(value);
  }
  return vars;
};

type BranchRow = { group: WorkstreamRepoGroup; branch: WorkstreamBranchGroup };

const getFilteredRows = (groups: WorkstreamRepoGroup[], filter: string): BranchRow[] =>
  groups.flatMap((group) =>
    group.branches
      .filter((b) => fuzzyMatch(filter, `${group.repoName} ${b.branch}`))
      .map((branch) => ({ group, branch })),
  );

const renderTUI = (
  groups: WorkstreamRepoGroup[],
  filteredRows: BranchRow[],
  cursor: number,
  filter: string,
  multi: boolean,
  deleteMode: boolean,
) => {
  const lines: string[] = [];

  if (deleteMode) {
    lines.push(`  \x1b[41m\x1b[38;2;0;0;0m DELETE MODE \x1b[0m`);
    lines.push("");
  }

  const filteredKeys = new Set(filteredRows.map((r) => `${r.group.repoKey}::${r.branch.branch}`));

  const termWidth = process.stdout.columns || 100;
  const available = termWidth - 2;
  const branchWMax = Math.max(20, Math.min(35, Math.floor(available * 0.28)));
  const branchW = Math.min(
    branchWMax,
    filteredRows.reduce((max, r) => Math.max(max, r.branch.branch.length), 0),
  );
  const titleW = filteredRows.reduce(
    (max, r) => Math.max(max, r.branch.items[0]?.title?.length ?? 0),
    0,
  );

  let rowIdx = 0;
  for (const group of groups) {
    if (!filteredRows.some((r) => r.group.repoKey === group.repoKey)) continue;

    lines.push(`  \x1b[48;5;75m\x1b[1m\x1b[38;2;0;0;0m ${group.repoName} \x1b[0m`);
    lines.push(`  ${pc.dim("─".repeat(available))}`);

    for (const branch of group.branches) {
      if (!filteredKeys.has(`${group.repoKey}::${branch.branch}`)) continue;

      const isSelected = rowIdx === cursor;
      const mostRecent = branch.items[0];
      const prefix = isSelected ? (deleteMode ? pc.red("▶ ") : pc.green("▶ ")) : "  ";

      const branchPadded = truncate(branch.branch, branchW);
      const title = (mostRecent?.title ?? "").padEnd(titleW);
      const summary = mostRecent?.summary ?? "";
      const summaryW = Math.max(0, available - branchW - COL_SEP.length - titleW - COL_SEP.length);

      if (isSelected) {
        const selectedColor = deleteMode ? pc.red : pc.green;
        if (multi) {
          lines.push(`${prefix}${selectedColor(branchPadded)}${COL_SEP}${pc.white(title)}`);
          lines.push("");
          for (const line of wrapToWidth(summary, available)) lines.push(`  ${pc.white(line)}`);
          lines.push("");
        } else {
          lines.push(
            `${prefix}${selectedColor(branchPadded)}${COL_SEP}${pc.white(title)}${COL_SEP}${pc.white(truncate(summary, summaryW))}`,
          );
        }
      } else {
        lines.push(
          `${prefix}${pc.gray(`${branchPadded}${COL_SEP}${title}${COL_SEP}${truncate(summary, summaryW)}`)}`,
        );
      }

      rowIdx++;
    }

    lines.push("");
  }

  if (!filteredRows.length) {
    lines.push(pc.dim("  No matches."));
    lines.push("");
  }

  lines.push(`  ${pc.dim("/")} ${filter}${pc.dim("█")}`);
  lines.push(
    deleteMode
      ? pc.dim("  ↑↓ navigate · enter delete · esc quit")
      : pc.dim("  ↑↓ navigate · enter select · ⌫ delete · ctrl+r refresh · esc quit"),
  );

  process.stdout.write(CLEAR + lines.join("\n") + "\n");
};

type TUIResult =
  | { type: "select"; row: BranchRow; filter: string; cursor: number }
  | { type: "refresh"; filter: string; cursor: number }
  | { type: "delete"; row: BranchRow; filter: string; cursor: number }
  | { type: "quit" };

const runTUI = (
  groups: WorkstreamRepoGroup[],
  initialFilter: string,
  initialCursor: number,
  multi: boolean,
  deleteMode: boolean,
): Promise<TUIResult> => {
  let filter = initialFilter;
  let filteredRows = getFilteredRows(groups, filter);
  let cursor = Math.min(Math.max(0, initialCursor), Math.max(0, filteredRows.length - 1));

  process.stdin.resume();
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  renderTUI(groups, filteredRows, cursor, filter, multi, deleteMode);

  return new Promise<TUIResult>((resolve) => {
    const cleanup = () => {
      process.stdin.off("keypress", onKey);
      process.stdout.off("resize", rerender);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const rerender = () => renderTUI(groups, filteredRows, cursor, filter, multi, deleteMode);

    process.stdout.on("resize", rerender);

    const updateFilter = (newFilter: string) => {
      filter = newFilter;
      filteredRows = getFilteredRows(groups, filter);
      cursor = Math.min(cursor, Math.max(0, filteredRows.length - 1));
      rerender();
    };

    const onKey = (
      _: unknown,
      key: { name: string; ctrl: boolean; sequence: string } | undefined,
    ) => {
      if (!key) return;

      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        resolve({ type: "quit" });
        return;
      }

      if (key.ctrl && key.name === "r") {
        cleanup();
        resolve({ type: "refresh", filter, cursor });
        return;
      }

      if (key.name === "up") {
        cursor = Math.max(0, cursor - 1);
        rerender();
        return;
      }

      if (key.name === "down") {
        cursor = Math.min(filteredRows.length - 1, cursor + 1);
        rerender();
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        if (!filteredRows.length) return;
        const row = filteredRows[cursor];
        if (!row) return;
        cleanup();
        resolve(
          deleteMode
            ? { type: "delete", row, filter, cursor }
            : { type: "select", row, filter, cursor },
        );
        return;
      }

      if (key.name === "backspace") {
        if (filter.length > 0) {
          updateFilter(filter.slice(0, -1));
        } else if (filteredRows.length > 0) {
          const row = filteredRows[cursor];
          if (row) {
            cleanup();
            resolve({ type: "delete", row, filter, cursor });
          }
        }
        return;
      }

      if (!key.ctrl && key.sequence?.length === 1 && key.sequence.charCodeAt(0) >= 32) {
        updateFilter(filter + key.sequence);
      }
    };

    process.stdin.on("keypress", onKey);
  });
};

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

const run = async () => {
  const [argv, settings] = await Promise.all([
    yargsInit({ delete: { type: "string" } }).parseAsync(),
    readSettings(),
  ]);

  const multi = settings.multiline ?? false;
  const deleteArg = argv["delete"] as string | undefined;
  const deleteMode = deleteArg !== undefined;

  // Auto-delete: --delete <value> bypasses the TUI entirely
  if (deleteMode && deleteArg) {
    process.stdout.write(CLEAR + pc.dim("  Loading…\n"));
    const allWorkstreams = await listWorkstreams();
    const groups = groupWorkstreams(allWorkstreams);
    const rows = getFilteredRows(groups, deleteArg);

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
    process.stdout.write(
      CLEAR + pc.dim(`  Deleted ${row.group.repoName} / ${row.branch.branch}\n`),
    );
    return;
  }

  if (!process.stdin.isTTY) {
    process.stderr.write("command-center requires an interactive terminal.\n");
    process.exit(1);
  }

  readline.emitKeypressEvents(process.stdin);

  process.stdout.write(CLEAR + pc.dim("  Loading…\n"));
  const allWorkstreams = await listWorkstreams();
  let groups = groupWorkstreams(allWorkstreams);

  if (!groups.length) {
    process.stdout.write(CLEAR + pc.dim("  No workstreams found.\n"));
    return;
  }

  let filter = "";
  let cursor = 0;

  while (true) {
    const result = await runTUI(groups, filter, cursor, multi, deleteMode);

    if (result.type === "quit") {
      process.stdout.write(CLEAR);
      return;
    }

    if (result.type === "refresh") {
      filter = result.filter;
      cursor = result.cursor;
      process.stdout.write(CLEAR + pc.dim("  Refreshing…\n"));
      const allWorkstreams = await listWorkstreams();
      groups = groupWorkstreams(allWorkstreams);
      continue;
    }

    filter = result.filter;
    cursor = result.cursor;

    const { group, branch } = result.row;
    process.stdout.write(CLEAR);

    if (result.type === "delete") {
      await deleteWorkstreamFiles(branch.items);
      const updated = await listWorkstreams();
      groups = groupWorkstreams(updated);
      if (!groups.length) {
        process.stdout.write(pc.dim("  No workstreams remaining.\n"));
        return;
      }
      cursor = Math.min(cursor, Math.max(0, getFilteredRows(groups, filter).length - 1));
      continue;
    }

    // Normal select mode
    let workstreamId = branch.items[0]?.id;
    if (branch.items.length > 1) {
      const choice = await select({
        message: `${pc.bold(group.repoName)} / ${pc.cyan(branch.branch)} — select workstream:`,
        options: branch.items.map((w) => ({
          value: w.id,
          label: w.title ?? `${w.repoName}/${w.branch}`,
          hint: `${colorStatus(w.status)} · ${colorAgent(w.agent)} · ${relativeTime(w.updatedAt)}`,
        })),
      });
      if (isCancel(choice)) continue;
      workstreamId = choice;
    }

    const workstream = branch.items.find((w) => w.id === workstreamId);
    assert(workstream, "Workstream not found");

    if (!settings.action) {
      process.stderr.write(
        pc.yellow('No action configured. Add an "action" to ~/.ai-work-status/settings.json\n'),
      );
      return;
    }

    await execa(settings.action, {
      env: { ...process.env, ...buildEnvVars(workstream) },
      shell: true,
      stdio: "inherit",
    });
    return;
  }
};

run().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
