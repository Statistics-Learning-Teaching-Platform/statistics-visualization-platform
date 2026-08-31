import type { ChartPoint, ChartSeries, SimulationResult } from "../types";
import { createRandom, normalRandom } from "@stats-viz/shared/random";
import { formatNumber, mean } from "@stats-viz/shared/format";
import { num, result, type ControlMap } from "./internal";

/** Equal-weight, fully normalized bivariate-normal mixture target. */
export function mixtureTargetDensity(x: number, y: number): number {
  const broadMode = Math.exp(-((x - 6) ** 2 + (y - 6) ** 2) / 4) / (4 * Math.PI);
  const unitMode = Math.exp(-(x * x + y * y) / 2) / (2 * Math.PI);
  return 0.5 * broadMode + 0.5 * unitMode;
}

const MIXTURE_MODES = [
  { x: 0, y: 0 },
  { x: 6, y: 6 },
] as const;
const MIXTURE_CONTOUR_LEVELS = [0.006, 0.015, 0.03] as const;

export function mixtureTargetContours(): ChartSeries[] {
  return MIXTURE_CONTOUR_LEVELS.flatMap((level) =>
    MIXTURE_MODES.map((mode, modeIndex) => {
      const points = Array.from({ length: 97 }, (_, index) => {
        const angle = (index / 96) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let innerRadius = 0;
        let outerRadius = 0.05;

        // Find the first outward crossing. The mixture is multimodal, so a
        // coarse exponential bracket could skip the valley and land in the
        // other mode; small fixed steps preserve the local contour component.
        while (
          outerRadius < 12
          && mixtureTargetDensity(mode.x + dx * outerRadius, mode.y + dy * outerRadius) > level
        ) {
          innerRadius = outerRadius;
          outerRadius += 0.05;
        }
        for (let iteration = 0; iteration < 32; iteration += 1) {
          const midpoint = (innerRadius + outerRadius) / 2;
          if (mixtureTargetDensity(mode.x + dx * midpoint, mode.y + dy * midpoint) > level) {
            innerRadius = midpoint;
          } else {
            outerRadius = midpoint;
          }
        }
        const radius = (innerRadius + outerRadius) / 2;
        return { x: mode.x + dx * radius, y: mode.y + dy * radius };
      });
      return {
        label: `target density ${level} mode ${modeIndex + 1}`,
        points,
        color: "#8d75b5",
        opacity: 0.5,
      };
    }),
  );
}

export function autocorrelationEffectiveSampleSize(values: number[]): number {
  if (values.length < 3) return values.length;
  const center = mean(values);
  const centered = values.map((value) => value - center);
  const varianceSum = centered.reduce((sum, value) => sum + value * value, 0);
  if (varianceSum <= Number.EPSILON) return 1;

  const autocorrelation = (lag: number) => {
    let covarianceSum = 0;
    for (let index = lag; index < centered.length; index += 1) {
      covarianceSum += centered[index] * centered[index - lag];
    }
    return covarianceSum / varianceSum;
  };

  let positivePairSum = 0;
  for (let lag = 1; lag + 1 < values.length; lag += 2) {
    const pair = autocorrelation(lag) + autocorrelation(lag + 1);
    if (pair <= 0) break;
    positivePairSum += pair;
  }
  const autocorrelationTime = Math.max(1, 1 + 2 * positivePairSum);
  return Math.max(1, Math.min(values.length, values.length / autocorrelationTime));
}

const MIXTURE_TARGET_CONTOURS = mixtureTargetContours();

