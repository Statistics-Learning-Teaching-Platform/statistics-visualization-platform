import { act, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_MODEL_CACHE_STORAGE_KEY,
  AI_MODEL_CACHE_TTL_MS,
  loadTutorModelCache,
  saveTutorModelCache,
  updateTutorModelCacheSelection,
  useTutorModels,
} from "../src/code-learning/tutorModels";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const loadedModel = {
  key: "loaded-model",
  displayName: "Loaded",
  quantization: "Q8",
  params: "9B",
  loaded: true,
  supportsReasoning: true,
};

const inactiveModel = {
  key: "inactive-model",
  displayName: "Inactive",
  quantization: "Q4",
  params: "8B",
  loaded: false,
  supportsReasoning: false,
};

function modelResponse(models = [loadedModel, inactiveModel]) {
  return new Response(JSON.stringify({ models }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useTutorModels 24-hour browser cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with no request, then caches a successful explicit scan and selection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(modelResponse());
    const first = renderHook(() => useTutorModels());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(first.result.current).toMatchObject({
      models: [],
      selected: "",
      hasScanned: false,
      status: "idle",
    });

    await act(async () => {
      await first.result.current.rescan();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/st-qselector/api/ai/models",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: expect.any(AbortSignal),
      }),
    );
    const scannedAt = first.result.current.cachedAt;
    expect(scannedAt).toEqual(expect.any(Number));

    act(() => first.result.current.select(loadedModel.key));
    expect(first.result.current.selected).toBe(loadedModel.key);
    expect(loadTutorModelCache()?.selected).toBe(loadedModel.key);
    expect(loadTutorModelCache()?.cachedAt).toBe(scannedAt);

    first.unmount();
    fetchMock.mockClear();
    const restored = renderHook(() => useTutorModels());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(restored.result.current.models.map((model) => model.key)).toEqual([
      loadedModel.key,
      inactiveModel.key,
    ]);
    expect(restored.result.current.selected).toBe(loadedModel.key);
    expect(restored.result.current.hasScanned).toBe(true);

    act(() => restored.result.current.reset());
    expect(restored.result.current.selected).toBe(loadedModel.key);
    expect(localStorage.getItem(AI_MODEL_CACHE_STORAGE_KEY)).not.toBeNull();
  });

  it("accepts only a loaded cached model and expires exactly at 24 hours", () => {
    const cachedAt = 1_000_000;
    saveTutorModelCache([loadedModel, inactiveModel], inactiveModel.key, cachedAt, localStorage);
    expect(loadTutorModelCache(localStorage, cachedAt + AI_MODEL_CACHE_TTL_MS - 1)).toMatchObject({
      selected: "",
      models: [
        expect.objectContaining({ key: loadedModel.key, supportsReasoning: true }),
        expect.objectContaining({ key: inactiveModel.key, loaded: false }),
      ],
    });

    const selected = updateTutorModelCacheSelection(
      loadedModel.key,
      localStorage,
      cachedAt + AI_MODEL_CACHE_TTL_MS - 1,
    );
    expect(selected?.selected).toBe(loadedModel.key);
    expect(selected?.cachedAt).toBe(cachedAt);

    expect(loadTutorModelCache(localStorage, cachedAt + AI_MODEL_CACHE_TTL_MS)).toBeNull();
    expect(localStorage.getItem(AI_MODEL_CACHE_STORAGE_KEY)).toBeNull();
  });

  it("rejects malformed, future-dated, and oversized browser snapshots", () => {
    localStorage.setItem(AI_MODEL_CACHE_STORAGE_KEY, "not-json");
    expect(loadTutorModelCache(localStorage, Date.now())).toBeNull();

    const now = 10_000_000;
    saveTutorModelCache([loadedModel], loadedModel.key, now + 1, localStorage);
    expect(loadTutorModelCache(localStorage, now)).toBeNull();

    localStorage.setItem(AI_MODEL_CACHE_STORAGE_KEY, "x".repeat(2 * 1024 * 1024 + 1));
    expect(loadTutorModelCache(localStorage, Date.now())).toBeNull();
  });

  it("preserves a still-loaded choice on rescan and clears it when the model unloads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(modelResponse());
    const { result } = renderHook(() => useTutorModels());
    await act(async () => result.current.rescan());
    act(() => result.current.select(loadedModel.key));

    fetchMock.mockResolvedValueOnce(modelResponse([{ ...loadedModel, displayName: "Fresh" }]));
    await act(async () => result.current.rescan());
    expect(result.current.selected).toBe(loadedModel.key);
    expect(result.current.models[0].displayName).toBe("Fresh");

    fetchMock.mockResolvedValueOnce(modelResponse([{ ...loadedModel, loaded: false }]));
    await act(async () => result.current.rescan());
    expect(result.current.selected).toBe("");
    expect(loadTutorModelCache()?.selected).toBe("");
  });

  it("retains the last valid cache when a rescan fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(modelResponse([loadedModel]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "offline" }), { status: 503 }));
    const { result } = renderHook(() => useTutorModels());
    await act(async () => result.current.rescan());
    act(() => result.current.select(loadedModel.key));
    await act(async () => result.current.rescan());

    expect(result.current.status).toBe("error");
    expect(result.current.models.map((model) => model.key)).toEqual([loadedModel.key]);
    expect(result.current.selected).toBe(loadedModel.key);
    expect(loadTutorModelCache()?.selected).toBe(loadedModel.key);
  });

  it("aborts or ignores superseded scans and invalidates cache only on demand", async () => {
    const requests: Array<{ response: Deferred<Response>; signal: AbortSignal }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const response = deferred<Response>();
      requests.push({ response, signal: init?.signal as AbortSignal });
      return response.promise;
    });
    saveTutorModelCache([loadedModel], loadedModel.key);
    const { result } = renderHook(() => useTutorModels());

    let staleScan!: Promise<void>;
    act(() => {
      staleScan = result.current.rescan();
    });
    expect(result.current).toMatchObject({
      models: [expect.objectContaining({ key: loadedModel.key })],
      selected: loadedModel.key,
      status: "loading",
    });

    let latestScan!: Promise<void>;
    act(() => {
      latestScan = result.current.rescan();
    });
    expect(requests[0].signal.aborted).toBe(true);

    await act(async () => {
      requests[1].response.resolve(modelResponse([{ ...loadedModel, key: "latest-loaded" }]));
      await latestScan;
    });
    expect(result.current.models.map((model) => model.key)).toEqual(["latest-loaded"]);

    await act(async () => {
      requests[0].response.resolve(modelResponse([{ ...loadedModel, key: "stale-loaded" }]));
      await staleScan;
    });
    expect(result.current.models.map((model) => model.key)).toEqual(["latest-loaded"]);

    act(() => result.current.invalidate());
    expect(result.current).toMatchObject({
      models: [],
      selected: "",
      hasScanned: false,
      status: "idle",
    });
    expect(localStorage.getItem(AI_MODEL_CACHE_STORAGE_KEY)).toBeNull();
  });

  it("checks request identity before a late 409 invalidates a newer model scan", () => {
    const requestSources = [
      "../src/r-learning/RLearningWorkspace.tsx",
      "../src/python-learning/PythonLearningWorkspace.tsx",
      "../src/shell/ExperimentTutor.tsx",
    ].map((relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8"));

    for (const source of requestSources) {
      const requestStart = source.indexOf("async function askTutor");
      const identityGuard = source.indexOf("if (!isCurrentRequest())", requestStart);
      const staleReset = source.indexOf("response.status === 409", requestStart);
      expect(requestStart).toBeGreaterThanOrEqual(0);
      expect(identityGuard).toBeGreaterThan(requestStart);
      expect(staleReset).toBeGreaterThan(identityGuard);
    }
  });
});
