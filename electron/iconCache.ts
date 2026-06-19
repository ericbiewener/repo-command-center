import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const cache: Record<string, string> = {};

export const loadIconDataUri = async (iconPath: string): Promise<string | null> => {
  const normalizedPath = path.resolve(iconPath);

  if (normalizedPath in cache) {
    return cache[normalizedPath];
  }

  const ext = path.extname(normalizedPath).toLowerCase();
  const mime = ALLOWED_EXTENSIONS[ext];

  if (!mime) {
    return null;
  }

  try {
    const data = await fs.readFile(normalizedPath);
    const dataUri = `data:${mime};base64,${data.toString("base64")}`;
    cache[normalizedPath] = dataUri;
    return dataUri;
  } catch {
    return null;
  }
};
