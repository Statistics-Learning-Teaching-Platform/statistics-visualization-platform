const MAX_MODEL_KEY_LENGTH = 512;
const REASONING_SETTINGS = ["off", "on", "low", "medium", "high"] as const;
export type StatAiReasoningSetting = (typeof REASONING_SETTINGS)[number];
export const MAX_STAT_AI_MODEL_RECORDS = 4_096;

export interface StatAiModel {
  key: string;
  displayName: string;
  quantization: string;
  params: string;
  loaded: boolean;
  supportsReasoning: boolean;
  reasoningOptions: StatAiReasoningSetting[];
  defaultReasoning?: StatAiReasoningSetting;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseStatAiModelKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const model = value.trim();
  // Upstream identifiers are opaque JSON values, not paths or shell input.
  // Publisher/model, quantization suffixes, spaces and Unicode are valid;
  // the subsequent exact match against the live catalogue authorizes use.
  return model.length > 0 && model.length <= MAX_MODEL_KEY_LENGTH && !/\p{Cc}/u.test(model)
    ? model
    : undefined;
}

function isReasoningSetting(value: unknown): value is StatAiReasoningSetting {
  return REASONING_SETTINGS.some((setting) => setting === value);
}

export function selectStatAiReasoning(
  model: StatAiModel,
  includeReasoning: boolean,
): StatAiReasoningSetting | undefined {
  const allowed = model.reasoningOptions;
  if (!includeReasoning) return allowed.includes("off") ? "off" : undefined;
  if (model.defaultReasoning && model.defaultReasoning !== "off" && allowed.includes(model.defaultReasoning)) {
    return model.defaultReasoning;
  }
  return (["on", "medium", "low", "high"] as const).find((setting) => allowed.includes(setting));
}

export function findLoadedStatAiModel(
  models: readonly StatAiModel[],
  key: string,
): StatAiModel | undefined {
  return models.find((model) => model.key === key && model.loaded);
}

/**
 * Converts the untrusted upstream catalogue into the exact browser-facing
 * representation. A model is active only when loaded_instances is an array
 * with at least one entry; names and historical status fields never affect it.
 */
export function parseStatAiModelsPayload(payload: unknown): StatAiModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.models)) {
    throw new Error("AI model service returned an invalid catalogue");
  }
  if (payload.models.length > MAX_STAT_AI_MODEL_RECORDS) {
    throw new Error("AI model catalogue is too large");
  }

  const models = new Map<string, StatAiModel>();
  for (const candidate of payload.models) {
    if (!isRecord(candidate) || candidate.type !== "llm") continue;
    const key = parseStatAiModelKey(candidate.key);
    if (!key) continue;

    const quantization = isRecord(candidate.quantization)
      ? boundedString(candidate.quantization.name, 100)
      : "";
    const capabilities = isRecord(candidate.capabilities) ? candidate.capabilities : undefined;
    const reasoning = isRecord(capabilities?.reasoning) ? capabilities.reasoning : undefined;
    const allowedOptions = Array.isArray(reasoning?.allowed_options)
      ? reasoning.allowed_options.filter(isReasoningSetting)
      : [];
    const defaultReasoning = isReasoningSetting(reasoning?.default) && allowedOptions.includes(reasoning.default)
      ? reasoning.default
      : undefined;
    const parsed: StatAiModel = {
      key,
      displayName: boundedString(candidate.display_name, 300) || key,
      quantization,
      params: boundedString(candidate.params_string, 100),
      loaded: Array.isArray(candidate.loaded_instances) && candidate.loaded_instances.length > 0,
      supportsReasoning: allowedOptions.some((setting) => setting !== "off"),
      reasoningOptions: allowedOptions,
      defaultReasoning,
    };
    const existing = models.get(key);
    models.set(
      key,
      existing
        ? {
            ...existing,
            displayName:
              existing.displayName === existing.key && parsed.displayName !== parsed.key
                ? parsed.displayName
                : existing.displayName,
            quantization: existing.quantization || parsed.quantization,
            params: existing.params || parsed.params,
            loaded: existing.loaded || parsed.loaded,
            supportsReasoning: existing.supportsReasoning || parsed.supportsReasoning,
            reasoningOptions: [...new Set([...existing.reasoningOptions, ...parsed.reasoningOptions])],
            defaultReasoning: existing.defaultReasoning ?? parsed.defaultReasoning,
          }
        : parsed,
    );
  }
  return [...models.values()];
}
