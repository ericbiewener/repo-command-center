#!/usr/bin/env node
import assert from "node:assert";
import readline from "node:readline";
import { isCancel, note, select } from "@clack/prompts";
import { execa } from "execa";
import pc from "picocolors";
import type {
  WorkstreamBranchGroup,
  WorkstreamRepoGroup,
} from "../renderer/utils/groupWorkstreams";
import { groupWorkstreams } from "../renderer/utils/groupWorkstreams";
import { listWorkstreams } from "../shared/readStatusFiles";
import type { AgentKind, WorkstreamStatus } from "../shared/types";
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
) => {
  const lines: string[] = [];
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

    for (const branch of group.branches) {
      if (!filteredKeys.has(`${group.repoKey}::${branch.branch}`)) continue;

      const isSelected = rowIdx === cursor;
      const mostRecent = branch.items[0];
      const prefix = isSelected ? pc.green("▶ ") : "  ";

      const branchPadded = truncate(branch.branch, branchW);
      const title = (mostRecent?.title ?? "").padEnd(titleW);
      const summary = mostRecent?.summary ?? "";
      const summaryW = Math.max(0, available - branchW - COL_SEP.length - titleW - COL_SEP.length);

      if (isSelected) {
        const summaryLines = multi ? wrapToWidth(summary, summaryW) : [truncate(summary, summaryW)];
        const contIndent = " ".repeat(2 + branchW + COL_SEP.length + titleW + COL_SEP.length);
        lines.push(
          `${prefix}${pc.green(branchPadded)}${COL_SEP}${pc.white(title)}${COL_SEP}${pc.white(summaryLines[0] ?? "")}`,
        );
        if (multi)
          for (const line of summaryLines.slice(1)) lines.push(`${contIndent}${pc.white(line)}`);
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
  lines.push(pc.dim("  ↑↓ navigate · enter select · ctrl+r refresh · esc quit"));

  process.stdout.write(CLEAR + lines.join("\n") + "\n");
};

type TUIResult =
  | { type: "select"; row: BranchRow; filter: string; cursor: number }
  | { type: "refresh"; filter: string; cursor: number }
  | { type: "quit" };

const runTUI = (
  groups: WorkstreamRepoGroup[],
  initialFilter: string,
  initialCursor: number,
  multi: boolean,
): Promise<TUIResult> => {
  let filter = initialFilter;
  let filteredRows = getFilteredRows(groups, filter);
  let cursor = Math.min(Math.max(0, initialCursor), Math.max(0, filteredRows.length - 1));

  process.stdin.resume();
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  renderTUI(groups, filteredRows, cursor, filter, multi);

  return new Promise<TUIResult>((resolve) => {
    const cleanup = () => {
      process.stdin.off("keypress", onKey);
      process.stdout.off("resize", rerender);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    };

    const rerender = () => renderTUI(groups, filteredRows, cursor, filter, multi);

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
        resolve({ type: "select", row, filter, cursor });
        return;
      }

      if (key.name === "backspace") {
        updateFilter(filter.slice(0, -1));
        return;
      }

      if (!key.ctrl && key.sequence?.length === 1 && key.sequence.charCodeAt(0) >= 32) {
        updateFilter(filter + key.sequence);
      }
    };

    process.stdin.on("keypress", onKey);
  });
};

const run = async () => {
  if (!process.stdin.isTTY) {
    process.stderr.write("command-center requires an interactive terminal.\n");
    process.exit(1);
  }

  const { multi } = await yargsInit({ multi: { type: "boolean", default: false } }).parseAsync();

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
    const result = await runTUI(groups, filter, cursor, multi);

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

    // If multiple workstreams in the branch, pick one
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

    note(
      [
        `${pc.dim("repo")}    ${pc.bold(workstream.repoName)}`,
        `${pc.dim("branch")}  ${pc.cyan(workstream.branch)}`,
        `${pc.dim("status")}  ${colorStatus(workstream.status)}`,
        `${pc.dim("agent")}   ${colorAgent(workstream.agent)}`,
        ...(workstream.summary ? [`${pc.dim("summary")} ${workstream.summary}`] : []),
        `${pc.dim("updated")} ${relativeTime(workstream.updatedAt)}`,
      ].join("\n"),
      workstream.title ?? `${workstream.repoName}/${workstream.branch}`,
    );

    const action = await select({
      message: "Action:",
      options: [
        { value: "vscode", label: "Open in VS Code" },
        { value: "back", label: "↩ Back to list" },
        { value: "quit", label: "Quit" },
      ],
    });

    if (isCancel(action) || action === "quit") {
      process.stdout.write(pc.dim("\nGoodbye.\n"));
      return;
    }

    if (action === "back") continue;

    if (action === "vscode" && workstream.repoPath) {
      await execa("code", [workstream.repoPath]);
      process.stdout.write(pc.dim(`\nOpened ${workstream.repoName} in VS Code.\n`));
      return;
    }
  }
};

run().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
