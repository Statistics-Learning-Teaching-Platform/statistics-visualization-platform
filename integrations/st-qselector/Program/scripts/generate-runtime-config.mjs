import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "config/database.yaml");
const outputPath = resolve(root, "src/generated/database-config.ts");

const document = loadYaml(await readFile(configPath, "utf8"));
if (!document || typeof document !== "object" || document.version !== 1) {
  throw new Error("config/database.yaml must contain version: 1");
}

const postgres = document.postgres;
if (!postgres || typeof postgres !== "object") {
  throw new Error("config/database.yaml is missing postgres settings");
}

const requiredStrings = ["host", "database", "username", "passwordEnv"];
for (const key of requiredStrings) {
  if (typeof postgres[key] !== "string" || !postgres[key].trim()) {
    throw new Error(`config/database.yaml postgres.${key} must be a non-empty string`);
  }
}
if (!Number.isInteger(postgres.port) || postgres.port < 1 || postgres.port > 65535) {
  throw new Error("config/database.yaml postgres.port must be a valid TCP port");
}

const pool = postgres.pool ?? {};
const generated = {
  host: postgres.host,
  port: postgres.port,
  database: postgres.database,
  username: postgres.username,
  passwordEnv: postgres.passwordEnv,
  ssl: postgres.ssl === true,
  maxConnections: Number.isInteger(pool.maxConnections) ? pool.maxConnections : 4,
  idleTimeoutMs: Number.isInteger(pool.idleTimeoutMs) ? pool.idleTimeoutMs : 20_000,
  connectionTimeoutMs: Number.isInteger(pool.connectionTimeoutMs) ? pool.connectionTimeoutMs : 8_000,
};

await writeFile(
  outputPath,
  `// Generated from config/database.yaml. Do not edit by hand.\n` +
    `export const databaseConfig = ${JSON.stringify(generated, null, 2)} as const;\n`,
  "utf8",
);

console.log(`Generated ${outputPath}`);
