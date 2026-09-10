import { describe, expect, it } from "vitest";
import { consumeTutorStream, TutorStreamError } from "../src/code-learning/tutor-stream";

function streamResponse(chunks: Uint8Array[], status = 200) {
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index++]);
    },
  });
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("consumeTutorStream", () => {
  it("joins split UTF-8 SSE records and preserves event order", async () => {
    const source = [
      'event: reasoning.delta\r\ndata: {"delta":"先检查 "}\r\n\r\n',
      'event: reasoning.delta\r\ndata: {"delta":"参数🧪"}\r\n\r\n',
      'event: message.delta\r\ndata: {"delta":"结论 "}\r\n\r\n',
      'event: message.delta\r\ndata: {"delta":"已得到。"}\r\n\r\n',
      'event: done\r\ndata: {}\r\n\r\n',
    ].join("");
    const encoded = new TextEncoder().encode(source);
    const splitAt = encoded.findIndex((byte, index) => byte === 0x9f && index > 0) + 1;
    const response = streamResponse([encoded.slice(0, splitAt), encoded.slice(splitAt)]);
    const events: unknown[] = [];
    await consumeTutorStream(response, (event) => events.push(event));
    expect(events).toEqual([
      { type: "reasoning.delta", delta: "先检查 " },
      { type: "reasoning.delta", delta: "参数🧪" },
      { type: "message.delta", delta: "结论 " },
      { type: "message.delta", delta: "已得到。" },
      { type: "done" },
    ]);
  });

  it("accepts data-only records and ignores SSE comments", async () => {
    const source = [
      ": keep-alive\n\n",
      'data: {"type":"message.delta","delta":"答案"}\n\n',
      "data: [DONE]\n\n",
    ].join("");
    const response = streamResponse([new TextEncoder().encode(source)]);
    const events: unknown[] = [];
    await consumeTutorStream(response, (event) => events.push(event));
    expect(events).toEqual([{ type: "message.delta", delta: "答案" }, { type: "done" }]);
  });

  it("rejects an incomplete stream and preserves structured HTTP errors", async () => {
    const incomplete = streamResponse([
      new TextEncoder().encode('event: message.delta\ndata: {"delta":"半截"}\n\n'),
    ]);
    await expect(consumeTutorStream(incomplete, () => undefined)).rejects.toThrow(
      "AI stream ended before completion",
    );

    const response = new Response(JSON.stringify({ error: "请重新扫描并选择" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
    await expect(consumeTutorStream(response, () => undefined)).rejects.toMatchObject({
      name: "TutorStreamError",
      status: 409,
      message: "请重新扫描并选择",
    } satisfies Partial<TutorStreamError>);
  });

  it("bounds a single event by encoded bytes rather than UTF-16 characters", async () => {
    const oversizedDelta = "测".repeat(90_000);
    const response = streamResponse([
      new TextEncoder().encode(
        `event: message.delta\ndata: ${JSON.stringify({ delta: oversizedDelta })}\n\n`,
      ),
    ]);

    await expect(consumeTutorStream(response, () => undefined)).rejects.toThrow(
      "AI stream event is too large",
    );
  });
});
