import type { SimulationResult } from "../types";
import { createRandom, exponentialRandom, normalRandom } from "@stats-viz/shared/random";
import { formatNumber, mean, standardDeviation } from "@stats-viz/shared/format";
import { histogram } from "@stats-viz/shared/math";
import { num, result, type ControlMap } from "./internal";

export function randomNormal(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(1, Math.round(num(controls, "sampleSize", 1000)));
  const targetMean = num(controls, "mean", 0);
  const sd = Math.max(0.1, num(controls, "sd", 1));
  const sample = Array.from({ length: n }, () => normalRandom(rng, targetMean, sd));
  return {
    ...result(
    "Generated normal sample",
    "Histogram bins show the simulated distribution around the requested mean and standard deviation.",
    [
      { label: "sample mean", value: formatNumber(mean(sample), 4), detail: `target ${formatNumber(targetMean, 2)}` },
      { label: "sample SD", value: formatNumber(standardDeviation(sample), 4), detail: `target ${formatNumber(sd, 2)}` },
      { label: "theoretical mean", value: formatNumber(targetMean, 4), detail: "population parameter" },
      { label: "theoretical SD", value: formatNumber(sd, 4), detail: "population parameter" },
      { label: "mean error", value: formatNumber(mean(sample) - targetMean, 4), detail: "sample mean − theoretical mean" }
    ],
    { type: "bars", title: "Normal sample histogram", xLabel: "bin center", yLabel: "count", bars: histogram(sample) }
    ),
    rawSample: sample,
  };
}
export function randomExponential(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(1, Math.round(num(controls, "sampleSize", 1000)));
  const lambda = Math.max(0.1, num(controls, "lambda", 2));
  const sample = Array.from({ length: n }, () => exponentialRandom(rng, lambda));
  return {
    ...result(
    "Generated exponential sample",
    "The histogram displays right-skew and tail length controlled by lambda.",
    [
      { label: "sample mean", value: formatNumber(mean(sample), 4), detail: `theory ${formatNumber(1 / lambda, 4)}` },
      { label: "sample SD", value: formatNumber(standardDeviation(sample), 4), detail: `theory ${formatNumber(1 / lambda, 4)}` },
      { label: "theoretical mean", value: formatNumber(1 / lambda, 4), detail: "1 / λ" },
      { label: "theoretical SD", value: formatNumber(1 / lambda, 4), detail: "1 / λ" },
      { label: "mean error", value: formatNumber(mean(sample) - 1 / lambda, 4), detail: "sample mean − theoretical mean" }
    ],
    { type: "bars", title: "Exponential sample histogram", xLabel: "bin center", yLabel: "count", bars: histogram(sample) }
    ),
    rawSample: sample,
  };
}
export function gammaRejection(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(1, Math.round(num(controls, "sampleSize", 2000)));
  const alpha = Math.max(0.5, num(controls, "alpha", 2));
  const beta = Math.max(0.2, num(controls, "beta", 1));
  // Bounded support covering ~all of the Gamma(alpha, beta) mass.
  const xMax = alpha / beta + (6 * Math.sqrt(alpha)) / beta;
  // Unnormalized Gamma(alpha, beta) density on [0, xMax].
  const density = (x: number) => (x > 0 ? Math.pow(x, alpha - 1) * Math.exp(-beta * x) : 0);
  // Domination constant via a uniform proposal g(x) = 1/xMax: take
  // M = fMax * xMax so that f(x) <= M * g(x) everywhere on the support. The
  // acceptance probability is then f(x) / (M * g(x)) = f(x) / fMax, which is
  // <= 1 by construction — unlike a clamped ratio this never silently biases
  // the sample toward under-enveloped regions.
  const grid = Array.from({ length: 512 }, (_, i) => density((i / 511) * xMax));
  const fMax = Math.max(Number.EPSILON, ...grid);
  const accepted: number[] = [];
  let proposals = 0;
  while (accepted.length < n) {
    proposals += 1;
    const proposal = rng() * xMax; // uniform proposal on [0, xMax]
    if (rng() <= density(proposal) / fMax) {
      accepted.push(proposal);
    }
  }
  const acceptedMean = accepted.length ? mean(accepted) : 0;
  return {
    ...result(
    "Acceptance-rejection preview",
    "A uniform proposal on a finite interval is accepted in proportion to the gamma density. The chart is a truncated approximation; the interval extends six standard deviations beyond the mean.",
    [
      { label: "accepted", value: String(accepted.length), detail: `${proposals} candidates` },
      { label: "acceptance rate", value: formatNumber(accepted.length / proposals, 4), detail: "accepted / candidates" },
      { label: "accepted mean", value: formatNumber(acceptedMean, 4), detail: `gamma mean ${formatNumber(alpha / beta, 4)}` },
      { label: "proposal support", value: `[0, ${formatNumber(xMax, 2)}]`, detail: "finite envelope used in this preview" }
    ],
    { type: "bars", title: "Accepted sample histogram", xLabel: "bin center", yLabel: "count", bars: histogram(accepted) }
    ),
    rawSample: accepted,
  };
}
