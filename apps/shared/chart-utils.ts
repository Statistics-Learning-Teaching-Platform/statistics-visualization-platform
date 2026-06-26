// Shared chart layout constants + scale factory used by the standalone apps
// (regression, confidence-interval, type-error) so they do not each redefine
// MARGIN/WIDTH/HEIGHT and the same scaleLinear().domain().range() boilerplate.
//
// Note: each app historically used slightly different pixel sizes because the
// figures render different content. CHART_LAYOUT below is the shared default
// (matching the standalone confidence-interval app); apps whose content needs
// more room (e.g. regression) pass their own layout to createLinearScales.

import { scaleLinear, type ScaleLinear } from "d3";

export interface ChartLayout {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

/** Default chart canvas; apps may override width/height/margin as needed. */
export const CHART_LAYOUT: ChartLayout = {
  width: 760,
  height: 360,
  margin: { top: 24, right: 32, bottom: 56, left: 56 },
};

/**
 * Build {xScale, yScale} for a chart canvas of the given layout. The x scale
 * maps to the inner width, the y scale maps to the inner height (inverted so
 * SVG y grows downward). Domains are caller-supplied.
 */
export function createLinearScales(
  layout: ChartLayout,
  xDomain: [number, number],
  yDomain: [number, number],
): { xScale: ScaleLinear<number, number>; yScale: ScaleLinear<number, number> } {
  const innerWidth = layout.width - layout.margin.left - layout.margin.right;
  const innerHeight = layout.height - layout.margin.top - layout.margin.bottom;
  return {
    xScale: scaleLinear().domain(xDomain).range([0, innerWidth]),
    yScale: scaleLinear().domain(yDomain).range([innerHeight, 0]),
  };
}

/** Inner width of a chart canvas (width minus left+right margins). */
export function innerWidth(layout: ChartLayout): number {
  return layout.width - layout.margin.left - layout.margin.right;
}

/** Inner height of a chart canvas (height minus top+bottom margins). */
export function innerHeight(layout: ChartLayout): number {
  return layout.height - layout.margin.top - layout.margin.bottom;
}
