import { computeInterval } from "@stats-viz/shared/confidence-interval";
import { formatNumber, mean } from "@stats-viz/shared/format";
import { createRandom, normalRandom } from "@stats-viz/shared/random";
import jStat from "jstat";
import type { SimulationResult } from "../types";
import { type ControlMap, num, result, str } from "./internal";

export function anova(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const dataset = str(controls, "dataset", "random");
  const groups: Array<{ label: string; values: number[] }> =
    dataset === "fuel"
      ? [
          { label: "Brand A", values: [7.8, 8.2, 8.65, 8.0, 8.36] },
          { label: "Brand B", values: [9.5, 10.21, 9.85, 10.02, 9.39] },
          { label: "Brand C", values: [8.2, 8.87, 8.35, 9.03, 8.68] },
        ]
      : dataset === "temperature"
        ? [
            { label: "80 C", values: [254, 263, 241, 237, 251] },
            { label: "85 C", values: [234, 218, 235, 227, 216] },
            { label: "90 C", values: [200, 222, 197, 206, 204] },
          ]
        : [
            {
              label: "Group 1",
              values: Array.from({ length: Math.max(2, Math.round(num(controls, "n1", 5))) }, () =>
                normalRandom(rng, num(controls, "mu1", 1), num(controls, "sigma", 1)),
              ),
            },
            {
              label: "Group 2",
              values: Array.from({ length: Math.max(2, Math.round(num(controls, "n2", 5))) }, () =>
                normalRandom(rng, num(controls, "mu2", 2), num(controls, "sigma", 1)),
              ),
            },
            {
              label: "Group 3",
              values: Array.from({ length: Math.max(2, Math.round(num(controls, "n3", 5))) }, () =>
                normalRandom(rng, num(controls, "mu3", 3), num(controls, "sigma", 1)),
              ),
            },
          ];
  const all = groups.flatMap((group) => group.values);
  const grandMean = mean(all);
  // Precompute each group's mean once — the old code recomputed mean(group.values)
  // once per element inside the ssWithin reduce (O(n²) in group size).
  const groupMeans = groups.map((group) => mean(group.values));
  const ssBetween = groups.reduce(
    (sum, group, index) => sum + group.values.length * (groupMeans[index] - grandMean) ** 2,
    0,
  );
  const ssWithin = groups.reduce(
    (sum, group, index) =>
      sum + group.values.reduce((inner, value) => inner + (value - groupMeans[index]) ** 2, 0),
    0,
  );
  const dfBetween = groups.length - 1;
  const dfWithin = all.length - groups.length;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const hasWithinGroupVariation = msWithin > Number.EPSILON;
  const hasBetweenGroupVariation = msBetween > Number.EPSILON;
  const f = hasWithinGroupVariation
    ? msBetween / msWithin
    : hasBetweenGroupVariation
      ? Number.POSITIVE_INFINITY
      : 0;
  const pValue = Number.isFinite(f) ? 1 - jStat.centralF.cdf(f, dfBetween, dfWithin) : 0;
  const formattedF = Number.isFinite(f) ? formatNumber(f, 4) : "∞";
  return result(
    "ANOVA summary",
    "The table partitions variability into between-group and within-group components.",
    [
      { label: "F statistic", value: formattedF, detail: "MS between / MS within" },
      {
        label: "p value",
        value: formatNumber(pValue, 4),
        detail: `F(${dfBetween}, ${dfWithin}) tail area`,
      },
      {
        label: "MS between",
        value: formatNumber(msBetween, 4),
        detail: "between-group variation per df",
      },
      {
        label: "MS within",
        value: formatNumber(msWithin, 4),
        detail: "within-group variation per df",
      },
      {
        label: "grand mean",
        value: formatNumber(grandMean, 4),
        detail: `${all.length} observations`,
      },
      { label: "groups", value: String(groups.length), detail: dataset },
    ],
    {
      type: "anova",
      title: "Within-group spread and between-group separation",
      xLabel: "group",
      yLabel: "observed response",
      groups: groups.map((group) => ({
        label: group.label,
        values: group.values,
        mean: mean(group.values),
      })),
      grandMean,
      grandMeanLabel: "grand mean",
      observationsLabel: "observations",
      groupMeanLabel: "group mean",
    },
    {
      columns: ["Source", "Df", "Sum Sq", "Mean Sq", "F"],
      rows: [
        [
          "Between groups",
          dfBetween,
          formatNumber(ssBetween, 4),
          formatNumber(msBetween, 4),
          formattedF,
        ],
        ["Within groups", dfWithin, formatNumber(ssWithin, 4), formatNumber(msWithin, 4), ""],
      ],
      title: "ANOVA table",
    },
    {
      tables: [
        {
          title: "Descriptive Statistics",
          columns: ["Group", "n", "Mean", "SD"],
          rows: groups.map((group, index) => [
            group.label,
            group.values.length,
            formatNumber(groupMeans[index], 4),
            formatNumber(
              Math.sqrt(
                group.values.reduce((sum, value) => sum + (value - groupMeans[index]) ** 2, 0) /
                  Math.max(1, group.values.length - 1),
              ),
              4,
            ),
          ]),
        },
        {
          title: "ANOVA table",
          columns: ["Source", "Df", "Sum Sq", "Mean Sq", "F"],
          rows: [
            [
              "Between groups",
              dfBetween,
              formatNumber(ssBetween, 4),
              formatNumber(msBetween, 4),
              formatNumber(f, 4),
            ],
            ["Within groups", dfWithin, formatNumber(ssWithin, 4), formatNumber(msWithin, 4), ""],
          ],
        },
      ],
    },
  );
}
export function confidenceInterval(controls: ControlMap, seed: number): SimulationResult {
  // mu/sigma are now exposed as controls (previously hardcoded 31.5 / 0.3577);
  // defaults preserve the historical dataset so existing tests stay valid.
  const mu = num(controls, "mu", 31.5);
  const sigma = num(controls, "sigma", 0.3577);
  const requestedSampleSize = Math.max(1, Math.round(num(controls, "sampleSize", 5)));
  const intervalCount = Math.max(1, Math.round(num(controls, "intervalCount", 20)));
  // sigmaKnown toggles z vs t: when false the interval uses the sample SD and
  // Student-t critical value, matching the standalone confidence-interval app.
  const sigmaKnown = str(controls, "sigmaKnown", "true") === "true";
  const sampleSize = sigmaKnown ? requestedSampleSize : Math.max(2, requestedSampleSize);
  const rawConfidenceLevel = Number(controls.confidenceLevel ?? 0.95);
  const confidenceLevel = Number.isFinite(rawConfidenceLevel) ? rawConfidenceLevel : 0.95;
  // Each interval is built from a FRESH random sample of size n drawn from
  // N(mu, sigma). This is genuine repeated sampling (the old version used
  // three user-entered means and did not actually simulate), so observed
  // coverage tracks the confidence level.
  const rng = createRandom(seed);
  const intervals = Array.from({ length: intervalCount }, (_, index) => {
    const sample = Array.from({ length: sampleSize }, () => normalRandom(rng, mu, sigma));
    const interval = computeInterval(sample, confidenceLevel, mu, sigma, sigmaKnown);
    return {
      label: `Sample ${index + 1}`,
      center: interval.mean,
      lower: interval.lower,
      upper: interval.upper,
      color: interval.lower <= mu && interval.upper >= mu ? "var(--lab-green)" : "var(--lab-coral)",
    };
  });
  const covering = intervals.filter(
    (interval) => interval.lower <= mu && interval.upper >= mu,
  ).length;
  const coverage = covering / intervalCount;
  const lowerBound = Math.min(mu, ...intervals.map((interval) => interval.lower));
  const upperBound = Math.max(mu, ...intervals.map((interval) => interval.upper));
  const pad = (upperBound - lowerBound) * 0.1 || (1.96 * sigma) / Math.sqrt(sampleSize);
  const confidencePct = confidenceLevel * 100;
  const method = sigmaKnown ? "z" : "t";
  const averageWidth =
    intervals.reduce((sum, interval) => sum + interval.upper - interval.lower, 0) /
    intervals.length;
  return result(
    "Sample-centered confidence intervals",
    `Each interval is a ${method}-interval from a fresh sample drawn from N(mu, sigma); the reference line marks the true mean.`,
    [
      {
        label: "observed coverage",
        value: `${formatNumber(coverage * 100, 1)}%`,
        detail: `${covering} / ${intervalCount}`,
      },
      {
        label: "confidence level",
        value: `${formatNumber(confidencePct, 1)}%`,
        detail: `${method}-interval, sigma ${sigmaKnown ? "known" : "estimated"}`,
      },
      {
        label: "sample size",
        value: String(sampleSize),
        detail: `${intervalCount} repeated samples`,
      },
      {
        label: "average width",
        value: formatNumber(averageWidth, 4),
        detail: "mean upper − lower across intervals",
      },
    ],
    {
      type: "intervals",
      title: "Repeated confidence intervals around sample means",
      xLabel: "parameter scale",
      yLabel: "repeated sample",
      intervals,
      reference: mu,
      referenceLabel: "true mean μ",
      legend: [
        { label: "covers μ", color: "var(--lab-green)", shape: "line" },
        { label: "misses μ", color: "var(--lab-coral)", shape: "line" },
        { label: "true mean", color: "var(--lab-blue)", shape: "dashed" },
      ],
      xDomain: [lowerBound - pad, upperBound + pad],
    },
  );
}
