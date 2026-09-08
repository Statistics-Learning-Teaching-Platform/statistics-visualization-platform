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

export function isSelectableTutorModel(model: TutorModelOption) {
  return model.loaded === true;
}

/**
 * Scans the online model list on demand. Models are never cached across
 * sessions of the picker: each `rescan()` starts from the live endpoint so
 * loaded/retired models reflect the current server state.
 */
export function useTutorModels() {
  const [models, setModels] = useState<TutorModelOption[]>([]);
  const [status, setStatus] = useState<TutorModelsStatus>("idle");
  const [selected, setSelected] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scanEpochRef = useRef(0);
  const [hasScanned, setHasScanned] = useState(false);

  const rescan = useCallback(async () => {
    abortRef.current?.abort();
    const scanEpoch = ++scanEpochRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setModels([]);
    setSelected("");
    setHasScanned(false);
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
      const scanned = payload.models;
      setModels(scanned);
      // A new live scan always requires an explicit selection from that exact
      // result. Nothing is restored from a previous scan or browser session.
      setSelected("");
      setHasScanned(true);
      setStatus("idle");
    } catch (error) {
      if (
        controller.signal.aborted ||
        scanEpochRef.current !== scanEpoch ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }
      setHasScanned(true);
      setStatus("error");
    }
  }, []);

  const select = useCallback(
    (key: string) => {
      const target = models.find((model) => model.key === key);
      // Only keys returned by the latest live scan are valid. Besides keeping
      // unloaded options disabled in the UI, this closes the imperative path
      // where a stale or fabricated key could otherwise become selected.
      if (!target || !isSelectableTutorModel(target)) return;
      setSelected(key);
    },
    [models],
  );

  const reset = useCallback(() => {
    scanEpochRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setModels([]);
    setSelected("");
    setHasScanned(false);
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { models, status, selected, hasScanned, select, reset, rescan };
}
