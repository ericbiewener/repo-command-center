import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PrInfo, Workstream } from "../src/shared/types.js";

const execFileAsync = promisify(execFile);

type GitHubRemote = { host: string; slug: string };

// Parses HTTPS or SSH remote URLs from any GitHub host (github.com or GHE).
// Returns the hostname and owner/repo slug, or null if the URL is unrecognised.
const parseGitHubRemote = (remote: string): GitHubRemote | null => {
  // HTTPS: https://github.com/owner/repo[.git] or https://ghe.company.com/owner/repo[.git]
  const httpsMatch = remote.match(/^https?:\/\/([^/]+)\/([^/\s]+\/[^/\s]+?)(?:\.git)?\s*$/);
  if (httpsMatch) return { host: httpsMatch[1], slug: httpsMatch[2] };
  // SSH: git@github.com:owner/repo[.git] or git@ghe.company.com:owner/repo[.git]
  const sshMatch = remote.match(/@([^:]+):([^/\s]+\/[^/\s]+?)(?:\.git)?\s*$/);
  if (sshMatch) return { host: sshMatch[1], slug: sshMatch[2] };
  return null;
};

type CiStatus = "passing" | "failing" | "pending" | "error";

// States that mean the check didn't actually run — safe to ignore.
const IGNORED_STATES = new Set(["SKIPPED", "NEUTRAL", "STALE"]);

const mapCiStatus = (rollup: Array<{ state: string }>): CiStatus => {
  const active = rollup.filter((c) => !IGNORED_STATES.has(c.state));

  if (
    active.some(
      (c) =>
        c.state === "FAILURE" ||
        c.state === "TIMED_OUT" ||
        c.state === "STARTUP_FAILURE" ||
        c.state === "ACTION_REQUIRED" ||
        c.state === "CANCELLED" ||
        c.state === "ERROR",
    )
  )
    return "failing";
  if (
    active.some(
      (c) =>
        c.state === "IN_PROGRESS" ||
        c.state === "PENDING" ||
        c.state === "WAITING" ||
        c.state === "EXPECTED",
    )
  )
    return "pending";
  if (active.length === 0 || active.every((c) => c.state === "SUCCESS")) return "passing";
  return "error";
};

const fetchPrInfo = async (workstream: Workstream): Promise<PrInfo | null> => {
  const ghRemote = parseGitHubRemote(workstream.repoRemote);
  if (!ghRemote) return null;

  // gh accepts "OWNER/REPO" for github.com and "HOST/OWNER/REPO" for GHE.
  const repoArg =
    ghRemote.host === "github.com" ? ghRemote.slug : `${ghRemote.host}/${ghRemote.slug}`;
  const expectedUrlPrefix = `https://${ghRemote.host}/`;

  try {
    const { stdout } = await execFileAsync(
      "gh",
      [
        "pr",
        "view",
        workstream.branch,
        "--repo",
        repoArg,
        "--json",
        "number,url,statusCheckRollup,state",
      ],
      { timeout: 10_000 },
    );

    if (!stdout.trim()) return null;

    const data = JSON.parse(stdout) as {
      number?: number;
      url?: string;
      statusCheckRollup?: Array<{ state: string }>;
      state?: string;
    };

    if (!data.number || !data.url) return null;

    if (!data.url.startsWith(expectedUrlPrefix)) {
      return { fetchError: "invalid PR URL scheme" };
    }

    return {
      number: data.number,
      url: data.url,
      ciStatus: mapCiStatus(data.statusCheckRollup ?? []),
      merged: data.state === "MERGED",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("no pull requests found")) return null;
    return { fetchError: message };
  }
};

export const createPrPoller = (onUpdate: () => void) => {
  const cache: Record<string, PrInfo | null> = {};
  let inFlight = false;

  const fetchAll = async (workstreams: Workstream[]) => {
    if (inFlight) return;
    inFlight = true;
    try {
      await Promise.all(
        workstreams.map(async (ws) => {
          cache[ws.id] = await fetchPrInfo(ws);
        }),
      );
      onUpdate();
    } finally {
      inFlight = false;
    }
  };

  const getCached = (workstreamId: string): PrInfo | null => cache[workstreamId] ?? null;

  const startPolling = (getWorkstreams: () => Workstream[], intervalMs: number) => {
    const id = setInterval(() => void fetchAll(getWorkstreams()), intervalMs);
    return () => clearInterval(id);
  };

  return { fetchAll, getCached, startPolling };
};

export type PrPoller = ReturnType<typeof createPrPoller>;
