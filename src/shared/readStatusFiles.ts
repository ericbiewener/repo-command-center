import fs from "node:fs/promises";
import { getStatusReposDir } from "./paths";
import { normalizeAgent, normalizeStatus } from "./statusNormalization";
import { generatedStatus, type PersistedStatusRecord, type Workstream } from "./types";

const requiredFields = [
  "workstreamId",
  "repoName",
  "repoPath",
  "repoRemote",
  "branch",
  "agent",
  "status",
  "updatedAt",
  "nextRecommendedAction",
];

const stringValue = (value: unknown) =>
  typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);

const parseRecord = (raw: string) => JSON.parse(raw) as Partial<PersistedStatusRecord>;

const listStatusFiles = async (dirPath: string): Promise<string[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = `${dirPath}/${entry.name}`;

      return entry.isDirectory()
        ? listStatusFiles(entryPath)
        : entry.isFile() && entry.name.endsWith(".json")
          ? Promise.resolve([entryPath])
          : Promise.resolve([]);
    }),
  );

  return nested.flat();
};

const invalidWorkstream = (statusFilePath: string, validationErrors: string[]): Workstream => ({
  id: statusFilePath,
  repoName: "Invalid status file",
  repoPath: "",
  repoRemote: "",
  branch: "",
  agent: "unknown",
  status: "invalid",
  rawStatus: "",
  nextRecommendedAction: "",
  updatedAt: "",
  updatedAtEpoch: null,
  statusFilePath,
  isValid: false,
  validationErrors,
});

const parseStatusFile = async (statusFilePath: string): Promise<Workstream> => {
  const raw = await fs.readFile(statusFilePath, "utf8").catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    return `__READ_ERROR__${message}`;
  });

  if (raw.startsWith("__READ_ERROR__")) {
    return invalidWorkstream(statusFilePath, [
      raw.replace("__READ_ERROR__", "Could not read file: "),
    ]);
  }

  try {
    const data = parseRecord(raw);
    const missingPresentFields = requiredFields.filter((field) => !(field in data));
    const validationErrors = requiredFields
      .filter((field) =>
        field === "repoRemote"
          ? missingPresentFields.includes(field)
          : !stringValue(data[field as keyof PersistedStatusRecord]).trim(),
      )
      .map((field) => `Missing required field: ${field}`);
    const statusErrors =
      stringValue(data.status) && stringValue(data.status) !== generatedStatus
        ? [`Invalid status value: ${stringValue(data.status)}`]
        : [];
    const rawUpdatedAt = stringValue(data.updatedAt);
    const updatedAtEpoch = Number.isNaN(Date.parse(rawUpdatedAt)) ? null : Date.parse(rawUpdatedAt);
    const dateErrors = updatedAtEpoch === null ? ["Invalid updatedAt value"] : [];
    const errors = [...validationErrors, ...statusErrors, ...dateErrors];

    return errors.length
      ? invalidWorkstream(statusFilePath, errors)
      : {
          id: stringValue(data.workstreamId),
          title: stringValue(data.title) || undefined,
          summary: stringValue(data.summary) || undefined,
          nextRecommendedAction: stringValue(data.nextRecommendedAction),
          repoName: stringValue(data.repoName),
          repoPath: stringValue(data.repoPath),
          repoRemote: stringValue(data.repoRemote),
          branch: stringValue(data.branch),
          agent: normalizeAgent(data.agent),
          status: normalizeStatus(data.status),
          rawStatus: stringValue(data.status),
          updatedAt: rawUpdatedAt,
          updatedAtEpoch,
          statusFilePath,
          isValid: true,
          validationErrors: [],
        };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return invalidWorkstream(statusFilePath, [`Could not parse JSON: ${message}`]);
  }
};

export const listWorkstreams = async (statusRoot = getStatusReposDir()) => {
  const files = await listStatusFiles(statusRoot);
  const workstreams = await Promise.all(files.map((file) => parseStatusFile(file)));

  return workstreams.sort((a, b) => (b.updatedAtEpoch ?? 0) - (a.updatedAtEpoch ?? 0));
};
