import { describe, expect, test } from "vitest";
import { getRepoNameFromRemote } from "./gitInfo";

describe("getRepoNameFromRemote", () => {
  test("derives repo names from common remote URL formats", () => {
    expect(getRepoNameFromRemote("git@github.com:example/figma-service.git")).toBe("figma-service");
    expect(getRepoNameFromRemote("https://github.com/example/command-center.git")).toBe(
      "command-center",
    );
    expect(getRepoNameFromRemote("/Users/eric/repos/local.git")).toBe("local");
  });
});
