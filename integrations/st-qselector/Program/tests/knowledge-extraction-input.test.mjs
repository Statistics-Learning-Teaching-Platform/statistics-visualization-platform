import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
    }
    if (specifier === "@/lib/ai-client") {
      return {
        url: "data:text/javascript,export%20async%20function%20callStatAi()%7Breturn%20%27%27%7D",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const {
  boundedKnowledgeSample,
  KNOWLEDGE_MAX_OUTPUT_TOKENS,
  KNOWLEDGE_SYSTEM_PROMPT,
  MAX_AI_KNOWLEDGE_INPUT_BYTES,
} = await import("../src/lib/knowledge-extraction.ts");
hooks.deregister();

test("large courseware is sampled across the document within the model input budget", () => {
  const source = `${"opening ".repeat(6_000)}${"中间内容".repeat(8_000)}${"closing ".repeat(6_000)}`;
  const sample = boundedKnowledgeSample(source);
  assert.ok(new TextEncoder().encode(sample).length <= MAX_AI_KNOWLEDGE_INPUT_BYTES);
  assert.match(sample, /^opening /);
  assert.match(sample, /courseware middle sample/);
  assert.match(sample, /中间内容/);
  assert.match(sample, /courseware final sample/);
  assert.match(sample, /closing $/);
});

test("knowledge sampling derives its input allowance from the shared 8K budget", async () => {
  const { statAiContextUsage } = await import("../src/lib/ai-context-budget.ts");
  const maximumSample = "x".repeat(MAX_AI_KNOWLEDGE_INPUT_BYTES);
  assert.equal(
    statAiContextUsage(
      KNOWLEDGE_SYSTEM_PROMPT,
      maximumSample,
      KNOWLEDGE_MAX_OUTPUT_TOKENS,
    ).totalTokens,
    8_192,
  );
});

test("small courseware is sent without rewriting", () => {
  const source = "Confidence intervals and hypothesis tests.";
  assert.equal(boundedKnowledgeSample(source), source);
});
