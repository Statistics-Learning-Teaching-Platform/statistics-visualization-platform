import { scaleLinear, line, scaleBand, type ScaleLinear } from "d3";
import type {
  ChartLegendItem,
  ChartPoint,
  ChartReference,
  ChartSeries,
  ChartSpec,
} from "./types";
import { CHART_LAYOUT } from "@stats-viz/shared/chart-utils";

const width = CHART_LAYOUT.width;
const height = CHART_LAYOUT.height;
const margin = { ...CHART_LAYOUT.margin, top: 52 };

const chartTheme = {
  background: "#fffaf1",
  text: "#252822",
  muted: "#696e63",
  axis: "#b9b3a7",
  grid: "#ded6c7",
  teal: "#2f6f64",
  sage: "#6f8f7a",
  sageSoft: "#b7d6cc",
  lavender: "#8d75b5",
  blue: "#4b73d9",
  danger: "#c8665a",
} as const;

function extent(values: number[], fallback: [number, number]): [number, number] {
  const min = values.reduce((a, b) => Math.min(a, b), Infinity);
  const max = values.reduce((a, b) => Math.max(a, b), -Infinity);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

interface TickProps {
  scale: ScaleLinear<number, number>;
  orientation: "x" | "y";
}

function AxisTicks({ scale, orientation }: TickProps) {
  const ticks = scale.ticks(5);
  return (
    <>
      {ticks.map((tick, i) => {
        const x = orientation === "x" ? scale(tick) : margin.left;
        const y = orientation === "x" ? height - margin.bottom : scale(tick);
        return (
          <g key={i}>
            {orientation === "x" ? (
              <line x1={x} x2={x} y1={y} y2={y + 6} stroke={chartTheme.axis} />
            ) : (
              <line x1={x - 6} x2={x} y1={y} y2={y} stroke={chartTheme.axis} />
            )}
            <text
              x={orientation === "x" ? x : x - 10}
              y={orientation === "x" ? y + 22 : y + 4}
              textAnchor={orientation === "x" ? "middle" : "end"}
              fill={chartTheme.muted}
              fontSize={11}
            >
              {Number(tick.toFixed(3))}
            </text>
          </g>
        );
      })}
    </>
  );
}

function GridLines({ x, y }: { x?: ScaleLinear<number, number>; y?: ScaleLinear<number, number> }) {
  return (
    <g aria-hidden="true">
      {x?.ticks(5).map((tick) => (
        <line
          key={`x-${tick}`}
          x1={x(tick)}
          x2={x(tick)}
          y1={margin.top}
          y2={height - margin.bottom}
          stroke={chartTheme.grid}
          strokeOpacity={0.58}
        />
      ))}
      {y?.ticks(5).map((tick) => (
        <line
          key={`y-${tick}`}
          x1={margin.left}
          x2={width - margin.right}
          y1={y(tick)}
          y2={y(tick)}
          stroke={chartTheme.grid}
          strokeOpacity={0.58}
        />
      ))}
    </g>
  );
}

function Legend({ items }: { items: ChartLegendItem[] }) {
  if (items.length === 0) return null;
  const itemWidth = 118;
  const legendWidth = Math.min(width - margin.left - margin.right, items.length * itemWidth + 18);
  const startX = width - margin.right - legendWidth;
  return (
    <g className="chart-legend" transform={`translate(${startX}, 8)`} aria-label="Legend">
      <rect width={legendWidth} height={32} rx={12} fill="rgba(255,253,248,0.9)" stroke="rgba(90,80,60,0.12)" />
      {items.map((item, index) => {
        const x = 10 + index * itemWidth;
        return (
          <g key={`${item.label}-${index}`} transform={`translate(${x}, 16)`}>
            <title>{item.label}</title>
            {item.shape === "dot" ? (
              <circle cx={5} cy={0} r={4} fill={item.color} />
            ) : item.shape === "bar" ? (
              <rect x={0} y={-5} width={10} height={10} rx={2} fill={item.color} />
            ) : (
              <line x1={0} x2={12} y1={0} y2={0} stroke={item.color} strokeWidth={3} strokeDasharray={item.shape === "dashed" ? "4 3" : undefined} />
            )}
            <text x={18} y={4} fill={chartTheme.text} fontSize={10.5} fontWeight={700}>
              {item.label.length > 15 ? `${item.label.slice(0, 14)}…` : item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function References({
  references = [],
  x,
  y,
}: {
  references?: ChartReference[];
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
}) {
  return references.map((reference, index) => {
    const color = reference.color ?? chartTheme.lavender;
    const isX = reference.axis === "x";
    const position = isX ? x(reference.value) : y(reference.value);
    return (
      <g key={`${reference.axis}-${reference.value}-${index}`}>
        <line
          x1={isX ? position : margin.left}
          x2={isX ? position : width - margin.right}
          y1={isX ? margin.top : position}
          y2={isX ? height - margin.bottom : position}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray={reference.dashed === false ? undefined : "5 5"}
        />
        {reference.label && (
          <text
            x={isX ? position + 6 : width - margin.right - 4}
            y={isX ? margin.top + 14 : position - 7}
            textAnchor={isX ? "start" : "end"}
            fill={color}
            fontSize={10.5}
            fontWeight={750}
          >
            {reference.label}
          </text>
        )}
      </g>
    );
  });
}

interface FrameProps {
  title: string;
  xLabel: string;
  yLabel: string;
  children: React.ReactNode;
}

function Frame({ title, xLabel, yLabel, children }: FrameProps) {
  return (
    <svg
      className="teaching-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title}
    >
      <desc>{`${title}. ${xLabel}; ${yLabel}.`}</desc>
      <rect x={0} y={0} width={width} height={height} rx={16} fill={chartTheme.background} />
      <text x={margin.left} y={22} fill={chartTheme.text} fontSize={16} fontWeight={700}>
        {title}
      </text>
      <text x={width / 2} y={height - 12} fill={chartTheme.muted} fontSize={12} textAnchor="middle">
        {xLabel}
      </text>
      <text
        x={18}
        y={height / 2}
        fill={chartTheme.muted}
        fontSize={12}
        textAnchor="middle"
        transform={`rotate(-90 18 ${height / 2})`}
      >
        {yLabel}
      </text>
      {children}
    </svg>
  );
}

function ScatterChart({ spec }: { spec: Extract<ChartSpec, { type: "scatter" }> }) {
  const lines = [spec.line, ...(spec.lines ?? [])].filter(Boolean) as ChartSeries[];
  const contours = spec.contours ?? [];
  const xDomain = spec.xDomain ?? extent(
    spec.points.map((p) => p.x).concat(lines.flatMap((series) => series.points.map((p) => p.x))),
    [0, 1]
  );
  const yDomain = spec.yDomain ?? extent(
    spec.points.map((p) => p.y).concat(lines.flatMap((series) => series.points.map((p) => p.y))),
    [0, 1]
  );
  const x = scaleLinear().domain(xDomain).nice().range([margin.left, width - margin.right]);
  const y = scaleLinear().domain(yDomain).nice().range([height - margin.bottom, margin.top]);
  const lineGen = line<ChartPoint>().x((p) => x(p.x)).y((p) => y(p.y));
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <GridLines x={x} y={y} />
      <AxisTicks scale={x} orientation="x" />
      <AxisTicks scale={y} orientation="y" />
      <References references={spec.references} x={x} y={y} />
      {spec.circles?.map((circle, index) => (
        <g key={`circle-${index}`}>
          <ellipse
            className="chart-data-circle"
            cx={x(circle.cx)}
            cy={y(circle.cy)}
            rx={Math.abs(x(circle.cx + circle.radius) - x(circle.cx))}
            ry={Math.abs(y(circle.cy + circle.radius) - y(circle.cy))}
            fill={circle.fill ?? "none"}
            stroke={circle.color ?? chartTheme.lavender}
            strokeWidth={2}
          />
          {circle.label && <text x={x(circle.cx)} y={y(circle.cy - circle.radius) - 7} textAnchor="middle" fill={circle.color ?? chartTheme.lavender} fontSize={11} fontWeight={750}>{circle.label}</text>}
        </g>
      ))}
      {contours.map((series, i) => (
        <path key={`contour-${i}`} d={lineGen(series.points) ?? ""} fill="none" stroke={series.color ?? chartTheme.lavender} strokeWidth={1.4} strokeOpacity={series.opacity ?? 0.62} strokeDasharray={series.dashed ? "5 4" : undefined} />
      ))}
      {lines.map((series, i) => (
        <path key={`line-${i}`} d={lineGen(series.points) ?? ""} fill="none" stroke={series.color ?? chartTheme.danger} strokeWidth={3} strokeOpacity={series.opacity ?? 1} strokeDasharray={series.dashed ? "7 5" : undefined} />
      ))}
      {spec.points.map((point, i) => (
        <g key={i}>
          <circle cx={x(point.x)} cy={y(point.y)} r={point.label ? 4.5 : 3} fill={point.color ?? chartTheme.teal} opacity={0.78}>
            <title>{point.label ? `${point.label}: ` : ""}(${Number(point.x.toFixed(3))}, ${Number(point.y.toFixed(3))})</title>
          </circle>
          {spec.showPointLabels && point.label && <text x={x(point.x) + 7} y={y(point.y) - 7} fill={chartTheme.text} fontSize={10}>{point.label}</text>}
        </g>
      ))}
      <Legend items={spec.legend ?? lines.map((series) => ({ label: series.label, color: series.color ?? chartTheme.danger, shape: series.dashed ? "dashed" : "line" }))} />
    </Frame>
  );
}

function LineChart({ spec }: { spec: Extract<ChartSpec, { type: "line" }> }) {
  const points = spec.series.flatMap((s) => s.points);
  const xDomain = spec.xDomain ?? extent(points.map((p) => p.x), [0, 1]);
  const yDomain = spec.yDomain ?? extent(points.map((p) => p.y), [0, 1]);
  const x = scaleLinear().domain(xDomain).nice().range([margin.left, width - margin.right]);
  const y = scaleLinear().domain(yDomain).nice().range([height - margin.bottom, margin.top]);
  const lineGen = line<ChartPoint>().x((p) => x(p.x)).y((p) => y(p.y));
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <GridLines x={x} y={y} />
      <AxisTicks scale={x} orientation="x" />
      <AxisTicks scale={y} orientation="y" />
      <References references={spec.references} x={x} y={y} />
      {spec.series.map((series, i) => (
        <path key={i} d={lineGen(series.points) ?? ""} fill="none" stroke={series.color ?? chartTheme.teal} strokeWidth={3} strokeOpacity={series.opacity ?? 1} strokeDasharray={series.dashed ? "7 5" : undefined} />
      ))}
      <Legend items={spec.legend ?? spec.series.map((series) => ({ label: series.label, color: series.color ?? chartTheme.teal, shape: series.dashed ? "dashed" : "line" }))} />
    </Frame>
  );
}

function BarsChart({ spec }: { spec: Extract<ChartSpec, { type: "bars" }> }) {
  const maxValue = Math.max(...spec.bars.map((b) => b.value), 1);
  const yDomain = spec.yDomain ?? [0, maxValue * 1.15] as [number, number];
  // Use array position as the categorical identity. Histogram labels are
  // rounded for display and adjacent narrow bins can legitimately share one.
  const x = scaleBand<number>().domain(spec.bars.map((_, index) => index)).range([margin.left, width - margin.right]).padding(0.18);
  const y = scaleLinear().domain(yDomain).nice().range([height - margin.bottom, margin.top]);
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <GridLines y={y} />
      <AxisTicks scale={y} orientation="y" />
      {spec.bars.map((bar, i) => (
        <g key={i}>
          <rect x={x(i) ?? margin.left} y={y(bar.value)} width={x.bandwidth()} height={Math.max(0, height - margin.bottom - y(bar.value))} fill={bar.color ?? chartTheme.teal} opacity={0.86}>
            <title>{`${bar.label}: ${Number(bar.value.toFixed(4))}`}</title>
          </rect>
          <text
            x={(x(i) ?? margin.left) + x.bandwidth() / 2}
            y={height - margin.bottom + 15}
            textAnchor={spec.bars.length > 8 ? "end" : "middle"}
            transform={spec.bars.length > 8 ? `rotate(-35 ${(x(i) ?? margin.left) + x.bandwidth() / 2} ${height - margin.bottom + 15})` : undefined}
            fill={chartTheme.muted}
            fontSize={spec.bars.length > 18 ? 8.5 : 10}
          >
            {bar.label.length > 10 ? `${bar.label.slice(0, 9)}…` : bar.label}
          </text>
        </g>
      ))}
      <Legend items={spec.legend ?? []} />
    </Frame>
  );
}

function IntervalsChart({ spec }: { spec: Extract<ChartSpec, { type: "intervals" }> }) {
  const values = spec.intervals.flatMap((i) => [i.lower, i.upper, i.center]);
  const xDomain = spec.xDomain ?? extent(values, [0, 1]);
  const x = scaleLinear().domain(xDomain).nice().range([margin.left, width - margin.right]);
  const intervalCount = Math.max(spec.intervals.length, 1);
  const plotHeight = height - margin.top - margin.bottom;
  const rowSpacing = plotHeight / intervalCount;
  const labelEvery = Math.max(1, Math.ceil(intervalCount / 24));
  const rowPadding = intervalCount <= 24 ? 0.22 : intervalCount <= 60 ? 0.12 : 0.05;
  const intervalStrokeWidth = rowSpacing < 4 ? 1.6 : rowSpacing < 8 ? 2.7 : rowSpacing < 12 ? 3.8 : 5;
  const centerRadius = rowSpacing < 4 ? 1.8 : rowSpacing < 8 ? 2.8 : rowSpacing < 12 ? 4 : 6;
  const labelFontSize = rowSpacing < 8 ? 8 : rowSpacing < 12 ? 9 : 10.5;
  const referenceRepeatedInLegend = spec.legend?.some((item) => item.shape === "dashed") ?? false;
  const y = scaleBand()
    .domain(spec.intervals.map((i) => i.label))
    .range([margin.top, height - margin.bottom])
    .padding(rowPadding);
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke={chartTheme.grid} />
      <AxisTicks scale={x} orientation="x" />
      {spec.reference !== undefined && (
        <g>
          <line x1={x(spec.reference)} x2={x(spec.reference)} y1={margin.top} y2={height - margin.bottom} stroke={chartTheme.blue} strokeDasharray="5 5" />
          {spec.referenceLabel && !referenceRepeatedInLegend && (
            <text x={x(spec.reference) + 6} y={margin.top + 13} fill={chartTheme.blue} fontSize={10.5} fontWeight={750}>
              {spec.referenceLabel}
            </text>
          )}
        </g>
      )}
      {spec.intervals.map((interval, i) => {
        const yCenter = (y(interval.label) ?? 0) + y.bandwidth() / 2;
        const showLabel = i % labelEvery === 0 || i === spec.intervals.length - 1;
        return (
          <g className="interval-row" key={i} aria-label={`${interval.label}: ${interval.lower} to ${interval.upper}`}>
            <title>{`${interval.label}: ${Number(interval.lower.toFixed(3))} to ${Number(interval.upper.toFixed(3))}; center ${Number(interval.center.toFixed(3))}`}</title>
            <line x1={x(interval.lower)} x2={x(interval.upper)} y1={yCenter} y2={yCenter} stroke={interval.color ?? chartTheme.teal} strokeWidth={intervalStrokeWidth} strokeLinecap="round" />
            <circle cx={x(interval.center)} cy={yCenter} r={centerRadius} fill={interval.color ?? chartTheme.teal} />
            {showLabel && (
              <text className="interval-row__label" x={margin.left - 10} y={yCenter} dominantBaseline="middle" textAnchor="end" fill={chartTheme.muted} fontSize={labelFontSize}>
                {interval.label}
              </text>
            )}
          </g>
        );
      })}
      <Legend items={spec.legend ?? []} />
    </Frame>
  );
}

function CltChart({ spec }: { spec: Extract<ChartSpec, { type: "clt" }> }) {
  const top = { x: margin.left, y: 54, width: width - margin.left - margin.right, height: 104 };
  const bottom = { x: margin.left, y: 210, width: width - margin.left - margin.right, height: 116 };
  const x = scaleLinear().domain(spec.xDomain).nice().range([bottom.x, bottom.x + bottom.width]);
  const populationMax = Math.max(...spec.populationBars.map((b) => b.value), 1);
  const samplingMax = Math.max(
    ...spec.sampleMeanBars.map((b) => b.value),
    ...spec.normalCurve.map((p) => p.y),
    1
  );
  const popY = scaleLinear().domain([0, populationMax * 1.15]).range([top.y + top.height, top.y]);
  const meanY = scaleLinear().domain([0, samplingMax * 1.18]).range([bottom.y + bottom.height, bottom.y]);
  const populationCenters = spec.populationBars.map((bar) => bar.x ?? Number(bar.label));
  const populationDomain = extent(populationCenters, [-3, 3]);
  const popX = scaleLinear().domain(populationDomain).range([top.x, top.x + top.width]);
  const popBarWidth = Math.max(2, top.width / Math.max(spec.populationBars.length, 1) * 0.82);
  const meanBarWidth = Math.max(2, bottom.width / Math.max(spec.sampleMeanBars.length, 1) * 0.82);
  const normalLine = line<ChartPoint>().x((p) => x(p.x)).y((p) => meanY(p.y));
  const populationMean = x(spec.populationMean);

  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <text x={top.x} y={top.y - 14} fill={chartTheme.muted} fontSize={13} fontWeight={800}>
        {spec.populationTitle}
      </text>
      <line x1={top.x} x2={top.x + top.width} y1={top.y + top.height} y2={top.y + top.height} stroke={chartTheme.grid} />
      {spec.populationBars.map((bar, i) => (
        <rect
          key={`pop-${i}`}
          x={popX(bar.x ?? Number(bar.label)) - popBarWidth / 2}
          y={popY(bar.value)}
          width={popBarWidth}
          height={Math.max(0, top.y + top.height - popY(bar.value))}
          fill={chartTheme.sageSoft}
          opacity={0.72}
        />
      ))}
      {popX.ticks(5).map((tick) => (
        <text key={`pop-tick-${tick}`} x={popX(tick)} y={top.y + top.height + 13} textAnchor="middle" fill={chartTheme.muted} fontSize={9.5}>{Number(tick.toFixed(2))}</text>
      ))}
      <line x1={populationMean} x2={populationMean} y1={top.y} y2={top.y + top.height} stroke={chartTheme.lavender} strokeDasharray="5 5" />
      <text x={populationMean + 6} y={top.y + 14} fill={chartTheme.lavender} fontSize={11} fontWeight={800}>
        μ
      </text>
      <text x={bottom.x} y={bottom.y - 16} fill={chartTheme.muted} fontSize={13} fontWeight={800}>
        {spec.samplingTitle}
      </text>
      <line x1={bottom.x} x2={bottom.x + bottom.width} y1={bottom.y + bottom.height} y2={bottom.y + bottom.height} stroke={chartTheme.grid} />
      <line x1={bottom.x} x2={bottom.x} y1={bottom.y} y2={bottom.y + bottom.height} stroke={chartTheme.grid} />
      {x.ticks(5).map((tick) => (
        <g key={`mean-tick-${tick}`}>
          <line x1={x(tick)} x2={x(tick)} y1={bottom.y + bottom.height} y2={bottom.y + bottom.height + 5} stroke={chartTheme.axis} />
          <text x={x(tick)} y={bottom.y + bottom.height + 18} textAnchor="middle" fill={chartTheme.muted} fontSize={10}>{Number(tick.toFixed(2))}</text>
        </g>
      ))}
      {spec.sampleMeanBars.map((bar, i) => (
        <rect
          key={`mean-${i}`}
          x={x(bar.x ?? Number(bar.label)) - meanBarWidth / 2}
          y={meanY(bar.value)}
          width={meanBarWidth}
          height={Math.max(0, bottom.y + bottom.height - meanY(bar.value))}
          fill={chartTheme.teal}
          opacity={0.76}
        />
      ))}
      <path d={normalLine(spec.normalCurve) ?? ""} fill="none" stroke={chartTheme.lavender} strokeWidth={3} strokeLinecap="round" />
      <line x1={populationMean} x2={populationMean} y1={bottom.y} y2={bottom.y + bottom.height} stroke={chartTheme.blue} strokeDasharray="5 5" />
      <g transform={`translate(${width - 250}, 24)`}>
        <rect x={0} y={0} width={222} height={62} rx={12} fill="rgba(255,253,248,0.86)" stroke="rgba(90,80,60,0.14)" />
        <line x1={12} x2={30} y1={20} y2={20} stroke={chartTheme.lavender} strokeWidth={3} />
        <text x={38} y={24} fill={chartTheme.text} fontSize={11} fontWeight={750}>
          {spec.normalApproximationLabel ?? "Normal approximation"}
        </text>
        <line x1={12} x2={30} y1={42} y2={42} stroke={chartTheme.blue} strokeDasharray="5 5" />
        <text x={38} y={46} fill={chartTheme.text} fontSize={11} fontWeight={750}>
          {spec.populationMeanLabel ?? "Population mean"}
        </text>
      </g>
    </Frame>
  );
}

function AnovaChart({ spec }: { spec: Extract<ChartSpec, { type: "anova" }> }) {
  const values = spec.groups.flatMap((group) => group.values);
  const yDomain = extent([...values, spec.grandMean], [0, 1]);
  const padding = Math.max((yDomain[1] - yDomain[0]) * 0.12, 0.5);
  const y = scaleLinear().domain([yDomain[0] - padding, yDomain[1] + padding]).nice().range([height - margin.bottom, margin.top]);
  const x = scaleBand().domain(spec.groups.map((group) => group.label)).range([margin.left, width - margin.right]).padding(0.24);
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <GridLines y={y} />
      <AxisTicks scale={y} orientation="y" />
      <line x1={margin.left} x2={width - margin.right} y1={y(spec.grandMean)} y2={y(spec.grandMean)} stroke={chartTheme.lavender} strokeWidth={2} strokeDasharray="6 5" />
      <text x={width - margin.right - 4} y={y(spec.grandMean) - 7} textAnchor="end" fill={chartTheme.lavender} fontSize={10.5} fontWeight={800}>{spec.grandMeanLabel ?? "grand mean"}</text>
      {spec.groups.map((group, groupIndex) => {
        const start = x(group.label) ?? margin.left;
        const center = start + x.bandwidth() / 2;
        return (
          <g key={group.label}>
            {group.values.map((value, valueIndex) => {
              const jitter = (((valueIndex * 37 + groupIndex * 19) % 17) / 16 - 0.5) * x.bandwidth() * 0.58;
              return <circle key={`${group.label}-${valueIndex}`} cx={center + jitter} cy={y(value)} r={4.4} fill={chartTheme.teal} opacity={0.7}><title>{`${group.label}: ${value.toFixed(3)}`}</title></circle>;
            })}
            <line x1={start + x.bandwidth() * 0.15} x2={start + x.bandwidth() * 0.85} y1={y(group.mean)} y2={y(group.mean)} stroke={chartTheme.danger} strokeWidth={4} strokeLinecap="round" />
            <text x={center} y={height - margin.bottom + 18} textAnchor="middle" fill={chartTheme.muted} fontSize={10.5}>{group.label}</text>
          </g>
        );
      })}
      <Legend items={[
        { label: spec.observationsLabel ?? "observations", color: chartTheme.teal, shape: "dot" },
        { label: spec.groupMeanLabel ?? "group mean", color: chartTheme.danger, shape: "line" },
        { label: spec.grandMeanLabel ?? "grand mean", color: chartTheme.lavender, shape: "dashed" },
      ]} />
    </Frame>
  );
}

function McmcChart({ spec }: { spec: Extract<ChartSpec, { type: "mcmc" }> }) {
  const left = { x: 54, y: 58, width: 408, height: 250 };
  const right = { x: 512, y: 68, width: 220, height: 102 };
  const rightBottom = { ...right, y: 208 };
  const x = scaleLinear().domain(spec.xDomain).range([left.x, left.x + left.width]);
  const y = scaleLinear().domain(spec.yDomain).range([left.y + left.height, left.y]);
  const traceValues = [...spec.traceX, ...spec.traceY].map((point) => point.y);
  const traceDomain = extent(traceValues, spec.yDomain);
  const traceXDomain = extent(spec.traceX.map((point) => point.x), [0, 1]);
  const traceX = scaleLinear().domain(traceXDomain).range([right.x, right.x + right.width]);
  const traceYTop = scaleLinear().domain(traceDomain).nice().range([right.y + right.height, right.y]);
  const traceYBottom = scaleLinear().domain(traceDomain).nice().range([rightBottom.y + rightBottom.height, rightBottom.y]);
  const targetLine = line<ChartPoint>().x((point) => x(point.x)).y((point) => y(point.y));
  const traceLineTop = line<ChartPoint>().x((point) => traceX(point.x)).y((point) => traceYTop(point.y));
  const traceLineBottom = line<ChartPoint>().x((point) => traceX(point.x)).y((point) => traceYBottom(point.y));
  const pathLine = line<ChartPoint>().x((point) => x(point.x)).y((point) => y(point.y));
  const latest = spec.path.at(-1);

  return (
    <Frame title={spec.title} xLabel="" yLabel="">
      <text x={left.x} y={left.y - 14} fill={chartTheme.text} fontSize={12} fontWeight={800}>{spec.targetLabel}</text>
      <rect x={left.x} y={left.y} width={left.width} height={left.height} rx={12} fill="rgba(255,253,248,0.55)" stroke={chartTheme.grid} />
      {x.ticks(5).map((tick) => <line key={`mx-${tick}`} x1={x(tick)} x2={x(tick)} y1={left.y} y2={left.y + left.height} stroke={chartTheme.grid} strokeOpacity={0.5} />)}
      {y.ticks(5).map((tick) => <line key={`my-${tick}`} x1={left.x} x2={left.x + left.width} y1={y(tick)} y2={y(tick)} stroke={chartTheme.grid} strokeOpacity={0.5} />)}
      {spec.contours.map((contour, index) => (
        <path key={`mcmc-contour-${index}`} d={targetLine(contour.points) ?? ""} fill="none" stroke={contour.color ?? chartTheme.lavender} strokeWidth={1.4} strokeOpacity={contour.opacity ?? 0.55} />
      ))}
      {spec.samples.map((point, index) => (
        <circle key={`mcmc-sample-${index}`} cx={x(point.x)} cy={y(point.y)} r={2.3} fill={point.color ?? chartTheme.teal} opacity={0.32}>
          <title>{`draw ${index + 1}: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`}</title>
        </circle>
      ))}
      <path d={pathLine(spec.path) ?? ""} fill="none" stroke={chartTheme.danger} strokeWidth={2.2} strokeOpacity={0.78} />
      {spec.path.map((point, index) => (
        <circle key={`path-${index}`} cx={x(point.x)} cy={y(point.y)} r={index === spec.path.length - 1 ? 5 : 2.5} fill={index === spec.path.length - 1 ? chartTheme.danger : chartTheme.lavender} />
      ))}
      {latest && <text x={x(latest.x) + 8} y={y(latest.y) - 8} fill={chartTheme.danger} fontSize={10.5} fontWeight={800}>{spec.currentStateLabel ?? "current state"}</text>}
      <text x={left.x + left.width / 2} y={left.y + left.height + 26} textAnchor="middle" fill={chartTheme.muted} fontSize={11}>{spec.xLabel}</text>
      <text x={left.x - 34} y={left.y + left.height / 2} textAnchor="middle" fill={chartTheme.muted} fontSize={11} transform={`rotate(-90 ${left.x - 34} ${left.y + left.height / 2})`}>{spec.yLabel}</text>

      <text x={right.x} y={right.y - 14} fill={chartTheme.text} fontSize={12} fontWeight={800}>{spec.traceLabel}</text>
      <rect x={right.x} y={right.y} width={right.width} height={right.height} rx={10} fill="rgba(255,253,248,0.55)" stroke={chartTheme.grid} />
      <path d={traceLineTop(spec.traceX) ?? ""} fill="none" stroke={chartTheme.teal} strokeWidth={2} />
      <text x={right.x + 8} y={right.y + 15} fill={chartTheme.teal} fontSize={10} fontWeight={800}>x₁</text>
      <rect x={rightBottom.x} y={rightBottom.y} width={rightBottom.width} height={rightBottom.height} rx={10} fill="rgba(255,253,248,0.55)" stroke={chartTheme.grid} />
      <path d={traceLineBottom(spec.traceY) ?? ""} fill="none" stroke={chartTheme.lavender} strokeWidth={2} />
      <text x={rightBottom.x + 8} y={rightBottom.y + 15} fill={chartTheme.lavender} fontSize={10} fontWeight={800}>x₂</text>
      <Legend items={[
        { label: spec.targetDensityLabel ?? "target density", color: chartTheme.lavender, shape: "line" },
        { label: spec.recentPathLabel ?? "recent path", color: chartTheme.danger, shape: "line" },
      ]} />
    </Frame>
  );
}

export function Chart({ spec }: { spec: ChartSpec }) {
  if (spec.type === "scatter") return <ScatterChart spec={spec} />;
  if (spec.type === "line") return <LineChart spec={spec} />;
  if (spec.type === "intervals") return <IntervalsChart spec={spec} />;
  if (spec.type === "clt") return <CltChart spec={spec} />;
  if (spec.type === "mcmc") return <McmcChart spec={spec} />;
  if (spec.type === "anova") return <AnovaChart spec={spec} />;
  return <BarsChart spec={spec} />;
}
