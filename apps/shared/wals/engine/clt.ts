import type { ChartPoint, SimulationResult } from "../types";
import { createRandom, exponentialRandom, normalRandom } from "@stats-viz/shared/random";
import { formatNumber, mean, standardDeviation } from "@stats-viz/shared/format";
import { histogram, normalPdf } from "@stats-viz/shared/math";
import { num, result, str, type ControlMap } from "./internal";

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
    return (exponentialRandom(rng, 1.25) - 0.8) * 1.25;
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
  // The normal, standardized uniform, centered exponential, and scaled
  // skewed examples are all constructed with mean 0 and standard deviation 1.
  return { mean: 0, sd: 1 };
}
export function generateSampleMeans(
  controls: ControlMap,
  count: number,
  seed: number
): number[] {
  const shape = str(controls, "populationShape", "exponential");
  const sampleSize = Math.max(1, Math.round(num(controls, "sampleSize", 5)));
  const rng = createRandom(seed);

  return Array.from({ length: count }, () => {
    const sample = Array.from({ length: sampleSize }, () =>
      drawPopulationValue(rng, shape)
    );
    return mean(sample);
  });
}
export function centralLimitTheorem(
  controls: ControlMap,
  seed: number,
  sampleMeans: number[] = []
): SimulationResult {
  const shape = str(controls, "populationShape", "exponential");
  const sampleSize = Math.max(1, Math.round(num(controls, "sampleSize", 5)));
  const population = populationForShape(shape);
  const moments = populationMoments(shape);
  const populationMean = moments.mean;
  const populationSd = moments.sd;
  const standardError = populationSd / Math.sqrt(sampleSize);
  const shownMeans = sampleMeans.length
    ? sampleMeans
    : generateSampleMeans(controls, DEFAULT_CLT_SAMPLE_COUNT, seed);

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

  return result(
    "Sampling distribution of sample means",
    "Draw repeated samples, then compare the histogram of sample means with the normal approximation predicted by the CLT.",
    [
      { label: "repeated samples", value: String(shownMeans.length), detail: "sample means in histogram" },
      { label: "sample size n", value: String(sampleSize), detail: "observations per sample" },
      { label: "population mean", value: formatNumber(populationMean, 3), detail: "theoretical value" },
      { label: "theoretical SE", value: formatNumber(standardError, 4), detail: "sigma / sqrt(n)" },
      {
        label: "observed SD",
        value: shownMeans.length > 1 ? formatNumber(standardDeviation(shownMeans), 4) : "n/a",
        detail: "SD of sample means"
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
    }
  );
}
