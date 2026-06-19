import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PrInfo, Workstream } from "../src/shared/types.js";

const execFileAsync = promisify(execFile);

const GITHUB_URL_PREFIX = "https://github.com/";

const parseGitHubSlug = (remote: string): string | null => {
  const httpsMatch = remote.match(/github\.com\/([^/]+\/[^/\s]+?)(?:\.git)?\s*$/);
  if (httpsMatch) return httpsMatch[1];
  const sshMatch = remote.match(/github\.com:([^/\s]+\/[^/\s]+?)(?:\.git)?\s*$/);
  if (sshMatch) return sshMatch[1];
  return null;
};

type CiStatus = "passing" | "failing" | "pending" | "error";

const mapCiStatus = (rollup: Array<{ state: string }>): CiStatus =>
  rollup.some((c) => c.state === "FAILURE")
    ? "failing"
    : rollup.some((c) => c.state === "IN_PROGRESS" || c.state === "PENDING")
      ? "pending"
      : rollup.length > 0 && rollup.every((c) => c.state === "SUCCESS")
        ? "passing"
        : "error";

const fetchPrInfo = async (workstream: Workstream): Promise<PrInfo | null> => {
  const slug = parseGitHubSlug(workstream.repoRemote);
  if (!slug) return null;

  try {
    const { stdout } = await execFileAsync(
      "gh",
      [
        "pr",
        "view",
        "--head",
        workstream.branch,
        "--repo",
        slug,
        "--json",
        "number,url,statusCheckRollup",
      ],
      { timeout: 10_000 },
    );

    if (!stdout.trim()) return null;

    const data = JSON.parse(stdout) as {
      number?: number;
      url?: string;
      statusCheckRollup?: Array<{ state: string }>;
    };

    if (!data.number || !data.url) return null;

    if (!data.url.startsWith(GITHUB_URL_PREFIX)) {
      return { fetchError: "invalid PR URL scheme" };
    }

    return {
      number: data.number,
      url: data.url,
      ciStatus: mapCiStatus(data.statusCheckRollup ?? []),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
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
