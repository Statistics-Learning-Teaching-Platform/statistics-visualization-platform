import "server-only";

import { queryDatabase, withTransaction } from "@/lib/db";
import { resolveClientAddress } from "./client-address";
import { AuthError, randomToken, sha256 } from "./security";

export async function requestPrincipal(request: Request, userId?: string): Promise<string> {
  if (userId) return `user:${userId}`;
  const address = resolveClientAddress(request.headers, process.env.STAT_TRUSTED_PROXY);
  return `ip:${await sha256(address)}`;
}

export async function consumeRateLimit(options: {
  principal: string;
  route: string;
  limit: number;
  windowSeconds: number;
}) {
  const bucketMs = options.windowSeconds * 1000;
  const bucketStart = new Date(Math.floor(Date.now() / bucketMs) * bucketMs);
  const result = await queryDatabase<{ request_count: number }>(
    `WITH cleanup AS (
       DELETE FROM api_rate_limits WHERE bucket_start < now() - interval '24 hours'
     )
     INSERT INTO api_rate_limits (principal, route, bucket_start, request_count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (principal, route, bucket_start)
     DO UPDATE SET request_count = api_rate_limits.request_count + 1
     RETURNING request_count`,
    [options.principal, options.route, bucketStart],
  );
  if (result.rows[0].request_count > options.limit) {
    throw new AuthError(429, "请求过于频繁，请稍后再试");
  }
}

export async function withConcurrencyLease<T>(options: {
  route: string;
  limit: number;
  ttlSeconds: number;
  busyMessage?: string;
  work: (signal: AbortSignal) => Promise<T>;
  requestSignal?: AbortSignal;
}): Promise<T> {
  const token = randomToken(24);
  const acquired = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`statmind:${options.route}`]);
    await client.query("DELETE FROM api_concurrency_leases WHERE expires_at <= now()");
    const count = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM api_concurrency_leases WHERE route = $1",
      [options.route],
    );
    if (Number(count.rows[0]?.count ?? 0) >= options.limit) return false;
    await client.query(
      `INSERT INTO api_concurrency_leases (route, lease_token, expires_at)
       VALUES ($1, $2, now() + ($3 * interval '1 second'))`,
      [options.route, token, options.ttlSeconds],
    );
    return true;
  });
  if (!acquired) throw new AuthError(503, options.busyMessage ?? "AI 服务当前请求较多，请稍后重试");

  const timeout = AbortSignal.timeout(options.ttlSeconds * 1000);
  const signal = options.requestSignal
    ? AbortSignal.any([options.requestSignal, timeout])
    : timeout;
  try {
    return await options.work(signal);
  } finally {
    await queryDatabase(
      "DELETE FROM api_concurrency_leases WHERE route = $1 AND lease_token = $2",
      [options.route, token],
    ).catch((error) => console.error("Failed to release API concurrency lease", error));
  }
}
