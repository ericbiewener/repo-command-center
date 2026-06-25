import { describe, expect, test } from "vitest";
import { type DevLogEntry, initDevLog, loggedExecFileAsync } from "./devLog";

const createLogEntries = () => {
  const entries: DevLogEntry[] = [];
  initDevLog({
    send: (_channel: string, entry: DevLogEntry) => {
      entries.push(entry);
    },
  } as unknown as Parameters<typeof initDevLog>[0]);
  return entries;
};

describe("loggedExecFileAsync", () => {
  test("does not emit a dev log when a command error is filtered", async () => {
    const entries = createLogEntries();

    await expect(
      loggedExecFileAsync(
        process.execPath,
        ["-e", "console.error('no pull requests found for branch'); process.exit(1);"],
        { shouldLogError: (error) => !String(error).includes("no pull requests found") },
      ),
    ).rejects.toThrow();

    expect(entries).toEqual([]);
  });

  test("emits a dev log for unfiltered command errors", async () => {
    const entries = createLogEntries();

    await expect(
      loggedExecFileAsync(process.execPath, [
        "-e",
        "console.error('different failure'); process.exit(1);",
      ]),
    ).rejects.toThrow();

    expect(entries).toEqual([
      expect.objectContaining({
        type: "exec:error",
        cmd: process.execPath,
      }),
    ]);
  });
});
