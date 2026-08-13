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
  /** Change the visible label according to another control's current value. */
  labelByValue?: { controlId: string; labels: Record<string, string> };
  /** Override numeric bounds/defaults according to another control. */
  rangeByValue?: {
    controlId: string;
    ranges: Record<string, { min: number; max: number; step: number; defaultValue: number }>;
  };
  /** Hide this control for selected values of another control. */
  hideWhen?: { controlId: string; values: string[] };
}

export type QuickActionType = "drawSampleMeans" | "bumpControl" | "setControl";
export type QuickActionCopyKey =
  | "addOneSample"
  | "addTwentySamples"
  | "draw1Sample"
  | "draw20Samples"
  | "draw100Samples"
  | "setN1"
  | "setN5"
  | "setN30"
  | "setN100"
  | "changeMeanOnly"
  | "changeSdOnly";

export interface QuickAction {
  type: QuickActionType;
  amount: number;
  /** For "bumpControl": the numeric control id to increment. */
  control?: string;
  /** Only render this action for matching control values. */
  showWhen?: { controlId: string; values: string[] };
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
   * - "setControl": set the numeric control named by `control` to `amount`.
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
  /** Optional plain-language definition shown beside the metric. */
  help?: string;
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
  dashed?: boolean;
  opacity?: number;
}

export interface ChartLegendItem {
  label: string;
  color: string;
  shape?: "line" | "dot" | "bar" | "dashed";
}

export interface ChartCircle {
  cx: number;
  cy: number;
  radius: number;
  label?: string;
  color?: string;
  fill?: string;
}

export interface ChartReference {
  axis: "x" | "y";
  value: number;
  label?: string;
  color?: string;
  dashed?: boolean;
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
  normalApproximationLabel?: string;
  populationMeanLabel?: string;
  xDomain: [number, number];
}

export interface ChartMcmc {
  type: "mcmc";
  title: string;
  xLabel: string;
  yLabel: string;
  targetLabel: string;
  traceLabel: string;
  currentStateLabel?: string;
  targetDensityLabel?: string;
  recentPathLabel?: string;
  samples: ChartPoint[];
  path: ChartPoint[];
  contours: ChartSeries[];
  traceX: ChartPoint[];
  traceY: ChartPoint[];
  xDomain: [number, number];
  yDomain: [number, number];
}

export interface ChartAnova {
  type: "anova";
  title: string;
  xLabel: string;
  yLabel: string;
  groups: Array<{ label: string; values: number[]; mean: number }>;
  grandMean: number;
  grandMeanLabel?: string;
  observationsLabel?: string;
  groupMeanLabel?: string;
}

export type ChartSpec =
  | {
      type: "scatter";
      title: string;
      xLabel: string;
      yLabel: string;
      points: ChartPoint[];
      line?: ChartSeries;
      lines?: ChartSeries[];
      contours?: ChartSeries[];
      circles?: ChartCircle[];
      references?: ChartReference[];
      legend?: ChartLegendItem[];
      showPointLabels?: boolean;
      xDomain?: [number, number];
      yDomain?: [number, number];
    }
  | {
      type: "line";
      title: string;
      xLabel: string;
      yLabel: string;
      series: ChartSeries[];
      references?: ChartReference[];
      legend?: ChartLegendItem[];
      xDomain?: [number, number];
      yDomain?: [number, number];
    }
  | {
      type: "bars";
      title: string;
      xLabel: string;
      yLabel: string;
      bars: ChartBar[];
      legend?: ChartLegendItem[];
      yDomain?: [number, number];
    }
  | {
      type: "intervals";
      title: string;
      xLabel: string;
      yLabel: string;
      intervals: ChartInterval[];
      reference?: number;
      referenceLabel?: string;
      legend?: ChartLegendItem[];
      xDomain?: [number, number];
    }
  | ChartClt
  | ChartMcmc
  | ChartAnova;

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
  /** Raw one-dimensional draws retained for deterministic incremental sampling tests. */
  rawSample?: number[];
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
