import {
  type ExperimentTelemetrySnapshot,
  useExperimentTelemetryPublisher,
} from "@stats-viz/shared/ai/experimentTelemetry";
import {
  type ChartLayout,
  createLinearScales,
  innerHeight,
  innerWidth,
} from "@stats-viz/shared/chart-utils";
import { formatNumber } from "@stats-viz/shared/format";
import { typeErrorCopy, useLanguage } from "@stats-viz/shared/i18n";
import { normalCdf, normalInv, normalPdf } from "@stats-viz/shared/math";
import {
  ChartFrame,
  ExperimentMetricStrip,
  FormulaCard,
  localizedExperimentMetadata,
  ParameterPanel,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";
import { axisBottom, axisLeft, area as d3Area, line, range, select } from "d3";
import { useMemo, useState } from "react";

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

const TELEMETRY_DISTRIBUTION_POINT_LIMIT = 25;

function evenlySpacedIndices(total: number, limit: number): number[] {
  const sent = Math.min(total, limit);
  if (sent <= 0) return [];
  if (sent === 1) return [0];
  return Array.from({ length: sent }, (_, index) => Math.round((index * (total - 1)) / (sent - 1)));
}

function generateDistribution(
  mean: number,
  stdDev: number,
  domain: [number, number],
): DistributionPoint[] {
  const step = (domain[1] - domain[0]) / 320;
  return range(domain[0], domain[1] + step / 2, step).map((x) => ({
    x,
    y: normalPdf(x, mean, stdDev),
  }));
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

function criticalAreaFn(testType: TestType): (d: DistributionPoint, c: number[]) => boolean {
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

export function resolveTestType(
  mode: "one-tailed" | "two-tailed",
  nullMean: number,
  trueMean: number,
): TestType {
  if (mode === "two-tailed") return "two-tailed";
  return trueMean < nullMean ? "left-tailed" : "right-tailed";
}

export function computeChartDomain(
  nullMean: number,
  trueMean: number,
  stdDev: number,
  criticalValues: number[],
): [number, number] {
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
    .y1((d) =>
      scales.yScale(
        invert ? (filterFn(d, criticalValue) ? 0 : d.y) : filterFn(d, criticalValue) ? d.y : 0,
      ),
    );
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
    const cv = computeCriticalValues(
      params.alpha,
      params.nullMean,
      standardError,
      effectiveTestType,
    );
    const xDomain = computeChartDomain(params.nullMean, params.trueMean, standardError, cv);
    const yMax = normalPdf(params.nullMean, params.nullMean, standardError) * 1.12;
    const scales = createScales(xDomain, yMax);
    const nullDistribution = generateDistribution(params.nullMean, standardError, xDomain);
    const trueDistribution = generateDistribution(params.trueMean, standardError, xDomain);
    const filterFn = criticalAreaFn(effectiveTestType);
    const typeTwoErrorRate = computeTypeTwoErrorRate(
      cv,
      params.trueMean,
      standardError,
      effectiveTestType,
    );
    const pValue = computePValue(
      params.observedStatistic,
      params.nullMean,
      standardError,
      effectiveTestType,
    );
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
    {
      kind: "dash",
      className: "chart-inline-legend__line--critical",
      label: copy.criticalBoundary,
    },
    { kind: "area", className: "chart-inline-legend__area--type1", label: copy.typeIErrorArea },
    { kind: "area", className: "chart-inline-legend__area--type2", label: copy.typeIIErrorArea },
    {
      kind: "dash",
      className: "chart-inline-legend__line--observed",
      label: copy.observedStatistic,
    },
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

  const telemetrySnapshot = useMemo<ExperimentTelemetrySnapshot>(() => {
    const pairedPointCount = Math.min(nullDistribution.length, trueDistribution.length);
    const sentIndices = evenlySpacedIndices(pairedPointCount, TELEMETRY_DISTRIBUTION_POINT_LIMIT);
    const sentCount = sentIndices.length;
    const truncatedCount = pairedPointCount - sentCount;
    const [domainStart, domainEnd] = scales.xScale.domain();
    const criticalValuesText = criticalValue.map((value) => value.toFixed(8)).join(", ");
    const testTypeLabel = getTestTypeLabel();
    const decision = computed.rejectsNull ? copy.rejectNull : copy.failToRejectNull;

    return {
      appId: "type-error",
      updatedAt: Date.now(),
      experiment: {
        title: copy.title,
        description: copy.description,
        researchQuestion: metadata?.localizedQuestion,
        category: metadata?.localizedCategory,
        exampleTitle: copy.chartTitle,
        exampleDescription: copy.chartDescription,
        teachingPoints: [copy.twoKindsOfErrorBody, copy.pValueWarning, getInterpretation()],
      },
      parameters: [
        { id: "test-type", label: copy.hypothesis, value: testTypeLabel },
        { id: "alpha", label: copy.alphaLabel, value: params.alpha },
        { id: "null-mean", label: copy.nullMeanLabel, value: params.nullMean },
        { id: "true-mean", label: copy.trueMeanLabel, value: params.trueMean },
        { id: "standard-deviation", label: copy.stdDevLabel, value: params.stdDev },
        { id: "sample-size", label: copy.sampleSizeLabel, value: params.sampleSize },
        {
          id: "observed-statistic",
          label: copy.observedStatistic,
          value: params.observedStatistic,
        },
      ],
      outputs: {
        headline: `${decision}: p=${computed.pValue.toFixed(8)} and α=${params.alpha.toFixed(8)}.`,
        narrative: [
          `${computed.hypothesisText.H0Text}; ${computed.hypothesisText.H1Text}; test=${testTypeLabel}.`,
          `Sampling standard error=${(params.stdDev / Math.sqrt(params.sampleSize)).toFixed(8)}; critical boundary/boundaries=${criticalValuesText}.`,
          `Type I error α=${computed.typeOneErrorRate.toFixed(8)}; Type II error β=${computed.typeTwoErrorRate.toFixed(8)}; power=${computed.power.toFixed(8)}; effect-size distance=${computed.effectSize.toFixed(8)}.`,
          `Observed statistic=${params.observedStatistic.toFixed(8)}; p=${computed.pValue.toFixed(8)}; decision=${decision}.`,
          getStrategyTip(),
        ].join("\n"),
        metrics: [
          {
            label: copy.alpha,
            value: computed.typeOneErrorRate.toFixed(8),
            detail: formatRate(computed.typeOneErrorRate),
          },
          {
            label: copy.betaLabel,
            value: computed.typeTwoErrorRate.toFixed(8),
            detail: formatRate(computed.typeTwoErrorRate),
          },
          {
            label: copy.power,
            value: computed.power.toFixed(8),
            detail: formatRate(computed.power),
          },
          { label: copy.effectSize, value: computed.effectSize.toFixed(8) },
          { label: copy.pValue, value: computed.pValue.toFixed(8) },
          { label: copy.testDecision, value: decision, detail: copy.decisionNote },
          {
            label: "Standard error",
            value: (params.stdDev / Math.sqrt(params.sampleSize)).toFixed(8),
          },
          {
            label: copy.criticalBoundary,
            value: criticalValuesText,
            detail: `${criticalValue.length} boundary value(s) for ${testTypeLabel}`,
          },
        ],
        tables: [
          {
            title: `Representative density coordinates — original paired points=${pairedPointCount} (null curve original=${nullDistribution.length}, true curve original=${trueDistribution.length}), sent=${sentCount}, truncated=${truncatedCount}`,
            columns: [
              "curve point index",
              copy.testStatistic,
              copy.nullDistribution,
              copy.trueDistribution,
              copy.typeIErrorArea,
              copy.typeIIErrorArea,
            ],
            rows: sentIndices.map((pointIndex) => {
              const nullPoint = nullDistribution[pointIndex];
              const truePoint = trueDistribution[pointIndex];
              const inRejectionRegion = computed.criticalAreaFn(nullPoint, criticalValue);
              return [
                pointIndex + 1,
                Number(nullPoint.x.toFixed(8)),
                Number(nullPoint.y.toFixed(8)),
                Number(truePoint.y.toFixed(8)),
                inRejectionRegion ? "yes" : "no",
                inRejectionRegion ? "no" : "yes",
              ];
            }),
          },
        ],
        chartTitle: copy.chartTitle,
        chartSummary: [
          `Overlapping normal sampling distributions across x-domain=[${domainStart.toFixed(8)}, ${domainEnd.toFixed(8)}].`,
          `Null curve center=${params.nullMean}, true curve center=${params.trueMean}, shared standard error=${(params.stdDev / Math.sqrt(params.sampleSize)).toFixed(8)}.`,
          `Critical boundary/boundaries=${criticalValuesText}; rejection tail configuration=${testTypeLabel}; observed-statistic marker=${params.observedStatistic}.`,
          `The rendered chart uses all null points=${nullDistribution.length} and all true points=${trueDistribution.length}; the telemetry table is only a bounded coordinate preview.`,
        ].join("\n"),
        rawSampleSummary: `Paired distribution-coordinate rows: original=${pairedPointCount}, sent=${sentCount}, truncated=${truncatedCount}. Sent rows are evenly spaced across the full x-domain, including both endpoints; they are not consecutive raw observations. Null curve original=${nullDistribution.length}; true curve original=${trueDistribution.length}.`,
      },
    };
  }, [
    computed,
    copy,
    criticalValue,
    metadata,
    nullDistribution,
    params,
    scales.xScale,
    testType,
    trueDistribution,
  ]);
  useExperimentTelemetryPublisher(telemetrySnapshot);

  return (
    <VisualizationFrame
      moduleId="type-error"
      content={
        <>
          <VisualizationHeader
            eyebrow={copy.coreVisualizer}
            title={copy.title}
            description={copy.description}
            experimentNumber={metadata?.number}
            category={metadata?.localizedCategory}
            researchQuestion={metadata?.localizedQuestion}
          />
          <div className="output-dock">
            <ExperimentMetricStrip
              ariaLabel={copy.modelOutput}
              metrics={[
                {
                  key: "alpha",
                  label: copy.alpha,
                  value: formatRate(computed.typeOneErrorRate),
                  note: copy.alphaNote,
                  semantics: "input" as const,
                },
                {
                  key: "beta",
                  label: copy.betaLabel,
                  value: formatRate(computed.typeTwoErrorRate),
                  note: copy.betaNote,
                },
                {
                  key: "power",
                  label: copy.power,
                  value: formatRate(computed.power),
                  note: copy.powerNote,
                },
                {
                  key: "p-value",
                  label: copy.pValue,
                  value: formatNumber(computed.pValue, 4),
                  note: copy.pValueNote,
                },
                {
                  key: "decision",
                  label: copy.testDecision,
                  value: computed.rejectsNull ? copy.rejectNull : copy.failToRejectNull,
                  note: copy.decisionNote,
                  semantics: "decision" as const,
                },
              ]}
            />
            <ChartFrame>
              <svg
                width={CHART_LAYOUT.width}
                height={CHART_LAYOUT.height}
                viewBox={`0 0 ${CHART_LAYOUT.width} ${CHART_LAYOUT.height}`}
                role="img"
                aria-label={`${copy.chartTitle}: ${computed.hypothesisText.H0Text}; ${computed.hypothesisText.H1Text}`}
              >
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
                  <g
                    transform={`translate(0, ${plotHeight})`}
                    ref={(g) => {
                      if (g) select(g).call(axisBottom(scales.xScale).ticks(6));
                    }}
                  />
                  <g
                    ref={(g) => {
                      if (g) select(g).call(axisLeft(scales.yScale).ticks(6));
                    }}
                  />
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
              <p className="control-panel__intro">{copy.controlIntro}</p>
              {[
                {
                  id: "alpha",
                  label: copy.alphaLabel,
                  hint: copy.alphaHint,
                  min: 0.01,
                  max: 0.2,
                  step: 0.01,
                  value: params.alpha,
                  key: "alpha" as const,
                },
                {
                  id: "null-mean",
                  label: copy.nullMeanLabel,
                  hint: copy.nullMeanHint,
                  min: -2,
                  max: 2,
                  step: 0.1,
                  value: params.nullMean,
                  key: "nullMean" as const,
                },
                {
                  id: "true-mean",
                  label: copy.trueMeanLabel,
                  hint: copy.trueMeanHint,
                  min: -3,
                  max: 3,
                  step: 0.1,
                  value: params.trueMean,
                  key: "trueMean" as const,
                },
                {
                  id: "std-dev",
                  label: copy.stdDevLabel,
                  hint: copy.stdDevHint,
                  min: 0.1,
                  max: 2,
                  step: 0.1,
                  value: params.stdDev,
                  key: "stdDev" as const,
                },
                {
                  id: "sample-size",
                  label: copy.sampleSizeLabel,
                  hint: copy.sampleSizeHint,
                  min: 2,
                  max: 200,
                  step: 1,
                  value: params.sampleSize,
                  key: "sampleSize" as const,
                },
                {
                  id: "observed-statistic",
                  label: copy.observedStatistic,
                  hint: copy.observedStatisticHint,
                  min: -4,
                  max: 6,
                  step: 0.05,
                  value: params.observedStatistic,
                  key: "observedStatistic" as const,
                },
              ].map((slider) => (
                <div className="control-panel__slider" key={slider.id}>
                  <div className="control-panel__label-row">
                    <label className="control-panel__label" htmlFor={slider.id}>
                      {slider.label}
                    </label>
                    <input
                      className="control-number-input"
                      aria-label={`${slider.label} numeric value`}
                      type="number"
                      id={`${slider.id}-numeric`}
                      min={slider.min}
                      max={slider.max}
                      step={slider.step}
                      value={slider.value}
                      onChange={(e) =>
                        setParams((p) => ({ ...p, [slider.key]: Number(e.target.value) }))
                      }
                    />
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
