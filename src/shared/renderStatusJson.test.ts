import { describe, expect, test } from "vitest";
import { renderStatusJson } from "./renderStatusJson";
import type { PersistedStatusRecord, RepoInfo, StatusPathInfo, StatusUpdatePayload } from "./types";

describe("renderStatusJson", () => {
  test("renders generated JSON status data", () => {
    const payload: StatusUpdatePayload = {
      repoPath: ".",
      agent: "codex",
      title: "Initial implementation",
      summary: "Building v1",
    };
    const repoInfo: RepoInfo = {
      repoRoot: "/tmp/repo",
      repoName: "repo",
      branch: "main",
      repoRemote: "git@github.com:example/repo.git",
      repoIdSource: "git@github.com:example/repo.git",
    };
    const pathInfo: StatusPathInfo = {
      repoKey: "repo--abc",
      branchKey: "main",
      workstreamId: "repo__main",
      statusFilePath: "/tmp/status.json",
    };
    const record = JSON.parse(
      renderStatusJson({
        payload,
        repoInfo,
        pathInfo,
        updatedAt: "2026-05-31T18:22:10.000Z",
      }),
    ) as PersistedStatusRecord;

    expect(record.workstreamId).toBe("repo__main");
    expect(record.agent).toBe("codex");
    expect(record.status).toBe("done");
    expect(record.repoRemote).toBe("git@github.com:example/repo.git");
    expect("schema_version" in record).toBe(false);
    expect("body_markdown" in record).toBe(false);
  });
});
