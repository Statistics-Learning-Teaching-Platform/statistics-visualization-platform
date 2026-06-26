import type { ChartLayout } from "@stats-viz/shared/chart-utils";
import { CHART_LAYOUT } from "@stats-viz/shared/chart-utils";
import type { IntervalSample } from "@stats-viz/shared/confidence-interval";

export type Sample = IntervalSample;

export interface Config {
  layout: ChartLayout;
  populationMean: number;
}

export const defaultConfig: Config = {
  layout: CHART_LAYOUT,
  populationMean: 10,
};

// Cap accumulated intervals so repeated "generate" clicks cannot grow the
// rendered SVG without bound and degrade rendering.
export const MAX_CI_SAMPLES = 500;

export interface Scales {
  xScale: ReturnType<typeof import("@stats-viz/shared/chart-utils").createLinearScales>["xScale"];
  yScale: ReturnType<typeof import("@stats-viz/shared/chart-utils").createLinearScales>["yScale"];
}
