import type { SimulationResult } from "../types";
import { createRandom, normalRandom } from "@stats-viz/shared/random";
import { formatNumber, mean } from "@stats-viz/shared/format";
import { computeInterval } from "@stats-viz/shared/confidence-interval";
import { num, result, str, type ControlMap } from "./internal";

export function anova(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const dataset = str(controls, "dataset", "random");
  const groups: Array<{ label: string; values: number[] }> =
    dataset === "fuel"
      ? [
          { label: "Brand A", values: [7.8, 8.2, 8.65, 8.0, 8.36] },
          { label: "Brand B", values: [9.5, 10.21, 9.85, 10.02, 9.39] },
          { label: "Brand C", values: [8.2, 8.87, 8.35, 9.03, 8.68] }
        ]
      : dataset === "temperature"
        ? [
            { label: "80 C", values: [254, 263, 241, 237, 251] },
            { label: "85 C", values: [234, 218, 235, 227, 216] },
            { label: "90 C", values: [200, 222, 197, 206, 204] }
          ]
        : [
            { label: "Group 1", values: Array.from({ length: Math.round(num(controls, "n1", 5)) }, () => normalRandom(rng, num(controls, "mu1", 1), num(controls, "sigma", 1))) },
            { label: "Group 2", values: Array.from({ length: Math.round(num(controls, "n2", 5)) }, () => normalRandom(rng, num(controls, "mu2", 2), num(controls, "sigma", 1))) },
            { label: "Group 3", values: Array.from({ length: Math.round(num(controls, "n3", 5)) }, () => normalRandom(rng, num(controls, "mu3", 3), num(controls, "sigma", 1))) }
          ];
  const all = groups.flatMap((group) => group.values);
  const grandMean = mean(all);
  // Precompute each group's mean once — the old code recomputed mean(group.values)
  // once per element inside the ssWithin reduce (O(n²) in group size).
  const groupMeans = groups.map((group) => mean(group.values));
  const ssBetween = groups.reduce((sum, group, index) => sum + group.values.length * (groupMeans[index] - grandMean) ** 2, 0);
  const ssWithin = groups.reduce((sum, group, index) => sum + group.values.reduce((inner, value) => inner + (value - groupMeans[index]) ** 2, 0), 0);
  const dfBetween = groups.length - 1;
  const dfWithin = all.length - groups.length;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msBetween / msWithin;
  return result(
    "ANOVA summary",
    "The table partitions variability into between-group and within-group components.",
    [
      { label: "F statistic", value: formatNumber(f, 4), detail: "MS between / MS within" },
      { label: "grand mean", value: formatNumber(grandMean, 4), detail: `${all.length} observations` },
      { label: "groups", value: String(groups.length), detail: dataset }
    ],
    { type: "bars", title: "Group means", xLabel: "group", yLabel: "mean", bars: groups.map((group) => ({ label: group.label, value: mean(group.values) })) },
    {
      columns: ["Source", "Df", "Sum Sq", "Mean Sq", "F"],
      rows: [
        ["Between groups", dfBetween, formatNumber(ssBetween, 4), formatNumber(msBetween, 4), formatNumber(f, 4)],
        ["Within groups", dfWithin, formatNumber(ssWithin, 4), formatNumber(msWithin, 4), ""]
      ]
    }
  );
}
export function confidenceInterval(controls: ControlMap, seed: number): SimulationResult {
  // mu/sigma are now exposed as controls (previously hardcoded 31.5 / 0.3577);
  // defaults preserve the historical dataset so existing tests stay valid.
  const mu = num(controls, "mu", 31.5);
  const sigma = num(controls, "sigma", 0.3577);
  const sampleSize = Math.max(1, Math.round(num(controls, "sampleSize", 5)));
  const intervalCount = Math.max(1, Math.round(num(controls, "intervalCount", 20)));
  // sigmaKnown toggles z vs t: when false the interval uses the sample SD and
  // Student-t critical value, matching the standalone confidence-interval app.
  const sigmaKnown = str(controls, "sigmaKnown", "true") === "true";
  const confidenceLevel = num(controls, "confidenceLevel", 0.95);
  // Each interval is built from a FRESH random sample of size n drawn from
  // N(mu, sigma). This is genuine repeated sampling (the old version used
  // three user-entered means and did not actually simulate), so observed
  // coverage tracks the confidence level.
  const rng = createRandom(seed);
  const palette = ["#d1495b", "#f28e2b", "#4e79a7", "#9c27b0", "#2a9d8f", "#e9c46a", "#264653", "#e76f51", "#60a5fa", "#f472b6"];
  const intervals = Array.from({ length: intervalCount }, (_, index) => {
    const sample = Array.from({ length: sampleSize }, () => normalRandom(rng, mu, sigma));
    const interval = computeInterval(sample, confidenceLevel, mu, sigma, sigmaKnown);
    return {
      label: `Sample ${index + 1}`,
      center: interval.mean,
      lower: interval.lower,
      upper: interval.upper,
      color: palette[index % palette.length],
    };
  });
  const covering = intervals.filter((interval) => interval.lower <= mu && interval.upper >= mu).length;
  const coverage = covering / intervalCount;
  const lowerBound = Math.min(mu, ...intervals.map((interval) => interval.lower));
  const upperBound = Math.max(mu, ...intervals.map((interval) => interval.upper));
  const pad = (upperBound - lowerBound) * 0.1 || (1.96 * sigma) / Math.sqrt(sampleSize);
  const confidencePct = confidenceLevel * 100;
  const method = sigmaKnown ? "z" : "t";
  return result(
    "Sample-centered confidence intervals",
    `Each interval is a ${method}-interval from a fresh sample drawn from N(mu, sigma); the reference line marks the true mean.`,
    [
      { label: "observed coverage", value: `${formatNumber(coverage * 100, 1)}%`, detail: `${covering} / ${intervalCount}` },
      { label: "confidence level", value: `${formatNumber(confidencePct, 1)}%`, detail: `${method}-interval, sigma ${sigmaKnown ? "known" : "estimated"}` },
      { label: "sample size", value: String(sampleSize), detail: `${intervalCount} repeated samples` }
    ],
    { type: "intervals", title: "Intervals around means", xLabel: "value", yLabel: "interval", intervals, reference: mu, xDomain: [lowerBound - pad, upperBound + pad] }
  );
}
