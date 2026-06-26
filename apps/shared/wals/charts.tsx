import { scaleLinear, line, scaleBand, type ScaleLinear } from "d3";
import type { ChartPoint, ChartSpec } from "./types";
import { CHART_LAYOUT } from "@stats-viz/shared/chart-utils";

const width = CHART_LAYOUT.width;
const height = CHART_LAYOUT.height;
const margin = CHART_LAYOUT.margin;

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
              <line x1={x} x2={x} y1={y} y2={y + 6} stroke="#94a3b8" />
            ) : (
              <line x1={x - 6} x2={x} y1={y} y2={y} stroke="#94a3b8" />
            )}
            <text
              x={orientation === "x" ? x : x - 10}
              y={orientation === "x" ? y + 22 : y + 4}
              textAnchor={orientation === "x" ? "middle" : "end"}
              fill="#64748b"
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
      <rect x={0} y={0} width={width} height={height} rx={8} fill="#ffffff" />
      <text x={margin.left} y={22} fill="#111827" fontSize={16} fontWeight={700}>
        {title}
      </text>
      <text x={width / 2} y={height - 12} fill="#475569" fontSize={12} textAnchor="middle">
        {xLabel}
      </text>
      <text
        x={18}
        y={height / 2}
        fill="#475569"
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
  const xDomain = spec.xDomain ?? extent(
    spec.points.map((p) => p.x).concat(spec.line?.points.map((p) => p.x) ?? []),
    [0, 1]
  );
  const yDomain = spec.yDomain ?? extent(
    spec.points.map((p) => p.y).concat(spec.line?.points.map((p) => p.y) ?? []),
    [0, 1]
  );
  const x = scaleLinear().domain(xDomain).nice().range([margin.left, width - margin.right]);
  const y = scaleLinear().domain(yDomain).nice().range([height - margin.bottom, margin.top]);
  const lineGen = line<ChartPoint>().x((p) => x(p.x)).y((p) => y(p.y));
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#cbd5e1" />
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#cbd5e1" />
      <AxisTicks scale={x} orientation="x" />
      <AxisTicks scale={y} orientation="y" />
      {spec.line && (
        <path d={lineGen(spec.line.points) ?? ""} fill="none" stroke={spec.line.color ?? "#d1495b"} strokeWidth={3} />
      )}
      {spec.points.map((point, i) => (
        <circle
          key={i}
          cx={x(point.x)}
          cy={y(point.y)}
          r={point.label ? 4.5 : 3}
          fill={point.color ?? "#136f63"}
          opacity={0.78}
        />
      ))}
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
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#cbd5e1" />
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#cbd5e1" />
      <AxisTicks scale={x} orientation="x" />
      <AxisTicks scale={y} orientation="y" />
      {spec.series.map((series, i) => (
        <path key={i} d={lineGen(series.points) ?? ""} fill="none" stroke={series.color ?? "#136f63"} strokeWidth={3} />
      ))}
    </Frame>
  );
}

function BarsChart({ spec }: { spec: Extract<ChartSpec, { type: "bars" }> }) {
  const maxValue = Math.max(...spec.bars.map((b) => b.value), 1);
  const yDomain = spec.yDomain ?? [0, maxValue * 1.15] as [number, number];
  const x = scaleBand().domain(spec.bars.map((b) => b.label)).range([margin.left, width - margin.right]).padding(0.18);
  const y = scaleLinear().domain(yDomain).nice().range([height - margin.bottom, margin.top]);
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#cbd5e1" />
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#cbd5e1" />
      <AxisTicks scale={y} orientation="y" />
      {spec.bars.map((bar, i) => (
        <rect
          key={i}
          x={x(bar.label) ?? margin.left}
          y={y(bar.value)}
          width={x.bandwidth()}
          height={Math.max(0, height - margin.bottom - y(bar.value))}
          fill={bar.color ?? "#136f63"}
          opacity={0.86}
        />
      ))}
    </Frame>
  );
}

