import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { listWorkstreams } from "./readStatusFiles";

const makeTempDir = () => fs.mkdtemp(path.join(os.tmpdir(), "ai-work-status-test-"));

describe("listWorkstreams", () => {
  test("returns sorted valid workstreams and invalid files", async () => {
    const root = await makeTempDir();
    const repoDir = path.join(root, "repo--abc", "branches");

    await fs.mkdir(repoDir, { recursive: true });
    await fs.writeFile(
      path.join(repoDir, "main.json"),
      JSON.stringify(
        {
          workstreamId: "repo__main",
          repoName: "repo",
          repoPath: root,
          repoRemote: "git@github.com:example/repo.git",
          branch: "main",
          agent: "codex",
          status: "done",
          updatedAt: "2026-05-31T18:22:10.000Z",
        },
        null,
        2,
      ),
      "utf8",
    );
    await fs.writeFile(
      path.join(repoDir, "bad.json"),
      JSON.stringify(
        {
          workstreamId: "repo__bad",
          repoName: "repo",
          repoPath: root,
          branch: "bad",
          agent: "codex",
          status: "done",
          updatedAt: "2026-05-31T18:21:10.000Z",
        },
        null,
        2,
      ),
      "utf8",
    );

    const workstreams = await listWorkstreams({}, root);

    expect(workstreams).toHaveLength(2);
    expect(workstreams[0]?.id).toBe("repo__main");
    expect(workstreams[0]?.repoRemote).toBe("git@github.com:example/repo.git");
    expect(workstreams[1]?.status).toBe("invalid");
    expect(workstreams[1]?.validationErrors).toContain("Missing required field: repoRemote");
  });
});
