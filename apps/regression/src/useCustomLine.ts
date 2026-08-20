import { useCallback, useEffect, useRef, useState } from "react";
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
  // Pointer down/up can occur before React commits an intervening render. Keep
  // the drag origin synchronously as well as in state so a fast gesture never
  // reuses a stale committed line or loses its start point.
  const dragStartRef = useRef<Point | null>(null);

  useEffect(() => {
    setCustomLine({ start: null, end: null });
    setTempLine({ start: null, end: null });
    setIsDragging(false);
    dragStartRef.current = null;
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
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = getChartCoords(e);
      const start = { x: scales.xScale.invert(x), y: scales.yScale.invert(y) };
      dragStartRef.current = start;
      setCustomLine({ start: null, end: null });
      setTempLine({ start, end: null });
      setIsDragging(true);
    },
    [getChartCoords, scales],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragStartRef.current) return;
      e.preventDefault();
      const { x, y } = getChartCoords(e);
      setTempLine((prev) => ({
        start: prev.start,
        end: { x: scales.xScale.invert(x), y: scales.yScale.invert(y) },
      }));
    },
    [getChartCoords, scales],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragStartRef.current) return;
      const { x, y } = getChartCoords(e);
      setTempLine({ start: null, end: null });
      setIsDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const start = dragStartRef.current;
      dragStartRef.current = null;
      const end = { x: scales.xScale.invert(x), y: scales.yScale.invert(y) };
      setCustomLine(!start || (start.x === end.x && start.y === end.y)
        ? { start: null, end: null }
        : { start, end });
    },
    [getChartCoords, scales],
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStartRef.current = null;
    setTempLine({ start: null, end: null });
    setIsDragging(false);
  }, []);

  const clear = useCallback(() => {
    dragStartRef.current = null;
    setCustomLine({ start: null, end: null });
    setTempLine({ start: null, end: null });
    setIsDragging(false);
  }, []);

  return {
    customLine,
    tempLine,
    isDragging,
    handlers: { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel },
    clear,
  };
}

/** Returns slope/intercept for the committed custom line, or null when incomplete. */
export function getCustomLineParams(customLine: CustomLineState): { slope: number; intercept: number } | null {
  if (!customLine.start || !customLine.end) return null;
  const dx = customLine.end.x - customLine.start.x;
  // A vertical stroke is not a function y = mx + b and therefore has no
  // fitted value or SSE in this visualizer. Treat it as incomplete instead of
  // silently converting it to a horizontal line with slope zero.
  if (Math.abs(dx) <= Number.EPSILON) return null;
  const slope = (customLine.end.y - customLine.start.y) / dx;
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
  if (customLineParams) {
    const lineY = customLineParams.slope * hoverPoint.x + customLineParams.intercept;
    return { point: hoverPoint, lineY, residual: hoverPoint.y - lineY, lineType: "custom" };
  }
  if (showRegression) {
    const lineY = regression.slope * hoverPoint.x + regression.intercept;
    return { point: hoverPoint, lineY, residual: hoverPoint.y - lineY, lineType: "regression" };
  }
  return null;
}
