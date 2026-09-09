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
  const lease = await acquireConcurrencyLease(options);
  try {
    return await options.work(lease.signal);
  } finally {
    await lease.release();
  }
}

type ConcurrencyLeaseOptions = {
  route: string;
  limit: number;
  ttlSeconds: number;
  busyMessage?: string;
  requestSignal?: AbortSignal;
};

type ConcurrencyLease = {
  signal: AbortSignal;
  release: () => Promise<void>;
};

async function acquireConcurrencyLease(options: ConcurrencyLeaseOptions): Promise<ConcurrencyLease> {
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
  let released = false;
  return {
    signal,
    release: async () => {
      if (released) return;
      released = true;
      await queryDatabase(
        "DELETE FROM api_concurrency_leases WHERE route = $1 AND lease_token = $2",
        [options.route, token],
      ).catch((error) => console.error("Failed to release API concurrency lease", error));
    },
  };
}

/**
 * Holds a concurrency lease until a streamed Response has been consumed or
 * cancelled. Returning a Response from the ordinary helper would otherwise
 * release the lease as soon as the headers are created, allowing unbounded
 * concurrent generations while their bodies are still running.
 */
export async function withConcurrencyLeaseStream(options: {
  route: string;
  limit: number;
  ttlSeconds: number;
  busyMessage?: string;
  requestSignal?: AbortSignal;
  work: (signal: AbortSignal) => Promise<Response>;
}): Promise<Response> {
  const lease = await acquireConcurrencyLease(options);
  let response: Response;
  try {
    response = await options.work(lease.signal);
  } catch (error) {
    await lease.release();
    throw error;
  }

  const body = response.body;
  if (!body) {
    await lease.release();
    return response;
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = body.getReader();
  } catch (error) {
    await lease.release();
    throw error;
  }

  let terminal = false;
  let readerReleased = false;
  let finalization: Promise<void> | undefined;
  let removeAbortListener: () => void = () => undefined;

  const releaseReader = () => {
    if (readerReleased) return;
    readerReleased = true;
    reader.releaseLock();
  };
  const finalize = (cancel: boolean, reason?: unknown) => {
    if (finalization) return finalization;
    terminal = true;
    removeAbortListener();
    finalization = (async () => {
      try {
        if (cancel) await reader.cancel(reason).catch(() => undefined);
      } finally {
        try {
          releaseReader();
        } finally {
          await lease.release();
        }
      }
    })();
    return finalization;
  };

  const wrapped = new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = () => {
        if (terminal) return;
        const reason = lease.signal.reason ?? new DOMException("Aborted", "AbortError");
        terminal = true;
        try {
          controller.error(reason);
        } catch {
          // The browser may have cancelled the response at the same time.
        }
        void finalize(true, reason);
      };
      removeAbortListener = () => lease.signal.removeEventListener("abort", abort);
      if (lease.signal.aborted) abort();
      else lease.signal.addEventListener("abort", abort, { once: true });
    },
    async pull(controller) {
      if (terminal) return;
      try {
        const next = await reader.read();
        if (terminal) return;
        if (next.done) {
          terminal = true;
          controller.close();
          await finalize(false);
          return;
        }
        controller.enqueue(next.value);
      } catch (error) {
        if (terminal) return;
        terminal = true;
        try {
          controller.error(error);
        } finally {
          await finalize(false);
        }
      }
    },
    cancel(reason) {
      return finalize(true, reason);
    },
  });

  return new Response(wrapped, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
