import { describe, expect, it } from "vitest";
import jStat from "jstat";
import { generateSampleMeans, runExample } from "../apps/shared/wals/engine";
import { linearRegression, normalCdf, normalPdf } from "../apps/shared/math";
import { mean, reductionPct, ratioOrNa, variance } from "../apps/shared/format";
import type { ExampleConfig, SimulationResult } from "../apps/shared/wals/types";

// runExample only consumes example.kind / .id / .sourcePath, so a minimal stub
// is enough to drive a single example kind directly.
function example(kind: string): ExampleConfig {
  return { id: "test", title: "test", kind, sourcePath: "test", description: "", teachingPoints: [], controls: [] };
}

function metric(result: SimulationResult, label: string): string {
  return result.metrics.find((m) => m.label === label)?.value ?? "";
}

function linePoints(result: SimulationResult) {
  return result.chart.type === "line" ? result.chart.series[0].points : [];
}

describe("distribution explorer", () => {
  const controls = (dist: string, a: number, b: number) => ({ dist, mode: "PDF", a, b, lower: -2, upper: 2 });

  it("matches the trusted jstat PDFs point-for-point (locks the t/beta/gamma/chisq fix)", () => {
    const cases: Array<{ dist: string; a: number; b: number; expected: (x: number) => number }> = [
      { dist: "norm", a: 0, b: 1, expected: (x) => jStat.normal.pdf(x, 0, 1) },
      { dist: "t", a: 6, b: 1, expected: (x) => jStat.studentt.pdf(x, 6) },
      { dist: "beta", a: 2, b: 2, expected: (x) => (x > 0 && x < 1 ? jStat.beta.pdf(x, 2, 2) : 0) },
      { dist: "gamma", a: 2, b: 1, expected: (x) => (x > 0 ? jStat.gamma.pdf(x, 2, 1 / 1) : 0) },
      { dist: "chisq", a: 1, b: 4, expected: (x) => (x > 0 ? jStat.chisquare.pdf(x, 4) : 0) },
    ];
    for (const { dist, a, b, expected } of cases) {
      const points = linePoints(runExample(example("distribution"), controls(dist, a, b), 1));
      expect(points.length).toBeGreaterThan(0);
      for (const point of points) {
        expect(point.y).toBeCloseTo(expected(point.x), 4);
      }
    }
  });

  it("renders Student-t differently from Normal (regression guard for the headline bug)", () => {
    const norm = runExample(example("distribution"), controls("norm", 0, 1), 1);
    const t = runExample(example("distribution"), controls("t", 6, 1), 1);
    const peak = (r: SimulationResult) => Math.max(...linePoints(r).map((p) => p.y));
    expect(peak(norm)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 2); // N(0,1) peak ~0.3989
    expect(Math.abs(peak(norm) - peak(t))).toBeGreaterThan(0.005);
  });

  it("computes interval probability via the exact CDF difference", () => {
    const r = runExample(
      example("distribution"),
      { dist: "norm", mode: "PDF", a: 0, b: 1, lower: -1.96, upper: 1.96 },
      1,
    );
    expect(Number(metric(r, "interval probability"))).toBeCloseTo(0.95, 2);
  });

  it("keeps a fixed N(0,1) reference beside the adjustable normal curve", () => {
    const r = runExample(
      example("distribution"),
      { dist: "norm", mode: "PDF", a: 2, b: 2, lower: -2, upper: 2 },
      1,
    );
    if (r.chart.type !== "line") throw new Error("expected line chart");
    expect(r.chart.series).toHaveLength(2);
    expect(r.chart.xDomain).toEqual([-12, 12]);
    expect(r.chart.yDomain).toEqual([0, 0.85]);

    const [current, reference] = r.chart.series;
    const currentPeak = current.points.reduce((best, point) => point.y > best.y ? point : best);
    const referencePeak = reference.points.reduce((best, point) => point.y > best.y ? point : best);
    expect(Math.abs(currentPeak.x - 2)).toBeLessThan(0.08);
    expect(Math.abs(referencePeak.x)).toBeLessThan(0.08);
    expect(currentPeak.y).toBeLessThan(referencePeak.y);
    expect(referencePeak.y).toBeCloseTo(jStat.normal.pdf(referencePeak.x, 0, 1), 5);
  });
});

