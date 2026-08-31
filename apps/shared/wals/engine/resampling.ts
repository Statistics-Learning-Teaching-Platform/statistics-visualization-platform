import type { SimulationResult } from "../types";
import { createRandom, normalRandom } from "@stats-viz/shared/random";
import { formatNumber, mean, parseNumberList, quantile, standardDeviation } from "@stats-viz/shared/format";
import { histogram } from "@stats-viz/shared/math";
import { num, result, str, type ControlMap } from "./internal";

export const MAX_BOOTSTRAP_INPUT_CHARS = 4096;
export const MAX_BOOTSTRAP_VALUES = 500;
export const MAX_MEAN_BOOTSTRAP_DRAWS = 1_000_000;
const MIN_BOOTSTRAP_REPLICATES = 100;
const MAX_BOOTSTRAP_REPLICATES = 10_000;
const MAX_MEAN_SAMPLE_SIZE = 5000;

export function resolveMeanBootstrapBudget(
  sampleSize: number,
  replicates: number,
): { sampleSize: number; replicates: number; draws: number } {
  const boundedSampleSize = Math.min(
    MAX_MEAN_SAMPLE_SIZE,
    Math.max(50, Math.round(Number.isFinite(sampleSize) ? sampleSize : 500)),
  );
  const requestedReplicates = Math.min(
    5000,
    Math.max(MIN_BOOTSTRAP_REPLICATES, Math.round(Number.isFinite(replicates) ? replicates : 1000)),
  );
  const budgetedReplicates = Math.max(
    MIN_BOOTSTRAP_REPLICATES,
    Math.floor(MAX_MEAN_BOOTSTRAP_DRAWS / boundedSampleSize),
  );
  const boundedReplicates = Math.min(requestedReplicates, budgetedReplicates);
  return {
    sampleSize: boundedSampleSize,
    replicates: boundedReplicates,
    draws: boundedSampleSize * boundedReplicates,
  };
}

function shuffleInPlace(values: number[], rng: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

export function permutationTailColor(binCenter: number, observed: number): "#c8665a" | "#2f6f64" {
  return Math.abs(binCenter) >= Math.abs(observed) ? "#c8665a" : "#2f6f64";
}

export function permutationHistogram(
  values: number[],
  observed: number,
  count = 24,
): Array<{ label: string; value: number; x: number; color: "#c8665a" | "#2f6f64" }> {
  if (values.length === 0) return [];
  const binCount = Math.max(1, Math.round(count));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) {
    return [{
      label: formatNumber(min, 2),
      value: values.length,
      x: min,
      color: permutationTailColor(min, observed),
    }];
  }

  const width = range / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    center: min + width * (index + 0.5),
    centralCount: 0,
    centralSum: 0,
    tailCount: 0,
    tailSum: 0,
  }));
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) / width)));
    const bin = bins[index];
    if (permutationTailColor(value, observed) === "#c8665a") {
      bin.tailCount += 1;
      bin.tailSum += value;
    } else {
      bin.centralCount += 1;
      bin.centralSum += value;
    }
  }

  return bins.flatMap((bin) => {
    const segments = [
      bin.centralCount > 0
        ? { x: bin.centralSum / bin.centralCount, value: bin.centralCount, color: "#2f6f64" as const }
        : undefined,
      bin.tailCount > 0
        ? { x: bin.tailSum / bin.tailCount, value: bin.tailCount, color: "#c8665a" as const }
        : undefined,
    ].filter((segment): segment is NonNullable<typeof segment> => segment !== undefined)
      .sort((left, right) => left.x - right.x);

    if (segments.length === 0) {
      return [{
        label: formatNumber(bin.center, 2),
        value: 0,
        x: bin.center,
        color: permutationTailColor(bin.center, observed),
      }];
    }
    return segments.map((segment) => ({
      label: formatNumber(segment.x, 2),
      ...segment,
    }));
  });
}

