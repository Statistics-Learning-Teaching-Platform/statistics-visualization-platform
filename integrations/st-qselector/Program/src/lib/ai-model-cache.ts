import { isSelectableAiModel, type AiModelOption } from "@/lib/ai-model-selection";

export const AI_MODEL_CACHE_STORAGE_KEY = "statmind.ai-model-cache-v1";
export const AI_MODEL_CACHE_EVENT = "statmind:ai-model-cache-changed";
export const AI_MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

const AI_MODEL_CACHE_VERSION = 1;
const MAX_CACHED_MODELS = 4_096;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;

type ModelCacheStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface AiModelCache {
  version: typeof AI_MODEL_CACHE_VERSION;
  cachedAt: number;
  models: AiModelOption[];
  selected: string;
}

function browserModelCacheStorage(): ModelCacheStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function boundedString(value: unknown, maximum: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalizeCachedModels(value: unknown): AiModelOption[] | null {
  if (!Array.isArray(value) || value.length > MAX_CACHED_MODELS) return null;
  const models = new Map<string, AiModelOption>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const record = candidate as Partial<AiModelOption>;
    const key = boundedString(record.key, 512);
    if (!key || /\p{Cc}/u.test(key) || typeof record.loaded !== "boolean" || models.has(key)) return null;
    if (record.displayName !== undefined && typeof record.displayName !== "string") return null;
    if (record.quantization !== undefined && typeof record.quantization !== "string") return null;
    if (record.params !== undefined && typeof record.params !== "string") return null;
    if (record.supportsReasoning !== undefined && typeof record.supportsReasoning !== "boolean") return null;
    const parsed: AiModelOption = {
      key,
      displayName: boundedString(record.displayName, 300) || key,
      quantization: boundedString(record.quantization, 100),
      params: boundedString(record.params, 100),
      loaded: record.loaded,
      supportsReasoning: record.supportsReasoning === true,
    };
    models.set(key, parsed);
  }
  return [...models.values()];
}

function normalizeModelCache(value: unknown, now: number): AiModelCache | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<AiModelCache>;
  if (
    record.version !== AI_MODEL_CACHE_VERSION ||
    !Number.isFinite(record.cachedAt) ||
    typeof record.selected !== "string"
  ) {
    return null;
  }
  const rawCachedAt = record.cachedAt;
  if (typeof rawCachedAt !== "number" || !Number.isFinite(rawCachedAt)) return null;
  const cachedAt = Math.floor(rawCachedAt);
  const age = now - cachedAt;
  if (cachedAt <= 0 || age < 0 || age >= AI_MODEL_CACHE_TTL_MS) return null;
  const models = normalizeCachedModels(record.models);
  if (!models) return null;
  const selected = models.some((model) => model.key === record.selected && isSelectableAiModel(model))
    ? record.selected
    : "";
  return { version: AI_MODEL_CACHE_VERSION, cachedAt, models, selected };
}

export function loadAiModelCache(
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
  now = Date.now(),
): AiModelCache | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(AI_MODEL_CACHE_STORAGE_KEY);
    if (!raw) return null;
    if (raw.length > MAX_CACHE_BYTES) {
      storage.removeItem(AI_MODEL_CACHE_STORAGE_KEY);
      return null;
    }
    const cache = normalizeModelCache(JSON.parse(raw), now);
    if (!cache) storage.removeItem(AI_MODEL_CACHE_STORAGE_KEY);
    return cache;
  } catch {
    try {
      storage.removeItem(AI_MODEL_CACHE_STORAGE_KEY);
    } catch {
      // Browser storage is optional in private or locked-down contexts.
    }
    return null;
  }
}

export function saveAiModelCache(
  models: readonly AiModelOption[],
  selected: string,
  cachedAt = Date.now(),
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
): AiModelCache {
  const normalizedModels = normalizeCachedModels(models) ?? [];
  const normalizedSelected = normalizedModels.some(
    (model) => model.key === selected && isSelectableAiModel(model),
  )
    ? selected
    : "";
  const cache: AiModelCache = {
    version: AI_MODEL_CACHE_VERSION,
    cachedAt: Math.floor(cachedAt),
    models: normalizedModels,
    selected: normalizedSelected,
  };
  try {
    storage?.setItem(AI_MODEL_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Keep the in-memory result even when localStorage is unavailable/full.
  }
  return cache;
}

export function clearAiModelCache(
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
): void {
  try {
    storage?.removeItem(AI_MODEL_CACHE_STORAGE_KEY);
  } catch {
    // The current component state is still cleared by the caller.
  }
}

export function updateAiModelCacheSelection(
  selected: string,
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
  now = Date.now(),
): AiModelCache | null {
  const current = loadAiModelCache(storage, now);
  if (!current) return null;
  return saveAiModelCache(current.models, selected, current.cachedAt, storage);
}

export function announceAiModelCacheChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AI_MODEL_CACHE_EVENT));
}