export function mcmcMixture(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const burnin = Math.max(0, Math.round(num(controls, "burnin", 200)));
  const sampleSize = Math.max(50, Math.round(num(controls, "sampleSize", 400)));
  const proposalSd = Math.max(0.05, num(controls, "proposalSd", 1));
  let x = rng() * 10 - 2;
  let y = rng() * 10 - 2;
  let accepted = 0;
  const points: ChartPoint[] = [];
  const allStates: ChartPoint[] = [];
  for (let i = 0; i < burnin + sampleSize; i += 1) {
    const px = x + normalRandom(rng, 0, proposalSd);
    const py = y + normalRandom(rng, 0, proposalSd);
    const ratio = mixtureTargetDensity(px, py) / Math.max(mixtureTargetDensity(x, y), Number.EPSILON);
    if (rng() < Math.min(1, ratio)) {
      x = px;
      y = py;
      accepted += 1;
    }
    if (i >= burnin) {
      const state = { x, y, color: i === burnin ? "var(--lab-orange)" : "var(--lab-teal)" };
      points.push(state);
      allStates.push(state);
    }
  }
  const previewStride = Math.max(1, Math.ceil(points.length / 420));
  const samples = points.filter((_, index) => index % previewStride === 0);
  const path = allStates.slice(-Math.min(45, allStates.length));
  const traceWindow = allStates.slice(-Math.min(180, allStates.length));
  const traceX = traceWindow.map((point, index) => ({ x: index + 1, y: point.x }));
  const traceY = traceWindow.map((point, index) => ({ x: index + 1, y: point.y }));
  const localEss = Math.min(
    autocorrelationEffectiveSampleSize(points.map((point) => point.x)),
    autocorrelationEffectiveSampleSize(points.map((point) => point.y)),
  );
  const coreAssignments = points.map((point) => {
    const distanceToFirst = point.x ** 2 + point.y ** 2;
    const distanceToSecond = (point.x - 6) ** 2 + (point.y - 6) ** 2;
    if (distanceToFirst <= 9) return 0;
    if (distanceToSecond <= 18) return 1;
    return undefined;
  });
  const modeVisits = [0, 0];
  let previousMode: number | undefined;
  let modeSwitches = 0;
  for (const assignment of coreAssignments) {
    if (assignment === undefined) continue;
    modeVisits[assignment] += 1;
    if (previousMode !== undefined && previousMode !== assignment) modeSwitches += 1;
    previousMode = assignment;
  }
  const minimumModeVisits = Math.max(5, Math.floor(sampleSize * 0.01));
  const visitedModes = modeVisits.filter((visits) => visits >= minimumModeVisits).length;
  const supportsGlobalEss = visitedModes === MIXTURE_MODES.length && modeSwitches > 0;
  return result(
    "Metropolis-Hastings sample path",
    "Contours show the target density, the red polyline shows the most recent chain movement, and the trace panels preserve draw order.",
    [
      { label: "acceptance rate", value: formatNumber(accepted / (burnin + sampleSize), 4), detail: "accepted proposals", help: "Very low values indicate proposals that are too large; very high values can indicate slow exploration." },
      { label: "proposal step", value: formatNumber(proposalSd, 2), detail: "proposal standard deviation" },
      {
        label: "effective sample size",
        value: supportsGlobalEss ? formatNumber(localEss, 0) : "n/a",
        detail: supportsGlobalEss ? `of ${sampleSize} retained draws` : "not reported until both modes are explored",
        help: "Initial-positive-sequence autocorrelation estimate. It is withheld when the chain has not demonstrated movement between both target modes.",
      },
      { label: "mode coverage", value: `${visitedModes} / 2`, detail: `${modeSwitches} between-mode transitions` },
      { label: "burn-in", value: String(burnin), detail: "discarded initial states" },
      { label: "mean location", value: `(${formatNumber(mean(points.map((p) => p.x)), 2)}, ${formatNumber(mean(points.map((p) => p.y)), 2)})`, detail: "retained sample mean" }
    ],
    {
      type: "mcmc",
      title: "How the Metropolis-Hastings chain explores a two-mode target",
      xLabel: "parameter x₁",
      yLabel: "parameter x₂",
      targetLabel: "Target density and recent chain path",
      traceLabel: "Recent trace by draw order",
      currentStateLabel: "current state",
      targetDensityLabel: "target density",
      recentPathLabel: "recent path",
      samples,
      path,
      contours: MIXTURE_TARGET_CONTOURS,
      traceX,
      traceY,
      xDomain: [-4, 10],
      yDomain: [-4, 10],
    }
  );
}
export function politician(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const steps = Math.max(1000, Math.round(num(controls, "steps", 5000)));
  const islands = ["Is1", "Is2", "Is3", "Is4", "Is5", "Is6", "Is7", "Is8", "Is9"];
  const population = [100, 700, 400, 200, 350, 450, 800, 500, 200];
  let current = Math.floor(rng() * islands.length);
  const visits = Array.from({ length: islands.length }, () => 0);
  for (let i = 0; i < steps; i += 1) {
    visits[current] += 1;
    const direction = rng() < 0.5 ? -1 : 1;
    const proposal = (current + direction + islands.length) % islands.length;
    const accept = Math.min(1, population[proposal] / population[current]);
    if (rng() < accept) current = proposal;
  }
  const totalPopulation = population.reduce((sum, value) => sum + value, 0);
  const bars = islands.map((island, index) => ({ label: island.replace("Is", "Island "), value: visits[index] / steps }));
  const target = islands.map((island, index) => ({ label: island.replace("Is", "Island "), value: population[index] / totalPopulation }));
  return result(
    "Metropolis walk over islands",
    "Visit frequencies approximate the target population proportions.",
    [
      { label: "steps", value: String(steps), detail: "single-chain simulation" },
      { label: "most visited", value: bars.reduce((best, item) => (item.value > best.value ? item : best)).label, detail: "highest empirical frequency" },
      { label: "target largest", value: "Is7", detail: "largest population" }
    ],
    {
      type: "bars",
      title: "Empirical visit frequency by island",
      xLabel: "island",
      yLabel: "visit proportion",
      bars: bars.map((bar, index) => ({ ...bar, color: Math.abs(bar.value - target[index].value) < 0.02 ? "var(--lab-green)" : "var(--lab-orange)" })),
      legend: [
        { label: "close to target", color: "var(--lab-green)", shape: "bar" },
        { label: "still converging", color: "var(--lab-orange)", shape: "bar" },
      ],
      yDomain: [0, Math.max(...bars.map((bar) => bar.value), ...target.map((bar) => bar.value)) * 1.2],
    }
  );
}

