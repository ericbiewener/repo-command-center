import { describe, expect, test } from "vitest";
import { normalizeAgent, normalizeStatus } from "./statusNormalization";

describe("status normalization", () => {
  test("normalizes known status aliases", () => {
    expect(normalizeStatus("in-progress")).toBe("running");
    expect(normalizeStatus("ready for review")).toBe("ready_for_review");
    expect(normalizeStatus("complete")).toBe("done");
    expect(normalizeStatus("idle")).toBe("paused");
  });

  test("normalizes unknown statuses to other", () => {
    expect(normalizeStatus("waiting")).toBe("other");
    expect(normalizeStatus(undefined)).toBe("other");
  });

  test("normalizes agent aliases", () => {
    expect(normalizeAgent("claude-code")).toBe("claude");
    expect(normalizeAgent("codex")).toBe("codex");
    expect(normalizeAgent("mystery")).toBe("unknown");
  });
});
