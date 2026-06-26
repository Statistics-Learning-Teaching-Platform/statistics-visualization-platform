import jStat from "jstat";
import type { SimulationResult } from "../types";
import { formatNumber } from "@stats-viz/shared/format";
import { normalCdf, normalPdf } from "@stats-viz/shared/math";
import { num, result, str, type ControlMap } from "./internal";

export function distribution(controls: ControlMap): SimulationResult {
  const dist = str(controls, "dist", "norm");
  const mode = str(controls, "mode", "PDF");
  const a = num(controls, "a", 0);
  const b = Math.max(0.1, num(controls, "b", 1));
  const lower = num(controls, "lower", -2);
  const upper = num(controls, "upper", 2);

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
    shape:     Math.max(0.5, a || 1),                    // slot a → gamma/beta shape α
    betaParam: Math.max(0.5, b || 1),                    // slot b → beta shape β
    tDf:       Math.max(1, Math.round(a || 6)),           // slot a → Student-t df
    chisqDf:   Math.max(1, Math.round(b)),               // slot b → chi-squared df
    prob:      Math.min(0.95, Math.max(0.05, a || 0.5)), // slot a → binom/geom success p
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
      case "unif": return x >= a && x <= b ? 1 / Math.max(b - a, Number.EPSILON) : 0;
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
      case "unif": return x < a ? 0 : x > b ? 1 : (x - a) / Math.max(b - a, Number.EPSILON);
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
    norm: `μ = ${formatNumber(a, 2)}, σ = ${formatNumber(b, 2)}`,
    t: `df = ${params.tDf}`,
    beta: `α = ${formatNumber(params.shape, 2)}, β = ${formatNumber(params.betaParam, 2)}`,
    gamma: `α = ${formatNumber(params.shape, 2)}, β = ${formatNumber(b, 2)}`,
    chisq: `df = ${params.chisqDf}`,
    exp: `λ = ${formatNumber(b, 2)}`,
    unif: `a = ${formatNumber(a, 2)}, b = ${formatNumber(b, 2)}`,
    binom: `n = ${params.binomN}, p = ${formatNumber(params.prob, 2)}`,
    geom: `p = ${formatNumber(params.prob, 2)}`,
    pois: `λ = ${formatNumber(b, 2)}`,
  };

  const isDiscrete = ["binom", "geom", "pois"].includes(dist);
  const xs = isDiscrete
    ? Array.from({ length: Math.max(8, params.binomN + 1) }, (_, index) => index)
    : Array.from({ length: 160 }, (_, index) => lower - 2 + (index * (upper - lower + 4)) / 159);

  const points = xs.map((x) => ({ x, y: mode === "CDF" ? cdfAt(x) : pdfAt(x) }));

  // Exact CDF difference for continuous distributions; pmf sum over the
  // integer support for discrete ones.
  const probability = isDiscrete
    ? xs.filter((x) => x >= lower && x <= upper).reduce((sum, x) => sum + pdfAt(x), 0)
    : Math.max(0, cdfAt(upper) - cdfAt(lower));

  return result(
    "Distribution explorer",
    `${mode} view for ${dist}; ${paramSummary[dist] ?? paramSummary.norm}.`,
    [
      { label: "distribution", value: dist, detail: mode },
      { label: "resolved parameters", value: paramSummary[dist] ?? paramSummary.norm },
      { label: "interval probability", value: formatNumber(probability, 4), detail: `P(${lower} <= X <= ${upper})` }
    ],
    isDiscrete
      ? { type: "bars", title: `${dist} ${mode}`, xLabel: "x", yLabel: mode, bars: points.map((point) => ({ label: String(point.x), value: point.y })) }
      : { type: "line", title: `${dist} ${mode}`, xLabel: "x", yLabel: mode, series: [{ label: dist, points, color: "#136f63" }] }
  );
}
