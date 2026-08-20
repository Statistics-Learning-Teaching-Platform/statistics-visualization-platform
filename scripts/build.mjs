import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(rootDir, "..");
const distDir = resolve(projectDir, "dist");
const basePath = process.env.BASE_PATH ?? "/";

rmSync(distDir, { force: true, recursive: true });

const viteBin = resolve(
  projectDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vite.cmd" : "vite",
);

if (!existsSync(viteBin)) {
  throw new Error("Vite is not installed. Run `npm ci` before building.");
}

// Single Vite build: the SPA shell imports all apps via dynamic imports,
// so Vite automatically code-splits each app into separate chunks.
// No per-app builds needed anymore.
execFileSync(viteBin, ["build", "--base", basePath], {
  cwd: projectDir,
  stdio: "inherit",
  env: process.env,
});
