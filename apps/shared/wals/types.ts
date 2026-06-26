import type { Language, TemplateCopy } from "@stats-viz/shared/i18n";

export type ControlValue = number | string;
export type ControlType = "number" | "select" | "text";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ControlConfig {
  id: string;
  label: string;
  type: ControlType;
  defaultValue: ControlValue;
  min?: number;
  max?: number;
  step?: number;
  options?: SelectOption[];
}

export type QuickActionType = "drawSampleMeans" | "bumpControl";
export type QuickActionCopyKey =
  | "addOneSample"
  | "addTwentySamples"
  | "draw1Sample"
  | "draw20Samples";

export interface QuickAction {
  type: QuickActionType;
  amount: number;
  /** For "bumpControl": the numeric control id to increment. */
  control?: string;
  /** Label key into walsCopy. */
  copyKey: QuickActionCopyKey;
}

export interface ExampleConfig {
  id: string;
  title: string;
  kind: string;
  sourcePath: string;
  description: string;
  teachingPoints: string[];
  controls: ControlConfig[];
  /**
   * Optional quick-action buttons rendered in the parameter panel. Replaces
   * former hardcoded checks on module id / example kind.
   * - "drawSampleMeans": append `amount` fresh sample means (CLT accumulation).
   * - "bumpControl": add `amount` to the numeric control named by `control`.
   */
  quickActions?: QuickAction[];
  /**
   * CLT-style cross-redraw accumulation: the run button appends sample means
   * instead of just reseeding. Replaces the former kind === "central-limit-theorem"
   * check.
   */
  accumulateSampleMeans?: boolean;
}

export interface ModuleConfig {
  id: string;
  repoName: string;
  title: string;
  subtitle: string;
  category: string;
  sourcePath: string;
  examples: ExampleConfig[];
  data?: {
    cities?: CityRecord[];
    source?: string;
  };
}

export interface CityRecord {
  city: string;
  GDP: number;
  completed: number;
  planning: number;
}

export interface Metric {
  label: string;
  value: string;
  detail?: string;
}

export interface ChartPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartSeries {
  label: string;
  points: ChartPoint[];
  color?: string;
}

export interface ChartBar {
  label: string;
  value: number;
  color?: string;
}

export interface ChartInterval {
  label: string;
  center: number;
  lower: number;
  upper: number;
  color?: string;
}

export interface ChartClt {
  type: "clt";
  title: string;
  xLabel: string;
  yLabel: string;
  populationTitle: string;
  samplingTitle: string;
  populationBars: ChartBar[];
  sampleMeanBars: ChartBar[];
  normalCurve: ChartPoint[];
  populationMean: number;
  latestMean?: number;
  xDomain: [number, number];
}

export type ChartSpec =
  | { type: "scatter"; title: string; xLabel: string; yLabel: string; points: ChartPoint[]; line?: ChartSeries; xDomain?: [number, number]; yDomain?: [number, number] }
  | { type: "line"; title: string; xLabel: string; yLabel: string; series: ChartSeries[]; xDomain?: [number, number]; yDomain?: [number, number] }
  | { type: "bars"; title: string; xLabel: string; yLabel: string; bars: ChartBar[]; yDomain?: [number, number] }
  | { type: "intervals"; title: string; xLabel: string; yLabel: string; intervals: ChartInterval[]; reference?: number; xDomain?: [number, number] }
  | ChartClt;

export interface TableSpec {
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface SimulationResult {
  headline: string;
  narrative: string;
  metrics: Metric[];
  chart: ChartSpec;
  table?: TableSpec;
}

export interface State {
  language: Language;
  copy: TemplateCopy;
  config: ModuleConfig;
  activeExample: ExampleConfig;
  controls: Record<string, ControlValue>;
  seed: number;
  sampleMeans?: number[];
  result: SimulationResult;
}
