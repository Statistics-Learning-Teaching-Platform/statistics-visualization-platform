import "server-only";

const DEFAULT_AI_URL = "http://alist.tlljyang.pp.ua:61235/api/v1/chat";
export const DEFAULT_AI_MODEL = "qwen3.8-9b-heretic-uncensored-nvfp4@q8_0";
const MAX_AI_RESPONSE_BYTES = 2 * 1024 * 1024;
const MODEL_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._@-]{0,127}$/;
const LEGACY_MODEL_KEY_PATTERN = /^lfm/i;

export interface StatAiModel {
  key: string;
  displayName: string;
  quantization: string;
  params: string;
  loaded: boolean;
  /** Legacy models remain observable for transparency but cannot be selected. */
  legacy: boolean;
  selectable: boolean;
}

export function isLegacyStatAiModel(value: unknown): boolean {
  return typeof value === "string" && LEGACY_MODEL_KEY_PATTERN.test(value.trim());
}

export function resolveStatAiModel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const model = value.trim();
  return MODEL_KEY_PATTERN.test(model) && !isLegacyStatAiModel(model) ? model : undefined;
}

export function configuredStatAiModel(): string {
  return resolveStatAiModel(process.env.STAT_AI_MODEL) ?? DEFAULT_AI_MODEL;
}

export function statAiModelsUrl(): string {
  const endpoint = process.env.STAT_AI_API_URL?.trim() || DEFAULT_AI_URL;
  return endpoint.replace(/\/api\/v1\/chat\/?$/, "/api/v1/models");
}

export async function listStatAiModels(signal?: AbortSignal): Promise<StatAiModel[]> {
  const response = await fetch(statAiModelsUrl(), {
    method: "GET",
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`AI model service returned ${response.status}`);
  const payload = (await response.json()) as {
    models?: Array<{
      type?: string;
      key?: string;
      display_name?: string;
      params_string?: string | null;
      quantization?: { name?: string };
      loaded_instances?: unknown[];
    }>;
  };
  return (payload.models ?? [])
    .filter((model) => model.type === "llm" && typeof model.key === "string")
    .flatMap((model) => {
      const key = (model.key as string).trim();
      if (!MODEL_KEY_PATTERN.test(key)) return [];
      const legacy = isLegacyStatAiModel(key);
      return [{
        key,
        displayName: model.display_name ?? key,
        quantization: model.quantization?.name ?? "",
        params: model.params_string ?? "",
        loaded: (model.loaded_instances?.length ?? 0) > 0,
        legacy,
        selectable: !legacy,
      }];
    });
}

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
  model?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const endpoint = process.env.STAT_AI_API_URL?.trim() || DEFAULT_AI_URL;
  const url = new URL(endpoint);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("STAT_AI_API_URL must use HTTP or HTTPS");
  }

  const model = resolveStatAiModel(options.model)
    ?? configuredStatAiModel();

  const body = JSON.stringify({
    model,
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
