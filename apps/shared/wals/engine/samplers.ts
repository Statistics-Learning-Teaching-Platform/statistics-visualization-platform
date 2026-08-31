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
  const alpha = Math.max(0.1, num(controls, "alpha", 2));
  const beta = Math.max(0.2, num(controls, "beta", 1));

  // Both branches are exact rejection samplers on the full positive support.
  // A uniform envelope cannot dominate Gamma(alpha, beta) when alpha < 1,
  // because its density is unbounded at zero. The GS algorithm handles that
  // case; Marsaglia-Tsang handles alpha >= 1. Values are sampled at rate 1 and
  // then divided by beta.
  const drawShapeUnitRate = (): { value: number; proposals: number } => {
    if (alpha < 1) {
      const envelope = (Math.E + alpha) / Math.E;
      let proposals = 0;
      while (true) {
        proposals += 1;
        const p = envelope * rng();
        if (p <= 1) {
          const x = Math.pow(p, 1 / alpha);
          if (rng() <= Math.exp(-x)) return { value: x, proposals };
        } else {
          const x = -Math.log((envelope - p) / alpha);
          if (rng() <= Math.pow(x, alpha - 1)) return { value: x, proposals };
        }
      }
    }

    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    let proposals = 0;
    while (true) {
      proposals += 1;
      const z = normalRandom(rng);
      const base = 1 + c * z;
      if (base <= 0) continue;
      const v = base ** 3;
      const u = Math.max(rng(), Number.EPSILON);
      if (
        u < 1 - 0.0331 * z ** 4
        || Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))
      ) {
        return { value: d * v, proposals };
      }
    }
  };

  const accepted: number[] = [];
  let proposals = 0;
  while (accepted.length < n) {
    const draw = drawShapeUnitRate();
    proposals += draw.proposals;
    accepted.push(draw.value / beta);
  }
  const acceptedMean = accepted.length ? mean(accepted) : 0;
  return {
    ...result(
    "Acceptance-rejection preview",
    "An exact rejection sampler targets the full positive gamma support. A shape-specific envelope keeps the method valid even when alpha is below one and the density is unbounded at zero.",
    [
      { label: "accepted", value: String(accepted.length), detail: `${proposals} candidates` },
      { label: "acceptance rate", value: formatNumber(accepted.length / proposals, 4), detail: "accepted / candidates" },
      { label: "accepted mean", value: formatNumber(acceptedMean, 4), detail: `gamma mean ${formatNumber(alpha / beta, 4)}` },
      { label: "proposal support", value: "(0, ∞)", detail: alpha < 1 ? "GS envelope" : "Marsaglia-Tsang envelope" }
    ],
    { type: "bars", title: "Accepted sample histogram", xLabel: "bin center", yLabel: "count", bars: histogram(accepted) }
    ),
    rawSample: accepted,
  };
}
