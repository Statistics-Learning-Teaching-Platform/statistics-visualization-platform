import { innerHeight, innerWidth } from "@stats-viz/shared/chart-utils";
import { axisBottom, axisLeft, line, select } from "d3";
import { useMemo } from "react";
import type { Point } from "./constants";
import { CHART_LAYOUT } from "./constants";

export interface RegressionChartProps {
  visibleData: Point[];
  domains: { x: [number, number]; y: [number, number] };
  scales: {
    xScale: (v: number) => number;
    yScale: (v: number) => number;
    xScaleTicks: number[];
    yScaleTicks: number[];
  };
  showRegression: boolean;
  regression: { slope: number; intercept: number };
  customLineParams: { slope: number; intercept: number } | null;
  tempLine: { start: Point | null; end: Point | null };
  isDragging: boolean;
  hoverInfo: import("./useCustomLine").HoverInfo;
  xAxisLabel: string;
  yAxisLabel: string;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void;
  onHoverPoint: (p: Point | null) => void;
}

export function RegressionChart({
  visibleData,
  domains,
  scales,
  showRegression,
  regression,
  customLineParams,
  tempLine,
  isDragging,
  hoverInfo,
  xAxisLabel,
  yAxisLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onHoverPoint,
}: RegressionChartProps) {
  const chartWidth = innerWidth(CHART_LAYOUT);
  const chartHeight = innerHeight(CHART_LAYOUT);

  const regressionLinePath = useMemo(() => {
    if (!showRegression) return "";
    const [xMin, xMax] = domains.x;
    const y1 = regression.slope * xMin + regression.intercept;
    const y2 = regression.slope * xMax + regression.intercept;
    const lineGen = line<Point>()
      .x((d) => scales.xScale(d.x))
      .y((d) => scales.yScale(d.y));
    return (
      lineGen([
        { x: xMin, y: y1 },
        { x: xMax, y: y2 },
      ]) ?? ""
    );
  }, [showRegression, regression, domains, scales]);

  const customLinePath = useMemo(() => {
    if (!customLineParams) return "";
    const [xMin, xMax] = domains.x;
    const y1 = customLineParams.slope * xMin + customLineParams.intercept;
    const y2 = customLineParams.slope * xMax + customLineParams.intercept;
    const lineGen = line<Point>()
      .x((d) => scales.xScale(d.x))
      .y((d) => scales.yScale(d.y));
    return (
      lineGen([
        { x: xMin, y: y1 },
        { x: xMax, y: y2 },
      ]) ?? ""
    );
  }, [customLineParams, domains, scales]);

  const tempLinePath = useMemo(() => {
    if (!tempLine.start || !tempLine.end || !isDragging) return "";
    const lineGen = line<Point>()
      .x((d) => scales.xScale(d.x))
      .y((d) => scales.yScale(d.y));
    return lineGen([tempLine.start, tempLine.end]) ?? "";
  }, [tempLine, isDragging, scales]);

  const residualSegments = useMemo(() => {
    const params = customLineParams ?? (showRegression ? regression : null);
    if (!params) return [];
    return visibleData.map((point) => ({
      point,
      fittedY: params.slope * point.x + params.intercept,
    }));
  }, [customLineParams, showRegression, regression, visibleData]);

  return (
    <svg
      width={CHART_LAYOUT.width}
      height={CHART_LAYOUT.height}
      viewBox={`0 0 ${CHART_LAYOUT.width} ${CHART_LAYOUT.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="chart-svg"
      role="img"
      aria-label={`${yAxisLabel} versus ${xAxisLabel} with draggable comparison line and residuals`}
      data-margin-left={CHART_LAYOUT.margin.left}
      data-margin-top={CHART_LAYOUT.margin.top}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <g transform={`translate(${CHART_LAYOUT.margin.left}, ${CHART_LAYOUT.margin.top})`}>
        <rect
          className="plot-background"
          x={0}
          y={0}
          width={chartWidth}
          height={chartHeight}
          rx={14}
        />
        <g className="chart-grid chart-grid--x">
          {scales.xScaleTicks.map((tick, i) => (
            <line
              key={i}
              x1={scales.xScale(tick)}
              y1={0}
              x2={scales.xScale(tick)}
              y2={chartHeight}
            />
          ))}
        </g>
        <g className="chart-grid chart-grid--y">
          {scales.yScaleTicks.map((tick, i) => (
            <line
              key={i}
              x1={0}
              y1={scales.yScale(tick)}
              x2={chartWidth}
              y2={scales.yScale(tick)}
            />
          ))}
        </g>
        <g
          transform={`translate(0, ${chartHeight})`}
          ref={(g) => {
            if (g) select(g).call(axisBottom(scales.xScale as any));
          }}
        />
        <g
          ref={(g) => {
            if (g) select(g).call(axisLeft(scales.yScale as any));
          }}
        />
        {residualSegments.map(({ point, fittedY }, index) => (
          <line
            key={`residual-${index}`}
            x1={scales.xScale(point.x)}
            x2={scales.xScale(point.x)}
            y1={scales.yScale(point.y)}
            y2={scales.yScale(fittedY)}
            stroke={customLineParams ? "var(--danger)" : "var(--chart-blue)"}
            strokeWidth={1.35}
            strokeDasharray="3 3"
            opacity={0.42}
          >
            <title>{`residual: ${(point.y - fittedY).toFixed(3)}`}</title>
          </line>
        ))}
        {visibleData.map((p, i) => (
          <circle
            key={i}
            className={p.outlier ? "data-point data-point--outlier" : "data-point"}
            cx={scales.xScale(p.x)}
            cy={scales.yScale(p.y)}
            r={5}
            fill={p.outlier ? "var(--danger)" : "var(--teal)"}
            opacity={p.outlier ? 0.86 : 0.82}
            stroke="#fffdf8"
            strokeWidth={2}
            data-x={p.x}
            data-y={p.y}
            onMouseEnter={() => onHoverPoint(p)}
            onMouseLeave={() => onHoverPoint(null)}
          />
        ))}
        {regressionLinePath && (
          <path
            d={regressionLinePath}
            className="regression-line"
            stroke="var(--chart-blue)"
            strokeWidth={2.4}
            fill="none"
          />
        )}
        {customLinePath && (
          <path
            d={customLinePath}
            className="custom-line"
            stroke="var(--danger)"
            strokeWidth={2}
            fill="none"
          />
        )}
        {tempLinePath && (
          <path
            d={tempLinePath}
            className="temp-line"
            stroke="var(--text-secondary)"
            strokeWidth={2}
            strokeDasharray="5,5"
            fill="none"
          />
        )}
        {hoverInfo && (
          <>
            <line
              className="hover-vertical-line"
              x1={scales.xScale(hoverInfo.point.x)}
              y1={scales.yScale(hoverInfo.point.y)}
              x2={scales.xScale(hoverInfo.point.x)}
              y2={scales.yScale(hoverInfo.lineY)}
              stroke="var(--danger)"
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.7}
            />
            <circle
              className="hovered-point-highlight"
              cx={scales.xScale(hoverInfo.point.x)}
              cy={scales.yScale(hoverInfo.point.y)}
              r={8}
              fill="none"
              stroke="var(--danger)"
              strokeWidth={2}
            />
          </>
        )}
        <text
          className="chart-axis-label chart-axis-label--x"
          x={chartWidth}
          y={chartHeight + 42}
          textAnchor="end"
        >
          {xAxisLabel}
        </text>
        <text
          className="chart-axis-label chart-axis-label--y"
          x={-chartHeight / 2}
          y={-46}
          transform="rotate(-90)"
          textAnchor="middle"
        >
          {yAxisLabel}
        </text>
      </g>
    </svg>
  );
}