describe("gamma rejection sampler (de-biased)", () => {
  it("produces an accepted-sample mean near alpha / beta", () => {
    const r = runExample(example("gamma-rejection"), { sampleSize: 6000, alpha: 2, beta: 1 }, 12345);
    const acceptedMean = Number(metric(r, "accepted mean"));
    expect(acceptedMean).toBeGreaterThan(1.6);
    expect(acceptedMean).toBeLessThan(2.4);
    // acceptance rate is a real probability
    expect(Number(metric(r, "acceptance rate"))).toBeGreaterThan(0);
    expect(Number(metric(r, "acceptance rate"))).toBeLessThan(1);
  });
});

describe("incremental random-variable sampling", () => {
  it.each([
    ["random-normal", { mean: 0, sd: 1 }],
    ["random-exponential", { lambda: 2 }],
    ["gamma-rejection", { alpha: 2, beta: 1 }],
  ])("keeps every previous draw when one %s sample is appended", (kind, parameters) => {
    const seed = 24680;
    const before = runExample(example(kind), { ...parameters, sampleSize: 25 }, seed);
    const after = runExample(example(kind), { ...parameters, sampleSize: 26 }, seed);
    expect(before.rawSample).toHaveLength(25);
    expect(after.rawSample).toHaveLength(26);
    expect(after.rawSample?.slice(0, 25)).toEqual(before.rawSample);
  });
});

describe("central limit theorem", () => {
  const controls = { populationShape: "exponential" as const, sampleSize: 5 };

  it("uses enough repeated samples by default and keeps a fixed standardized domain", () => {
    for (const sampleSize of [1, 5, 20, 88]) {
      const r = runExample(
        example("central-limit-theorem"),
        { populationShape: "exponential", sampleSize },
        42,
      );
      if (r.chart.type !== "clt") throw new Error("expected clt chart");
      expect(Number(metric(r, "repeated samples"))).toBe(500);
      expect(r.chart.xDomain).toEqual([-4, 4]);
      expect("latestMean" in r.chart).toBe(false);
    }
  });

  it("makes the approach toward normality measurable as n grows", () => {
    const skewness = (values: number[]) => {
      const center = mean(values);
      const sd = Math.sqrt(variance(values));
      return values.reduce((sum, value) => sum + ((value - center) / sd) ** 3, 0) / values.length;
    };
    const n1 = generateSampleMeans({ populationShape: "exponential", sampleSize: 1 }, 5000, 17);
    const n20 = generateSampleMeans({ populationShape: "exponential", sampleSize: 20 }, 5000, 17);
    expect(Math.abs(skewness(n20))).toBeLessThan(Math.abs(skewness(n1)) * 0.45);
  });

  it("observed SD of sample means tracks the theoretical SE", () => {
    const means = generateSampleMeans(controls, 3000, 42);
    const r = runExample(example("central-limit-theorem"), controls, 42, undefined, means);
    expect(Number(metric(r, "observed SD"))).toBeCloseTo(Number(metric(r, "theoretical SE")), 1);
  });

  it("scales the normal curve to the in-range histogram (locks the curve-scaling fix)", () => {
    const means = generateSampleMeans(controls, 2000, 7);
    const r = runExample(example("central-limit-theorem"), controls, 7, undefined, means);
    if (r.chart.type !== "clt") throw new Error("expected clt chart");
    const bars = r.chart.sampleMeanBars;
    const barTotal = bars.reduce((sum, bar) => sum + bar.value, 0);
    // histogram drops out-of-range means, so its total never exceeds what we supplied
    expect(barTotal).toBeLessThanOrEqual(means.length);
    const maxBar = Math.max(...bars.map((bar) => bar.value));
    const curvePeak = Math.max(...r.chart.normalCurve.map((point) => point.y));
    // curve is scaled to the same counts as the bars (was inflated under the old bug)
    expect(curvePeak).toBeGreaterThan(0);
    expect(Math.abs(curvePeak - maxBar)).toBeLessThan(maxBar);
  });
});

describe("ANOVA", () => {
  it("matches the hand-computed F statistic on the fuel dataset", () => {
    const r = runExample(example("anova"), { dataset: "fuel" }, 1);
    expect(Number(metric(r, "F statistic"))).toBeCloseTo(29.377, 1);
    if (r.chart.type !== "anova") throw new Error("expected anova chart");
    expect(r.chart.groups.map((group) => group.label)).toEqual(["Brand A", "Brand B", "Brand C"]);
    expect(r.chart.grandMean).toBeCloseTo(mean(r.chart.groups.flatMap((group) => group.values)), 8);
  });
});

