import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/authenticatedFetch";

export type TutorModelOption = {
  key: string;
  displayName: string;
  quantization: string;
  params: string;
  loaded: boolean;
  supportsReasoning?: boolean;
};

export type TutorModelsStatus = "idle" | "loading" | "error";

export const AI_MODEL_CACHE_STORAGE_KEY = "statmind.ai-model-cache-v1";
export const AI_MODEL_CACHE_EVENT = "statmind:ai-model-cache-changed";
export const AI_MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

const AI_MODEL_CACHE_VERSION = 1;
const MAX_CACHED_MODELS = 4_096;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;

type ModelCacheStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface TutorModelCache {
  version: typeof AI_MODEL_CACHE_VERSION;
  cachedAt: number;
  models: TutorModelOption[];
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

function normalizeCachedModels(value: unknown): TutorModelOption[] | null {
  if (!Array.isArray(value) || value.length > MAX_CACHED_MODELS) return null;
  const models = new Map<string, TutorModelOption>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const record = candidate as Partial<TutorModelOption>;
    const key = boundedString(record.key, 512);
    if (!key || /\p{Cc}/u.test(key) || typeof record.loaded !== "boolean" || models.has(key)) return null;
    if (record.displayName !== undefined && typeof record.displayName !== "string") return null;
    if (record.quantization !== undefined && typeof record.quantization !== "string") return null;
    if (record.params !== undefined && typeof record.params !== "string") return null;
    if (record.supportsReasoning !== undefined && typeof record.supportsReasoning !== "boolean") return null;
    const parsed: TutorModelOption = {
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

function normalizeModelCache(value: unknown, now: number): TutorModelCache | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TutorModelCache>;
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
  const selected = models.some((model) => model.key === record.selected && isSelectableTutorModel(model))
    ? record.selected
    : "";
  return { version: AI_MODEL_CACHE_VERSION, cachedAt, models, selected };
}

export function loadTutorModelCache(
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
  now = Date.now(),
): TutorModelCache | null {
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

export function saveTutorModelCache(
  models: readonly TutorModelOption[],
  selected: string,
  cachedAt = Date.now(),
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
): TutorModelCache {
  const normalizedModels = normalizeCachedModels(models) ?? [];
  const normalizedSelected = normalizedModels.some(
    (model) => model.key === selected && isSelectableTutorModel(model),
  )
    ? selected
    : "";
  const cache: TutorModelCache = {
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

export function clearTutorModelCache(
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
): void {
  try {
    storage?.removeItem(AI_MODEL_CACHE_STORAGE_KEY);
  } catch {
    // The current hook state is still cleared below.
  }
}

export function updateTutorModelCacheSelection(
  selected: string,
  storage: ModelCacheStorage | undefined = browserModelCacheStorage(),
  now = Date.now(),
): TutorModelCache | null {
  const current = loadTutorModelCache(storage, now);
  if (!current) return null;
  return saveTutorModelCache(current.models, selected, current.cachedAt, storage);
}

function announceTutorModelCacheChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AI_MODEL_CACHE_EVENT));
}

export function isSelectableTutorModel(model: TutorModelOption) {
  return model.loaded === true;
}

/**
 * Reuses the last successful live scan and selected loaded model for the cache TTL.
 * A manual rescan replaces that snapshot; inference routes still recheck the
 * selected model against the live upstream catalogue before every attempt.
 */
export function useTutorModels() {
  const [initialCache] = useState(() => loadTutorModelCache());
  const [models, setModels] = useState<TutorModelOption[]>(initialCache?.models ?? []);
  const [status, setStatus] = useState<TutorModelsStatus>("idle");
  const [selected, setSelected] = useState(initialCache?.selected ?? "");
  const [cachedAt, setCachedAt] = useState<number | null>(initialCache?.cachedAt ?? null);
  const [hasScanned, setHasScanned] = useState(Boolean(initialCache));
  const abortRef = useRef<AbortController | null>(null);
  const scanEpochRef = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const applyCache = useCallback((cache: TutorModelCache | null) => {
    setModels(cache?.models ?? []);
    setSelected(cache?.selected ?? "");
    selectedRef.current = cache?.selected ?? "";
    setCachedAt(cache?.cachedAt ?? null);
    setHasScanned(Boolean(cache));
    setStatus("idle");
  }, []);

  const rescan = useCallback(async () => {
    abortRef.current?.abort();
    const scanEpoch = ++scanEpochRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    try {
      const response = await authenticatedFetch("/st-qselector/api/ai/models", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        models?: TutorModelOption[];
        error?: string;
      };
      if (!response.ok || !Array.isArray(payload.models)) {
        throw new Error(payload.error ?? "Failed to load models");
      }
      if (controller.signal.aborted || scanEpochRef.current !== scanEpoch) return;
      const cache = saveTutorModelCache(payload.models, selectedRef.current);
      applyCache(cache);
      announceTutorModelCacheChange();
    } catch (error) {
      if (
        controller.signal.aborted ||
        scanEpochRef.current !== scanEpoch ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }
      setStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [applyCache]);

  const select = useCallback(
    (key: string) => {
      const target = models.find((model) => model.key === key);
      if (!target || !isSelectableTutorModel(target)) return;
      setSelected(key);
      selectedRef.current = key;
      if (cachedAt !== null) {
        const cache = updateTutorModelCacheSelection(key);
        if (cache) {
          applyCache(cache);
          announceTutorModelCacheChange();
        }
      }
    },
    [applyCache, cachedAt, models],
  );

  const reset = useCallback(() => {
    scanEpochRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    applyCache(loadTutorModelCache());
  }, [applyCache]);

  const invalidate = useCallback(() => {
    scanEpochRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    clearTutorModelCache();
    applyCache(null);
    announceTutorModelCacheChange();
  }, [applyCache]);

  useEffect(() => {
    const synchronize = () => {
      scanEpochRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      applyCache(loadTutorModelCache());
    };
    const synchronizeStorage = (event: StorageEvent) => {
      if (event.key === AI_MODEL_CACHE_STORAGE_KEY) synchronize();
    };
    const synchronizeVisibility = () => {
      if (document.visibilityState === "visible") synchronize();
    };
    window.addEventListener(AI_MODEL_CACHE_EVENT, synchronize);
    window.addEventListener("storage", synchronizeStorage);
    document.addEventListener("visibilitychange", synchronizeVisibility);
    return () => {
      window.removeEventListener(AI_MODEL_CACHE_EVENT, synchronize);
      window.removeEventListener("storage", synchronizeStorage);
      document.removeEventListener("visibilitychange", synchronizeVisibility);
    };
  }, [applyCache]);

  useEffect(() => {
    if (cachedAt === null) return;
    const remaining = Math.max(0, cachedAt + AI_MODEL_CACHE_TTL_MS - Date.now());
    const timer = window.setTimeout(invalidate, remaining);
    return () => window.clearTimeout(timer);
  }, [cachedAt, invalidate]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { models, status, selected, hasScanned, cachedAt, select, reset, invalidate, rescan };
}
