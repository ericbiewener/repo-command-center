import { describe, expect, test } from "vitest";
import { renderStatusJson } from "./renderStatusJson";
import type { PersistedStatusRecord, RepoInfo, StatusPathInfo, StatusUpdatePayload } from "./types";

describe("renderStatusJson", () => {
  test("renders generated JSON status data and Markdown body", () => {
    const payload: StatusUpdatePayload = {
      repoPath: ".",
      agent: "codex",
      status: "running",
      title: "Initial implementation",
      summary: "Building v1",
      priority: "medium",
      bodyMarkdown: "## Current goal\n\nBuild the app.",
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

    expect(record.workstream_id).toBe("repo__main");
    expect(record.agent).toBe("codex");
    expect(record.status).toBe("running");
    expect(record.repo_remote).toBe("git@github.com:example/repo.git");
    expect(record.body_markdown).toBe("## Current goal\n\nBuild the app.");
  });
});
