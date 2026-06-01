import matter from "gray-matter";
import { describe, expect, test } from "vitest";
import { renderStatusMarkdown } from "./renderStatusMarkdown";
import type { RepoInfo, StatusPathInfo, StatusUpdatePayload } from "./types";

describe("renderStatusMarkdown", () => {
  test("renders generated YAML frontmatter and Markdown body", () => {
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
      repoIdSource: "/tmp/repo",
    };
    const pathInfo: StatusPathInfo = {
      repoKey: "repo--abc",
      branchKey: "main",
      workstreamId: "repo__main",
      statusFilePath: "/tmp/status.md",
    };
    const markdown = renderStatusMarkdown({
      payload,
      repoInfo,
      pathInfo,
      updatedAt: "2026-05-31T18:22:10.000Z",
    });
    const parsed = matter(markdown);

    expect(parsed.data.workstream_id).toBe("repo__main");
    expect(parsed.data.agent).toBe("codex");
    expect(parsed.data.status).toBe("running");
    expect(parsed.content.trim()).toBe("## Current goal\n\nBuild the app.");
  });
});
