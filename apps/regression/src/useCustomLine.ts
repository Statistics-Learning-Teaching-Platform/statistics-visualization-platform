import { useCallback, useEffect, useState } from "react";
import type { ScaleLinear } from "d3";
import type { Point, CustomLineState } from "./constants";

interface UseCustomLineOptions {
  scales: { xScale: ScaleLinear<number, number>; yScale: ScaleLinear<number, number> };
  chartLayoutMargin: { left: number; top: number };
  resetDeps: unknown[];
}

/**
 * Manages the drag-to-draw custom line interaction on the regression chart.
 * `tempLine` is the in-progress drag preview; `customLine` is the committed line.
 * The committed line is reset whenever `resetDeps` change (dataset / outlier toggle).
 */
export function useCustomLine({ scales, chartLayoutMargin, resetDeps }: UseCustomLineOptions) {
  const [customLine, setCustomLine] = useState<CustomLineState>({ start: null, end: null });
  const [tempLine, setTempLine] = useState<CustomLineState>({ start: null, end: null });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setCustomLine({ start: null, end: null });
  }, resetDeps);

  const getChartCoords = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = svg.viewBox.baseVal.width / rect.width;
      const scaleY = svg.viewBox.baseVal.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX - chartLayoutMargin.left,
        y: (e.clientY - rect.top) * scaleY - chartLayoutMargin.top,
      };
    },
    [chartLayoutMargin.left, chartLayoutMargin.top],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const { x, y } = getChartCoords(e);
      setTempLine({ start: { x: scales.xScale.invert(x), y: scales.yScale.invert(y) }, end: null });
      setIsDragging(true);
    },
    [getChartCoords, scales],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging) return;
      const { x, y } = getChartCoords(e);
      setTempLine((prev) => ({
        start: prev.start,
        end: { x: scales.xScale.invert(x), y: scales.yScale.invert(y) },
      }));
    },
    [isDragging, getChartCoords, scales],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging) return;
      const { x, y } = getChartCoords(e);
      setTempLine({ start: null, end: null });
      setIsDragging(false);
      setCustomLine((prev) => {
        const start = prev.start ?? tempLine.start;
        const end = { x: scales.xScale.invert(x), y: scales.yScale.invert(y) };
        if (!start || (start.x === end.x && start.y === end.y)) return { start: null, end: null };
        return { start, end };
      });
    },
    [isDragging, getChartCoords, scales, tempLine.start],
  );

  const clear = useCallback(() => setCustomLine({ start: null, end: null }), []);

  return {
    customLine,
    tempLine,
    isDragging,
    handlers: { handlePointerDown, handlePointerMove, handlePointerUp },
    clear,
  };
}

/** Returns slope/intercept for the committed custom line, or null when incomplete. */
export function getCustomLineParams(customLine: CustomLineState): { slope: number; intercept: number } | null {
  if (!customLine.start || !customLine.end) return null;
  const dx = customLine.end.x - customLine.start.x;
  const slope = dx !== 0 ? (customLine.end.y - customLine.start.y) / dx : 0;
  return { slope, intercept: customLine.start.y - slope * customLine.start.x };
}

export type HoverInfo = {
  point: Point;
  lineY: number;
  residual: number;
  lineType: "regression" | "custom";
} | null;

/** Computes hover diagnostics (fitted y, residual) for a hovered point. */
export function computeHoverInfo(
  hoverPoint: Point | null,
  showRegression: boolean,
  regression: { slope: number; intercept: number },
  customLineParams: { slope: number; intercept: number } | null,
): HoverInfo {
  if (!hoverPoint) return null;
  if (showRegression) {
    const lineY = regression.slope * hoverPoint.x + regression.intercept;
    return { point: hoverPoint, lineY, residual: hoverPoint.y - lineY, lineType: "regression" };
  }
  if (customLineParams) {
    const lineY = customLineParams.slope * hoverPoint.x + customLineParams.intercept;
    return { point: hoverPoint, lineY, residual: hoverPoint.y - lineY, lineType: "custom" };
  }
  return null;
}
