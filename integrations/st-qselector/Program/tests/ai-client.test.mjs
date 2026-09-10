import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import test from "node:test";

// Load the real server implementation without Next's runtime-only marker.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith("/src/lib/auth/security.ts")) {
      return {
        format: "module",
        source: stripTypeScriptTypes(readFileSync(new URL(url), "utf8"), { mode: "transform" }),
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
const {
  callStatAi,
  callStatAiWithReasoning,
  streamStatAiWithReasoning,
  StatAiContextBudgetError,
} = await import("../src/lib/ai-client.ts");
hooks.deregister();

const key = "publisher/statistics-model@q8";
const options = { model: key, systemPrompt: "Help teach statistics.", input: "Explain the mean." };
const catalogue = (loaded, reasoning) => Response.json({ models: [{
  type: "llm", key, loaded_instances: loaded ? [{ id: key }] : [],
  capabilities: reasoning ? { reasoning } : {},
}] });

test("missing, unloaded and removed selections never send an inference request", async (t) => {
  const methods = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    methods.push(init.method);
    assert.equal(init.method, "GET");
    return catalogue(false);
  });
  await assert.rejects(callStatAi({ ...options, model: "" }), { status: 400 });
  assert.deepEqual(methods, []);
  await assert.rejects(callStatAi(options), { status: 409 });
  await assert.rejects(callStatAi({ ...options, model: "removed-model" }), { status: 409 });
  assert.deepEqual(methods, ["GET", "GET"]);
});

test("an over-budget prompt is rejected before model discovery or inference", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (...args) => {
    requests.push(args);
    return catalogue(true);
  });
  await assert.rejects(
    callStatAi({
      ...options,
      systemPrompt: "system",
      input: "课".repeat(3_000),
      maxOutputTokens: 2_048,
    }),
    (error) => error instanceof StatAiContextBudgetError && error.status === 413,
  );
  assert.deepEqual(requests, []);
});

test("a model unloaded during a retry delay blocks the second inference attempt", async (t) => {
  const methods = [];
  let scans = 0;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    methods.push(init.method);
    assert.equal(init.cache, "no-store");
    if (init.method === "GET") return catalogue(scans++ === 0);
    return new Response("temporarily unavailable", { status: 503 });
  });
  await assert.rejects(callStatAi(options), { status: 409 });
  assert.deepEqual(methods, ["GET", "POST", "GET"]);
});

test("inference keeps exact namespaced keys and sends only supported reasoning controls", async (t) => {
  let capability = { allowed_options: ["on"], default: "on" };
  const bodies = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "GET") return catalogue(true, capability);
    const body = JSON.parse(init.body);
    bodies.push(body);
    assert.equal(body.model, key);
    assert.equal(body.store, false);
    return Response.json({ output: [
      { type: "reasoning", content: "First identify the total and count." },
      { type: "message", content: "Divide the total by the count." },
    ] });
  });
  await callStatAi(options);
  assert.equal("reasoning" in bodies[0], false);
  const completion = await callStatAiWithReasoning(options);
  assert.equal(bodies[1].reasoning, "on");
  assert.equal(completion.reasoning, "First identify the total and count.");
  capability = { allowed_options: ["low", "medium", "high"], default: "low" };
  await callStatAiWithReasoning(options);
  assert.equal(bodies[2].reasoning, "low");
  capability = undefined;
  await callStatAiWithReasoning(options);
  assert.equal("reasoning" in bodies[3], false);
});

function chunkedSse(records, chunkSizes = [1, 2, 5, 3]) {
  const bytes = new TextEncoder().encode(records.join(""));
  return new ReadableStream({
    start(controller) {
      let offset = 0;
      let index = 0;
      while (offset < bytes.byteLength) {
        const size = chunkSizes[index++ % chunkSizes.length];
        controller.enqueue(bytes.slice(offset, offset + size));
        offset += size;
      }
      controller.close();
    },
  });
}

function appEvents(text) {
  return text
    .trim()
    .split(/\n\n/)
    .map((record) => {
      const event = record.match(/^event: ([^\n]+)$/m)?.[1];
      const data = record.match(/^data: ([^\n]+)$/m)?.[1];
      return { event, data: data ? JSON.parse(data) : undefined };
    });
}

