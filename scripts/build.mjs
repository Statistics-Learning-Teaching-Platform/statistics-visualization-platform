import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(rootDir, "..");
const distDir = resolve(projectDir, "dist");
const basePath = process.env.BASE_PATH ?? "/";

rmSync(distDir, { force: true, recursive: true });

// Single Vite build: the SPA shell imports all apps via dynamic imports,
// so Vite automatically code-splits each app into separate chunks.
// No per-app builds needed anymore.
execFileSync("npx", ["vite", "build", "--base", basePath], {
  cwd: projectDir,
  stdio: "inherit",
  env: process.env,
  shell: true,
});