export function bootstrapMax(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const rawData = str(controls, "data", "0.5,0.6,0.7");
  const boundedData = rawData.slice(0, MAX_BOOTSTRAP_INPUT_CHARS);
  const parsedValues = parseNumberList(boundedData);
  const values = parsedValues.slice(0, MAX_BOOTSTRAP_VALUES);
  const inputWasLimited = rawData.length > boundedData.length || parsedValues.length > values.length;
  const replicates = Math.min(
    MAX_BOOTSTRAP_REPLICATES,
    Math.max(MIN_BOOTSTRAP_REPLICATES, Math.round(num(controls, "replicates", 1000))),
  );
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
  const sortedValues = [...values].sort((a, b) => a - b);
  // For n draws with replacement, P(max rank <= k) = ((k + 1) / n)^n.
  // Inverting that CDF produces the exact bootstrap-maximum distribution in
  // O(replicates) time instead of allocating and scanning n values per replica.
  const maxima = Array.from({ length: replicates }, () => {
    const rank = Math.max(
      0,
      Math.ceil(sortedValues.length * Math.pow(rng(), 1 / sortedValues.length)) - 1,
    );
    return sortedValues[Math.min(rank, sortedValues.length - 1)];
  });
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
      { label: "95% CI", value: `${formatNumber(ciLower, 3)} - ${formatNumber(ciUpper, 3)}`, detail: "percentile interval" },
      {
        label: "replicates",
        value: String(replicates),
        detail: `${values.length} observed values${inputWasLimited ? " (input limit applied)" : ""}`,
      }
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
  const requestedSampleSize = num(controls, "sampleSize", 500);
  const requestedReplicates = num(controls, "replicates", 1000);
  const budget = resolveMeanBootstrapBudget(requestedSampleSize, requestedReplicates);
  const n = budget.sampleSize;
  const replicates = budget.replicates;
  const sample = Array.from({ length: n }, () => normalRandom(rng, 5, 2));
  // Preserve the mathematical bootstrap size n while avoiding per-replicate
  // arrays. The total number of indexed draws is capped by the budget helper,
  // which only reduces the replicate count — never the resample size n.
  const bootMeans = Array.from({ length: replicates }, () => {
    let sum = 0;
    for (let draw = 0; draw < n; draw += 1) {
      sum += sample[Math.floor(rng() * n)];
    }
    return sum / n;
  });
  const observed = mean(sample);
  const bootstrapMean = mean(bootMeans);
  const ciLower = quantile(bootMeans, 0.025);
  const ciUpper = quantile(bootMeans, 0.975);
  const requestedReplicateCount = Math.min(
    5000,
    Math.max(MIN_BOOTSTRAP_REPLICATES, Math.round(requestedReplicates)),
  );
  const limitedByBudget = replicates < requestedReplicateCount;
  return result(
    "Bootstrap mean summary",
    limitedByBudget
      ? "Every bootstrap replicate resamples exactly n observations; the replicate count was reduced to keep the total draw budget responsive."
      : "Every bootstrap replicate resamples exactly n observations with replacement from the generated sample.",
    [
      { label: "observed statistic", value: formatNumber(observed, 4), detail: "mean of observed sample" },
      { label: "bootstrap mean", value: formatNumber(bootstrapMean, 4), detail: "mean of bootstrap means" },
      { label: "bias", value: formatNumber(bootstrapMean - observed, 4), detail: "bootstrap mean − observed" },
      { label: "bootstrap SE", value: formatNumber(standardDeviation(bootMeans), 4), detail: "SD of bootstrap statistics" },
      { label: "95% CI", value: `${formatNumber(ciLower, 3)} - ${formatNumber(ciUpper, 3)}`, detail: "percentile interval" },
      {
        label: "bootstrap replicates",
        value: String(replicates),
        detail: limitedByBudget
          ? `${requestedReplicateCount} requested; ${budget.draws.toLocaleString("en-US")} total draws`
          : `${budget.draws.toLocaleString("en-US")} total draws`,
      }
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
  const groupSize = Math.min(80, Math.max(5, Math.round(num(controls, "groupSize", 20))));
  const effect = num(controls, "effect", 0.6);
  const replicates = Math.min(5000, Math.max(100, Math.round(num(controls, "replicates", 1000))));
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
  // The tail-aware histogram keeps bins split at the observed statistic so the
  // visual tail area matches the reported p value. Keep the engine payload
  // serialisable and backwards-compatible; the shared chart renderer maps the
  // semantic swatches to lab tokens.
  const bars = permutationHistogram(nullDifferences, observed).map((bar) => ({
    ...bar,
    semanticColor: bar.color === "#c8665a" ? "var(--lab-coral)" : "var(--lab-teal)",
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
