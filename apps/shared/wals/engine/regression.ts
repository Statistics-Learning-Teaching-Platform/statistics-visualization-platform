import type { ChartSeries, CityRecord, SimulationResult } from "../types";
import { formatNumber } from "@stats-viz/shared/format";
import { linearRegression } from "@stats-viz/shared/math";
import { result, str, type ControlMap } from "./internal";

export function linearRegressionExample(controls: ControlMap, _seed: number, data?: { cities?: CityRecord[] }): SimulationResult {
  const feature = str(controls, "feature", "completed") as "completed" | "GDP";
  const exclude = str(controls, "excludeHighLeverage", "no") === "yes";
  const source = data?.cities ?? [];
  const kept = exclude ? source.filter((city) => !["上海", "香港"].includes(city.city)) : source;
  const points = kept.map((city) => ({ x: city[feature], y: city.planning, label: city.city }));
  const fit = linearRegression(points);
  const xMin = points.map((point) => point.x).reduce((a, b) => Math.min(a, b), Infinity);
  const xMax = points.map((point) => point.x).reduce((a, b) => Math.max(a, b), -Infinity);
  const line: ChartSeries = { label: "least squares fit", color: "var(--lab-blue)", points: [{ x: xMin, y: fit.intercept + fit.slope * xMin }, { x: xMax, y: fit.intercept + fit.slope * xMax }] };
  const residuals: ChartSeries[] = points.map((point) => ({
    label: `residual for ${point.label ?? "observation"}`,
    color: "var(--lab-purple)",
    dashed: true,
    opacity: 0.34,
    points: [point, { x: point.x, y: fit.intercept + fit.slope * point.x }],
  }));
  return result(
    "City regression model",
    "The WALS city dataset links planned skyscrapers with either completed buildings or GDP.",
    [
      { label: "slope", value: formatNumber(fit.slope, 5), detail: `predictor: ${feature}` },
      { label: "intercept", value: formatNumber(fit.intercept, 4), detail: "least-squares fit" },
      { label: "R-squared", value: formatNumber(fit.rSquared, 4), detail: `${kept.length} cities` },
      { label: "SSE", value: formatNumber(fit.sse, 3), detail: "sum of squared residuals" },
      { label: "n", value: String(kept.length), detail: "included cities" }
    ],
    {
      type: "scatter",
      title: "Observed cities, fitted values, and residuals",
      xLabel: feature,
      yLabel: "planned skyscrapers",
      points,
      line,
      lines: residuals,
      legend: [
        { label: "city", color: "var(--lab-teal)", shape: "dot" },
        { label: "least squares fit", color: "var(--lab-blue)", shape: "line" },
        { label: "residual", color: "var(--lab-purple)", shape: "dashed" },
      ],
    },
    { columns: ["City", feature, "planned"], rows: kept.map((city) => [city.city, city[feature], city.planning]) }
  );
}
