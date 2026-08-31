import { useMemo, useState } from "react";
import { range, select, axisBottom, axisLeft, line, area as d3Area } from "d3";
import { typeErrorCopy, useLanguage } from "@stats-viz/shared/i18n";
import { normalCdf, normalInv, normalPdf } from "@stats-viz/shared/math";
import {
  createLinearScales,
  innerHeight,
  innerWidth,
  type ChartLayout,
} from "@stats-viz/shared/chart-utils";
import { formatNumber } from "@stats-viz/shared/format";
import {
  ChartFrame,
  ExperimentMetricStrip,
  FormulaCard,
  localizedExperimentMetadata,
  ParameterPanel,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";

type TestType = "left-tailed" | "right-tailed" | "two-tailed";

interface Params {
  alpha: number;
  nullMean: number;
  trueMean: number;
  stdDev: number;
  sampleSize: number;
  observedStatistic: number;
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

function generateDistribution(mean: number, stdDev: number, domain: [number, number]): DistributionPoint[] {
  const step = (domain[1] - domain[0]) / 320;
  return range(domain[0], domain[1] + step / 2, step).map((x) => ({ x, y: normalPdf(x, mean, stdDev) }));
}

function createScales(xDomain: [number, number], yMax: number) {
  return createLinearScales(CHART_LAYOUT, xDomain, [0, yMax]);
}

export function computeCriticalValues(
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

export function computeTypeTwoErrorRate(
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

export function resolveTestType(mode: "one-tailed" | "two-tailed", nullMean: number, trueMean: number): TestType {
  if (mode === "two-tailed") return "two-tailed";
  return trueMean < nullMean ? "left-tailed" : "right-tailed";
}

export function computeChartDomain(nullMean: number, trueMean: number, stdDev: number, criticalValues: number[]): [number, number] {
  const padding = 4.5 * stdDev;
  return [
    Math.min(nullMean - padding, trueMean - padding, ...criticalValues) - stdDev * 0.15,
    Math.max(nullMean + padding, trueMean + padding, ...criticalValues) + stdDev * 0.15,
  ];
}

export function computePValue(
  observedStatistic: number,
  nullMean: number,
  stdDev: number,
  testType: TestType,
): number {
  const lowerTail = normalCdf(observedStatistic, nullMean, stdDev);
  if (testType === "left-tailed") return Math.max(0, Math.min(1, lowerTail));
  if (testType === "right-tailed") return Math.max(0, Math.min(1, 1 - lowerTail));
  return Math.min(1, 2 * Math.min(lowerTail, 1 - lowerTail));
}

function buildAreaPath(
  data: DistributionPoint[],
  criticalValue: number[],
  filterFn: (d: DistributionPoint, c: number[]) => boolean,
  scales: ReturnType<typeof createScales>,
  invert: boolean,
): string {
  const areaGen = d3Area<DistributionPoint>()
    .x((d) => scales.xScale(d.x))
    .y0(scales.yScale(0))
    .y1((d) => scales.yScale(invert
      ? (filterFn(d, criticalValue) ? 0 : d.y)
      : (filterFn(d, criticalValue) ? d.y : 0)));
  return areaGen(data) ?? "";
}

export default function TypeErrorApp() {
  const language = useLanguage();
  const copy = typeErrorCopy[language];
  const metadata = localizedExperimentMetadata("type-error", language);
  const [testType, setTestType] = useState<TestType>("right-tailed");
  const [params, setParams] = useState<Params>({
    alpha: 0.05,
    nullMean: 0,
    trueMean: 1,
    stdDev: 1,
    sampleSize: 20,
    observedStatistic: 1.65,
  });

  const computed = useMemo(() => {
    // The observed statistic is a sample mean, so its null distribution uses
    // the standard error σ/√n rather than the population σ. The UI exposes
    // left and right tails explicitly, so preserve the learner's selected
    // direction; `resolveTestType` remains available for callers that present
    // a single direction-following one-tailed mode.
    const effectiveTestType = testType;
    const standardError = params.stdDev / Math.sqrt(params.sampleSize);
    const cv = computeCriticalValues(params.alpha, params.nullMean, standardError, effectiveTestType);
    const xDomain = computeChartDomain(params.nullMean, params.trueMean, standardError, cv);
    const yMax = normalPdf(params.nullMean, params.nullMean, standardError) * 1.12;
    const scales = createScales(xDomain, yMax);
    const nullDistribution = generateDistribution(params.nullMean, standardError, xDomain);
    const trueDistribution = generateDistribution(params.trueMean, standardError, xDomain);
    const filterFn = criticalAreaFn(effectiveTestType);
    const typeTwoErrorRate = computeTypeTwoErrorRate(cv, params.trueMean, standardError, effectiveTestType);
    const pValue = computePValue(params.observedStatistic, params.nullMean, standardError, effectiveTestType);
    return {
      scales,
      nullDistribution,
      trueDistribution,
      criticalValue: cv,
      criticalAreaFn: filterFn,
      hypothesisText: createHypothesisText(params.nullMean, effectiveTestType),
      typeOneErrorRate: params.alpha,
      typeTwoErrorRate,
      power: 1 - typeTwoErrorRate,
      effectSize: Math.abs(params.trueMean - params.nullMean),
      pValue,
      rejectsNull: pValue < params.alpha,
    };
  }, [params, testType]);

  const { scales, nullDistribution, trueDistribution, criticalValue } = computed;
  const plotWidth = innerWidth(CHART_LAYOUT);
  const plotHeight = innerHeight(CHART_LAYOUT);
  const plotTop = scales.yScale(scales.yScale.domain()[1]);

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
    { kind: "dash", className: "chart-inline-legend__line--observed", label: copy.observedStatistic },
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
    testType === "two-tailed"
      ? copy.twoSidedTest
      : testType === "left-tailed"
        ? copy.leftTailedTest
        : copy.rightTailedTest;

  const formatRate = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <VisualizationFrame
      moduleId="type-error"
      content={
        <>
          <VisualizationHeader eyebrow={copy.coreVisualizer} title={copy.title} description={copy.description} experimentNumber={metadata?.number} category={metadata?.localizedCategory} researchQuestion={metadata?.localizedQuestion} />
          <div className="output-dock">
            <div className="output-heading">
              <p className="eyebrow">{copy.modelOutput}</p>
              <h2>{copy.chartTitle}</h2>
              <p>{copy.chartDescription}</p>
            </div>
            <ExperimentMetricStrip
              ariaLabel={copy.modelOutput}
              metrics={[
                { key: "alpha", label: copy.alpha, value: formatRate(computed.typeOneErrorRate), note: copy.alphaNote, semantics: "input" as const },
                { key: "beta", label: copy.betaLabel, value: formatRate(computed.typeTwoErrorRate), note: copy.betaNote },
                { key: "power", label: copy.power, value: formatRate(computed.power), note: copy.powerNote },
                { key: "p-value", label: copy.pValue, value: formatNumber(computed.pValue, 4), note: copy.pValueNote },
                { key: "decision", label: copy.testDecision, value: computed.rejectsNull ? copy.rejectNull : copy.failToRejectNull, note: copy.decisionNote, semantics: "decision" as const },
              ]}
            />
            <ChartFrame>
              <svg width={CHART_LAYOUT.width} height={CHART_LAYOUT.height} viewBox={`0 0 ${CHART_LAYOUT.width} ${CHART_LAYOUT.height}`} role="img" aria-label={`${copy.chartTitle}: ${computed.hypothesisText.H0Text}; ${computed.hypothesisText.H1Text}`}>
                <g transform={`translate(${CHART_LAYOUT.margin.left}, ${CHART_LAYOUT.margin.top})`}>
                  <path d={nullPath} fill="none" stroke="var(--lab-purple)" strokeWidth={2} />
                  <path d={truePath} fill="none" stroke="var(--teal)" strokeWidth={2} />
                  <path d={type1AreaPath} fill="var(--lab-orange)" opacity={0.24} />
                  <path d={type2AreaPath} fill="var(--danger)" opacity={0.24} />
                  {criticalValue.map((cv, i) => (
                    <line
                      key={i}
                      x1={scales.xScale(cv)}
                      x2={scales.xScale(cv)}
                      y1={scales.yScale(0)}
                      y2={plotTop}
                      stroke="var(--lab-orange)"
                      strokeDasharray="5,5"
                    />
                  ))}
                  <line
                    x1={scales.xScale(params.observedStatistic)}
                    x2={scales.xScale(params.observedStatistic)}
                    y1={scales.yScale(0)}
                    y2={plotTop}
                    stroke="var(--lab-blue)"
                    strokeWidth={2}
                    strokeDasharray="3,4"
                  />
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
                      height={127}
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
            </ChartFrame>
          </div>
        </>
      }
      sidebar={
        <>
          <ParameterPanel eyebrow={copy.parameters}>
            <div className="test-type-tabs">
              <div className="test-type-tabs__label">{copy.hypothesis}</div>
              <div className="test-type-tabs__buttons">
                <button
                  type="button"
                  className="test-type-tab"
                  data-test-type="left-tailed"
                  data-active={String(testType === "left-tailed")}
                  onClick={() => setTestType("left-tailed")}
                >
                  {copy.leftTailed}
                </button>
                <button
                  type="button"
                  className="test-type-tab"
                  data-test-type="right-tailed"
                  data-active={String(testType === "right-tailed")}
                  onClick={() => setTestType("right-tailed")}
                >
                  {copy.rightTailed}
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
                { id: "true-mean", label: copy.trueMeanLabel, hint: copy.trueMeanHint, min: -3, max: 3, step: 0.1, value: params.trueMean, key: "trueMean" as const },
                { id: "std-dev", label: copy.stdDevLabel, hint: copy.stdDevHint, min: 0.1, max: 2, step: 0.1, value: params.stdDev, key: "stdDev" as const },
                { id: "sample-size", label: copy.sampleSizeLabel, hint: copy.sampleSizeHint, min: 2, max: 200, step: 1, value: params.sampleSize, key: "sampleSize" as const },
                { id: "observed-statistic", label: copy.observedStatistic, hint: copy.observedStatisticHint, min: -4, max: 6, step: 0.05, value: params.observedStatistic, key: "observedStatistic" as const },
              ].map((slider) => (
                <div className="control-panel__slider" key={slider.id}>
                  <div className="control-panel__label-row">
                    <label className="control-panel__label" htmlFor={slider.id}>
                      {slider.label}
                    </label>
                    <input className="control-number-input" aria-label={`${slider.label} numeric value`} type="number" id={`${slider.id}-numeric`} min={slider.min} max={slider.max} step={slider.step} value={slider.value} onChange={(e) => setParams((p) => ({ ...p, [slider.key]: Number(e.target.value) }))} />
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
          </ParameterPanel>
          <div className="teaching-panel">
            <p className="eyebrow">{copy.conceptKeyIdea}</p>
            <h2>{copy.twoKindsOfError}</h2>
            <p>{copy.twoKindsOfErrorBody}</p>
            <h3>{copy.alphaPowerTradeOff}</h3>
            <p>{getInterpretation()}</p>
            <p>{getStrategyTip()}</p>
          </div>
          <FormulaCard
            eyebrow={copy.formula}
            formula={
              <div className="math-expression">
                <span>{copy.power} = 1 −</span>
                <span className="math-symbol">β</span>
              </div>
            }
          >
            <p>
              {copy.currentTest
                .replace("{testType}", getTestTypeLabel())
                .replace("{criticalValue}", getCriticalValueLabel())}
            </p>
          </FormulaCard>
        </>
      }
    />
  );
}
