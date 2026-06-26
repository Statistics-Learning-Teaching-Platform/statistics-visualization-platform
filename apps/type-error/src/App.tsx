import { useMemo, useState } from "react";
import { range, select, axisBottom, axisLeft, line } from "d3";
import { typeErrorCopy, useLanguage } from "@stats-viz/shared/i18n";
import { normalCdf, normalInv, normalPdf } from "@stats-viz/shared/math";
import {
  createLinearScales,
  innerHeight,
  innerWidth,
  type ChartLayout,
} from "@stats-viz/shared/chart-utils";
import { formatNumber } from "@stats-viz/shared/format";

type TestType = "left-tailed" | "right-tailed" | "two-tailed";

interface Params {
  alpha: number;
  nullMean: number;
  trueMean: number;
  stdDev: number;
}

interface DistributionPoint {
  x: number;
  y: number;
}

// Per-app chart canvas (the documented chart-utils override path; the
// regression app follows the same pattern). Differs from the shared default
// CHART_LAYOUT because this figure's content needs taller top/bottom margins.
const CHART_LAYOUT: ChartLayout = {
  width: 760,
  height: 380,
  margin: { top: 50, right: 30, bottom: 50, left: 50 },
};

function generateDistribution(mean: number, stdDev: number): DistributionPoint[] {
  return range(-5, 10, 0.05).map((x) => ({ x, y: normalPdf(x, mean, stdDev) }));
}

function createScales() {
  return createLinearScales(CHART_LAYOUT, [-5, 10], [0, 0.5]);
}

function computeCriticalValues(
  alpha: number,
  nullMean: number,
  stdDev: number,
  testType: TestType,
): number[] {
  const pValues =
    testType === "right-tailed"
      ? [1 - alpha]
      : testType === "left-tailed"
        ? [alpha]
        : [alpha / 2, 1 - alpha / 2];
  return pValues.map((p) => normalInv(p, nullMean, stdDev));
}

function criticalAreaFn(
  testType: TestType,
): (d: DistributionPoint, c: number[]) => boolean {
  return (d, c) => {
    if (testType === "right-tailed") return d.x > (c[0] ?? 0);
    if (testType === "left-tailed") return d.x < (c[0] ?? 0);
    return d.x < (c[0] ?? 0) || d.x > (c[1] ?? 0);
  };
}

function createHypothesisText(nullMean: number, testType: TestType) {
  const H0Text = `H₀: μ = ${nullMean}`;
  const H1Text =
    testType === "right-tailed"
      ? `Hₐ: μ > ${nullMean}`
      : testType === "left-tailed"
        ? `Hₐ: μ < ${nullMean}`
        : `Hₐ: μ ≠ ${nullMean}`;
  return { H0Text, H1Text };
}

function computeTypeTwoErrorRate(
  criticalValue: number[],
  trueMean: number,
  stdDev: number,
  testType: TestType,
): number {
  if (testType === "right-tailed") return normalCdf(criticalValue[0] ?? 0, trueMean, stdDev);
  if (testType === "left-tailed") return 1 - normalCdf(criticalValue[0] ?? 0, trueMean, stdDev);
  const left = criticalValue[0] ?? 0;
  const right = criticalValue[1] ?? 0;
  return normalCdf(right, trueMean, stdDev) - normalCdf(left, trueMean, stdDev);
}

function buildAreaPath(
  data: DistributionPoint[],
  criticalValue: number[],
  filterFn: (d: DistributionPoint, c: number[]) => boolean,
  scales: ReturnType<typeof createScales>,
  invert: boolean,
): string {
  const area = data.map((d) => ({
    x: d.x,
    y: invert ? (filterFn(d, criticalValue) ? 0 : d.y) : filterFn(d, criticalValue) ? d.y : 0,
  }));
  if (area.length === 0) return "";
  area.push({ x: area[0]!.x, y: 0 });
  const last = area.at(-1)!;
  area.unshift({ x: last.x, y: 0 });
  area.unshift({ x: area[0]!.x, y: 0 });
  const lineGen = line<DistributionPoint>()
    .x((d) => scales.xScale(d.x))
    .y((d) => scales.yScale(d.y));
  return lineGen(area) ?? "";
}

