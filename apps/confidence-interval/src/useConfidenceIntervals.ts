import { useCallback, useMemo, useState } from "react";
import { max, min } from "d3";
import { createRandom, normalRandom } from "@stats-viz/shared/random";
import {
  createLinearScales,
  type ChartLayout,
} from "@stats-viz/shared/chart-utils";
import {
  computeInterval,
  calculateCoverage,
  type IntervalSample,
} from "@stats-viz/shared/confidence-interval";
import { defaultConfig, MAX_CI_SAMPLES, type Sample, type Scales } from "./constants";

function createScales(layout: ChartLayout, samples: Sample[]): Scales {
  const xDomain: [number, number] = [5, 15];
  const yDomain: [number, number] = [0, 1];
  if (samples && samples.length > 0) {
    yDomain[1] = samples.length;
    const maxValue = max(samples, (d) => d.upper)! * 1.1;
    const minValue = min(samples, (d) => d.lower)! * 0.9;
    xDomain[0] = Math.min(minValue, 5);
    xDomain[1] = Math.max(maxValue, 15);
  }
  return createLinearScales(layout, xDomain, yDomain);
}

export interface UseConfidenceIntervalsResult {
  sampleSize: number;
  populationSD: number;
  confidenceLevel: number;
  sigmaKnown: boolean;
  samples: Sample[];
  coverage: number;
  scales: Scales;
  setSampleSize: (v: number) => void;
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
  const [sampleSize, setSampleSizeState] = useState(10);
  const [populationSD, setPopulationSDState] = useState(2);
  const [confidenceLevel, setConfidenceLevelState] = useState(0.95);
  const [sigmaKnown, setSigmaKnownState] = useState(true);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [seed, setSeed] = useState(42);

  const coverage = useMemo(() => calculateCoverage(samples), [samples]);
  const scales = useMemo(() => createScales(defaultConfig.layout, samples), [samples]);

  const addSamples = useCallback(
    (count: number) => {
      setSamples((prev) => {
        const rng = createRandom(seed);
        const newSamples: IntervalSample[] = [];
        for (let i = 0; i < count; i++) {
          const arr = Array.from({ length: sampleSize }, () =>
            normalRandom(rng, defaultConfig.populationMean, populationSD),
          );
          newSamples.push(computeInterval(arr, confidenceLevel, defaultConfig.populationMean, populationSD, sigmaKnown));
        }
        const combined = [...prev, ...newSamples];
        return combined.length > MAX_CI_SAMPLES
          ? combined.slice(combined.length - MAX_CI_SAMPLES)
          : combined;
      });
      setSeed((s) => s + count);
    },
    [seed, populationSD, sampleSize, confidenceLevel, sigmaKnown],
  );

  const reset = useCallback(() => {
    setSamples([]);
    setSeed(42);
  }, []);

  // Wrap each setter so parameter changes also clear accumulated samples.
  const setSampleSize = useCallback((value: number) => {
    setSampleSizeState(value);
    reset();
  }, [reset]);
  const setPopulationSD = useCallback((value: number) => {
    setPopulationSDState(value);
    reset();
  }, [reset]);
  const setConfidenceLevel = useCallback((value: number) => {
    setConfidenceLevelState(value);
    reset();
  }, [reset]);
  const setSigmaKnown = useCallback((value: boolean) => {
    setSigmaKnownState(value);
    reset();
  }, [reset]);

  return {
    sampleSize,
    populationSD,
    confidenceLevel,
    sigmaKnown,
    samples,
    coverage,
    scales,
    setSampleSize,
    setPopulationSD,
    setConfidenceLevel,
    setSigmaKnown,
    addSamples,
    reset,
  };
}
