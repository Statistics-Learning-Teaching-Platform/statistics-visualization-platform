// Confidence-interval primitives shared by the WALS engine
// (apps/shared/wals/engine/inference.ts) and the standalone
// confidence-interval app (apps/confidence-interval/src/App.tsx).
//
// Previously the two modules each implemented criticalValue / ci / coverage
// independently: the WALS engine was z-only with hardcoded mu/sigma, while the
// standalone app supported z/t switching. This module is the single source of
// truth so both surfaces agree numerically and support the same capabilities.

import jStat from "jstat";
import { mean, standardDeviation } from "./format";
import { normalInv } from "./math";

/** A single computed interval plus the metadata needed to render and score it. */
export interface IntervalSample {
  lower: number;
  upper: number;
  mean: number;
  contains: boolean;
}

/**
 * Critical value for a two-sided interval at the given confidence level.
 * Uses the z quantile when sigma is known, the Student-t quantile with n-1 df
 * when sigma is unknown and estimated by the sample standard deviation.
 */
export function criticalValue(
  confidenceLevel: number,
  sampleSize: number,
  sigmaKnown: boolean,
): number {
  const p = 0.5 + confidenceLevel / 2;
  return sigmaKnown
    ? normalInv(p, 0, 1)
    : jStat.studentt.inv(p, Math.max(1, sampleSize - 1));
}

/**
 * Build a single confidence interval from a sample drawn from the population.
 * When `sigmaKnown` is true the margin uses `populationSD`; otherwise it uses
 * the sample standard deviation (t-interval).
 */
export function computeInterval(
  samples: number[],
  confidenceLevel: number,
  populationMean: number,
  populationSD: number,
  sigmaKnown: boolean,
): IntervalSample {
  if (samples.length === 0) {
    return { lower: Number.NaN, upper: Number.NaN, mean: Number.NaN, contains: false };
  }
  const sampleMean = mean(samples);
  const crit = criticalValue(confidenceLevel, samples.length, sigmaKnown);
  const sigma = sigmaKnown ? populationSD : standardDeviation(samples);
  const margin = (crit * sigma) / Math.sqrt(samples.length);
  const lower = sampleMean - margin;
  const upper = sampleMean + margin;
  return {
    lower,
    upper,
    mean: sampleMean,
    contains: lower <= populationMean && upper >= populationMean,
  };
}

/** Fraction of intervals whose bounds contain the population mean. */
export function calculateCoverage(samples: IntervalSample[]): number {
  const n = samples.length;
  if (!n) return 0;
  return samples.filter((x) => x.contains).length / n;
}