export default function TypeErrorApp() {
  const language = useLanguage();
  const copy = typeErrorCopy[language];
  const [testType, setTestType] = useState<TestType>("right-tailed");
  const [params, setParams] = useState<Params>({
    alpha: 0.05,
    nullMean: 0,
    trueMean: 1,
    stdDev: 1,
  });

  const computed = useMemo(() => {
    const scales = createScales();
    const nullDistribution = generateDistribution(params.nullMean, params.stdDev);
    const trueDistribution = generateDistribution(params.trueMean, params.stdDev);
    const cv = computeCriticalValues(params.alpha, params.nullMean, params.stdDev, testType);
    const filterFn = criticalAreaFn(testType);
    const typeTwoErrorRate = computeTypeTwoErrorRate(cv, params.trueMean, params.stdDev, testType);
    return {
      scales,
      nullDistribution,
      trueDistribution,
      criticalValue: cv,
      criticalAreaFn: filterFn,
      hypothesisText: createHypothesisText(params.nullMean, testType),
      typeOneErrorRate: params.alpha,
      typeTwoErrorRate,
      power: 1 - typeTwoErrorRate,
      effectSize: params.trueMean - params.nullMean,
    };
  }, [params, testType]);

  const { scales, nullDistribution, trueDistribution, criticalValue } = computed;
  const plotWidth = innerWidth(CHART_LAYOUT);
  const plotHeight = innerHeight(CHART_LAYOUT);

  const nullLine = line<DistributionPoint>()
    .x((d) => scales.xScale(d.x))
    .y((d) => scales.yScale(d.y));
  const nullPath = nullLine(nullDistribution) ?? "";
  const truePath = nullLine(trueDistribution) ?? "";
  const type1AreaPath = buildAreaPath(
    nullDistribution,
    criticalValue,
    computed.criticalAreaFn,
    scales,
    false,
  );
  const type2AreaPath = buildAreaPath(
    trueDistribution,
    criticalValue,
    computed.criticalAreaFn,
    scales,
    true,
  );

  const legendRows = [
    { kind: "line", className: "chart-inline-legend__line--null", label: copy.nullDistribution },
    { kind: "line", className: "chart-inline-legend__line--true", label: copy.trueDistribution },
    { kind: "dash", className: "chart-inline-legend__line--critical", label: copy.criticalBoundary },
    { kind: "area", className: "chart-inline-legend__area--type1", label: copy.typeIErrorArea },
    { kind: "area", className: "chart-inline-legend__area--type2", label: copy.typeIIErrorArea },
  ];

  const getCriticalValueLabel = () => {
    const values = criticalValue.map((v) => v.toFixed(2));
    if (testType === "two-tailed") return values.join(copy.and);
    return values[0] ?? "--";
  };

  const getInterpretation = () => {
    if (computed.power >= 0.8) return copy.strongPower;
    if (computed.power >= 0.5) return copy.moderatePower;
    return copy.lowPower;
  };

  const getStrategyTip = () => {
    if (Math.abs(computed.effectSize) < 0.5) return copy.closeTrueMean;
    if (params.alpha <= 0.05) return copy.strictAlpha;
    return copy.largerAlpha;
  };

  const getTestTypeLabel = () =>
    testType === "two-tailed" ? copy.twoSidedTest : copy.oneSidedTest;

  const formatRate = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="module-shell">
      <div className="module-layout">
        <div className="experiment-board">
          <div className="experiment-header">
            <div>
              <p className="eyebrow">{copy.coreVisualizer}</p>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </div>
          </div>
          <div className="output-dock">
            <div className="output-heading">
              <p className="eyebrow">{copy.modelOutput}</p>
              <h2>{copy.chartTitle}</h2>
              <p>{copy.chartDescription}</p>
            </div>
            <div className="chart-frame">
              <svg width={CHART_LAYOUT.width} height={CHART_LAYOUT.height} viewBox={`0 0 ${CHART_LAYOUT.width} ${CHART_LAYOUT.height}`}>
                <g transform={`translate(${CHART_LAYOUT.margin.left}, ${CHART_LAYOUT.margin.top})`}>
                  <path d={nullPath} fill="none" stroke="var(--chart-blue)" strokeWidth={2} />
                  <path d={truePath} fill="none" stroke="var(--teal)" strokeWidth={2} />
                  <path d={type1AreaPath} fill="var(--lavender)" opacity={0.24} />
                  <path d={type2AreaPath} fill="var(--danger)" opacity={0.24} />
                  {criticalValue.map((cv, i) => (
                    <line
                      key={i}
                      x1={scales.xScale(cv)}
                      x2={scales.xScale(cv)}
                      y1={scales.yScale(0)}
                      y2={scales.yScale(0.5)}
                      stroke="var(--text-primary)"
                      strokeDasharray="5,5"
                    />
                  ))}
                  <g transform={`translate(0, ${plotHeight})`} ref={(g) => {
                    if (g) select(g).call(axisBottom(scales.xScale).ticks(6));
                  }} />
                  <g ref={(g) => {
                    if (g) select(g).call(axisLeft(scales.yScale).ticks(6));
                  }} />
                  <text
                    className="chart-axis-label"
                    x={plotWidth / 2}
                    y={CHART_LAYOUT.height - CHART_LAYOUT.margin.top - 8}
                    textAnchor="middle"
                  >
                    {copy.testStatistic}
                  </text>
                  <text
                    className="chart-axis-label"
                    transform={`translate(${-36}, ${plotHeight / 2}) rotate(-90)`}
                    textAnchor="middle"
                  >
                    {copy.density}
                  </text>
                  <text x={10} y={20} textAnchor="start" fontWeight="bold" fontSize={14}>
                    {computed.hypothesisText.H0Text}
                  </text>
                  <text x={10} y={40} textAnchor="start" fontWeight="bold" fontSize={14}>
                    {computed.hypothesisText.H1Text}
                  </text>
                  <g
                    className="chart-inline-legend"
                    transform={`translate(${Math.max(16, plotWidth - 206 - 14)}, 12)`}
                  >
                    <rect
                      className="chart-inline-legend__panel"
                      width={206}
                      height={112}
                      rx={12}
                      ry={12}
                    />
                    <text className="chart-inline-legend__title" x={12} y={20}>
                      {copy.legend}
                    </text>
                    {legendRows.map((row, i) => {
                      const y = 38 + i * 15;
                      return (
                        <g key={i} className="chart-inline-legend__row">
                          {row.kind === "area" ? (
                            <rect
                              className={`chart-inline-legend__area ${row.className}`}
                              x={12}
                              y={y - 7}
                              width={18}
                              height={9}
                              rx={3}
                              ry={3}
                            />
                          ) : (
                            <line
                              className={`chart-inline-legend__line ${row.className}`}
                              x1={12}
                              x2={30}
                              y1={y - 3}
                              y2={y - 3}
                            />
                          )}
                          <text className="chart-inline-legend__label" x={38} y={y}>
                            {row.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </g>
              </svg>
            </div>
          </div>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">{copy.alpha}</span>
              <span className="metric-value">{formatRate(computed.typeOneErrorRate)}</span>
              <small className="metric-note">{copy.alphaNote}</small>
            </div>
            <div className="metric-card">
              <span className="metric-label">{copy.betaLabel}</span>
              <span className="metric-value">{formatRate(computed.typeTwoErrorRate)}</span>
              <small className="metric-note">{copy.betaNote}</small>
            </div>
            <div className="metric-card">
              <span className="metric-label">{copy.power}</span>
              <span className="metric-value">{formatRate(computed.power)}</span>
              <small className="metric-note">{copy.powerNote}</small>
            </div>
            <div className="metric-card">
              <span className="metric-label">{copy.effectSize}</span>
              <span className="metric-value">{formatNumber(computed.effectSize, 2)}</span>
              <small className="metric-note">{copy.effectSizeNote}</small>
            </div>
          </div>
        </div>
        <div className="teaching-area">
          <div className="teaching-panel parameter-panel">
            <p className="eyebrow">{copy.parameters}</p>
            <div className="test-type-tabs">
              <div className="test-type-tabs__label">{copy.hypothesis}</div>
              <div className="test-type-tabs__buttons">
                <button
                  type="button"
                  className="test-type-tab"
                  data-test-type="right-tailed"
                  data-active={String(testType === "right-tailed")}
                  onClick={() => setTestType("right-tailed")}
                >
                  {copy.oneSided}
                </button>
                <button
                  type="button"
                  className="test-type-tab"
                  data-test-type="two-tailed"
                  data-active={String(testType === "two-tailed")}
                  onClick={() => setTestType("two-tailed")}
                >
                  {copy.twoSided}
                </button>
              </div>
            </div>
            <div className="control-panel">
              <div className="control-panel__title">{copy.controlPanel}</div>
              <p className="control-panel__intro">
                {copy.controlIntro}
              </p>
              {[
                { id: "alpha", label: copy.alphaLabel, hint: copy.alphaHint, min: 0.01, max: 0.2, step: 0.01, value: params.alpha, key: "alpha" as const },
                { id: "null-mean", label: copy.nullMeanLabel, hint: copy.nullMeanHint, min: -2, max: 2, step: 0.1, value: params.nullMean, key: "nullMean" as const },
                { id: "true-mean", label: copy.trueMeanLabel, hint: copy.trueMeanHint, min: 0, max: 3, step: 0.1, value: params.trueMean, key: "trueMean" as const },
                { id: "std-dev", label: copy.stdDevLabel, hint: copy.stdDevHint, min: 0.1, max: 2, step: 0.1, value: params.stdDev, key: "stdDev" as const },
              ].map((slider) => (
                <div className="control-panel__slider" key={slider.id}>
                  <div className="control-panel__label-row">
                    <label className="control-panel__label" htmlFor={slider.id}>
                      {slider.label}
                    </label>
                    <span className="control-panel__value">{formatNumber(slider.value, 2)}</span>
                  </div>
                  <p className="control-panel__hint">{slider.hint}</p>
                  <input
                    className="control-panel__input"
                    type="range"
                    id={slider.id}
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={slider.value}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, [slider.key]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="teaching-panel">
            <p className="eyebrow">{copy.conceptKeyIdea}</p>
            <h2>{copy.twoKindsOfError}</h2>
            <p>{copy.twoKindsOfErrorBody}</p>
            <h3>{copy.alphaPowerTradeOff}</h3>
            <p>{getInterpretation()}</p>
            <p>{getStrategyTip()}</p>
          </div>
          <div className="teaching-panel">
            <p className="eyebrow">{copy.formula}</p>
            <div className="latex-formula">
              <div className="math-expression">
                <span>Power = 1 −</span>
                <span className="math-symbol">β</span>
              </div>
            </div>
            <p>
              {copy.currentTest
                .replace("{testType}", getTestTypeLabel())
                .replace("{criticalValue}", getCriticalValueLabel())}
            </p>
          </div>
          <div className="teaching-panel">
            <p className="eyebrow">{copy.howToReadThis}</p>
            <h3>{copy.currentHypotheses}</h3>
            <div className="concept-strip">
              <div className="concept-item">
                <span className="concept-name">H0</span>
                <span className="concept-value">{computed.hypothesisText.H0Text}</span>
              </div>
              <div className="concept-item">
                <span className="concept-name">H1</span>
                <span className="concept-value">{computed.hypothesisText.H1Text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
