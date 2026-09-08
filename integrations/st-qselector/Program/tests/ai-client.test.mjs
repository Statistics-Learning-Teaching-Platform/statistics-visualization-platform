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
