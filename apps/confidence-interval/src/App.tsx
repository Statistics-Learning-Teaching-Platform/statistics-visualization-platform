import {
  type ExperimentTelemetrySnapshot,
  useExperimentTelemetryPublisher,
} from "@stats-viz/shared/ai/experimentTelemetry";
import { criticalValue } from "@stats-viz/shared/confidence-interval";
import { confidenceIntervalCopy, useLanguage } from "@stats-viz/shared/i18n";
import {
  ChartFrame,
  ExperimentMetricStrip,
  FormulaCard,
  localizedExperimentMetadata,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";
import { useMemo, useState } from "react";
import { ConfidenceIntervalChart } from "./ConfidenceIntervalChart";
import { ControlSidebar } from "./ControlSidebar";
import { useConfidenceIntervals } from "./useConfidenceIntervals";

const TELEMETRY_INTERVAL_LIMIT = 60;

export default function ConfidenceIntervalApp() {
  const language = useLanguage();
  const copy = confidenceIntervalCopy[language];
  const metadata = localizedExperimentMetadata("confidence-interval", language);
  const [collapsed, setCollapsed] = useState(false);

  const {
    sampleSize,
    populationMean,
    populationSD,
    confidenceLevel,
    sigmaKnown,
    samples,
    coverage,
    scales,
    setSampleSize,
    setPopulationMean,
    setPopulationSD,
    setConfidenceLevel,
    setSigmaKnown,
    addSamples,
    reset,
  } = useConfidenceIntervals();

  const sampleCount = samples.length;
  const averageWidth =
    sampleCount === 0 ? 0 : samples.reduce((sum, s) => sum + (s.upper - s.lower), 0) / sampleCount;
  const critValue = criticalValue(confidenceLevel, sampleSize, sigmaKnown);
  const metrics = useMemo(
    () => [
      {
        label: copy.observedCoverage,
        value: `${(coverage * 100).toFixed(1)}%`,
        note: copy.observedCoverageNote,
      },
      { label: copy.samplesDrawn, value: String(sampleCount), note: copy.samplesDrawnNote },
      {
        label: copy.averageIntervalWidth,
        value: averageWidth.toFixed(2),
        note: copy.averageIntervalWidthNote,
      },
      { label: copy.criticalMultiplier, value: critValue.toFixed(2), note: copy.zMultiplierNote },
    ],
    [copy, coverage, sampleCount, averageWidth, critValue],
  );

  const trueMeanLabel = copy.trueMean.replace("{mean}", populationMean.toFixed(1));
  const recentMeans = samples.slice(-3).map((sample) => sample.mean);
  const confidencePercent = Math.round(confidenceLevel * 100);
  const telemetrySnapshot = useMemo<ExperimentTelemetrySnapshot>(() => {
    const sentSamples = samples.slice(-TELEMETRY_INTERVAL_LIMIT);
    const sentCount = sentSamples.length;
    const truncatedCount = sampleCount - sentCount;
    const capturedCount = samples.reduce((count, sample) => count + Number(sample.contains), 0);
    const missedCount = sampleCount - capturedCount;
    const standardError = populationSD / Math.sqrt(sampleSize);
    const [domainStart, domainEnd] = scales.xScale.domain();
    const previewScope = `Accumulated interval data: original=${sampleCount}, sent=${sentCount}, truncated=${truncatedCount}. `;
    const previewOrder = sentCount
      ? `The table contains the most recent ${sentCount} intervals in chronological order; ${truncatedCount} earlier intervals are omitted.`
      : "No intervals have been generated, so the table contains no rows.";

    return {
      appId: "confidence-interval",
      updatedAt: Date.now(),
      experiment: {
        title: copy.title,
        description: copy.description,
        researchQuestion: metadata?.localizedQuestion,
        category: metadata?.localizedCategory,
        exampleTitle: copy.chartTitle,
        exampleDescription: copy.chartDescription,
        teachingPoints: [copy.whatIsBody, copy.coverageBody, copy.learningNoteBody],
      },
      parameters: [
        { id: "sample-size", label: copy.sampleSize, value: sampleSize },
        { id: "population-mean", label: copy.populationMean, value: populationMean },
        { id: "population-sd", label: copy.populationSD, value: populationSD },
        {
          id: "confidence-level",
          label: copy.confidenceLevel,
          value: confidenceLevel,
        },
        {
          id: "sigma-known",
          label: copy.sigmaAssumption,
          value: sigmaKnown ? copy.sigmaKnown : copy.sigmaUnknown,
        },
      ],
      outputs: {
        headline:
          sampleCount > 0
            ? `${capturedCount} of ${sampleCount} intervals captured μ=${populationMean}.`
            : "No repeated-sampling intervals have been generated yet.",
        narrative: [
          `Method=${sigmaKnown ? "z interval (population sigma known)" : "t interval (population sigma estimated)"}; target confidence=${confidencePercent}%.`,
          `SE based on the configured population spread is ${standardError.toFixed(6)}; critical multiplier=${critValue.toFixed(6)}.`,
          `Observed captures=${capturedCount}, misses=${missedCount}, observed coverage=${(coverage * 100).toFixed(3)}%, average width=${averageWidth.toFixed(6)}.`,
        ].join("\n"),
        metrics: [
          {
            label: copy.observedCoverage,
            value: `${(coverage * 100).toFixed(3)}%`,
            detail: `${capturedCount} captured; ${missedCount} missed; ${sampleCount} total intervals`,
          },
          { label: copy.samplesDrawn, value: String(sampleCount) },
          { label: copy.averageIntervalWidth, value: averageWidth.toFixed(6) },
          { label: copy.criticalMultiplier, value: critValue.toFixed(6) },
          { label: "Standard error", value: standardError.toFixed(6) },
        ],
        tables: [
          {
            title: `${copy.chartTitle} — original=${sampleCount}, sent=${sentCount}, truncated=${truncatedCount}`,
            columns: [
              "sample number",
              "sample mean",
              "lower",
              "upper",
              "width",
              "captures true mean",
            ],
            rows: sentSamples.map((sample, index) => [
              sampleCount - sentCount + index + 1,
              Number(sample.mean.toFixed(6)),
              Number(sample.lower.toFixed(6)),
              Number(sample.upper.toFixed(6)),
              Number((sample.upper - sample.lower).toFixed(6)),
              sample.contains ? "yes" : "no",
            ]),
          },
        ],
        chartTitle: copy.chartTitle,
        chartSummary: [
          `Repeated-interval chart with sampling-distribution curve; x-domain=[${domainStart.toFixed(6)}, ${domainEnd.toFixed(6)}].`,
          `The chart holds ${sampleCount} accumulated intervals but visibly renders only the most recent ${Math.min(sampleCount, 5)} interval rows; hidden chart rows=${Math.max(0, sampleCount - 5)}.`,
          `The true-mean reference is μ=${populationMean}; theoretical central ${confidencePercent}% band=[${(populationMean - critValue * standardError).toFixed(6)}, ${(populationMean + critValue * standardError).toFixed(6)}].`,
        ].join("\n"),
        rawSampleSummary: previewScope + previewOrder,
      },
    };
  }, [
    averageWidth,
    confidenceLevel,
    confidencePercent,
    copy,
    coverage,
    critValue,
    metadata,
    populationMean,
    populationSD,
    sampleCount,
    sampleSize,
    samples,
    scales.xScale,
    sigmaKnown,
  ]);
  useExperimentTelemetryPublisher(telemetrySnapshot);

  return (
    <VisualizationFrame
      moduleId="confidence-interval"
      content={
        <>
          <VisualizationHeader
            eyebrow={copy.coreVisualizer}
            title={copy.title}
            experimentNumber={metadata?.number}
            category={metadata?.localizedCategory}
            researchQuestion={metadata?.localizedQuestion}
          />
          <section className="ci-reference-stage" aria-label={copy.chartTitle}>
            <div className="output-heading ci-reference-heading">
              <div>
                <p className="eyebrow">{copy.modelOutput}</p>
                <h2>{copy.chartTitle}</h2>
                <p>{copy.chartDescription}</p>
              </div>
              <span className="sample-pill">
                {copy.samples.replace("{count}", String(sampleCount))}
              </span>
            </div>
            <div className="chart-legend ci-reference-legend">
              <span className="legend-item">
                <span className="legend-swatch legend-swatch--capture" />
                <span>{copy.capturesTrueMean}</span>
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-swatch--miss" />
                <span>{copy.missesTrueMean}</span>
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-swatch--true" />
                <span>{trueMeanLabel}</span>
              </span>
            </div>
            <ChartFrame className="ci-reference-chart-frame">
              <ConfidenceIntervalChart
                samples={samples}
                scales={scales}
                trueMean={populationMean}
                populationSD={populationSD}
                sampleSize={sampleSize}
                confidenceLevel={confidenceLevel}
                criticalMultiplier={critValue}
                trueMeanLabel={trueMeanLabel}
                populationScaleLabel={copy.populationScale}
                sampleIndexLabel={
                  language === "zh" ? "最近生成的区间" : "Latest generated intervals"
                }
                emptyPrompt={copy.emptyInterpretation}
                chartDescription={copy.chartAriaDescription}
                sampleTooltip={(sampleNumber, lower, upper, contains) =>
                  copy.sampleTooltip
                    .replace("{number}", String(sampleNumber))
                    .replace("{lower}", lower.toFixed(3))
                    .replace("{upper}", upper.toFixed(3))
                    .replace("{coverage}", contains ? copy.tooltipCovers : copy.tooltipMisses)
                }
              />
            </ChartFrame>
            <ExperimentMetricStrip
              metrics={metrics.map((metric, index) => ({
                ...metric,
                key: String(index),
                semantics: index === 0 ? "derived" : "comparison",
              }))}
              ariaLabel={copy.modelOutput}
            />
            <div className="ci-reference-explanation-grid">
              <section className="teaching-panel ci-reference-explanation">
                <p className="eyebrow">{copy.howToReadThis}</p>
                <ul className="ci-reference-notes">
                  <li>
                    <strong>x̄</strong>
                    <span>{copy.whatIsBody}</span>
                  </li>
                  <li>
                    <strong>SE(x̄) = σ / √n</strong>
                    <span>{copy.learningNoteBody}</span>
                  </li>
                  <li>
                    <strong>{confidencePercent}%</strong>
                    <span>{copy.coverageBody}</span>
                  </li>
                </ul>
              </section>
              <FormulaCard
                eyebrow={copy.formula}
                formula={
                  <div className="math-expression">
                    <span>{copy.estimate}</span>
                    <span className="math-symbol">±</span>
                    <span>{copy.criticalValue}</span>
                    <span className="math-symbol">×</span>
                    <span>{copy.se}</span>
                  </div>
                }
              >
                <p>
                  {copy.formulaNote
                    .replace("{zValue}", critValue.toFixed(2))
                    .replace("{populationMean}", populationMean.toFixed(1))}
                </p>
              </FormulaCard>
            </div>
          </section>
        </>
      }
      sidebar={
        <nav
          className="ci-reference-rail"
          aria-label={language === "zh" ? "置信区间参数" : "Confidence interval parameters"}
        >
          <ControlSidebar
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            copy={copy}
            sampleSize={sampleSize}
            populationSD={populationSD}
            populationMean={populationMean}
            confidenceLevel={confidenceLevel}
            sigmaKnown={sigmaKnown}
            recentMeans={recentMeans}
            recentMeansTitle={language === "zh" ? "最近 3 个样本均值" : "Latest 3 sample means"}
            recentMeanLabel={language === "zh" ? "样本均值 {index}" : "Sample mean {index}"}
            onSampleSize={setSampleSize}
            onPopulationSD={setPopulationSD}
            onPopulationMean={setPopulationMean}
            onConfidenceLevel={setConfidenceLevel}
            onSigmaKnown={setSigmaKnown}
          />
          <div className="studio-control-bar studio-control-bar--side ci-reference-actions">
            <div className="studio-control-bar__buttons">
              <button
                id="generateSample"
                type="button"
                className="studio-button studio-button--primary"
                onClick={() => addSamples(1)}
              >
                <span className="studio-button__icon" aria-hidden="true">
                  +
                </span>
                <span>{copy.generateOne}</span>
              </button>
              <button
                id="generateMultiple"
                type="button"
                className="studio-button studio-button--secondary"
                onClick={() => addSamples(20)}
              >
                <span className="studio-button__icon" aria-hidden="true">
                  ⋯
                </span>
                <span>{copy.generateTwenty}</span>
              </button>
              <button
                id="reset"
                type="button"
                className="studio-button studio-button--danger"
                onClick={reset}
              >
                <span className="studio-button__icon" aria-hidden="true">
                  ↺
                </span>
                <span>{copy.reset}</span>
              </button>
            </div>
            <span className="studio-control-bar__hint">{copy.controlHint}</span>
          </div>
        </nav>
      }
    />
  );
}
