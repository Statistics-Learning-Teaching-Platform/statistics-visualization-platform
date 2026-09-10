import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { load as loadYaml } from "js-yaml";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const integrationRoot = resolve(root, "..");
const config = loadYaml(await readFile(resolve(root, "config/database.yaml"), "utf8"));
const postgres = config?.postgres;
if (!postgres || config?.version !== 1) throw new Error("Invalid database.yaml");

const adminPassword = process.env.STAT_DB_ADMIN_PASSWORD;
const appPassword = process.env[postgres.passwordEnv];
if (!adminPassword) throw new Error("STAT_DB_ADMIN_PASSWORD is required");
if (!appPassword) throw new Error(`${postgres.passwordEnv} is required`);

for (const value of [postgres.database, postgres.username]) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  }
}

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${value.replaceAll("'", "''")}'`;
const positiveInteger = (value, fallback, name) => {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw new Error(`config/database.yaml ${name} must be a positive integer`);
  }
  return resolved;
};
const statementTimeoutMs = positiveInteger(
  postgres.operationalTimeouts?.statementMs,
  15_000,
  "postgres.operationalTimeouts.statementMs",
);
const lockTimeoutMs = positiveInteger(
  postgres.operationalTimeouts?.lockMs,
  5_000,
  "postgres.operationalTimeouts.lockMs",
);
const idleInTransactionTimeoutMs = positiveInteger(
  postgres.operationalTimeouts?.idleInTransactionMs,
  15_000,
  "postgres.operationalTimeouts.idleInTransactionMs",
);
const adminOptions = {
  host: postgres.host,
  port: postgres.port,
  user: "postgres",
  password: adminPassword,
  database: "postgres",
  ssl: postgres.ssl,
  connectionTimeoutMillis: postgres.pool?.connectionTimeoutMs ?? 8_000,
};

