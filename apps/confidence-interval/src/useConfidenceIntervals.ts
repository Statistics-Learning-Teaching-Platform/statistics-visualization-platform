import { type ChartLayout, createLinearScales } from "@stats-viz/shared/chart-utils";
import {
  calculateCoverage,
  computeInterval,
  type IntervalSample,
} from "@stats-viz/shared/confidence-interval";
import { createRandom, normalRandom } from "@stats-viz/shared/random";
import { useCallback, useMemo, useState } from "react";
import { defaultConfig, MAX_CI_SAMPLES, type Sample, type Scales } from "./constants";

export function confidenceIntervalXDomain(
  samples: Sample[],
  populationMean = 10,
): [number, number] {
  const finiteLowerBounds = samples.map((sample) => sample.lower).filter(Number.isFinite);
  const finiteUpperBounds = samples.map((sample) => sample.upper).filter(Number.isFinite);
  if (finiteLowerBounds.length === 0 || finiteUpperBounds.length === 0) {
    return [populationMean - 5, populationMean + 5];
  }

  const observedLower = Math.min(...finiteLowerBounds);
  const observedUpper = Math.max(...finiteUpperBounds);
  const padding = Math.max((observedUpper - observedLower) * 0.1, 0.1);
  return [
    Math.min(observedLower - padding, populationMean - 5),
    Math.max(observedUpper + padding, populationMean + 5),
  ];
}

function createScales(layout: ChartLayout, samples: Sample[], populationMean: number): Scales {
  const xDomain = confidenceIntervalXDomain(samples, populationMean);
  const yDomain: [number, number] = [0, 1];
  if (samples && samples.length > 0) {
    yDomain[1] = samples.length;
  }
  return createLinearScales(layout, xDomain, yDomain);
}

export interface UseConfidenceIntervalsResult {
  populationMean: number;
  sampleSize: number;
  populationSD: number;
  confidenceLevel: number;
  sigmaKnown: boolean;
  samples: Sample[];
  coverage: number;
  scales: Scales;
  setSampleSize: (v: number) => void;
  setPopulationMean: (v: number) => void;
  setPopulationSD: (v: number) => void;
  setConfidenceLevel: (v: number) => void;
  setSigmaKnown: (v: boolean) => void;
  addSamples: (count: number) => void;
  reset: () => void;
}

/**
 * Owns all CI simulation state: parameters, accumulated samples, and derived
 * coverage / scales. Parameter changes reset the samples (so coverage reflects
 * a single parameter set rather than a mixture).
 */
export function useConfidenceIntervals(): UseConfidenceIntervalsResult {
  const [populationMean, setPopulationMeanState] = useState(defaultConfig.populationMean);
  const [sampleSize, setSampleSizeState] = useState(10);
  const [populationSD, setPopulationSDState] = useState(2);
  const [confidenceLevel, setConfidenceLevelState] = useState(0.95);
  const [sigmaKnown, setSigmaKnownState] = useState(true);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [seed, setSeed] = useState(42);

  const coverage = useMemo(() => calculateCoverage(samples), [samples]);
  const scales = useMemo(
    () => createScales(defaultConfig.layout, samples, populationMean),
    [samples, populationMean],
  );

  const addSamples = useCallback(
    (count: number) => {
      setSamples((prev) => {
        const rng = createRandom(seed);
        const newSamples: IntervalSample[] = [];
        for (let i = 0; i < count; i++) {
          const arr = Array.from({ length: sampleSize }, () =>
            normalRandom(rng, populationMean, populationSD),
          );
          newSamples.push(
            computeInterval(arr, confidenceLevel, populationMean, populationSD, sigmaKnown),
          );
        }
        const combined = [...prev, ...newSamples];
        return combined.length > MAX_CI_SAMPLES
          ? combined.slice(combined.length - MAX_CI_SAMPLES)
          : combined;
      });
      setSeed((s) => s + count);
    },
    [seed, populationMean, populationSD, sampleSize, confidenceLevel, sigmaKnown],
  );

  const reset = useCallback(() => {
    setSamples([]);
    setSeed(42);
  }, []);

  // Wrap each setter so parameter changes also clear accumulated samples.
  const setSampleSize = useCallback(
    (value: number) => {
      setSampleSizeState(sigmaKnown ? value : Math.max(2, value));
      reset();
    },
    [reset, sigmaKnown],
  );
  const setPopulationMean = useCallback(
    (value: number) => {
      setPopulationMeanState(value);
      reset();
    },
    [reset],
  );
  const setPopulationSD = useCallback(
    (value: number) => {
      setPopulationSDState(value);
      reset();
    },
    [reset],
  );
  const setConfidenceLevel = useCallback(
    (value: number) => {
      setConfidenceLevelState(value);
      reset();
    },
    [reset],
  );
  const setSigmaKnown = useCallback(
    (value: boolean) => {
      setSigmaKnownState(value);
      if (!value) setSampleSizeState((current) => Math.max(2, current));
      reset();
    },
    [reset],
  );

  return {
    sampleSize,
    populationMean,
    populationSD,
    confidenceLevel,
    sigmaKnown,
    samples,
    coverage,
    scales,
    setSampleSize,
    setPopulationMean,
    setPopulationSD,
    setConfidenceLevel,
    setSigmaKnown,
    addSamples,
    reset,
  };
}
