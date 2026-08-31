import { formatNumber, mean, standardDeviation } from "@stats-viz/shared/format";
import { histogram, normalPdf } from "@stats-viz/shared/math";
import { createRandom, exponentialRandom, normalRandom } from "@stats-viz/shared/random";
import type { ChartPoint, SimulationResult } from "../types";
import { type ControlMap, num, result, str } from "./internal";

export const DEFAULT_CLT_SAMPLE_COUNT = 500;

function drawPopulationValue(rng: () => number, shape: string): number {
  if (shape === "normal") {
    return normalRandom(rng, 0, 1);
  }

  if (shape === "uniform") {
    return rng() * 2 * Math.sqrt(3) - Math.sqrt(3);
  }

  if (shape === "bimodal") {
    return rng() < 0.5 ? normalRandom(rng, -1.35, 0.45) : normalRandom(rng, 1.35, 0.45);
  }

  if (shape === "skewed") {
    // Standardized Gamma(shape=2, rate=1): still right-skewed, but visibly
    // distinct from the centered exponential option (skewness sqrt(2) vs 2).
    return (exponentialRandom(rng, 1) + exponentialRandom(rng, 1) - 2) / Math.sqrt(2);
  }

  return exponentialRandom(rng, 1) - 1;
}
function populationForShape(shape: string): number[] {
  // Deterministic seed so each shape's population is reproducible across renders.
  // 937 is an arbitrary base; 97 (prime) spreads seeds across different shape names.
  const rng = createRandom(937 + shape.length * 97);
  return Array.from({ length: 2500 }, () => drawPopulationValue(rng, shape));
}

function populationMoments(shape: string): { mean: number; sd: number } {
  if (shape === "bimodal") {
    return { mean: 0, sd: Math.sqrt(1.35 ** 2 + 0.45 ** 2) };
  }
  // The normal, standardized uniform, centered exponential, and standardized
  // gamma examples are all constructed with mean 0 and standard deviation 1.
  return { mean: 0, sd: 1 };
}
export function generateSampleMeans(controls: ControlMap, count: number, seed: number): number[] {
  const shape = str(controls, "populationShape", "exponential");
  const sampleSize = Math.max(1, Math.round(num(controls, "sampleSize", 5)));
  const rng = createRandom(seed);

  return Array.from({ length: count }, () => {
    const sample = Array.from({ length: sampleSize }, () => drawPopulationValue(rng, shape));
    return mean(sample);
  });
}
export function centralLimitTheorem(
  controls: ControlMap,
  seed: number,
  sampleMeans?: number[],
): SimulationResult {
  const shape = str(controls, "populationShape", "exponential");
  const sampleSize = Math.max(1, Math.round(num(controls, "sampleSize", 5)));
  const population = populationForShape(shape);
  const moments = populationMoments(shape);
  const populationMean = moments.mean;
  const populationSd = moments.sd;
  const standardError = populationSd / Math.sqrt(sampleSize);
  const repetitions = Math.max(
    1,
    Math.round(num(controls, "repetitions", DEFAULT_CLT_SAMPLE_COUNT)),
  );
  const shownMeans = sampleMeans ?? generateSampleMeans(controls, repetitions, seed);

  // Standardize the sample means and keep a fixed domain. Previously every n
  // received a newly centered/scaled x-axis, which visually hid both the CLT
  // shape change and the shrinking standard error.
  const standardizedMeans = shownMeans.map(
    (value) => (value - populationMean) / Math.max(standardError, 1e-9),
  );
  const samplingDomain: [number, number] = [-4, 4];
  const binCount = 20;
  const binWidth = (samplingDomain[1] - samplingDomain[0]) / binCount;
  // Histogram first so the normal-curve height scales by the number of sample
  // means that actually land inside the plotted domain. histogram() drops
  // out-of-range means, so scaling by shownMeans.length leaves the curve
  // sitting above the bars whenever a tail escapes the domain.
  const sampleMeanBars = histogram(standardizedMeans, binCount, samplingDomain);
  const inRangeCount = sampleMeanBars.reduce((sum, bar) => sum + bar.value, 0);
  const curvePoints: ChartPoint[] = Array.from({ length: 80 }, (_, index) => {
    const x = samplingDomain[0] + (index / 79) * (samplingDomain[1] - samplingDomain[0]);
    return {
      x,
      y: normalPdf(x, 0, 1) * binWidth * Math.max(inRangeCount, 1),
    };
  });

  const stabilityNarrative =
    shownMeans.length === 0
      ? "No repeated samples yet. Add samples to begin building the sampling distribution."
      : shownMeans.length < 100
        ? "The sampling shape is still unstable. Add more repeated samples before judging its shape."
        : "Compare the histogram with the theoretical normal curve and the observed SD with sigma / sqrt(n).";

  return result(
    "Sampling distribution of sample means",
    stabilityNarrative,
    [
      { label: "sample size n", value: String(sampleSize), detail: "observations per sample" },
      {
        label: "repeated samples",
        value: String(shownMeans.length),
        detail: "sample means in histogram",
      },
      {
        label: "mean of sample means",
        value: shownMeans.length > 0 ? formatNumber(mean(shownMeans), 4) : "n/a",
        detail: "empirical center",
      },
      {
        label: "empirical SE",
        value: shownMeans.length > 1 ? formatNumber(standardDeviation(shownMeans), 4) : "n/a",
        detail: "SD of sample means",
      },
      { label: "theoretical SE", value: formatNumber(standardError, 4), detail: "sigma / sqrt(n)" },
      // Keep the former diagnostic labels in the payload for backwards
      // compatibility with engine consumers while the shared metric strip
      // presents the five teaching metrics above.
      {
        label: "observed SD",
        value: shownMeans.length > 1 ? formatNumber(standardDeviation(shownMeans), 4) : "n/a",
        detail: "SD of sample means",
      },
      {
        label: "shape stability",
        value: shownMeans.length < 100 ? "still unstable" : "ready to compare",
        detail:
          shownMeans.length < 100
            ? "collect at least 100 repeated samples"
            : "enough repetitions for a first visual comparison",
      },
    ],
    {
      type: "clt",
      title: "Central Limit Theorem simulation",
      populationTitle: `Population distribution: ${shape}`,
      samplingTitle: "Standardized sampling distribution of sample means",
      xLabel: "Standardized sample mean z",
      yLabel: "Count",
      populationBars: histogram(population, 24),
      sampleMeanBars,
      normalCurve: curvePoints,
      populationMean: 0,
      normalApproximationLabel: "Normal approximation",
      populationMeanLabel: "Expected center z = 0",
      xDomain: samplingDomain,
    },
  );
}
