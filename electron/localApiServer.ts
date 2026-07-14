import assert from "node:assert";
import crypto from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { parseDashboardFocusRequest } from "../src/shared/dashboardFocus";
import { removeServerInfo, writeServerInfo } from "../src/shared/serverInfo";
import { formatValidationError } from "../src/shared/statusSchema";
import type { DashboardFocusRequest } from "../src/shared/types";
import { writeStatusFile } from "../src/shared/writeStatusFile";

const maxBodySize = 256 * 1024;

const sendJson = (res: ServerResponse, statusCode: number, body: unknown) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
};

const readJsonBody = (req: IncomingMessage) =>
  new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      chunks.push(chunk);

      if (size > maxBodySize) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });

export const startLocalApiServer = async (
  onStatusUpdated: () => void,
  onDashboardFocusRequested: (request: DashboardFocusRequest) => void,
) => {
  const token = crypto.randomBytes(32).toString("hex");
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        app: "grove",
        version: "1.0.0",
      });
      return;
    }

    if (
      req.method !== "POST" ||
      !["/api/status/update", "/api/dashboard/focus"].includes(url.pathname)
    ) {
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    if (req.headers.authorization !== `Bearer ${token}`) {
      sendJson(res, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    if (!String(req.headers["content-type"] ?? "").includes("application/json")) {
      sendJson(res, 415, { ok: false, error: "Content-Type must be application/json" });
      return;
    }

    try {
      const payload = await readJsonBody(req);
      if (url.pathname === "/api/status/update") {
        const result = await writeStatusFile(payload);

        onStatusUpdated();
        sendJson(res, 200, { ok: true, ...result });
        return;
      }

      const request = parseDashboardFocusRequest(payload);
      onDashboardFocusRequested(request);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: formatValidationError(error) });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert(address && typeof address === "object", "Local API server did not expose an address.");

  const info = {
    port: (address as AddressInfo).port,
    token,
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };

  await writeServerInfo(info);

  return {
    info,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await removeServerInfo();
    },
  };
};
