import type { ChartPoint, SimulationResult } from "../types";
import { createRandom, normalRandom } from "@stats-viz/shared/random";
import { formatNumber, mean } from "@stats-viz/shared/format";
import { num, result, type ControlMap } from "./internal";

export function mcmcMixture(controls: ControlMap, seed: number): SimulationResult {
  const rng = createRandom(seed);
  const burnin = Math.max(0, Math.round(num(controls, "burnin", 200)));
  const sampleSize = Math.max(50, Math.round(num(controls, "sampleSize", 400)));
  const density = (x: number, y: number) => 0.5 * Math.exp(-((x - 6) ** 2 + (y - 6) ** 2) / 4) + 0.5 * Math.exp(-(x * x + y * y) / 2);
  let x = rng() * 10 - 2;
  let y = rng() * 10 - 2;
  let accepted = 0;
  const points: ChartPoint[] = [];
  for (let i = 0; i < burnin + sampleSize; i += 1) {
    const px = x + normalRandom(rng, 0, 1);
    const py = y + normalRandom(rng, 0, 1);
    const ratio = density(px, py) / Math.max(density(x, y), Number.EPSILON);
    if (rng() < Math.min(1, ratio)) {
      x = px;
      y = py;
      accepted += 1;
    }
    if (i >= burnin) {
      points.push({ x, y, color: i === burnin ? "#d1495b" : "#136f63" });
    }
  }
  return result(
    "Metropolis-Hastings sample path",
    "The chain moves through a two-mode target density after the selected burn-in.",
    [
      { label: "acceptance rate", value: formatNumber(accepted / (burnin + sampleSize), 4), detail: "accepted proposals" },
      { label: "sample size", value: String(sampleSize), detail: `${burnin} burn-in draws` },
      { label: "mean location", value: `(${formatNumber(mean(points.map((p) => p.x)), 2)}, ${formatNumber(mean(points.map((p) => p.y)), 2)})`, detail: "posterior sample mean" }
    ],
    { type: "scatter", title: "MCMC draws", xLabel: "x1", yLabel: "x2", points, xDomain: [-4, 10], yDomain: [-4, 10] }
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
  const bars = islands.map((island, index) => ({ label: island, value: visits[index] / steps }));
  return result(
    "Metropolis walk over islands",
    "Visit frequencies approximate the target population proportions.",
    [
      { label: "steps", value: String(steps), detail: "single-chain simulation" },
      { label: "most visited", value: bars.reduce((best, item) => (item.value > best.value ? item : best)).label, detail: "highest empirical frequency" },
      { label: "target largest", value: "Is7", detail: "largest population" }
    ],
    { type: "bars", title: "Visit frequency by island", xLabel: "island", yLabel: "frequency", bars, yDomain: [0, Math.max(...bars.map((bar) => bar.value)) * 1.2] }
  );
}
