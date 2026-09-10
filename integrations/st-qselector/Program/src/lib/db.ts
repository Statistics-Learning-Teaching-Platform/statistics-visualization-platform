import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import pg from "pg";
import { databaseConfig } from "@/generated/database-config";

declare global {
  var __statNodeDatabasePool: pg.Pool | undefined;
}

function isCloudflareWorker() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

function createNodePool(): pg.Pool {
  const password = process.env[databaseConfig.passwordEnv];
  if (!password) {
    throw new Error(`Missing required database secret: ${databaseConfig.passwordEnv}`);
  }

  return new pg.Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.username,
    password,
    ssl: databaseConfig.ssl,
    max: databaseConfig.maxConnections,
    idleTimeoutMillis: databaseConfig.idleTimeoutMs,
    connectionTimeoutMillis: databaseConfig.connectionTimeoutMs,
    allowExitOnIdle: true,
  });
}

function getNodePool(): pg.Pool {
  if (!globalThis.__statNodeDatabasePool) {
    globalThis.__statNodeDatabasePool = createNodePool();
  }
  return globalThis.__statNodeDatabasePool;
}

function createHyperdriveClient(): pg.Client {
  const hyperdrive = getCloudflareContext().env.HYPERDRIVE;
  if (!hyperdrive?.connectionString) {
    throw new Error("Missing required Hyperdrive binding: HYPERDRIVE");
  }
  return new pg.Client({
    connectionString: hyperdrive.connectionString,
    connectionTimeoutMillis: databaseConfig.connectionTimeoutMs,
  });
}

export async function queryDatabase<Row extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<pg.QueryResult<Row>> {
  if (!isCloudflareWorker()) return getNodePool().query<Row>(text, values);

  // Worker sockets belong to one invocation. Hyperdrive makes a fresh edge
  // client inexpensive and retains the reusable connections near PostgreSQL.
  const client = createHyperdriveClient();
  try {
    await client.connect();
    return await client.query<Row>(text, values);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export type DatabaseClient = Pick<pg.Client, "query">;

async function runTransaction<T>(
  client: DatabaseClient,
  work: (client: DatabaseClient) => Promise<T>,
  onRollbackFailure: () => void,
): Promise<T> {
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      onRollbackFailure();
    }
    throw error;
  }
}

export async function withTransaction<T>(work: (client: DatabaseClient) => Promise<T>): Promise<T> {
  if (isCloudflareWorker()) {
    const client = createHyperdriveClient();
    try {
      await client.connect();
      return await runTransaction(client, work, () => undefined);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const client = await getNodePool().connect();
  let destroyClient = false;
  try {
    return await runTransaction(client, work, () => {
      destroyClient = true;
    });
  } finally {
    client.release(destroyClient);
  }
}
