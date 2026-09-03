import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const base = `${origin}/st-qselector`;
const output = [];
const server = spawn(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-H", "127.0.0.1", "-p", String(port)],
  { cwd: root, env: { ...process.env, STAT_ALLOWED_ORIGINS: origin }, stdio: ["ignore", "pipe", "pipe"] },
);
server.stdout.on("data", (chunk) => output.push(chunk.toString()));
server.stderr.on("data", (chunk) => output.push(chunk.toString()));

async function waitUntilReady() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited early:\n${output.join("")}`);
    try {
      const response = await fetch(`${base}/api/auth/me`);
      if (response.status === 401) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for Next server:\n${output.join("")}`);
}

try {
  await waitUntilReady();
  const cases = [
    ["questions", "/api/questions", { method: "GET" }],
    ["asset", "/api/asset?chapter=Ch01&file=Assests%2FData-Chapter01-02.xlsx", { method: "GET" }],
    // Same-origin browser GET fetches do not reliably include Origin. The
    // read-only model discovery endpoint must therefore reach session auth
    // (401 anonymously), rather than being rejected by the mutation origin
    // guard (403) before authentication.
    ["AI models", "/api/ai/models", { method: "GET" }],
    ["export", "/api/export/docx", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}" }],
    ["AI paper", "/api/ai/paper", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}" }],
    ["AI knowledge", "/api/ai/knowledge", { method: "POST", headers: { Origin: origin } }],
    ["R tutor", "/api/ai/r-tutor", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}" }],
    ["Python tutor", "/api/ai/python-tutor", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}" }],
  ];
  for (const [name, pathname, init] of cases) {
    const response = await fetch(`${base}${pathname}`, init);
    if (name === "AI models") {
      assert.equal(response.status, 401, `${name} should authenticate anonymous GETs: ${await response.text()}`);
      continue;
    }
    assert.ok(
      response.status === 401 || response.status === 403,
      `${name} returned ${response.status}, expected 401/403: ${await response.text()}`,
    );
  }
  console.log(`Anonymous authorization regression checks passed for ${cases.length} routes.`);
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
