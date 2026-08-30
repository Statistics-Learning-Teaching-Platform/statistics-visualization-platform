import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const services = [
  { name: "portal", script: "dev:portal" },
  { name: "qselector", script: "dev:qselector" },
];

const children = new Map();
let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children.values()) {
    if (!child.killed) child.kill(signal);
  }
}

for (const service of services) {
  const child = spawn(npmCommand, ["run", service.script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  children.set(service.name, child);

  child.on("error", (error) => {
    console.error(`[dev:${service.name}] failed to start:`, error);
    process.exitCode = 1;
    stopAll();
  });

  child.on("exit", (code, signal) => {
    children.delete(service.name);

    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      console.error(`[dev:${service.name}] exited with ${reason}; stopping all services.`);
      process.exitCode = code && code !== 0 ? code : 1;
      stopAll();
    }

    if (children.size === 0) process.exit();
  });
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));
