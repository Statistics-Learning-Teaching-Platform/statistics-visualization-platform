const encoder = new TextEncoder();

/** The smallest context window supported by StatMind's local-model routes. */
export const STAT_AI_CONTEXT_WINDOW_TOKENS = 8_192;

/**
 * Reserved for the model's chat template, message framing, and tokenizer
 * differences that cannot be observed through LM Studio's model catalogue.
 */
export const STAT_AI_CONTEXT_OVERHEAD_TOKENS = 512;

/**
 * A tokenizer-independent upper bound for byte-fallback tokenizers: one token
 * for every UTF-8 byte. This is intentionally stricter than treating a KiB
 * request limit as an equivalent number of model tokens.
 */
export function conservativeStatAiTokenCount(value: string): number {
  return encoder.encode(value).byteLength;
}

export interface StatAiContextUsage {
  systemTokens: number;
  inputTokens: number;
  outputTokens: number;
  overheadTokens: number;
  totalTokens: number;
  limitTokens: number;
}

function normalizeReservedOutputTokens(value: number): number {
  if (!Number.isFinite(value)) {
    // Unknown or unbounded output must consume the whole advertised window so
    // callers fail closed instead of accidentally receiving an unlimited input.
    return value === Number.NEGATIVE_INFINITY ? 0 : STAT_AI_CONTEXT_WINDOW_TOKENS;
  }
  return Math.max(0, Math.floor(value));
}

export function statAiContextUsage(
  systemPrompt: string,
  input: string,
  maxOutputTokens: number,
): StatAiContextUsage {
  const systemTokens = conservativeStatAiTokenCount(systemPrompt);
  const inputTokens = conservativeStatAiTokenCount(input);
  const outputTokens = normalizeReservedOutputTokens(maxOutputTokens);
  const totalTokens = systemTokens + inputTokens + outputTokens + STAT_AI_CONTEXT_OVERHEAD_TOKENS;
  return {
    systemTokens,
    inputTokens,
    outputTokens,
    overheadTokens: STAT_AI_CONTEXT_OVERHEAD_TOKENS,
    totalTokens,
    limitTokens: STAT_AI_CONTEXT_WINDOW_TOKENS,
  };
}

/** Maximum UTF-8 bytes available to user input under the conservative bound. */
export function statAiInputByteBudget(systemPrompt: string, maxOutputTokens: number): number {
  return Math.max(
    0,
    STAT_AI_CONTEXT_WINDOW_TOKENS
      - STAT_AI_CONTEXT_OVERHEAD_TOKENS
      - conservativeStatAiTokenCount(systemPrompt)
      - normalizeReservedOutputTokens(maxOutputTokens),
  );
}

/** Truncate without splitting a Unicode code point. */
export function truncateStatAiUtf8(value: string, maximumBytes: number, marker = "…[truncated]"): string {
  if (!Number.isFinite(maximumBytes)) {
    return maximumBytes === Number.POSITIVE_INFINITY ? value : "";
  }
  maximumBytes = Math.floor(maximumBytes);
  if (maximumBytes <= 0) return "";
  if (conservativeStatAiTokenCount(value) <= maximumBytes) return value;
  const markerBytes = conservativeStatAiTokenCount(marker);
  if (markerBytes >= maximumBytes) return "";
  let used = markerBytes;
  let result = "";
  for (const character of value) {
    const bytes = conservativeStatAiTokenCount(character);
    if (used + bytes > maximumBytes) break;
    result += character;
    used += bytes;
  }
  return `${result}${marker}`;
}

/** Bound a value by the bytes of its JSON string representation. */
export function truncateStatAiJsonString(value: string, maximumBytes: number): string {
  if (conservativeStatAiTokenCount(JSON.stringify(value)) <= maximumBytes) return value;
  const characters = Array.from(value);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = characters.slice(0, middle).join("");
    if (conservativeStatAiTokenCount(JSON.stringify(candidate)) <= maximumBytes) low = middle;
    else high = middle - 1;
  }
  return characters.slice(0, low).join("");
}
