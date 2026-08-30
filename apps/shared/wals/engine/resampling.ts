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
  const observed = Math.max(...values);
  const bootstrapMean = mean(maxima);
  const ciLower = quantile(maxima, 0.025);
  const ciUpper = quantile(maxima, 0.975);
  return result(
    "Bootstrap distribution of the maximum",
    "Each bootstrap replicate samples observed values with replacement and records the maximum.",
    [
      { label: "observed statistic", value: formatNumber(observed, 4), detail: "maximum of observed data" },
      { label: "bootstrap mean", value: formatNumber(bootstrapMean, 4), detail: "mean of bootstrap maxima" },
      { label: "bias", value: formatNumber(bootstrapMean - observed, 4), detail: "bootstrap mean − observed" },
      { label: "bootstrap SE", value: formatNumber(standardDeviation(maxima), 4), detail: "SD of bootstrap statistics" },
      { label: "95% CI", value: `${formatNumber(ciLower, 3)} - ${formatNumber(ciUpper, 3)}`, detail: "percentile interval" }
    ],
    { type: "bars", title: "Bootstrap maxima", xLabel: "max value bin", yLabel: "count", bars: histogram(maxima), references: [
      { axis: "x", value: observed, label: "observed", color: "var(--lab-blue)" },
      { axis: "x", value: ciLower, label: "95% lower", color: "var(--lab-orange)" },
      { axis: "x", value: ciUpper, label: "95% upper", color: "var(--lab-orange)" },
    ] }
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
  const observed = mean(sample);
  const bootstrapMean = mean(bootMeans);
  const ciLower = quantile(bootMeans, 0.025);
  const ciUpper = quantile(bootMeans, 0.975);
  return result(
    "Bootstrap mean summary",
    "Every bootstrap replicate resamples exactly n observations with replacement from the generated sample.",
    [
      { label: "observed statistic", value: formatNumber(observed, 4), detail: "mean of observed sample" },
      { label: "bootstrap mean", value: formatNumber(bootstrapMean, 4), detail: "mean of bootstrap means" },
      { label: "bias", value: formatNumber(bootstrapMean - observed, 4), detail: "bootstrap mean − observed" },
      { label: "bootstrap SE", value: formatNumber(standardDeviation(bootMeans), 4), detail: "SD of bootstrap statistics" },
      { label: "95% CI", value: `${formatNumber(ciLower, 3)} - ${formatNumber(ciUpper, 3)}`, detail: "percentile interval" }
    ],
    { type: "bars", title: "Bootstrap means", xLabel: "mean bin", yLabel: "count", bars: histogram(bootMeans), references: [
      { axis: "x", value: observed, label: "observed", color: "var(--lab-blue)" },
      { axis: "x", value: ciLower, label: "95% lower", color: "var(--lab-orange)" },
      { axis: "x", value: ciUpper, label: "95% upper", color: "var(--lab-orange)" },
    ] }
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
    // Keep the engine payload serialisable and backwards-compatible; the
    // shared chart renderer maps these semantic legacy swatches to lab tokens.
    color: Math.abs(Number(bar.label)) >= Math.abs(observed) ? "#c8665a" : "#2f6f64",
    semanticColor: Math.abs(Number(bar.label)) >= Math.abs(observed) ? "var(--lab-coral)" : "var(--lab-teal)",
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
        { label: "central null outcomes", color: "var(--lab-teal)", shape: "bar" },
        { label: "as extreme as observed", color: "var(--lab-coral)", shape: "bar" },
      ],
    },
  );
}
