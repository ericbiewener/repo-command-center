import fs from "node:fs/promises";
import { getStatusReposDir } from "./paths";
import { normalizeAgent, normalizeStatus } from "./statusNormalization";
import type { PersistedStatusRecord, Workstream } from "./types";

const requiredFields = [
  "schema_version",
  "workstream_id",
  "repo_name",
  "repo_path",
  "branch",
  "agent",
  "status",
  "updated_at",
  "body_markdown",
];

const stringValue = (value: unknown) =>
  typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);

const isValidSchemaVersion = (value: unknown) => value === 1;

const parseRecord = (raw: string) => JSON.parse(raw) as Partial<PersistedStatusRecord>;

const listMarkdownFiles = async (dirPath: string): Promise<string[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = `${dirPath}/${entry.name}`;

      return entry.isDirectory()
        ? listMarkdownFiles(entryPath)
        : entry.isFile() && entry.name.endsWith(".json")
          ? Promise.resolve([entryPath])
          : Promise.resolve([]);
    }),
  );

  return nested.flat();
};

const invalidWorkstream = (
  statusFilePath: string,
  markdownBody: string,
  validationErrors: string[],
): Workstream => ({
  id: statusFilePath,
  repoName: "Invalid status file",
  repoPath: "",
  branch: "",
  agent: "unknown",
  status: "invalid",
  rawStatus: "",
  updatedAt: "",
  updatedAtEpoch: null,
  statusFilePath,
  markdownBody,
  isValid: false,
  validationErrors,
});

const parseStatusFile = async (statusFilePath: string): Promise<Workstream> => {
  const raw = await fs.readFile(statusFilePath, "utf8").catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    return `__READ_ERROR__${message}`;
  });

  if (raw.startsWith("__READ_ERROR__")) {
    return invalidWorkstream(statusFilePath, "", [
      raw.replace("__READ_ERROR__", "Could not read file: "),
    ]);
  }

  try {
    const data = parseRecord(raw);
    const validationErrors = requiredFields
      .filter((field) =>
        field === "schema_version"
          ? !isValidSchemaVersion(data.schema_version)
          : !stringValue(data[field as keyof PersistedStatusRecord]).trim(),
      )
      .map((field) => `Missing required field: ${field}`);
    const rawUpdatedAt = stringValue(data.updated_at);
    const updatedAtEpoch = Number.isNaN(Date.parse(rawUpdatedAt)) ? null : Date.parse(rawUpdatedAt);
    const dateErrors = updatedAtEpoch === null ? ["Invalid updated_at value"] : [];
    const errors = [...validationErrors, ...dateErrors];

    return errors.length
      ? invalidWorkstream(statusFilePath, stringValue(data.body_markdown), errors)
      : {
          id: stringValue(data.workstream_id),
          title: stringValue(data.title) || undefined,
          summary: stringValue(data.summary) || undefined,
          repoName: stringValue(data.repo_name),
          repoPath: stringValue(data.repo_path),
          branch: stringValue(data.branch),
          agent: normalizeAgent(data.agent),
          status: normalizeStatus(data.status),
          rawStatus: stringValue(data.status),
          priority: stringValue(data.priority) || undefined,
          updatedAt: rawUpdatedAt,
          updatedAtEpoch,
          statusFilePath,
          markdownBody: stringValue(data.body_markdown).trim(),
          isValid: true,
          validationErrors: [],
        };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return invalidWorkstream(statusFilePath, raw, [`Could not parse JSON: ${message}`]);
  }
};

export const listWorkstreams = async (statusRoot = getStatusReposDir()) => {
  const files = await listMarkdownFiles(statusRoot);
  const workstreams = await Promise.all(files.map((file) => parseStatusFile(file)));

  return workstreams.sort((a, b) => (b.updatedAtEpoch ?? 0) - (a.updatedAtEpoch ?? 0));
};