export function gibbsBivariate(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const rho = Math.max(-0.95, Math.min(0.95, num(controls, "correlation", 0.8)));
  const burnin = Math.max(0, Math.round(num(controls, "burnin", 100)));
  const sampleSize = Math.max(50, Math.round(num(controls, "sampleSize", 400)));
  const conditionalSd = Math.sqrt(Math.max(1 - rho * rho, 1e-6));
  let x = 0;
  let y = 0;
  const samples: ChartPoint[] = [];
  const axisPath: ChartPoint[] = [];
  for (let sweep = 0; sweep < burnin + sampleSize; sweep += 1) {
    x = normalRandom(rng, rho * y, conditionalSd);
    if (sweep >= burnin && sweep >= burnin + sampleSize - 24) axisPath.push({ x, y });
    y = normalRandom(rng, rho * x, conditionalSd);
    if (sweep >= burnin) {
      samples.push({ x, y, color: "var(--lab-teal)" });
      if (sweep >= burnin + sampleSize - 24) axisPath.push({ x, y });
    }
  }
  const contour = (radius: number): ChartPoint[] => Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    const z1 = radius * Math.cos(angle);
    const z2 = radius * Math.sin(angle);
    return { x: z1, y: rho * z1 + conditionalSd * z2 };
  });
  const previewStride = Math.max(1, Math.ceil(samples.length / 420));
  const preview = samples.filter((_, index) => index % previewStride === 0);
  const traceWindow = samples.slice(-Math.min(180, samples.length));
  const traceX = traceWindow.map((point, index) => ({ x: index + 1, y: point.x }));
  const traceY = traceWindow.map((point, index) => ({ x: index + 1, y: point.y }));
  const xMean = mean(samples.map((point) => point.x));
  const yMean = mean(samples.map((point) => point.y));
  const covariance = mean(samples.map((point) => (point.x - xMean) * (point.y - yMean)));
  const xVariance = mean(samples.map((point) => (point.x - xMean) ** 2));
  const yVariance = mean(samples.map((point) => (point.y - yMean) ** 2));
  const observedCorrelation = covariance / Math.max(Math.sqrt(xVariance * yVariance), Number.EPSILON);
  const lagOne = (values: number[]): number => {
    if (values.length < 3) return 0;
    const center = mean(values);
    const denominator = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
    if (denominator <= Number.EPSILON) return 0;
    return values.slice(1).reduce((sum, value, index) => sum + (value - center) * (values[index] - center), 0) / denominator;
  };
  const lagCorrelation = Math.max(-0.99, Math.min(0.99, (lagOne(samples.map((point) => point.x)) + lagOne(samples.map((point) => point.y))) / 2));
  const ess = sampleSize * (1 - lagCorrelation) / Math.max(1 + lagCorrelation, 0.01);
  return result(
    "Gibbs sampling through conditional distributions",
    "Each sweep updates x while y is fixed, then updates y while x is fixed. The recent path therefore alternates horizontal and vertical moves.",
    [
      { label: "target correlation", value: formatNumber(rho, 3), detail: "bivariate normal target" },
      { label: "sample correlation", value: formatNumber(observedCorrelation, 3), detail: `${sampleSize} retained sweeps` },
      { label: "burn-in", value: String(burnin), detail: "discarded sweeps" },
      { label: "effective sample size", value: formatNumber(Math.min(sampleSize, Math.max(1, ess)), 0), detail: `of ${sampleSize} retained draws` },
      { label: "posterior mean", value: `(${formatNumber(xMean, 2)}, ${formatNumber(yMean, 2)})`, detail: "retained sample mean" },
      // Keep the conditional spread available to existing consumers; the
      // shared strip presents the five teaching metrics above.
      { label: "conditional SD", value: formatNumber(conditionalSd, 3), detail: "sqrt(1 - rho²)" },
    ],
    {
      type: "mcmc",
      title: "Gibbs updates follow one conditional direction at a time",
      xLabel: "parameter x₁",
      yLabel: "parameter x₂",
      targetLabel: "Bivariate target and alternating Gibbs path",
      traceLabel: "Recent conditional draws",
      currentStateLabel: "current state",
      targetDensityLabel: "target density",
      recentPathLabel: "recent path",
      samples: preview,
      path: axisPath,
      contours: [0.8, 1.5, 2.3].map((radius) => ({ label: `density level ${radius}`, points: contour(radius), color: "var(--lab-purple)", opacity: 0.55 })),
      traceX,
      traceY,
      xDomain: [-4, 4],
      yDomain: [-4, 4],
    },
  );
}
