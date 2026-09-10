import { describe, expect, it } from "vitest";
import { prepareCodeTutorRequest, truncateJsonString } from "../src/code-learning/tutorPayload";

describe("code tutor request envelope", () => {
  it("bounds the encoded JSON body and sends each consumed field only once", () => {
    const request = prepareCodeTutorRequest({
      language: "zh",
      model: `发布者/${"模型🧪".repeat(100)}`,
      question: `为什么？${"问\"\\\u0000🧪".repeat(1_000)}`,
      lesson: {
        title: "标题".repeat(1_000),
        objective: "目标".repeat(2_000),
        task: "任务".repeat(2_000),
        concepts: Array.from({ length: 30 }, () => "概念🧪".repeat(100)),
      },
      code: `print("${"值🧪\\\u0000".repeat(10_000)}")`,
      console: ["输出🧪\u0000".repeat(20_000)],
      review: "检查结果".repeat(2_000),
      history: Array.from({ length: 6 }, (_, index) => ({
        role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: "历史🧪\"\\\u0000".repeat(2_000),
      })),
    });

    expect(new TextEncoder().encode(request.body).length).toBeLessThanOrEqual(20_000);
    const payload = JSON.parse(request.body) as Record<string, unknown>;
    expect(payload).not.toHaveProperty("currentCode");
    expect(payload).not.toHaveProperty("consoleOutput");
    expect(payload).not.toHaveProperty("currentParameters");
    expect(payload).not.toHaveProperty("chartSummary");
    expect(payload.question).toBe(request.question);
    expect(payload.code).toEqual(expect.any(String));
    expect(payload.console).toEqual([expect.any(String)]);
  });

  it("does not split Unicode code points while accounting for JSON escaping", () => {
    const bounded = truncateJsonString('🧪"\\\u0000'.repeat(100), 80);
    expect(new TextEncoder().encode(JSON.stringify(bounded)).length).toBeLessThanOrEqual(80);
    expect(bounded).not.toMatch(/[\uD800-\uDBFF]$/u);
  });
});
