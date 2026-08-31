import { axisBottom, select } from "d3";
import { defaultConfig, type Sample, type Scales } from "./constants";

interface ConfidenceIntervalChartProps {
  samples: Sample[];
  scales: Scales;
  trueMean?: number;
  populationSD: number;
  sampleSize: number;
  confidenceLevel: number;
  criticalMultiplier: number;
  trueMeanLabel: string;
  populationScaleLabel: string;
  sampleIndexLabel: string;
  emptyPrompt: string;
  chartDescription: string;
  sampleTooltip: (sampleNumber: number, lower: number, upper: number, contains: boolean) => string;
}

const MAX_VISIBLE_INTERVALS = 5;

function normalDensity(x: number, mean: number, sd: number): number {
  const safeSD = Math.max(sd, Number.EPSILON);
  const z = (x - mean) / safeSD;
  return Math.exp(-0.5 * z * z) / (safeSD * Math.sqrt(2 * Math.PI));
}

function linePath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

export function ConfidenceIntervalChart({
  samples,
  scales,
  trueMean = defaultConfig.populationMean,
  populationSD,
  sampleSize,
  confidenceLevel,
  criticalMultiplier,
  trueMeanLabel,
  populationScaleLabel,
  sampleIndexLabel,
  emptyPrompt,
  chartDescription,
  sampleTooltip,
}: ConfidenceIntervalChartProps) {
  const width = defaultConfig.layout.width;
  const height = 410;
  const margin = { ...defaultConfig.layout.margin, bottom: 34 };
  const marginLeft = margin.left;
  const marginTop = margin.top;
  const innerWidth = width - margin.left - margin.right;
  const curveTop = 8;
  const baselineY = 174;
  const intervalStartY = 222;
  const intervalGap = 30;
  const standardError = Math.max(populationSD / Math.sqrt(Math.max(1, sampleSize)), Number.EPSILON);
  const [domainStart, domainEnd] = scales.xScale.domain() as [number, number];
  const maxDensity = normalDensity(trueMean, trueMean, standardError);
  const densityY = (density: number) => baselineY - (density / maxDensity) * (baselineY - curveTop);
  const curvePoints = Array.from({ length: 121 }, (_, index) => {
    const value = domainStart + ((domainEnd - domainStart) * index) / 120;
    return {
      value,
      x: scales.xScale(value),
      y: densityY(normalDensity(value, trueMean, standardError)),
    };
  });
  const theoreticalLower = trueMean - criticalMultiplier * standardError;
  const theoreticalUpper = trueMean + criticalMultiplier * standardError;
  const bandValues = [
    theoreticalLower,
    ...curvePoints.filter((point) => point.value > theoreticalLower && point.value < theoreticalUpper).map((point) => point.value),
    theoreticalUpper,
  ].filter((value) => value >= domainStart && value <= domainEnd);
  const bandPoints = bandValues.map((value) => ({
    x: scales.xScale(value),
    y: densityY(normalDensity(value, trueMean, standardError)),
  }));
  const bandPath = bandPoints.length > 1
    ? `M${bandPoints[0].x.toFixed(2)} ${baselineY} ${linePath(bandPoints).replace(/^M/, "L")} L${bandPoints[bandPoints.length - 1].x.toFixed(2)} ${baselineY} Z`
    : "";
  const trueMeanX = scales.xScale(trueMean);
  const visibleStart = Math.max(0, samples.length - MAX_VISIBLE_INTERVALS);
  const visibleCount = Math.min(samples.length, MAX_VISIBLE_INTERVALS);
  const finalIntervalY = intervalStartY + Math.max(0, visibleCount - 1) * intervalGap;
  const meanLineBottom = Math.max(baselineY + 16, finalIntervalY + 14);

  return (
    <svg
      className="confidence-chart confidence-chart--distribution"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${samples.length} repeated confidence intervals; ${trueMeanLabel}`}
    >
      <desc>{chartDescription}</desc>
      <g transform={`translate(${marginLeft}, ${marginTop})`}>
        <g
          className="ci-distribution-axis"
          transform={`translate(0, ${baselineY})`}
          ref={(group) => {
            if (group) {
              select(group).call(
                axisBottom(scales.xScale)
                  .ticks(6)
                  .tickSize(-(baselineY - curveTop))
                  .tickSizeOuter(0)
                  .tickPadding(8),
              );
            }
          }}
        />
        {bandPath && <path className="ci-distribution-band" d={bandPath} />}
        <path className="ci-distribution-curve" d={linePath(curvePoints)} />
        <line
          className="ci-true-mean-line"
          x1={trueMeanX}
          x2={trueMeanX}
          y1={curveTop}
          y2={meanLineBottom}
        />
        <text className="ci-true-mean-label" x={trueMeanX + 8} y={curveTop + 12}>
          {trueMeanLabel}
        </text>
        <text className="ci-confidence-band-label" x={scales.xScale(theoreticalUpper) - 6} y={baselineY - 12} textAnchor="end">
          {Math.round(confidenceLevel * 100)}%
        </text>
        <text className="ci-interval-section-label" x={0} y={intervalStartY - 19}>
          {sampleIndexLabel}
        </text>

        {samples.length === 0 ? (
          <g className="ci-empty-state">
            <line
              className="ci-empty-interval"
              x1={scales.xScale(theoreticalLower)}
              x2={scales.xScale(theoreticalUpper)}
              y1={intervalStartY + 6}
              y2={intervalStartY + 6}
            />
            <circle className="ci-empty-point" cx={trueMeanX} cy={intervalStartY + 6} r={4.5} />
            <text className="ci-empty-label" x={innerWidth / 2} y={intervalStartY + 40} textAnchor="middle">
              {emptyPrompt}
            </text>
          </g>
        ) : samples.map((sample, index) => {
          const visible = index >= visibleStart;
          const visibleIndex = index - visibleStart;
          const y = intervalStartY + Math.max(0, visibleIndex) * intervalGap;
          const x1 = scales.xScale(sample.lower);
          const x2 = scales.xScale(sample.upper);
          const meanX = scales.xScale(sample.mean);
          const statusClass = sample.contains ? "ci-group--capture" : "ci-group--miss";
          return (
            <g
              key={index}
              className={`ci-group ${statusClass}`}
              visibility={visible ? "visible" : "hidden"}
              aria-hidden={visible ? undefined : true}
            >
              <title>{sampleTooltip(index + 1, sample.lower, sample.upper, sample.contains)}</title>
              <text className="ci-interval-index" x={0} y={y + 4}>
                #{index + 1} {sample.contains ? "✓" : "×"}
              </text>
              <line className="ci-line" y1={y} y2={y} x1={x1} x2={x2} />
              <line className="ci-endpoint" x1={x1} x2={x1} y1={y - 5} y2={y + 5} />
              <line className="ci-endpoint" x1={x2} x2={x2} y1={y - 5} y2={y + 5} />
              <circle className="sample-mean" cx={meanX} cy={y} r={4.8} />
              <text className="ci-bound-label ci-bound-label--lower" x={x1 - 5} y={y - 7} textAnchor="end">
                {sample.lower.toFixed(2)}
              </text>
              <text className="ci-mean-label" x={meanX} y={y - 7} textAnchor="middle">
                x̄={sample.mean.toFixed(2)}
              </text>
              <text className="ci-bound-label ci-bound-label--upper" x={x2 + 5} y={y - 7}>
                {sample.upper.toFixed(2)}
              </text>
            </g>
          );
        })}
      </g>
      <text className="chart-axis-label" x={width / 2} y={height - 9} textAnchor="middle">
        {populationScaleLabel}
      </text>
    </svg>
  );
}
