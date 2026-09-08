import "server-only";

import { AuthError } from "@/lib/auth/security";
import {
  findLoadedStatAiModel,
  parseStatAiModelKey,
  parseStatAiModelsPayload,
  selectStatAiReasoning,
  type StatAiModel,
} from "@/lib/stat-ai-models";
import { statAiContextUsage } from "@/lib/ai-context-budget";

export type { StatAiModel } from "@/lib/stat-ai-models";

export class StatAiModelSelectionError extends AuthError {}
export class StatAiContextBudgetError extends AuthError {}

const DEFAULT_AI_URL = "https://models.ljysvr.pp.ua/api/v1/chat";
const MAX_AI_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_OUTPUT_TOKENS = 4_096;
const MIN_MAX_OUTPUT_TOKENS = 128;
const MAX_MAX_OUTPUT_TOKENS = 8_192;

function statAiAuthHeaders(): Record<string, string> {
  // Keep the upstream LM Studio token in a Worker secret. The legacy name is
  // accepted as a migration aid for local deployments, but is never exposed
  // to the browser or included in a response.
  const token = process.env.STAT_AI_API_TOKEN?.trim() || process.env.LM_API_TOKEN?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeMaxOutputTokens(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.max(MIN_MAX_OUTPUT_TOKENS, Math.min(MAX_MAX_OUTPUT_TOKENS, Math.floor(value)));
}

export function statAiModelsUrl(): string {
  const endpoint = process.env.STAT_AI_API_URL?.trim() || DEFAULT_AI_URL;
  return endpoint.replace(/\/api\/v1\/chat\/?$/, "/api/v1/models");
}

/**
 * Requires a model key supplied by the current request. There is deliberately
 * no configured/default model: callers must forward an explicit user choice.
 */
export function resolveStatAiModel(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new StatAiModelSelectionError(400, "请先手动扫描并选择一个已启用模型");
  }
  const model = parseStatAiModelKey(value);
  if (!model) {
    throw new StatAiModelSelectionError(400, "所选模型标识无效，请重新扫描并选择");
  }
  return model;
}

export async function listStatAiModels(signal?: AbortSignal): Promise<StatAiModel[]> {
  const response = await fetch(statAiModelsUrl(), {
    method: "GET",
    headers: statAiAuthHeaders(),
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`AI model service returned ${response.status}`);
  }
  return parseStatAiModelsPayload(await readLimitedJsonResponse<unknown>(response));
}

export async function requireLoadedStatAiModel(value: unknown, signal?: AbortSignal): Promise<StatAiModel> {
  const requested = resolveStatAiModel(value);
  const models = await listStatAiModels(signal);
  const requestedModel = findLoadedStatAiModel(models, requested);
  if (requestedModel) return requestedModel;
  throw new StatAiModelSelectionError(409, "所选模型当前未启用或已被移除，请重新扫描并选择");
}

interface AiOutputItem {
  type?: string;
  content?: string;
}

interface StatAiCallOptions {
  systemPrompt: string;
  input: string;
  model: string;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface StatAiCompletion {
  message: string;
  reasoning?: string;
  model: string;
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

async function readLimitedJsonResponse<T>(response: Response): Promise<T> {
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
    return JSON.parse(text) as T;
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}

async function requestStatAi(options: StatAiCallOptions, includeReasoning: boolean): Promise<StatAiCompletion> {
  const endpoint = process.env.STAT_AI_API_URL?.trim() || DEFAULT_AI_URL;
  const url = new URL(endpoint);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("STAT_AI_API_URL must use HTTP or HTTPS");
  }

  const maxOutputTokens = normalizeMaxOutputTokens(options.maxOutputTokens);
  const usage = statAiContextUsage(options.systemPrompt, options.input, maxOutputTokens);
  if (usage.totalTokens > usage.limitTokens) {
    throw new StatAiContextBudgetError(
      413,
      `AI 上下文超过 8K 安全预算（输入上界 ${usage.systemTokens + usage.inputTokens}，输出预留 ${usage.outputTokens}）`,
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Recheck on every attempt: a failed request or retry delay may coincide
    // with a model change. This is a preflight check, not an atomic no-load
    // guarantee; LM Studio must have JIT loading disabled on the server.
    const model = await requireLoadedStatAiModel(options.model, options.signal);
    const body = JSON.stringify({
      model: model.key,
      system_prompt: options.systemPrompt,
      input: options.input,
      max_output_tokens: maxOutputTokens,
      // Unsupported settings cause an upstream error. Always-on models and
      // models without exposed controls must retain the server default.
      reasoning: selectStatAiReasoning(model, includeReasoning),
      store: false,
    });
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...statAiAuthHeaders() },
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
    const payload = await readLimitedJsonResponse<{ output?: AiOutputItem[] }>(response);
    const message = payload.output
      ?.filter((item) => item.type === "message" && typeof item.content === "string")
      .at(-1)
      ?.content?.trim();
    if (!message) throw new Error("AI returned an empty response");
    const reasoning = payload.output
      ?.filter((item) => item.type === "reasoning" && typeof item.content === "string")
      .map((item) => item.content?.trim())
      .filter((content): content is string => Boolean(content))
      .join("\n\n");
    return { message, reasoning: reasoning || undefined, model: model.key };
  }
  throw new Error("AI service is temporarily unavailable");
}

export async function callStatAi(options: StatAiCallOptions): Promise<string> {
  return (await requestStatAi(options, false)).message;
}

export async function callStatAiWithReasoning(options: StatAiCallOptions): Promise<StatAiCompletion> {
  return requestStatAi(options, true);
}
