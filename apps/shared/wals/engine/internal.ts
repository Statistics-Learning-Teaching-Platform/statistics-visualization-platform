// Shared helpers for the engine domain modules: control accessors and the
// SimulationResult constructor. Kept in this file (not in engine.ts) so every
// domain module can import them directly without going through the facade,
// which avoids an import cycle.
import type { ControlValue, SimulationResult, TableSpec } from "../types";

export type ControlMap = Record<string, ControlValue>;

export function num(controls: ControlMap, id: string, fallback: number): number {
  const value = controls[id];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function str(controls: ControlMap, id: string, fallback: string): string {
  const value = controls[id];
  return typeof value === "string" ? value : fallback;
}

export function result(
  headline: string,
  narrative: string,
  metrics: SimulationResult["metrics"],
  chart: SimulationResult["chart"],
  table?: TableSpec
): SimulationResult {
  return { headline, narrative, metrics, chart, table };
}