function IntervalsChart({ spec }: { spec: Extract<ChartSpec, { type: "intervals" }> }) {
  const values = spec.intervals.flatMap((i) => [i.lower, i.upper, i.center]);
  const xDomain = spec.xDomain ?? extent(values, [0, 1]);
  const x = scaleLinear().domain(xDomain).nice().range([margin.left, width - margin.right]);
  const y = scaleBand().domain(spec.intervals.map((i) => i.label)).range([margin.top, height - margin.bottom]).padding(0.35);
  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#cbd5e1" />
      <AxisTicks scale={x} orientation="x" />
      {spec.reference !== undefined && (
        <line x1={x(spec.reference)} x2={x(spec.reference)} y1={margin.top} y2={height - margin.bottom} stroke="#64748b" strokeDasharray="5 5" />
      )}
      {spec.intervals.map((interval, i) => {
        const yCenter = (y(interval.label) ?? 0) + y.bandwidth() / 2;
        return (
          <g key={i}>
            <line x1={x(interval.lower)} x2={x(interval.upper)} y1={yCenter} y2={yCenter} stroke={interval.color ?? "#136f63"} strokeWidth={5} strokeLinecap="round" />
            <circle cx={x(interval.center)} cy={yCenter} r={6} fill={interval.color ?? "#136f63"} />
            <text x={margin.left - 10} y={yCenter + 4} textAnchor="end" fill="#475569" fontSize={12}>
              {interval.label}
            </text>
          </g>
        );
      })}
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
  const popX = scaleBand()
    .domain(spec.populationBars.map((b) => b.label))
    .range([top.x, top.x + top.width])
    .padding(0.18);
  const meanX = scaleBand()
    .domain(spec.sampleMeanBars.map((b) => b.label))
    .range([bottom.x, bottom.x + bottom.width])
    .padding(0.16);
  const normalLine = line<ChartPoint>().x((p) => x(p.x)).y((p) => meanY(p.y));
  const latestMean = spec.latestMean === undefined ? null : x(spec.latestMean);
  const populationMean = x(spec.populationMean);

  return (
    <Frame title={spec.title} xLabel={spec.xLabel} yLabel={spec.yLabel}>
      <text x={top.x} y={top.y - 14} fill="#475569" fontSize={13} fontWeight={800}>
        {spec.populationTitle}
      </text>
      <line x1={top.x} x2={top.x + top.width} y1={top.y + top.height} y2={top.y + top.height} stroke="#ded6c7" />
      {spec.populationBars.map((bar, i) => (
        <rect
          key={`pop-${i}`}
          x={popX(bar.label) ?? top.x}
          y={popY(bar.value)}
          width={popX.bandwidth()}
          height={Math.max(0, top.y + top.height - popY(bar.value))}
          fill="#b7d6cc"
          opacity={0.72}
        />
      ))}
      <line x1={populationMean} x2={populationMean} y1={top.y} y2={top.y + top.height} stroke="#8d75b5" strokeDasharray="5 5" />
      <text x={populationMean + 6} y={top.y + 14} fill="#8d75b5" fontSize={11} fontWeight={800}>
        μ
      </text>
      <text x={bottom.x} y={bottom.y - 16} fill="#475569" fontSize={13} fontWeight={800}>
        {spec.samplingTitle}
      </text>
      <line x1={bottom.x} x2={bottom.x + bottom.width} y1={bottom.y + bottom.height} y2={bottom.y + bottom.height} stroke="#ded6c7" />
      <line x1={bottom.x} x2={bottom.x} y1={bottom.y} y2={bottom.y + bottom.height} stroke="#ded6c7" />
      <AxisTicks scale={x} orientation="x" />
      {spec.sampleMeanBars.map((bar, i) => (
        <rect
          key={`mean-${i}`}
          x={meanX(bar.label) ?? bottom.x}
          y={meanY(bar.value)}
          width={meanX.bandwidth()}
          height={Math.max(0, bottom.y + bottom.height - meanY(bar.value))}
          fill="#2f6f64"
          opacity={0.76}
        />
      ))}
      <path d={normalLine(spec.normalCurve) ?? ""} fill="none" stroke="#8d75b5" strokeWidth={3} strokeLinecap="round" />
      <line x1={populationMean} x2={populationMean} y1={bottom.y} y2={bottom.y + bottom.height} stroke="#4b73d9" strokeDasharray="5 5" />
      {latestMean !== null && (
        <>
          <line x1={latestMean} x2={latestMean} y1={bottom.y} y2={bottom.y + bottom.height} stroke="#c8665a" strokeWidth={2} />
          <text x={latestMean + 6} y={bottom.y + 15} fill="#c8665a" fontSize={11} fontWeight={800}>
            latest mean
          </text>
        </>
      )}
      <g transform={`translate(${width - 250}, 24)`}>
        <rect x={0} y={0} width={222} height={62} rx={12} fill="rgba(255,253,248,0.86)" stroke="rgba(90,80,60,0.14)" />
        <line x1={12} x2={30} y1={20} y2={20} stroke="#8d75b5" strokeWidth={3} />
        <text x={38} y={24} fill="#33352f" fontSize={11} fontWeight={750}>
          Normal approximation
        </text>
        <line x1={12} x2={30} y1={42} y2={42} stroke="#4b73d9" strokeDasharray="5 5" />
        <text x={38} y={46} fill="#33352f" fontSize={11} fontWeight={750}>
          Population mean
        </text>
      </g>
    </Frame>
  );
}

export function Chart({ spec }: { spec: ChartSpec }) {
  if (spec.type === "scatter") return <ScatterChart spec={spec} />;
  if (spec.type === "line") return <LineChart spec={spec} />;
  if (spec.type === "intervals") return <IntervalsChart spec={spec} />;
  if (spec.type === "clt") return <CltChart spec={spec} />;
  return <BarsChart spec={spec} />;
}
