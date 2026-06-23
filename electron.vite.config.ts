import { chmod, copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import type { Plugin } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

const copyCliShellScripts = (): Plugin => ({
  name: "copy-cli-shell-scripts",
  closeBundle: async () => {
    await mkdir("dist/cli", { recursive: true });
    const files = (await readdir("src/cli")).filter((f) => f.endsWith(".sh"));
    await Promise.all(
      files.map(async (f) => {
        const dest = resolve("dist/cli", f);
        await copyFile(resolve("src/cli", f), dest);
        await chmod(dest, 0o755);
      }),
    );
  },
});

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["zod"] }), copyCliShellScripts()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "electron/main.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "electron/preload.ts"),
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: ".",
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  },
});