const admin = new pg.Client(adminOptions);
await admin.connect();
try {
  const roleName = quoteIdentifier(postgres.username);
  const rolePassword = quoteLiteral(appPassword);
  const roleExists = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [postgres.username]);
  if (roleExists.rowCount === 0) {
    await admin.query(
      `CREATE ROLE ${roleName} LOGIN PASSWORD ${rolePassword} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
  } else {
    await admin.query(
      `ALTER ROLE ${roleName} WITH LOGIN PASSWORD ${rolePassword} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
  }

  const databaseExists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [postgres.database]);
  if (databaseExists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${quoteIdentifier(postgres.database)} OWNER ${roleName}`);
  }

  const databases = await admin.query("SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate");
  for (const { datname } of databases.rows) {
    if (datname === postgres.database) continue;
    await admin.query(`REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteIdentifier(datname)} FROM ${roleName}`);
  }
  await admin.query(`ALTER DATABASE ${quoteIdentifier(postgres.database)} OWNER TO ${roleName}`);
  await admin.query(`REVOKE ALL ON DATABASE ${quoteIdentifier(postgres.database)} FROM PUBLIC`);
  await admin.query(`GRANT CONNECT, TEMPORARY ON DATABASE ${quoteIdentifier(postgres.database)} TO ${roleName}`);
  await admin.query(
    `ALTER ROLE ${roleName} IN DATABASE ${quoteIdentifier(postgres.database)} SET statement_timeout = ${quoteLiteral(`${statementTimeoutMs}ms`)}`,
  );
  await admin.query(
    `ALTER ROLE ${roleName} IN DATABASE ${quoteIdentifier(postgres.database)} SET lock_timeout = ${quoteLiteral(`${lockTimeoutMs}ms`)}`,
  );
  await admin.query(
    `ALTER ROLE ${roleName} IN DATABASE ${quoteIdentifier(postgres.database)} SET idle_in_transaction_session_timeout = ${quoteLiteral(`${idleInTransactionTimeoutMs}ms`)}`,
  );
} finally {
  await admin.end();
}

const app = new pg.Client({
  host: postgres.host,
  port: postgres.port,
  user: postgres.username,
  password: appPassword,
  database: postgres.database,
  ssl: postgres.ssl,
  connectionTimeoutMillis: postgres.pool?.connectionTimeoutMs ?? 8_000,
});
await app.connect();
try {
  const migrations = (await readdir(resolve(root, "database")))
    .filter((name) => /^\d{3}_[a-z0-9_-]+\.sql$/.test(name))
    .sort();
  if (!migrations.length) throw new Error("No database migrations found");
  for (const migration of migrations) {
    await app.query(await readFile(resolve(root, "database", migration), "utf8"));
  }

  const initialPasswords = {
    tmpsudo: process.env.STAT_INITIAL_SUDO_PASSWORD,
    tmpteacher: process.env.STAT_INITIAL_TEACHER_PASSWORD,
    tmpstudent: process.env.STAT_INITIAL_STUDENT_PASSWORD,
  };
  for (const [username, password] of Object.entries(initialPasswords)) {
    if (!password || password.length < 12) {
      throw new Error(`STAT_INITIAL_${username.replace("tmp", "").toUpperCase()}_PASSWORD must contain at least 12 characters`);
    }
  }
  if (new Set(Object.values(initialPasswords)).size !== Object.keys(initialPasswords).length) {
    throw new Error("Initial account passwords must be distinct");
  }
  const passwordHashes = Object.fromEntries(
    await Promise.all(Object.entries(initialPasswords).map(async ([username, password]) => [username, await bcrypt.hash(password, 12)])),
  );

  const sudo = await app.query(
    `INSERT INTO users (username, password_hash, role, must_change_password)
     VALUES ('tmpsudo', $1, 'superadmin', true)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [passwordHashes.tmpsudo],
  );
  const sudoId = sudo.rows[0]?.id ?? (await app.query("SELECT id FROM users WHERE lower(username)='tmpsudo'")).rows[0].id;
  const teacher = await app.query(
    `INSERT INTO users (username, password_hash, role, must_change_password, created_by)
     VALUES ('tmpteacher', $1, 'teacher', true, $2)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [passwordHashes.tmpteacher, sudoId],
  );
  const teacherId = teacher.rows[0]?.id ?? (await app.query("SELECT id FROM users WHERE lower(username)='tmpteacher'")).rows[0].id;
  await app.query(
    `INSERT INTO users (username, password_hash, role, must_change_password, created_by)
     VALUES ('tmpstudent', $1, 'student', true, $2)
     ON CONFLICT DO NOTHING`,
    [passwordHashes.tmpstudent, teacherId],
  );

  const assetManifest = JSON.parse(await readFile(resolve(root, "database/private-assets-manifest.json"), "utf8"));
  if (assetManifest.schemaVersion !== 1 || !Array.isArray(assetManifest.assets)) {
    throw new Error("Invalid private asset manifest");
  }
  await app.query("BEGIN");
  try {
    const keys = [];
    for (const asset of assetManifest.assets) {
      if (!asset || typeof asset.key !== "string" || typeof asset.source !== "string") {
        throw new Error("Invalid private asset entry");
      }
      const source = resolve(integrationRoot, asset.source);
      if (!source.startsWith(integrationRoot + sep)) throw new Error(`Private asset escapes integration root: ${asset.source}`);
      const content = await readFile(source);
      const digest = createHash("sha256").update(content).digest("hex");
      if (digest !== asset.sha256 || content.byteLength !== asset.size) {
        throw new Error(`Private asset changed after release review: ${asset.key}`);
      }
      await app.query(
        `INSERT INTO private_assets (asset_key, content_type, access_scope, content, content_length, content_sha256)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (asset_key) DO UPDATE
         SET content_type = EXCLUDED.content_type,
             access_scope = EXCLUDED.access_scope,
             content = EXCLUDED.content,
             content_length = EXCLUDED.content_length,
             content_sha256 = EXCLUDED.content_sha256,
             updated_at = now()`,
        [asset.key, asset.contentType, asset.accessScope, content, content.byteLength, digest],
      );
      keys.push(asset.key);
    }
    await app.query("DELETE FROM private_assets WHERE NOT (asset_key = ANY($1::text[]))", [keys]);
    await app.query("COMMIT");
  } catch (error) {
    await app.query("ROLLBACK");
    throw error;
  }
} finally {
  await app.end();
}

console.log("STAT database migrations, private assets, role, and initial accounts are ready.");
