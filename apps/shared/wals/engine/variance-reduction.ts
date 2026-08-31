import type { SimulationResult } from "../types";
import { createRandom } from "@stats-viz/shared/random";
import { formatNumber, mean, reductionPct, standardDeviation, variance } from "@stats-viz/shared/format";
import { histogram } from "@stats-viz/shared/math";
import { num, result, type ControlMap } from "./internal";

export function antitheticExp(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const requestedN = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const n = requestedN - requestedN % 2;
  const half = Math.floor(n / 2);
  const pairedPoints = Array.from({ length: half }, (_, index) => {
    const u = rng();
    return { x: Math.exp(u), y: Math.exp(1 - u), index };
  });
  const paired = pairedPoints.map((point) => (point.x + point.y) / 2);
  const independent = Array.from({ length: n }, () => Math.exp(rng()));
  // Both estimators spend n integrand evaluations. Because n evaluations make
  // only n/2 antithetic pair-means, compare variances of the final estimators,
  // not variances of their differently sized per-draw contribution arrays.
  const pairedEstimatorVariance = variance(paired) / paired.length;
  const independentEstimatorVariance = variance(independent) / independent.length;
  const exact = Math.E - 1;
  const pairedMeanX = mean(pairedPoints.map((point) => point.x));
  const pairedMeanY = mean(pairedPoints.map((point) => point.y));
  const pairCorrelation = pairedPoints.length > 1
    ? (pairedPoints.reduce((sum, point) => sum + (point.x - pairedMeanX) * (point.y - pairedMeanY), 0) / (pairedPoints.length - 1)) /
      Math.sqrt(Math.max(Number.EPSILON, variance(pairedPoints.map((point) => point.x)) * variance(pairedPoints.map((point) => point.y))))
    : 0;
  return result(
    "Antithetic estimator for exp(U)",
    "Paired uniforms U and 1-U reduce estimator variance for a monotone integrand.",
    [
      { label: "antithetic estimate", value: formatNumber(mean(paired), 5), detail: `exact ${formatNumber(exact, 5)}` },
      { label: "independent estimate", value: formatNumber(mean(independent), 5), detail: "simple MC" },
      { label: "variance reduction", value: reductionPct(pairedEstimatorVariance, independentEstimatorVariance), detail: `${n} function evaluations each` },
      { label: "pair correlation", value: formatNumber(pairCorrelation, 3), detail: "correlation of f(U) and f(1 − U)" }
    ],
    { type: "bars", title: "Variance under the same simulation budget", xLabel: "estimator", yLabel: "estimator variance", bars: [{ label: "antithetic", value: pairedEstimatorVariance, color: "#2f6f64", semanticColor: "var(--lab-teal)" }, { label: "independent", value: independentEstimatorVariance, color: "#c8665a", semanticColor: "var(--lab-coral)" }] }
  );
}
export function antitheticGamma(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const requestedN = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const n = requestedN - requestedN % 2;
  const half = Math.floor(n / 2);
  const paired = Array.from({ length: half }, () => {
    const u = Math.max(rng(), Number.EPSILON);
    return (Math.pow(-Math.log(u), 0.9) + Math.pow(-Math.log(1 - u), 0.9)) / 2;
  });
  const independent = Array.from({ length: n }, () => {
    const u = Math.max(rng(), Number.EPSILON);
    return Math.pow(-Math.log(u), 0.9);
  });
  const pairedEstimatorVariance = variance(paired) / paired.length;
  const independentEstimatorVariance = variance(independent) / independent.length;
  return result(
    "Antithetic gamma-like integral",
    "The paired estimator mirrors the WALS antithetic integral example.",
    [
      { label: "estimate", value: formatNumber(mean(paired), 5), detail: "antithetic method" },
      { label: "standard error", value: formatNumber(standardDeviation(paired) / Math.sqrt(half), 5), detail: `${half} pairs` },
      { label: "variance reduction", value: reductionPct(pairedEstimatorVariance, independentEstimatorVariance), detail: `${n} function evaluations each` }
    ],
    { type: "bars", title: "Pair-mean histogram", xLabel: "pair mean", yLabel: "count", bars: histogram(paired) }
  );
}
export function controlExp(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const coefficient = num(controls, "coefficient", -1.6903);
  const simple = Array.from({ length: n }, () => {
    const u = rng();
    return { simple: Math.exp(u), control: Math.exp(u) + coefficient * (u - 0.5) };
  });
  const simpleValues = simple.map((item) => item.simple);
  const controlValues = simple.map((item) => item.control);
  const optimalCoefficient = 6 * (Math.E - 3);
  return result(
    "Control variate estimator",
    "The adjustment uses U - 1/2, whose expectation is zero.",
    [
      { label: "simple estimate", value: formatNumber(mean(simpleValues), 5), detail: `variance ${formatNumber(variance(simpleValues), 5)}` },
      { label: "control estimate", value: formatNumber(mean(controlValues), 5), detail: `variance ${formatNumber(variance(controlValues), 5)}` },
      { label: "variance reduction", value: reductionPct(variance(controlValues), variance(simpleValues)), detail: `c = ${formatNumber(coefficient, 3)}` },
      { label: "optimal coefficient", value: formatNumber(optimalCoefficient, 4), detail: "theoretical minimum-variance c" }
    ],
    { type: "bars", title: "Simple versus control-variate variance", xLabel: "estimator", yLabel: "sample variance", bars: [{ label: "simple", value: variance(simpleValues), color: "var(--lab-coral)" }, { label: "control variate", value: variance(controlValues), color: "var(--lab-teal)" }] }
  );
}
export function controlRatio(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const pilot = Array.from({ length: 10000 }, () => rng());
  const f = (u: number) => Math.exp(-0.5) / (1 + u * u);
  const g = (u: number) => Math.exp(-u) / (1 + u * u);
  const pilotF = pilot.map(f);
  const pilotG = pilot.map(g);
  const fMean = mean(pilotF);
  const gMean = mean(pilotG);
  const covariance = mean(pilot.map((_, index) => (pilotF[index] - fMean) * (pilotG[index] - gMean)));
  const c = -covariance / variance(pilotF);
  const knownF = Math.exp(-0.5) * Math.PI / 4;
  const simple = Array.from({ length: n }, () => g(rng()));
  const controlled = Array.from({ length: n }, () => {
    const u = rng();
    return g(u) + c * (f(u) - knownF);
  });
  return result(
    "Estimated control-variate coefficient",
    "A pilot simulation estimates the coefficient used for the control-variate correction.",
    [
      { label: "simple estimate", value: formatNumber(mean(simple), 5), detail: `se ${formatNumber(standardDeviation(simple) / Math.sqrt(n), 5)}` },
      { label: "controlled estimate", value: formatNumber(mean(controlled), 5), detail: `se ${formatNumber(standardDeviation(controlled) / Math.sqrt(n), 5)}` },
      { label: "variance reduction", value: reductionPct(variance(controlled), variance(simple)), detail: `c = ${formatNumber(c, 3)}` }
    ],
    { type: "bars", title: "Variance after estimating a control coefficient", xLabel: "estimator", yLabel: "sample variance", bars: [{ label: "simple", value: variance(simple), color: "var(--lab-coral)" }, { label: "controlled", value: variance(controlled), color: "var(--lab-teal)" }] }
  );
}
export function importancePower(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const importanceWeights: number[] = [];
  const importance = Array.from({ length: n }, () => {
    const x = Math.pow(rng(), 1 / 5);
    importanceWeights.push(1 / Math.max(x ** 4, Number.EPSILON));
    return Math.pow(x, 5.1) / (5 * Math.pow(x, 4));
  });
  const simple = Array.from({ length: n }, () => Math.pow(rng(), 5.1));
  const exact = 1 / 6.1;
  const weightSum = importanceWeights.reduce((sum, weight) => sum + weight, 0);
  const ess = weightSum * weightSum / Math.max(Number.EPSILON, importanceWeights.reduce((sum, weight) => sum + weight * weight, 0));
  return result(
    "Importance sampling comparison",
    "The proposal density concentrates samples near larger x values.",
    [
      { label: "importance estimate", value: formatNumber(mean(importance), 6), detail: `variance ${formatNumber(variance(importance), 6)}` },
      { label: "simple estimate", value: formatNumber(mean(simple), 6), detail: `variance ${formatNumber(variance(simple), 6)}` },
      { label: "exact target", value: formatNumber(exact, 6), detail: "1 / 6.1" },
      { label: "variance reduction", value: reductionPct(variance(importance), variance(simple)), detail: "importance vs simple" },
      { label: "ESS", value: formatNumber(ess, 0), detail: "effective sample size from proposal weights" }
    ],
    { type: "scatter", title: "Target versus proposal contributions", xLabel: "uniform contribution", yLabel: "importance contribution", points: importance.slice(0, 250).map((value, index) => ({ x: simple[index] ?? 0, y: value, color: "var(--lab-teal)" })), legend: [{ label: "proposal-weighted draw", color: "var(--lab-teal)", shape: "dot" }] }
  );
}
export function conditionalCircle(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const conditional = Array.from({ length: n }, () => {
    const u = rng();
    return Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2));
  });
  const simple = Array.from({ length: n }, () => {
    const x = rng();
    const y = rng();
    return x * x + y * y <= 1 ? 1 : 0;
  });
  const exact = Math.PI / 4;
  return result(
    "Conditional Monte Carlo estimator",
    "Conditioning replaces a binary hit/miss draw with a smooth conditional expectation.",
    [
      { label: "conditional estimate", value: formatNumber(mean(conditional), 5), detail: `variance ${formatNumber(variance(conditional), 5)}` },
      { label: "simple estimate", value: formatNumber(mean(simple), 5), detail: `variance ${formatNumber(variance(simple), 5)}` },
      { label: "exact target", value: formatNumber(exact, 5), detail: "π / 4" },
      { label: "variance reduction", value: reductionPct(variance(conditional), variance(simple)), detail: "conditional vs simple" }
    ],
    { type: "bars", title: "Conditioning smooths a hit-or-miss estimator", xLabel: "estimator", yLabel: "sample variance", bars: [{ label: "conditional", value: variance(conditional), color: "var(--lab-teal)" }, { label: "hit or miss", value: variance(simple), color: "var(--lab-coral)" }] }
  );
}
