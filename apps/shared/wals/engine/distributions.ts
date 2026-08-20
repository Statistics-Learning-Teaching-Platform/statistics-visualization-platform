import jStat from "jstat";
import type { SimulationResult } from "../types";
import { formatNumber } from "@stats-viz/shared/format";
import { normalCdf, normalPdf } from "@stats-viz/shared/math";
import { num, result, str, type ControlMap } from "./internal";

export function distribution(controls: ControlMap): SimulationResult {
  const dist = str(controls, "dist", "norm");
  const mode = str(controls, "mode", "PDF");
  const a = num(controls, "a", 0);
  const rawB = num(controls, "b", 1);
  // Most distributions use slot b as a positive scale/rate/shape parameter,
  // but Uniform uses it as a location. Keep the raw value for that one case:
  // clamping it here used to turn U(-5, -1) into U(-5, 0.1).
  const b = Math.max(0.1, rawB);
  const lower = num(controls, "lower", -2);
  const upper = num(controls, "upper", 2);
  const intervalLower = Math.min(lower, upper);
  const intervalUpper = Math.max(lower, upper);
  const uniformLower = Math.min(a, rawB);
  const uniformUpper = Math.max(a, rawB);

  // The control surface exposes two generic slots (a, b); each distribution
  // maps them to its own parameters. The mapping is collected in ONE object
  // below so the (intentional) asymmetry is impossible to miss — e.g.
  // Student-t's df is resolved from slot `a`, while chi-squared's df is
  // resolved from slot `b`. Resolved values are also surfaced in the
  // "resolved parameters" metric, so the learner always sees what each slot
  // currently means.
  // Replacing these slots with named per-distribution parameters is a separate
  // UX redesign (it would change the module-config controls and the a/b
  // sliders the UI renders) and is intentionally out of scope here.
  const params = {
    shape:     Math.max(0.1, a || 1),                    // slot a → gamma/beta shape α
    betaParam: Math.max(0.1, b || 1),                    // slot b → beta shape β
    tDf:       Math.max(1, Math.round(a || 6)),           // slot a → Student-t df
    chisqDf:   Math.max(1, Math.round(b)),               // slot b → chi-squared df
    prob:      Math.min(0.99, Math.max(0.01, a || 0.5)), // slot a → binom/geom success p
    binomN:    Math.max(1, Math.round(b)),               // slot b → binomial trials n
  };

  const pdfAt = (x: number): number => {
    switch (dist) {
      case "norm": return normalPdf(x, a, b);
      case "t": return jStat.studentt.pdf(x, params.tDf);
      case "beta": return x > 0 && x < 1 ? jStat.beta.pdf(x, params.shape, params.betaParam) : 0;
      case "gamma": return x > 0 ? jStat.gamma.pdf(x, params.shape, 1 / b) : 0; // jstat takes (shape, scale = 1/rate)
      case "chisq": return x > 0 ? jStat.chisquare.pdf(x, params.chisqDf) : 0;
      case "exp": return x < 0 ? 0 : b * Math.exp(-b * x);
      case "unif": return x >= uniformLower && x <= uniformUpper ? 1 / Math.max(uniformUpper - uniformLower, Number.EPSILON) : 0;
      case "pois": return x >= 0 && Number.isInteger(x) ? jStat.poisson.pdf(x, b) : 0;
      case "binom": return x >= 0 && x <= params.binomN && Number.isInteger(x) ? jStat.binomial.pdf(x, params.binomN, params.prob) : 0;
      case "geom": return x >= 0 && Number.isInteger(x) ? Math.pow(1 - params.prob, x) * params.prob : 0;
      default: return normalPdf(x, a, b);
    }
  };

  const cdfAt = (x: number): number => {
    switch (dist) {
      case "norm": return normalCdf(x, a, b);
      case "t": return jStat.studentt.cdf(x, params.tDf);
      case "beta": return x <= 0 ? 0 : x >= 1 ? 1 : jStat.beta.cdf(x, params.shape, params.betaParam);
      case "gamma": return x <= 0 ? 0 : jStat.gamma.cdf(x, params.shape, 1 / b);
      case "chisq": return x <= 0 ? 0 : jStat.chisquare.cdf(x, params.chisqDf);
      case "exp": return x < 0 ? 0 : 1 - Math.exp(-b * x);
      case "unif": return x < uniformLower ? 0 : x > uniformUpper ? 1 : (x - uniformLower) / Math.max(uniformUpper - uniformLower, Number.EPSILON);
      case "pois": return x < 0 ? 0 : jStat.poisson.cdf(Math.floor(x), b);
      case "binom": return x < 0 ? 0 : x >= params.binomN ? 1 : jStat.binomial.cdf(Math.floor(x), params.binomN, params.prob);
      case "geom": return x < 0 ? 0 : 1 - Math.pow(1 - params.prob, Math.floor(x) + 1);
      default: return normalCdf(x, a, b);
    }
  };

  // Symbolic notation keeps the value free of untranslated Latin words (the
  // i18n completeness check flags any 3+ letter Latin token) while naming each
  // distribution's parameters: gamma uses shape α / rate β, jstat's scale is 1/β.
  const paramSummary: Record<string, string> = {
    norm: `μ = ${formatNumber(a, 2)}, σ = ${formatNumber(b, 2)}, σ² = ${formatNumber(b * b, 2)}`,
    t: `df = ${params.tDf}`,
    beta: `α = ${formatNumber(params.shape, 2)}, β = ${formatNumber(params.betaParam, 2)}`,
    gamma: `α = ${formatNumber(params.shape, 2)}, β = ${formatNumber(b, 2)}`,
    chisq: `df = ${params.chisqDf}`,
    exp: `λ = ${formatNumber(b, 2)}`,
    unif: `a = ${formatNumber(uniformLower, 2)}, b = ${formatNumber(uniformUpper, 2)}`,
    binom: `n = ${params.binomN}, p = ${formatNumber(params.prob, 2)}`,
    geom: `p = ${formatNumber(params.prob, 2)}`,
    pois: `λ = ${formatNumber(b, 2)}`,
  };

  const isDiscrete = ["binom", "geom", "pois"].includes(dist);
  const discreteMax = dist === "binom"
    ? params.binomN
    : dist === "pois"
      ? Math.max(12, Math.ceil(b + 6 * Math.sqrt(Math.max(b, 0.1))))
      : Math.min(100, Math.max(12, Math.ceil(Math.log(0.001) / Math.log(Math.max(1 - params.prob, 0.001)))));
  const continuousSupport: Record<string, [number, number]> = {
    norm: [a - 4 * b, a + 4 * b],
    t: [-8, 8],
    beta: [0, 1],
    gamma: [0, params.shape / b + (6 * Math.sqrt(params.shape)) / b],
    chisq: [0, params.chisqDf + 6 * Math.sqrt(2 * params.chisqDf)],
    exp: [0, 8 / b],
    unif: [uniformLower, uniformUpper],
  };
  const support = continuousSupport[dist] ?? [intervalLower - 2, intervalUpper + 2];
  const supportWidth = Math.max(support[1] - support[0], 1);
  // Normal curves deliberately share one fixed teaching canvas. If the axis
  // followed μ and σ, every curve would be re-centred and re-scaled, hiding
  // the very location/spread changes this visualizer is meant to teach.
  const continuousMin = dist === "norm" ? -12 : Math.min(intervalLower, support[0] - supportWidth * 0.04);
  const continuousMax = dist === "norm" ? 12 : Math.max(intervalUpper, support[1] + supportWidth * 0.04);
  const xs = isDiscrete
    ? Array.from({ length: discreteMax + 1 }, (_, index) => index)
    : Array.from({ length: 180 }, (_, index) => continuousMin + (index * (continuousMax - continuousMin)) / 179);

  const points = xs.map((x) => ({ x, y: mode === "CDF" ? cdfAt(x) : pdfAt(x) }));
  const normalReferencePoints = dist === "norm"
    ? xs.map((x) => ({ x, y: mode === "CDF" ? normalCdf(x, 0, 1) : normalPdf(x, 0, 1) }))
    : [];

  // Exact CDF difference for continuous distributions; pmf sum over the
  // integer support for discrete ones.
  const probability = isDiscrete
    ? Math.max(0, cdfAt(Math.floor(intervalUpper)) - cdfAt(Math.ceil(intervalLower) - 1))
    : Math.max(0, cdfAt(intervalUpper) - cdfAt(intervalLower));
  const verticalLabel = isDiscrete
    ? mode === "CDF" ? "CDF  F(x)" : "PMF  P(X = x)"
    : mode === "CDF" ? "CDF  F(x)" : "density  f(x)";

  return result(
    "Distribution explorer",
    `${mode} view for ${dist}; ${paramSummary[dist] ?? paramSummary.norm}.`,
    [
      { label: "distribution", value: dist, detail: mode },
      { label: "resolved parameters", value: paramSummary[dist] ?? paramSummary.norm },
      { label: "interval probability", value: formatNumber(probability, 4), detail: `P(${intervalLower} <= X <= ${intervalUpper})` }
    ],
    isDiscrete
      ? {
          type: "bars",
          title: `${dist} ${mode === "CDF" ? "cumulative distribution" : "probability mass"}`,
          xLabel: "possible value x",
          yLabel: verticalLabel,
          bars: points.map((point) => ({
            label: String(point.x),
            value: point.y,
            color: point.x >= intervalLower && point.x <= intervalUpper ? "#c8665a" : "#2f6f64",
          })),
          legend: [
            { label: "selected interval", color: "#c8665a", shape: "bar" },
            { label: "outside interval", color: "#2f6f64", shape: "bar" },
          ],
        }
      : {
          type: "line",
          title: dist === "norm"
            ? "normal parameter comparison"
            : `${dist} ${mode === "CDF" ? "cumulative distribution" : "density"}`,
          xLabel: "value x",
          yLabel: verticalLabel,
          series: dist === "norm"
            ? [
                { label: "current N(μ, σ²)", points, color: "#2f6f64" },
                { label: "reference N(0, 1)", points: normalReferencePoints, color: "#8d75b5", dashed: true, opacity: 0.92 },
              ]
            : [{ label: mode === "CDF" ? "F(x)" : "f(x)", points, color: "#2f6f64" }],
          references: [
            { axis: "x", value: intervalLower, label: "lower", color: "#c8665a" },
            { axis: "x", value: intervalUpper, label: "upper", color: "#c8665a" },
          ],
          xDomain: dist === "norm" ? [-12, 12] : undefined,
          yDomain: dist === "norm" ? (mode === "CDF" ? [0, 1.02] : [0, 0.85]) : undefined,
        }
  );
}
