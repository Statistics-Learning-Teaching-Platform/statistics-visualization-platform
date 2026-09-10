import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__rateLimitStreamDb = undefined;

const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: moduleUrl("export {};"), shortCircuit: true };
    }
    if (specifier === "@/lib/db") {
      return {
        url: moduleUrl(`
          export async function withTransaction(work) {
            const state = globalThis.__rateLimitStreamDb;
            return work({
              async query(text, values) {
                state.transactionQueries.push({ text, values });
                if (text.includes("count(*)")) return { rows: [{ count: "0" }] };
                return { rows: [] };
              },
            });
          }
          export async function queryDatabase(text, values) {
            globalThis.__rateLimitStreamDb.releaseQueries.push({ text, values });
            return { rows: [] };
          }
        `),
        shortCircuit: true,
      };
    }
    if (context.parentURL?.endsWith("/src/lib/auth/rate-limit.ts") && specifier === "./client-address") {
      return {
        url: moduleUrl("export function resolveClientAddress() { return 'test'; }"),
        shortCircuit: true,
      };
    }
    if (context.parentURL?.endsWith("/src/lib/auth/rate-limit.ts") && specifier === "./security") {
      return {
        url: moduleUrl(`
          export class AuthError extends Error {
            constructor(status, message) { super(message); this.status = status; }
          }
          export function randomToken() { return "test-lease-token"; }
          export async function sha256(value) { return value; }
        `),
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const { withConcurrencyLeaseStream } = await import("../src/lib/auth/rate-limit.ts");
hooks.deregister();

function resetDb() {
  globalThis.__rateLimitStreamDb = { transactionQueries: [], releaseQueries: [] };
  return globalThis.__rateLimitStreamDb;
}

function options(work, overrides = {}) {
  return {
    route: "test-stream",
    limit: 2,
    ttlSeconds: 30,
    work,
    ...overrides,
  };
}

test("a streaming concurrency lease remains held until the body finishes", async () => {
  const db = resetDb();
  let upstream;
  const response = await withConcurrencyLeaseStream(options(async () => new Response(new ReadableStream({
    start(controller) {
      upstream = controller;
    },
  }))));
  assert.equal(db.releaseQueries.length, 0);

  const reader = response.body.getReader();
  upstream.enqueue(Uint8Array.of(1, 2, 3));
  assert.deepEqual(await reader.read(), { done: false, value: Uint8Array.of(1, 2, 3) });
  assert.equal(db.releaseQueries.length, 0);

  upstream.close();
  assert.deepEqual(await reader.read(), { done: true, value: undefined });
  await new Promise(setImmediate);
  assert.equal(db.releaseQueries.length, 1);
});

test("consumer cancellation cancels the source and releases its lease exactly once", async () => {
  const db = resetDb();
  let cancelledWith;
  const response = await withConcurrencyLeaseStream(options(async () => new Response(new ReadableStream({
    cancel(reason) {
      cancelledWith = reason;
    },
  }))));
  const reader = response.body.getReader();
  await reader.cancel("drawer closed");
  await reader.cancel("duplicate cancellation");
  assert.equal(cancelledWith, "drawer closed");
  assert.equal(db.releaseQueries.length, 1);
});

test("request abort and lease timeout actively cancel the source and release the lease", async (t) => {
  await t.test("request abort", async () => {
    const db = resetDb();
    const request = new AbortController();
    let cancelledWith;
    const response = await withConcurrencyLeaseStream(options(async () => new Response(new ReadableStream({
      cancel(reason) {
        cancelledWith = reason;
      },
    })), { requestSignal: request.signal }));
    const reader = response.body.getReader();
    const pendingRead = reader.read();
    request.abort();
    await assert.rejects(pendingRead, (error) => error === request.signal.reason);
    await new Promise(setImmediate);
    assert.equal(cancelledWith, request.signal.reason);
    assert.equal(db.releaseQueries.length, 1);
  });

  await t.test("lease timeout", async () => {
    const db = resetDb();
    let cancelledWith;
    const response = await withConcurrencyLeaseStream(options(async () => new Response(new ReadableStream({
      cancel(reason) {
        cancelledWith = reason;
      },
    })), { ttlSeconds: 0.01 }));
    const reader = response.body.getReader();
    let guard;
    try {
      await assert.rejects(
        Promise.race([
          reader.read(),
          new Promise((_, reject) => {
            guard = setTimeout(() => reject(new Error("lease timeout did not abort")), 250);
          }),
        ]),
        { name: "TimeoutError" },
      );
    } finally {
      clearTimeout(guard);
    }
    await new Promise(setImmediate);
    assert.equal(cancelledWith?.name, "TimeoutError");
    assert.equal(db.releaseQueries.length, 1);
  });
});

test("setup failures release the streaming concurrency lease", async (t) => {
  await t.test("work failure", async () => {
    const db = resetDb();
    await assert.rejects(
      withConcurrencyLeaseStream(options(async () => {
        throw new Error("setup failed");
      })),
      /setup failed/,
    );
    assert.equal(db.releaseQueries.length, 1);
  });

  await t.test("locked response body", async () => {
    const db = resetDb();
    const original = new Response("locked");
    const reader = original.body.getReader();
    await assert.rejects(
      withConcurrencyLeaseStream(options(async () => original)),
      TypeError,
    );
    assert.equal(db.releaseQueries.length, 1);
    reader.releaseLock();
    await original.body.cancel();
  });
});
