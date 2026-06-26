import { select, axisBottom, axisLeft } from "d3";
import { defaultConfig, type Sample, type Scales } from "./constants";

interface ConfidenceIntervalChartProps {
  samples: Sample[];
  scales: Scales;
  trueMeanLabel: string;
  populationScaleLabel: string;
  sampleIndexLabel: string;
}

export function ConfidenceIntervalChart({
  samples,
  scales,
  trueMeanLabel,
  populationScaleLabel,
  sampleIndexLabel,
}: ConfidenceIntervalChartProps) {
  const { width, height, margin } = defaultConfig.layout;
  const marginTop = margin.top;
  const marginBottom = margin.bottom;
  const marginLeft = margin.left;
  const chartHeight = height - marginTop - marginBottom;
  const trueMeanX = scales.xScale(defaultConfig.populationMean);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${marginLeft}, ${marginTop})`}>
        <g transform={`translate(0, ${chartHeight})`} ref={(g) => {
          if (g) select(g).call(axisBottom(scales.xScale).ticks(6).tickSizeOuter(0));
        }} />
        <g ref={(g) => {
          if (g) select(g).call(axisLeft(scales.yScale).ticks(6).tickSizeOuter(0));
        }} />
        <line
          x1={trueMeanX}
          y1={0}
          x2={trueMeanX}
          y2={chartHeight}
          stroke="var(--chart-blue)"
          strokeWidth={1.8}
          strokeDasharray="6,7"
        />
        <text x={trueMeanX} y={15} fill="var(--chart-blue)">
          {trueMeanLabel}
        </text>
        {samples.map((sample, i) => {
          const x1 = scales.xScale(sample.lower);
          const x2 = scales.xScale(sample.upper);
          const meanX = scales.xScale(sample.mean);
          const y = scales.yScale(i + 0.5);
          const color = sample.contains ? "var(--sage)" : "var(--danger)";
          return (
            <g key={i} className="ci-group">
              <line
                className="ci-line"
                y1={y}
                y2={y}
                x1={x1}
                x2={x2}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle
                className="sample-mean"
                cx={meanX}
                cy={y}
                r={5.5}
                fill={sample.contains ? "var(--deep-teal)" : "var(--danger)"}
                stroke="var(--chart-bg)"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </g>
      <text
        className="chart-axis-label"
        x={width / 2}
        y={height - 10}
        textAnchor="middle"
      >
        {populationScaleLabel}
      </text>
      <text
        className="chart-axis-label"
        transform={`translate(16, ${height / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        {sampleIndexLabel}
      </text>
    </svg>
  );
}
