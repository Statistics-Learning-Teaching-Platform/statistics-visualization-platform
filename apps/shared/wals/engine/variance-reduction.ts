import type { SimulationResult } from "../types";
import { createRandom } from "@stats-viz/shared/random";
import { formatNumber, mean, reductionPct, standardDeviation, variance } from "@stats-viz/shared/format";
import { histogram } from "@stats-viz/shared/math";
import { num, result, type ControlMap } from "./internal";

export function antitheticExp(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const half = Math.floor(n / 2);
  const paired = Array.from({ length: half }, () => {
    const u = rng();
    return (Math.exp(u) + Math.exp(1 - u)) / 2;
  });
  const independent = Array.from({ length: n }, () => Math.exp(rng()));
  const exact = Math.E - 1;
  return result(
    "Antithetic estimator for exp(U)",
    "Paired uniforms U and 1-U reduce estimator variance for a monotone integrand.",
    [
      { label: "antithetic estimate", value: formatNumber(mean(paired), 5), detail: `exact ${formatNumber(exact, 5)}` },
      { label: "independent estimate", value: formatNumber(mean(independent), 5), detail: "simple MC" },
      { label: "variance reduction", value: reductionPct(variance(paired), variance(independent)), detail: "sample variance basis" }
    ],
    { type: "bars", title: "Estimator variance", xLabel: "method", yLabel: "variance", bars: [{ label: "antithetic", value: variance(paired) }, { label: "independent", value: variance(independent) }] }
  );
}
export function antitheticGamma(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const half = Math.floor(n / 2);
  const paired = Array.from({ length: half }, () => {
    const u = Math.max(rng(), Number.EPSILON);
    return (Math.pow(-Math.log(u), 0.9) + Math.pow(-Math.log(1 - u), 0.9)) / 2;
  });
  return result(
    "Antithetic gamma-like integral",
    "The paired estimator mirrors the WALS antithetic integral example.",
    [
      { label: "estimate", value: formatNumber(mean(paired), 5), detail: "antithetic method" },
      { label: "standard error", value: formatNumber(standardDeviation(paired) / Math.sqrt(half), 5), detail: `${half} pairs` },
      { label: "pair variance", value: formatNumber(variance(paired), 5), detail: "variance of pair means" }
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
  return result(
    "Control variate estimator",
    "The adjustment uses U - 1/2, whose expectation is zero.",
    [
      { label: "simple estimate", value: formatNumber(mean(simpleValues), 5), detail: `variance ${formatNumber(variance(simpleValues), 5)}` },
      { label: "control estimate", value: formatNumber(mean(controlValues), 5), detail: `variance ${formatNumber(variance(controlValues), 5)}` },
      { label: "variance reduction", value: reductionPct(variance(controlValues), variance(simpleValues)), detail: `c = ${formatNumber(coefficient, 3)}` }
    ],
    { type: "bars", title: "Simple vs control variate variance", xLabel: "method", yLabel: "variance", bars: [{ label: "simple", value: variance(simpleValues) }, { label: "control", value: variance(controlValues) }] }
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
    { type: "bars", title: "Estimator variance", xLabel: "method", yLabel: "variance", bars: [{ label: "simple", value: variance(simple) }, { label: "controlled", value: variance(controlled) }] }
  );
}
export function importancePower(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const importance = Array.from({ length: n }, () => {
    const x = Math.pow(rng(), 1 / 5);
    return Math.pow(x, 5.1) / (5 * Math.pow(x, 4));
  });
  const simple = Array.from({ length: n }, () => Math.pow(rng(), 5.1));
  return result(
    "Importance sampling comparison",
    "The proposal density concentrates samples near larger x values.",
    [
      { label: "importance estimate", value: formatNumber(mean(importance), 6), detail: `variance ${formatNumber(variance(importance), 6)}` },
      { label: "simple estimate", value: formatNumber(mean(simple), 6), detail: `variance ${formatNumber(variance(simple), 6)}` },
      { label: "variance reduction", value: reductionPct(variance(importance), variance(simple)), detail: "importance vs simple" }
    ],
    { type: "bars", title: "Estimator variance", xLabel: "method", yLabel: "variance", bars: [{ label: "importance", value: variance(importance) }, { label: "simple", value: variance(simple) }] }
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
    const u = rng();
    return u * u + (2 * u - 1) ** 2 < 1 ? 1 : 0;
  });
  return result(
    "Conditional Monte Carlo estimator",
    "Conditioning replaces a binary hit/miss draw with a smooth conditional expectation.",
    [
      { label: "conditional estimate", value: formatNumber(mean(conditional), 5), detail: `variance ${formatNumber(variance(conditional), 5)}` },
      { label: "simple estimate", value: formatNumber(mean(simple), 5), detail: `variance ${formatNumber(variance(simple), 5)}` },
      { label: "variance reduction", value: reductionPct(variance(conditional), variance(simple)), detail: "conditional vs simple" }
    ],
    { type: "bars", title: "Estimator variance", xLabel: "method", yLabel: "variance", bars: [{ label: "conditional", value: variance(conditional) }, { label: "simple", value: variance(simple) }] }
  );
}