test("tutor streaming maps reasoning and message deltas without duplicating chat.end", async (t) => {
  const bodies = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "GET") return catalogue(true, { allowed_options: ["on"], default: "on" });
    bodies.push(JSON.parse(init.body));
    const records = [
      "event: chat.start\ndata: {\"type\":\"chat.start\"}\n\n",
      "event: reasoning.start\ndata: {\"type\":\"reasoning.start\"}\n\n",
      `event: reasoning.delta\ndata: ${JSON.stringify({ type: "reasoning.delta", content: "先想" })}\n\n`,
      `event: message.delta\ndata: ${JSON.stringify({ type: "message.delta", content: "答" })}\n\n`,
      `event: chat.end\ndata: ${JSON.stringify({ type: "chat.end", result: { output: [
        { type: "reasoning", content: "先想" },
        { type: "message", content: "答" },
      ] } })}\n\n`,
    ];
    return new Response(chunkedSse(records));
  });
  const stream = await streamStatAiWithReasoning({ ...options, maxOutputTokens: 256 });
  const events = appEvents(await new Response(stream).text());
  assert.equal(bodies[0].stream, true);
  assert.deepEqual(events.map(({ event }) => event), [
    "reasoning.delta",
    "message.delta",
    "done",
  ]);
  assert.deepEqual(events.map(({ data }) => data.delta).filter(Boolean), ["先想", "答"]);
});

test("tutor streaming works without reasoning and only supplements a missing aggregate suffix", async (t) => {
  const bodies = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "GET") return catalogue(true);
    bodies.push(JSON.parse(init.body));
    return new Response(chunkedSse([
      `event: message.delta\ndata: ${JSON.stringify({ type: "message.delta", content: "答" })}\n\n`,
      `event: chat.end\ndata: ${JSON.stringify({ type: "chat.end", result: { output: [
        { type: "message", content: "答案完整" },
      ] } })}\n\n`,
    ]));
  });
  const stream = await streamStatAiWithReasoning(options);
  const events = appEvents(await new Response(stream).text());
  assert.equal("reasoning" in bodies[0], false);
  assert.deepEqual(events.map(({ event }) => event), ["message.delta", "message.delta", "done"]);
  assert.deepEqual(events.map(({ data }) => data.delta).filter(Boolean), ["答", "案完整"]);
});

test("tutor streaming reports upstream errors and truncated streams as app errors", async (t) => {
  let mode = "error";
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "GET") return catalogue(true);
    const record = mode === "error"
      ? [
          `event: error\ndata: ${JSON.stringify({ type: "error", error: { message: "upstream failed" } })}\n\n`,
          `event: chat.end\ndata: ${JSON.stringify({ type: "chat.end", result: { output: [
            { type: "message", content: "must not escape after an error" },
          ] } })}\n\n`,
        ].join("")
      : "event: message.start\ndata: {\"type\":\"message.start\"}\n\n";
    return new Response(record);
  });
  let stream = await streamStatAiWithReasoning(options);
  let events = appEvents(await new Response(stream).text());
  assert.equal(events.at(-1)?.event, "error");
  assert.equal(events.some(({ event }) => event === "done"), false);
  assert.match(events.at(-1)?.data.message, /upstream failed/);
  mode = "truncated";
  stream = await streamStatAiWithReasoning(options);
  events = appEvents(await new Response(stream).text());
  assert.equal(events.at(-1)?.event, "error");
  assert.match(events.at(-1)?.data.message, /ended before completion/);
});

test("cancelling a tutor stream cancels the upstream reader", async (t) => {
  let upstreamCancellation;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "GET") return catalogue(true);
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          `event: message.delta\ndata: ${JSON.stringify({ type: "message.delta", content: "partial" })}\n\n`,
        ));
      },
      cancel(reason) {
        upstreamCancellation = reason;
      },
    }));
  });
  const stream = await streamStatAiWithReasoning(options);
  const reader = stream.getReader();
  assert.equal((await reader.read()).done, false);
  await reader.cancel("learner left");
  assert.equal(upstreamCancellation, "learner left");
});

test("aborting a tutor request actively cancels an upstream body that ignores the fetch signal", async (t) => {
  const request = new AbortController();
  let upstreamCancellation;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "GET") return catalogue(true);
    return new Response(new ReadableStream({
      cancel(reason) {
        upstreamCancellation = reason;
      },
    }));
  });
  const stream = await streamStatAiWithReasoning({ ...options, signal: request.signal });
  const reader = stream.getReader();
  const pendingRead = reader.read();
  request.abort();
  await assert.rejects(pendingRead, (error) => error === request.signal.reason);
  assert.equal(upstreamCancellation, request.signal.reason);
});

test("an over-limit upstream stream is cancelled and cannot report success", async (t) => {
  let upstreamCancellations = 0;
  const oversized = Array.from({ length: 9 }, () =>
    `event: chat.start\ndata: ${JSON.stringify({ type: "chat.start", padding: "x".repeat(250_000) })}\n\n`
  ).join("");
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "GET") return catalogue(true);
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(oversized));
      },
      cancel() {
        upstreamCancellations += 1;
      },
    }));
  });
  const stream = await streamStatAiWithReasoning(options);
  const events = appEvents(await new Response(stream).text());
  assert.equal(events.at(-1)?.event, "error");
  assert.match(events.at(-1)?.data.message, /too large/);
  assert.equal(events.some(({ event }) => event === "done"), false);
  assert.equal(upstreamCancellations, 1);
});
