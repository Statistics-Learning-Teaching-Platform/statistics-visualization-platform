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
const MAX_AI_EVENT_BYTES = 256 * 1024;
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

export interface StatAiCallOptions {
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

export type StatAiStreamEvent =
  | { type: "reasoning.delta"; delta: string }
  | { type: "message.delta"; delta: string }
  | { type: "done"; model: string }
  | { type: "error"; message: string; status: number };

class StatAiStreamProtocolError extends Error {}

type ParsedSseRecord = { eventName: string; data: string };

const streamEncoder = new TextEncoder();

function appStreamEvent(event: StatAiStreamEvent): Uint8Array {
  const eventName = event.type;
  return streamEncoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(event)}\n\n`);
}

function parseUpstreamSseRecord(record: string): ParsedSseRecord | null {
  if (!record.trim()) return null;
  const lines = record.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let eventName = "";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "event") eventName = value;
    if (field === "data") dataLines.push(value);
  }
  if (!dataLines.length) return null;
  return { eventName, data: dataLines.join("\n") };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function streamErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.trim().slice(0, 500) || "AI stream failed";
}

function isAbortLike(error: unknown, signal?: AbortSignal): boolean {
  return Boolean(
    signal?.aborted ||
      (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) ||
      (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")),
  );
}

function outputTextItems(value: unknown, type: "message" | "reasoning"): string[] {
  if (!isRecord(value) || !Array.isArray(value.output)) return [];
  return value.output
    .filter((item): item is Record<string, unknown> => isRecord(item) && item.type === type)
    .map((item) => (typeof item.content === "string" ? item.content : ""))
    .filter(Boolean);
}

/**
 * Converts LM Studio's named SSE stream into the small application-owned
 * protocol consumed by the three tutor UIs. Lifecycle and tool events never
 * cross the browser boundary; only reasoning/message deltas and completion or
 * error are exposed.
 */
function normalizeStatAiStream(
  response: Response,
  model: string,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  if (!response.body) throw new Error("AI returned an empty stream");
  const reader = response.body.getReader();
  let cancelled = false;
  let readerReleased = false;
  let abortCancellation: Promise<void> | undefined;
  let removeAbortListener: () => void = () => undefined;
  const releaseReader = () => {
    if (readerReleased) return;
    readerReleased = true;
    reader.releaseLock();
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = () => {
        if (cancelled || abortCancellation) return;
        abortCancellation = reader.cancel(
          signal?.reason ?? new DOMException("Aborted", "AbortError"),
        ).catch(() => undefined);
      };
      removeAbortListener = () => signal?.removeEventListener("abort", abort);
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });

      void (async () => {
        let pending = "";
        let inputBytes = 0;
        let outputBytes = 0;
        let reasoning = "";
        let message = "";
        let sawChatEnd = false;
        let finished = false;
        let controllerClosed = false;
        const boundaryPattern = /\r\n\r\n|\n\n|\r\r/;
        const decoder = new TextDecoder();

        const closeController = () => {
          if (controllerClosed || cancelled) return;
          controllerClosed = true;
          controller.close();
        };

        const enqueueEvent = (event: StatAiStreamEvent) => {
          const bytes = appStreamEvent(event);
          outputBytes += bytes.byteLength;
          if (outputBytes > MAX_AI_RESPONSE_BYTES) {
            throw new StatAiStreamProtocolError("AI response is too large");
          }
          controller.enqueue(bytes);
        };

        const appendAggregate = (kind: "reasoning" | "message", aggregate: string) => {
          if (!aggregate) return;
          const current = kind === "reasoning" ? reasoning : message;
          if (aggregate === current) return;
          let delta = aggregate;
          if (current && aggregate.startsWith(current)) delta = aggregate.slice(current.length);
          // A provider should make the final aggregate a prefix extension of
          // its deltas. If it does not, trust the already streamed text and do
          // not duplicate or overwrite anything in the learner's transcript.
          if (current && delta === aggregate && !aggregate.startsWith(current)) return;
          if (kind === "reasoning") reasoning += delta;
          else message += delta;
          if (delta) enqueueEvent({ type: kind === "reasoning" ? "reasoning.delta" : "message.delta", delta });
        };

        const processRecord = (record: string) => {
          if (streamEncoder.encode(record).byteLength > MAX_AI_EVENT_BYTES) {
            throw new StatAiStreamProtocolError("AI stream event is too large");
          }
          const parsedRecord = parseUpstreamSseRecord(record);
          if (!parsedRecord) return;
          let payload: unknown;
          try {
            payload = JSON.parse(parsedRecord.data);
          } catch {
            throw new StatAiStreamProtocolError("AI returned an invalid stream event");
          }
          if (!isRecord(payload)) throw new StatAiStreamProtocolError("AI returned an invalid stream event");
          const type = typeof payload.type === "string" ? payload.type : parsedRecord.eventName;
          if (type === "reasoning.delta" || type === "message.delta") {
            if (typeof payload.content !== "string" || !payload.content) {
              throw new StatAiStreamProtocolError("AI returned an invalid stream delta");
            }
            if (type === "reasoning.delta") reasoning += payload.content;
            else message += payload.content;
            enqueueEvent({ type, delta: payload.content });
            return;
          }
          if (type === "error") {
            const errorPayload = isRecord(payload.error) ? payload.error : undefined;
            const upstreamMessage = errorPayload && typeof errorPayload.message === "string"
              ? errorPayload.message
              : "AI service returned a stream error";
            throw new StatAiStreamProtocolError(streamErrorMessage(upstreamMessage));
          }
          if (type !== "chat.end") return;
          const result = payload.result;
          appendAggregate("reasoning", outputTextItems(result, "reasoning").join("\n\n"));
          appendAggregate("message", outputTextItems(result, "message").at(-1) ?? "");
          if (!message.trim()) throw new StatAiStreamProtocolError("AI returned an empty response");
          sawChatEnd = true;
          enqueueEvent({ type: "done", model });
        };

        const sendErrorAndClose = (error: unknown) => {
          if (finished || cancelled) return;
          if (isAbortLike(error, signal)) {
            finished = true;
            // Propagate cancellation to the outer response so its lease and
            // the browser's fetch both finish promptly; do not manufacture a
            // user-facing error after an intentional abort.
            try {
              controller.error(signal?.reason ?? error);
            } catch {
              // The consumer may already have cancelled the stream.
            }
            return;
          }
          try {
            enqueueEvent({ type: "error", message: streamErrorMessage(error), status: 502 });
          } catch {
            // The output budget may itself be exhausted; closing the stream
            // still lets the client detect an incomplete response.
          }
          finished = true;
          closeController();
        };

        try {
          while (!finished) {
            const next = await reader.read();
            if (next.done) break;
            inputBytes += next.value.byteLength;
            if (inputBytes > MAX_AI_RESPONSE_BYTES) {
              throw new StatAiStreamProtocolError("AI response is too large");
            }
            pending += decoder.decode(next.value, { stream: true });
            if (pending.length > MAX_AI_EVENT_BYTES && !boundaryPattern.test(pending)) {
              throw new StatAiStreamProtocolError("AI stream event is too large");
            }
            let boundary: RegExpExecArray | null;
            while ((boundary = boundaryPattern.exec(pending))) {
              const record = pending.slice(0, boundary.index);
              pending = pending.slice(boundary.index + boundary[0].length);
              processRecord(record);
              if (sawChatEnd) {
                finished = true;
                break;
              }
            }
          }
          if (signal?.aborted) {
            throw signal.reason ?? new DOMException("Aborted", "AbortError");
          }
          if (!finished) {
            const tail = pending + decoder.decode();
            if (tail.trim()) processRecord(tail);
          }
          if (sawChatEnd && !cancelled) {
            finished = true;
            closeController();
          } else if (!sawChatEnd && !cancelled) {
            throw new StatAiStreamProtocolError("AI stream ended before completion");
          }
        } catch (error) {
          sendErrorAndClose(error);
        } finally {
          removeAbortListener();
          if (abortCancellation) await abortCancellation;
          else if (!cancelled) await reader.cancel().catch(() => undefined);
          releaseReader();
        }
      })();
    },
    async cancel(reason) {
      cancelled = true;
      removeAbortListener();
      if (abortCancellation) await abortCancellation;
      else await reader.cancel(reason).catch(() => undefined);
      releaseReader();
    },
  });
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

/**
 * Opens a real LM Studio SSE generation after the same context and live-model
 * checks used by the non-streaming paths. Retries are deliberately limited to
 * failures received before a response stream is opened; once a delta reaches
 * the caller, replaying the request could duplicate learner-visible text.
 */
export async function streamStatAiWithReasoning(
  options: StatAiCallOptions,
): Promise<ReadableStream<Uint8Array>> {
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
    const model = await requireLoadedStatAiModel(options.model, options.signal);
    const reasoning = selectStatAiReasoning(model, true);
    const body = JSON.stringify({
      model: model.key,
      system_prompt: options.systemPrompt,
      input: options.input,
      max_output_tokens: maxOutputTokens,
      ...(reasoning ? { reasoning } : {}),
      store: false,
      stream: true,
    });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        ...statAiAuthHeaders(),
      },
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
    return normalizeStatAiStream(response, model.key, options.signal);
  }
  throw new Error("AI service is temporarily unavailable");
}

export async function callStatAi(options: StatAiCallOptions): Promise<string> {
  return (await requestStatAi(options, false)).message;
}

export async function callStatAiWithReasoning(options: StatAiCallOptions): Promise<StatAiCompletion> {
  return requestStatAi(options, true);
}
