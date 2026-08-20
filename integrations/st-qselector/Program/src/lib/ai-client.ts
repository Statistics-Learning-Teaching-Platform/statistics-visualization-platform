import "server-only";

const DEFAULT_AI_URL = "http://alist.tlljyang.pp.ua:61235/api/v1/chat";
const DEFAULT_AI_MODEL = "lfm2.5-8b-a1b@q6_k";
const MAX_AI_RESPONSE_BYTES = 2 * 1024 * 1024;

interface AiOutputItem {
  type?: string;
  content?: string;
}

function waitBeforeRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function readLimitedJsonResponse(response: Response): Promise<{ output?: AiOutputItem[] }> {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AI_RESPONSE_BYTES) {
    throw new Error("AI response is too large");
  }
  if (!response.body) throw new Error("AI returned an empty response");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_AI_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("AI response is too large");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text) as { output?: AiOutputItem[] };
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}

export async function callStatAi(options: {
  systemPrompt: string;
  input: string;
  signal?: AbortSignal;
}): Promise<string> {
  const endpoint = process.env.STAT_AI_API_URL?.trim() || DEFAULT_AI_URL;
  const url = new URL(endpoint);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("STAT_AI_API_URL must use HTTP or HTTPS");
  }

  const body = JSON.stringify({
    model: process.env.STAT_AI_MODEL?.trim() || DEFAULT_AI_MODEL,
    system_prompt: options.systemPrompt,
    input: options.input,
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: options.signal,
      cache: "no-store",
      body,
    });
    if (!response.ok) {
      const retryable = [500, 502, 503, 504].includes(response.status) && attempt < 2;
      await response.body?.cancel();
      if (retryable) {
        await waitBeforeRetry(300 * (2 ** attempt), options.signal);
        continue;
      }
      throw new Error(`AI service returned ${response.status}`);
    }
    const payload = await readLimitedJsonResponse(response);
    const message = payload.output
      ?.filter((item) => item.type === "message" && typeof item.content === "string")
      .at(-1)
      ?.content?.trim();
    if (!message) throw new Error("AI returned an empty response");
    return message;
  }
  throw new Error("AI service is temporarily unavailable");
}
