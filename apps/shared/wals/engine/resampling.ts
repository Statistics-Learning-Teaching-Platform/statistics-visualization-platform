import type { SimulationResult } from "../types";
import { createRandom, normalRandom, sampleWithReplacement } from "@stats-viz/shared/random";
import { formatNumber, mean, parseNumberList, quantile, standardDeviation } from "@stats-viz/shared/format";
import { histogram } from "@stats-viz/shared/math";
import { num, result, str, type ControlMap } from "./internal";

function shuffleInPlace(values: number[], rng: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

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
  // A bootstrap replicate must have the same size as the observed sample.
  // Using an arbitrary cap changes the estimated standard error and makes the
  // control labelled "sample size" mathematically misleading.
  const bootMeans = Array.from({ length: replicates }, () => mean(sampleWithReplacement(rng, sample, sample.length)));
  return result(
    "Bootstrap mean summary",
    "Every bootstrap replicate resamples exactly n observations with replacement from the generated sample.",
    [
      { label: "sample mean", value: formatNumber(mean(sample), 4), detail: "generated sample" },
      { label: "bootstrap mean", value: formatNumber(mean(bootMeans), 4), detail: "mean of bootstrap means" },
      { label: "bootstrap sd", value: formatNumber(standardDeviation(bootMeans), 4), detail: "bootstrap standard error" },
      { label: "resample size", value: String(n), detail: "same size as observed sample" }
    ],
    { type: "bars", title: "Bootstrap means", xLabel: "mean bin", yLabel: "count", bars: histogram(bootMeans) }
  );
}

export function permutationMeanDifference(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const groupSize = Math.max(5, Math.round(num(controls, "groupSize", 20)));
  const effect = num(controls, "effect", 0.6);
  const replicates = Math.max(100, Math.round(num(controls, "replicates", 1000)));
  const groupA = Array.from({ length: groupSize }, () => normalRandom(rng, 0, 1));
  const groupB = Array.from({ length: groupSize }, () => normalRandom(rng, effect, 1));
  const observed = mean(groupB) - mean(groupA);
  const combined = [...groupA, ...groupB];
  const nullDifferences = Array.from({ length: replicates }, () => {
    const shuffled = [...combined];
    shuffleInPlace(shuffled, rng);
    return mean(shuffled.slice(groupSize)) - mean(shuffled.slice(0, groupSize));
  });
  const extreme = nullDifferences.filter((value) => Math.abs(value) >= Math.abs(observed)).length;
  const pValue = (extreme + 1) / (replicates + 1);
  const bars = histogram(nullDifferences, 24).map((bar) => ({
    ...bar,
    color: Math.abs(Number(bar.label)) >= Math.abs(observed) ? "#c8665a" : "#2f6f64",
  }));
  return result(
    "Permutation test for a difference in means",
    "Group labels are shuffled while the observed values stay fixed. The red tails are permutation differences at least as extreme as the observed difference.",
    [
      { label: "observed difference", value: formatNumber(observed, 4), detail: "mean(B) - mean(A)" },
      { label: "two-sided p value", value: formatNumber(pValue, 4), detail: `${extreme} extreme permutations` },
      { label: "permutations", value: String(replicates), detail: `${groupSize} observations per group` },
      { label: "decision at 5%", value: pValue < 0.05 ? "reject H0" : "do not reject H0", detail: "based on permutation tail area" },
    ],
    {
      type: "bars",
      title: "Null distribution created by shuffling group labels",
      xLabel: "permuted mean difference",
      yLabel: "permutation count",
      bars,
      legend: [
        { label: "central null outcomes", color: "#2f6f64", shape: "bar" },
        { label: "as extreme as observed", color: "#c8665a", shape: "bar" },
      ],
    },
  );
}
