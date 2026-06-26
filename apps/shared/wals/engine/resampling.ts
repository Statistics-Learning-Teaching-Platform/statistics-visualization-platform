import type { SimulationResult } from "../types";
import { createRandom, normalRandom, sampleWithReplacement } from "@stats-viz/shared/random";
import { formatNumber, mean, parseNumberList, quantile, standardDeviation } from "@stats-viz/shared/format";
import { histogram } from "@stats-viz/shared/math";
import { num, result, str, type ControlMap } from "./internal";

export function bootstrapMax(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const values = parseNumberList(str(controls, "data", "0.5,0.6,0.7"));
  const replicates = Math.max(100, Math.round(num(controls, "replicates", 1000)));
  if (values.length === 0) {
    return result(
      "Bootstrap requires data",
      "Enter at least one numeric value in the data control to bootstrap the maximum.",
      [
        { label: "observed values", value: "0", detail: "data control is empty" },
        { label: "replicates", value: String(replicates), detail: "no input to resample" }
      ],
      { type: "bars", title: "No data", xLabel: "max value bin", yLabel: "count", bars: [{ label: "n/a", value: 0 }] }
    );
  }
  const maxima = Array.from({ length: replicates }, () => sampleWithReplacement(rng, values, values.length).reduce((a, b) => Math.max(a, b), -Infinity));
  return result(
    "Bootstrap distribution of the maximum",
    "Each bootstrap replicate samples observed values with replacement and records the maximum.",
    [
      { label: "bootstrap mean max", value: formatNumber(mean(maxima), 4), detail: "mean of maxima" },
      { label: "95% interval", value: `${formatNumber(quantile(maxima, 0.025), 3)} - ${formatNumber(quantile(maxima, 0.975), 3)}`, detail: "percentile interval" },
      { label: "replicates", value: String(replicates), detail: `${values.length} observed values` }
    ],
    { type: "bars", title: "Bootstrap maxima", xLabel: "max value bin", yLabel: "count", bars: histogram(maxima) }
  );
}
export function meanBootstrap(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(50, Math.round(num(controls, "sampleSize", 10000)));
  const replicates = Math.max(100, Math.round(num(controls, "replicates", 1000)));
  const sample = Array.from({ length: n }, () => normalRandom(rng, 5, 2));
  const bootMeans = Array.from({ length: replicates }, () => mean(sampleWithReplacement(rng, sample, Math.min(sample.length, 500))));
  return result(
    "Bootstrap mean summary",
    "The bootstrap reuses the generated sample to estimate the mean's sampling spread.",
    [
      { label: "sample mean", value: formatNumber(mean(sample), 4), detail: "generated sample" },
      { label: "bootstrap mean", value: formatNumber(mean(bootMeans), 4), detail: "mean of bootstrap means" },
      { label: "bootstrap sd", value: formatNumber(standardDeviation(bootMeans), 4), detail: "bootstrap standard error" }
    ],
    { type: "bars", title: "Bootstrap means", xLabel: "mean bin", yLabel: "count", bars: histogram(bootMeans) }
  );
}
