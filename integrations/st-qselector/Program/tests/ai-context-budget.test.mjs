import assert from "node:assert/strict";
import test from "node:test";
import {
  conservativeStatAiTokenCount,
  STAT_AI_CONTEXT_OVERHEAD_TOKENS,
  STAT_AI_CONTEXT_WINDOW_TOKENS,
  statAiContextUsage,
  statAiInputByteBudget,
  truncateStatAiJsonString,
  truncateStatAiUtf8,
} from "../src/lib/ai-context-budget.ts";

test("the conservative token bound accounts for UTF-8 byte fallback", () => {
  assert.equal(conservativeStatAiTokenCount("abc"), 3);
  assert.equal(conservativeStatAiTokenCount("统计"), 6);
  assert.equal(conservativeStatAiTokenCount("🧪"), 4);
});

test("system, input, reserved output, and framing share one 8K budget", () => {
  const systemPrompt = "s".repeat(400);
  const maxOutputTokens = 2_048;
  const inputBudget = statAiInputByteBudget(systemPrompt, maxOutputTokens);
  const atLimit = statAiContextUsage(systemPrompt, "i".repeat(inputBudget), maxOutputTokens);
  assert.equal(atLimit.totalTokens, STAT_AI_CONTEXT_WINDOW_TOKENS);
  assert.equal(atLimit.overheadTokens, STAT_AI_CONTEXT_OVERHEAD_TOKENS);
  assert.equal(
    statAiContextUsage(systemPrompt, `${"i".repeat(inputBudget)}x`, maxOutputTokens).totalTokens,
    STAT_AI_CONTEXT_WINDOW_TOKENS + 1,
  );
});

test("prompt truncation preserves Unicode and JSON byte budgets", () => {
  const text = truncateStatAiUtf8("统计🧪".repeat(100), 37);
  assert.ok(conservativeStatAiTokenCount(text) <= 37);
  assert.equal(new TextDecoder("utf-8", { fatal: true }).decode(new TextEncoder().encode(text)), text);
  assert.ok(text.endsWith("…[truncated]"));

  const jsonValue = truncateStatAiJsonString('🧪"\\\u0000'.repeat(100), 80);
  assert.ok(conservativeStatAiTokenCount(JSON.stringify(jsonValue)) <= 80);
  assert.equal(new TextDecoder("utf-8", { fatal: true }).decode(new TextEncoder().encode(jsonValue)), jsonValue);
});

test("invalid and unbounded numeric allowances fail closed", () => {
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(statAiInputByteBudget("system", invalid), 0);
    const usage = statAiContextUsage("system", "input", invalid);
    assert.ok(Number.isFinite(usage.totalTokens));
    assert.ok(usage.totalTokens > STAT_AI_CONTEXT_WINDOW_TOKENS);
  }

  assert.equal(truncateStatAiUtf8("content", Number.NaN), "");
  assert.equal(truncateStatAiUtf8("content", Number.NEGATIVE_INFINITY), "");
  assert.equal(truncateStatAiUtf8("content", Number.POSITIVE_INFINITY), "content");
});
