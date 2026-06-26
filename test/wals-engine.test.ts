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

describe("central limit theorem", () => {
  const controls = { populationShape: "exponential" as const, sampleSize: 5 };

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
