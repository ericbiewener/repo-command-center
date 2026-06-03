import fs from "node:fs/promises";
import path from "node:path";
import { getRepoInfo } from "./gitInfo";
import { renderStatusJson } from "./renderStatusJson";
import { computeStatusPath } from "./statusPath";
import { validateStatusUpdatePayload } from "./statusSchema";

export const writeStatusFile = async (input: unknown) => {
  const payload = validateStatusUpdatePayload(input);
  const repoInfo = await getRepoInfo(payload.repoPath);
  const pathInfo = computeStatusPath(repoInfo);
  const updatedAt = new Date().toISOString();
  const json = renderStatusJson({
    payload,
    repoInfo,
    pathInfo,
    updatedAt,
  });
  const parentDir = path.dirname(pathInfo.statusFilePath);
  const tempFilePath = path.join(
    parentDir,
    `.${path.basename(pathInfo.statusFilePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await fs.mkdir(parentDir, { recursive: true });
  await fs.writeFile(tempFilePath, json, "utf8");
  await fs.rename(tempFilePath, pathInfo.statusFilePath);

  return {
    statusFilePath: pathInfo.statusFilePath,
    workstreamId: pathInfo.workstreamId,
  };
};
