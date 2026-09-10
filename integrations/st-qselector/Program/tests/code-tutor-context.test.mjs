import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { formatCodeTutorInput } = await import("../src/lib/code-tutor-context.ts");
hooks.deregister();

test("code tutor input stays inside its dynamic model allowance", () => {
  const maximumBytes = 3_200;
  const input = formatCodeTutorInput({
    question: "为什么这段代码失败？".repeat(300),
    code: 'print("统计🧪")\n'.repeat(1_000),
    console: ["错误输出".repeat(1_000)],
    review: "检查结果".repeat(1_000),
    lesson: {
      title: "抽样分布".repeat(200),
      objective: "理解标准误".repeat(500),
      task: "完成练习".repeat(500),
      concepts: Array.from({ length: 100 }, () => "均值"),
    },
    history: Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 ? "assistant" : "user",
      content: "历史消息".repeat(500),
    })),
  }, "R", maximumBytes);

  assert.ok(Buffer.byteLength(input, "utf8") <= maximumBytes);
  assert.match(input, /^LEARNER QUESTION\n/);
  assert.equal(new TextDecoder("utf-8", { fatal: true }).decode(new TextEncoder().encode(input)), input);
  assert.ok(input.endsWith("…[truncated]"));
});

test("small code tutor input preserves the learner's concrete context", () => {
  const input = formatCodeTutorInput({
    question: "Why is the mean four?",
    code: "mean(c(2, 4, 6))",
    console: ["[1] 4"],
    review: "Passed",
    lesson: { title: "Mean", objective: "Interpret a sample mean", task: "Run the code" },
    history: [{ role: "user", content: "I expected five." }],
  }, "R", 8_000);

  for (const expected of [
    "Why is the mean four?",
    "mean(c(2, 4, 6))",
    "[1] 4",
    "Interpret a sample mean",
    "I expected five.",
  ]) {
    assert.match(input, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
