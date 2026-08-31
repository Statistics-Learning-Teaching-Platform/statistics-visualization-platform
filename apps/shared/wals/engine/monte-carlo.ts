import type { ChartPoint, SimulationResult } from "../types";
import { createRandom, exponentialRandom, normalRandom } from "@stats-viz/shared/random";
import { formatNumber, mean, ratioOrNa, variance } from "@stats-viz/shared/format";
import { normalCdf } from "@stats-viz/shared/math";
import { num, result, type ControlMap } from "./internal";

export function piCircle(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.min(10000, Math.max(100, Math.round(num(controls, "points", 1000))));
  let inside = 0;
  const points: ChartPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const x = rng() * 2 - 1;
    const y = rng() * 2 - 1;
    const hit = x * x + y * y <= 1;
    if (hit) inside += 1;
    if (i < 1200) points.push({ x, y, color: hit ? "var(--lab-teal)" : "var(--lab-coral)" });
  }
  const estimate = 4 * inside / n;
  return result(
    "Circle-area Monte Carlo estimate",
    "The chart displays a capped preview of simulated points; the metrics use all generated points.",
    [
      { label: "pi estimate", value: formatNumber(estimate, 5), detail: "4 x inside proportion" },
      { label: "reference value", value: formatNumber(Math.PI, 5), detail: "analytic π" },
      { label: "inside points", value: String(inside), detail: `${n} total draws` },
      { label: "absolute error", value: formatNumber(Math.abs(Math.PI - estimate), 5), detail: "Compared with Math.PI" },
      { label: "simulation count", value: String(n), detail: "points generated" }
    ],
    {
      type: "scatter",
      title: "Area ratio inside the unit circle",
      xLabel: "horizontal coordinate x",
      yLabel: "vertical coordinate y",
      points,
      circles: [{ cx: 0, cy: 0, radius: 1, label: "unit circle", color: "var(--lab-purple)" }],
      references: [
        { axis: "x", value: 0, color: "var(--lab-border)", dashed: false },
        { axis: "y", value: 0, color: "var(--lab-border)", dashed: false },
      ],
      legend: [
        { label: "inside circle", color: "var(--lab-teal)", shape: "dot" },
        { label: "outside circle", color: "var(--lab-coral)", shape: "dot" },
        { label: "circle boundary", color: "var(--lab-purple)", shape: "line" },
      ],
      xDomain: [-1, 1],
      yDomain: [-1, 1],
    }
  );
}
export function buffon(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const trials = Math.max(100, Math.round(num(controls, "trials", 1000)));
  const experiments = Math.max(1, Math.round(num(controls, "experiments", 20)));
  const planeWidth = Math.max(1, num(controls, "planeWidth", 6));
  const needleLength = Math.min(1, planeWidth);
  const estimates: ChartPoint[] = [];
  let totalCrosses = 0;
  for (let experiment = 1; experiment <= experiments; experiment += 1) {
    let crosses = 0;
    for (let i = 0; i < trials; i += 1) {
      const centerDistance = rng() * (planeWidth / 2);
      const theta = rng() * Math.PI;
      if (centerDistance <= (needleLength / 2) * Math.sin(theta)) crosses += 1;
    }
    totalCrosses += crosses;
    const probability = totalCrosses / (trials * experiment);
    estimates.push({ x: experiment, y: probability > 0 ? (2 * needleLength) / (planeWidth * probability) : 0 });
  }
  const final = estimates.at(-1)?.y ?? 0;
  return result(
    "Buffon's needle convergence",
    "Each point is the cumulative pi estimate after another experiment.",
    [
      { label: "pi estimate", value: formatNumber(final, 5), detail: "Cumulative estimate" },
      { label: "reference value", value: formatNumber(Math.PI, 5), detail: "analytic π" },
      { label: "crossing rate", value: formatNumber(totalCrosses / (trials * experiments), 4), detail: "Needles crossing a line" },
      { label: "absolute error", value: formatNumber(Math.abs(Math.PI - final), 5), detail: "Compared with Math.PI" },
      { label: "simulation count", value: String(trials * experiments), detail: `${trials} trials each` }
    ],
    {
      type: "line",
      title: "Cumulative estimate by experiment",
      xLabel: "completed experiments",
      yLabel: "estimate of π",
      series: [{ label: "Monte Carlo estimate", points: estimates, color: "var(--lab-teal)" }],
      references: [{ axis: "y", value: Math.PI, label: "π", color: "var(--lab-purple)" }],
      yDomain: [Math.max(0, Math.min(...estimates.map((point) => point.y), Math.PI) - 0.8), Math.max(...estimates.map((point) => point.y), Math.PI) + 0.8],
    }
  );
}
export function mcIntegralExp(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 10000)));
  const values = Array.from({ length: n }, () => Math.exp(-(2 + 2 * rng())) * 2);
  const estimate = mean(values);
  const exact = Math.exp(-2) - Math.exp(-4);
  let running = 0;
  const convergence = values.filter((_, index) => index % Math.max(1, Math.floor(n / 80)) === 0).map((_, index) => {
    const end = Math.min(values.length, (index + 1) * Math.max(1, Math.floor(n / 80)));
    running = values.slice(0, end).reduce((sum, draw) => sum + draw, 0) / end;
    return { x: end, y: running };
  });
  return result(
    "Monte Carlo integral estimate",
    "The integral is estimated by averaging transformed uniform draws.",
    [
      { label: "estimate", value: formatNumber(estimate, 6), detail: "Monte Carlo" },
      { label: "exact value", value: formatNumber(exact, 6), detail: "exp(-2) - exp(-4)" },
      { label: "absolute error", value: formatNumber(Math.abs(estimate - exact), 6), detail: `${n} draws` }
    ],
    { type: "line", title: "Monte Carlo convergence", xLabel: "simulation count N", yLabel: "running estimate", series: [{ label: "estimate", points: convergence, color: "var(--lab-teal)" }], references: [{ axis: "y", value: exact, label: "exact", color: "var(--lab-purple)" }] }
  );
}
export function mcTransform(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  // Two estimators of the same WALS target integrand (the leading 5 is the
  // integrand's scale constant from the reference example): one samples via a
  // 1/u transform of a uniform, the other via a scaled exponential draw.
  const uniformValues = Array.from({ length: n }, () => {
    const u = Math.max(rng(), Number.EPSILON);
    return 5 * (1 / (u * u)) * Math.sqrt(1 / u - 1) * Math.exp(-(1 / u - 1));
  });
  const exponentialValues = Array.from({ length: n }, () => 5 * Math.sqrt(exponentialRandom(rng)));
  const exact = 5 * Math.sqrt(Math.PI) / 2;
  return result(
    "Estimator comparison",
    "Both estimators target the same quantity with different sampling distributions.",
    [
      { label: "uniform estimate", value: formatNumber(mean(uniformValues), 5), detail: `variance ${formatNumber(variance(uniformValues), 4)}` },
      { label: "exponential estimate", value: formatNumber(mean(exponentialValues), 5), detail: `variance ${formatNumber(variance(exponentialValues), 4)}` },
      { label: "exact target", value: formatNumber(exact, 5), detail: "5Γ(3/2)" },
      { label: "variance ratio", value: ratioOrNa(variance(uniformValues), variance(exponentialValues), 3), detail: "uniform / exponential" }
    ],
    { type: "bars", title: "Estimator variance", xLabel: "method", yLabel: "variance", bars: [{ label: "uniform", value: variance(uniformValues) }, { label: "exponential", value: variance(exponentialValues) }] }
  );
}
export function normalCdfExample(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const n = Math.max(100, Math.round(num(controls, "sampleSize", 1000)));
  const low = num(controls, "low", 0.1);
  const high = num(controls, "high", 2.5);
  const xs = Array.from({ length: 10 }, (_, index) => low + (index * (high - low)) / 9);
  const z = Array.from({ length: n }, () => normalRandom(rng));
  const rows = xs.map((xValue) => {
    const indicator = mean(z.map((value) => (value <= xValue ? 1 : 0)));
    const exact = normalCdf(xValue);
    return [formatNumber(xValue, 3), formatNumber(indicator, 4), formatNumber(exact, 4), formatNumber(Math.abs(indicator - exact), 4)];
  });
  return result(
    "Normal CDF simulation grid",
    "Indicator simulation is compared with the analytic normal CDF.",
    [
      { label: "grid points", value: String(xs.length), detail: `from ${low} to ${high}` },
      { label: "draws", value: String(n), detail: "standard normal sample" },
      { label: "max error", value: formatNumber(Math.max(...rows.map((row) => Number(row[3]))), 4), detail: "indicator vs Phi" }
    ],
    {
      type: "line",
      title: "Simulated and analytic standard normal CDF",
      xLabel: "threshold x",
      yLabel: "P(Z ≤ x)",
      series: [
        { label: "indicator estimate", points: xs.map((xValue, index) => ({ x: xValue, y: Number(rows[index][1]) })), color: "var(--lab-teal)" },
        { label: "analytic Φ(x)", points: xs.map((xValue) => ({ x: xValue, y: normalCdf(xValue) })), color: "var(--lab-purple)", dashed: true },
      ],
      yDomain: [0, 1],
    },
    { columns: ["x", "Indicator MC", "Phi(x)", "Abs. error"], rows }
  );
}
