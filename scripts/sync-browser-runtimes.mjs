import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { version as pyodideVersion } from "pyodide";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRuntime = resolve(root, "public/runtime");
const cacheRoot = resolve(root, ".runtime-cache");
const pyodideSource = resolve(root, "node_modules/pyodide");
const webRSource = resolve(root, "node_modules/webr/dist");
const mirror =
  process.env.PYODIDE_CHINA_MIRROR?.replace(/\/$/, "") ??
  `https://cdn.jsdmirror.com/pyodide/v${pyodideVersion}/full`;
const basePackages = ["numpy", "pandas", "matplotlib", "scipy"];
const webRVersion = "0.6.0";
// Served directory for webR. The "-cf2" suffix versions the URL space: edge
// caches hold immutable responses per URL, and only fresh URLs reach the
// Pages Function that swaps in the eval-permitting CSP the worker needs.
const webRDirectory = "0.6.0-cf3";

async function sha256(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

async function ensureDownload(fileName, expectedHash) {
  const cachePath = resolve(cacheRoot, "pyodide", pyodideVersion, fileName);
  await mkdir(dirname(cachePath), { recursive: true });
  try {
    if ((await sha256(cachePath)) === expectedHash) return cachePath;
  } catch {
    // Cache miss or stale partial file.
  }

  const temporaryPath = `${cachePath}.partial`;
  await rm(temporaryPath, { force: true });
  const response = await fetch(`${mirror}/${encodeURIComponent(fileName)}`, {
    headers: { "User-Agent": "StatMind-runtime-sync/1.0" },
    redirect: "follow",
  });
  if (!response.ok || !response.body) {
    throw new Error(`Domestic Pyodide mirror returned ${response.status} for ${fileName}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath));
  const actualHash = await sha256(temporaryPath);
  if (actualHash !== expectedHash) {
    await rm(temporaryPath, { force: true });
    throw new Error(
      `Checksum mismatch for ${fileName}: expected ${expectedHash}, received ${actualHash}`,
    );
  }
  await rm(cachePath, { force: true });
  await cp(temporaryPath, cachePath);
  await rm(temporaryPath, { force: true });
  return cachePath;
}

async function syncPyodide() {
  const runtimeRoot = resolve(publicRuntime, "pyodide");
  const destination = resolve(runtimeRoot, pyodideVersion);
  await rm(runtimeRoot, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const file of [
    "pyodide.asm.mjs",
    "pyodide.asm.wasm",
    "python_stdlib.zip",
    "pyodide-lock.json",
  ]) {
    await cp(resolve(pyodideSource, file), resolve(destination, file));
  }

  const lock = JSON.parse(await readFile(resolve(pyodideSource, "pyodide-lock.json"), "utf8"));
  const selected = new Set();
  function select(name) {
    if (selected.has(name)) return;
    const entry = lock.packages[name];
    if (!entry) throw new Error(`Pyodide lock file does not contain ${name}`);
    selected.add(name);
    for (const dependency of entry.depends ?? []) select(dependency);
  }
  for (const name of basePackages) select(name);

  const files = [];
  for (const name of [...selected].sort()) {
    const entry = lock.packages[name];
    const cached = await ensureDownload(entry.file_name, entry.sha256);
    await cp(cached, resolve(destination, entry.file_name));
    files.push({ package: name, file: entry.file_name, sha256: entry.sha256 });
  }
  return files;
}

async function syncWebR() {
  const runtimeRoot = resolve(publicRuntime, "webr");
  const destination = resolve(runtimeRoot, webRDirectory);
  await rm(runtimeRoot, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const file of ["R.js", "R.wasm", "libRblas.so", "libRlapack.so", "webr-worker.js"]) {
    await cp(resolve(webRSource, file), resolve(destination, file));
  }
  await cp(resolve(webRSource, "vfs"), resolve(destination, "vfs"), { recursive: true });
}

await mkdir(publicRuntime, { recursive: true });
const pyodideFiles = await syncPyodide();
await syncWebR();
await writeFile(
  resolve(publicRuntime, "runtime-manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      pyodide: { version: pyodideVersion, source: mirror, packages: pyodideFiles },
      webR: { version: webRVersion, directory: webRDirectory, source: "local npm package" },
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Browser runtimes synced from the verified domestic mirror (${mirror}).`);