describe("permutation test", () => {
  it("creates a complete null histogram and a valid corrected p value", () => {
    const r = runExample(
      example("permutation-mean-difference"),
      { groupSize: 8, effect: 0.8, replicates: 200 },
      41,
    );
    if (r.chart.type !== "bars") throw new Error("expected bars chart");
    expect(r.chart.bars.reduce((sum, bar) => sum + bar.value, 0)).toBe(200);
    expect(new Set(r.chart.bars.map((bar) => bar.color))).toEqual(new Set(["#2f6f64", "#c8665a"]));
    const pValue = Number(metric(r, "two-sided p value"));
    expect(pValue).toBeGreaterThanOrEqual(1 / 201);
    expect(pValue).toBeLessThanOrEqual(1);
  });
});

describe("MCMC teaching payloads", () => {
  it("preserves draw order for Metropolis-Hastings and Gibbs traces", () => {
    const mh = runExample(example("mcmc-mixture"), { burnin: 20, sampleSize: 120, proposalSd: 1 }, 9);
    const gibbs = runExample(example("gibbs-bivariate"), { burnin: 20, sampleSize: 120, correlation: 0.8 }, 9);
    for (const r of [mh, gibbs]) {
      if (r.chart.type !== "mcmc") throw new Error("expected mcmc chart");
      expect(r.chart.samples.length).toBeGreaterThan(0);
      expect(r.chart.path.length).toBeGreaterThan(1);
      expect(r.chart.traceX).toHaveLength(120);
      expect(r.chart.traceY).toHaveLength(120);
      expect(r.chart.contours.length).toBeGreaterThan(0);
    }
  });
});

describe("shared math + format helpers", () => {
  it("linearRegression recovers slope/intercept/r² for a perfect line", () => {
    const fit = linearRegression([0, 1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 5 })));
    expect(fit.slope).toBeCloseTo(2, 6);
    expect(fit.intercept).toBeCloseTo(5, 6);
    expect(fit.rSquared).toBeCloseTo(1, 6);
  });

  it("normalPdf / normalCdf are correct at the standard normal", () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 6);
    expect(normalCdf(1.96, 0, 1)).toBeCloseTo(0.975, 3);
  });

  it("variance is the unbiased (n-1) estimator; mean is the average", () => {
    expect(mean([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(5, 6);
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(32 / 7, 4);
  });

  it("reductionPct / ratioOrNa guard degenerate inputs", () => {
    expect(reductionPct(1, 0)).toBe("n/a");
    expect(reductionPct(1, Number.NaN)).toBe("n/a");
    expect(reductionPct(1, 4)).toBe("75.00%");
    expect(ratioOrNa(6, 0)).toBe("n/a");
    expect(ratioOrNa(6, 3)).toBe("2.00");
  });
});

describe("confidence interval (genuine repeated sampling)", () => {
  // The mes-confidence-interval engine now draws fresh random samples and
  // builds a z-interval from each (previously it used three user-entered means).
  it("draws exactly intervalCount intervals and reports a valid coverage", () => {
    const r = runExample(
      example("confidence-interval"),
      { confidenceLevel: 0.95, sampleSize: 5, intervalCount: 200 },
      12345,
    );
    if (r.chart.type !== "intervals") throw new Error("expected intervals chart");
    expect(r.chart.intervals.length).toBe(200);
    expect(r.chart.reference).toBe(31.5);
    const coverage = Number.parseFloat(metric(r, "observed coverage"));
    expect(coverage).toBeGreaterThanOrEqual(0);
    expect(coverage).toBeLessThanOrEqual(100);
  });

  it("observed coverage tracks the confidence level over many intervals", () => {
    // 95% z-interval; 400 intervals should land near 95%.
    const r = runExample(
      example("confidence-interval"),
      { confidenceLevel: 0.95, sampleSize: 5, intervalCount: 400 },
      777,
    );
    const coverage = Number.parseFloat(metric(r, "observed coverage"));
    expect(coverage).toBeGreaterThan(85);
    expect(coverage).toBeLessThanOrEqual(100);
  });
});
