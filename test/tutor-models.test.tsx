import { act, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTutorModels } from "../src/code-learning/tutorModels";

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

function modelResponse(
  models: Array<{
    key: string;
    displayName: string;
    quantization: string;
    params: string;
    loaded: boolean;
  }>,
) {
  return new Response(JSON.stringify({ models }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useTutorModels live scan policy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not preload models and only starts a request after an explicit scan", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(modelResponse([]));
    const { result } = renderHook(() => useTutorModels());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      models: [],
      selected: "",
      hasScanned: false,
      status: "idle",
    });

    await act(async () => {
      await result.current.rescan();
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
    expect(result.current).toMatchObject({ hasScanned: true, status: "idle" });
  });

  it("accepts only a loaded model from the latest scan", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      modelResponse([
        {
          key: "loaded-model",
          displayName: "Loaded",
          quantization: "Q8",
          params: "9B",
          loaded: true,
        },
        {
          key: "inactive-model",
          displayName: "Inactive",
          quantization: "Q4",
          params: "8B",
          loaded: false,
        },
      ]),
    );
    const { result } = renderHook(() => useTutorModels());

    await act(async () => {
      await result.current.rescan();
    });
    act(() => result.current.select("inactive-model"));
    expect(result.current.selected).toBe("");
    act(() => result.current.select("not-in-this-scan"));
    expect(result.current.selected).toBe("");
    act(() => result.current.select("loaded-model"));
    expect(result.current.selected).toBe("loaded-model");
  });

  it("clears stale results immediately and aborts or ignores superseded scans", async () => {
    const requests: Array<{
      response: Deferred<Response>;
      signal: AbortSignal;
    }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const response = deferred<Response>();
      requests.push({ response, signal: init?.signal as AbortSignal });
      return response.promise;
    });
    const { result } = renderHook(() => useTutorModels());

    let initialScan!: Promise<void>;
    act(() => {
      initialScan = result.current.rescan();
    });
    await act(async () => {
      requests[0].response.resolve(
        modelResponse([
          {
            key: "initial-loaded",
            displayName: "Initial",
            quantization: "Q8",
            params: "9B",
            loaded: true,
          },
        ]),
      );
      await initialScan;
    });
    act(() => result.current.select("initial-loaded"));
    expect(result.current.selected).toBe("initial-loaded");

    let staleScan!: Promise<void>;
    act(() => {
      staleScan = result.current.rescan();
    });
    expect(result.current).toMatchObject({
      models: [],
      selected: "",
      hasScanned: false,
      status: "loading",
    });

    let latestScan!: Promise<void>;
    act(() => {
      latestScan = result.current.rescan();
    });
    expect(requests[1].signal.aborted).toBe(true);

    await act(async () => {
      requests[2].response.resolve(
        modelResponse([
          {
            key: "latest-loaded",
            displayName: "Latest",
            quantization: "Q6",
            params: "14B",
            loaded: true,
          },
        ]),
      );
      await latestScan;
    });
    expect(result.current.models.map((model) => model.key)).toEqual(["latest-loaded"]);

    await act(async () => {
      requests[1].response.resolve(
        modelResponse([
          {
            key: "stale-loaded",
            displayName: "Stale",
            quantization: "Q4",
            params: "7B",
            loaded: true,
          },
        ]),
      );
      await staleScan;
    });
    expect(result.current.models.map((model) => model.key)).toEqual(["latest-loaded"]);

    act(() => result.current.reset());
    expect(requests[2].signal.aborted).toBe(true);
    expect(result.current).toMatchObject({
      models: [],
      selected: "",
      hasScanned: false,
      status: "idle",
    });
  });

  it("checks request identity before a late 409 can reset a newer model scan", () => {
    const requestSources = [
      "../src/r-learning/RLearningWorkspace.tsx",
      "../src/python-learning/PythonLearningWorkspace.tsx",
      "../src/shell/ExperimentTutor.tsx",
    ].map((relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8"));

    for (const source of requestSources) {
      const requestStart = source.indexOf("async function askTutor");
      const identityGuard = source.indexOf("if (!isCurrentRequest()) return;", requestStart);
      const staleReset = source.indexOf("response.status === 409", requestStart);
      expect(requestStart).toBeGreaterThanOrEqual(0);
      expect(identityGuard).toBeGreaterThan(requestStart);
      expect(staleReset).toBeGreaterThan(identityGuard);
    }
  });
});
