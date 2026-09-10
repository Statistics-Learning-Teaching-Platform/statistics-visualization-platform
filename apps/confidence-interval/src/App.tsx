import { useMemo, useState } from "react";
import { useLanguage, confidenceIntervalCopy } from "@stats-viz/shared/i18n";
import { criticalValue } from "@stats-viz/shared/confidence-interval";
import {
  ChartFrame,
  ExperimentMetricStrip,
  FormulaCard,
  localizedExperimentMetadata,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";

import { useConfidenceIntervals } from "./useConfidenceIntervals";
import { ConfidenceIntervalChart } from "./ConfidenceIntervalChart";
import { ControlSidebar } from "./ControlSidebar";

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
    sampleCount === 0
      ? 0
      : samples.reduce((sum, s) => sum + (s.upper - s.lower), 0) / sampleCount;
  const critValue = criticalValue(confidenceLevel, sampleSize, sigmaKnown);
  const metrics = useMemo(
    () => [
      { label: copy.observedCoverage, value: `${(coverage * 100).toFixed(1)}%`, note: copy.observedCoverageNote },
      { label: copy.samplesDrawn, value: String(sampleCount), note: copy.samplesDrawnNote },
      { label: copy.averageIntervalWidth, value: averageWidth.toFixed(2), note: copy.averageIntervalWidthNote },
      { label: copy.criticalMultiplier, value: critValue.toFixed(2), note: copy.zMultiplierNote },
    ],
    [copy, coverage, sampleCount, averageWidth, critValue],
  );

  const trueMeanLabel = copy.trueMean.replace("{mean}", populationMean.toFixed(1));
  const recentMeans = samples.slice(-3).map((sample) => sample.mean);
  const confidencePercent = Math.round(confidenceLevel * 100);

  return (
    <VisualizationFrame
      moduleId="confidence-interval"
      content={
        <>
          <VisualizationHeader eyebrow={copy.coreVisualizer} title={copy.title} experimentNumber={metadata?.number} category={metadata?.localizedCategory} researchQuestion={metadata?.localizedQuestion} />
          <section className="ci-reference-stage" aria-label={copy.chartTitle}>
              <ExperimentMetricStrip metrics={metrics.map((metric, index) => ({ ...metric, key: String(index), semantics: index === 0 ? "derived" : "comparison" }))} ariaLabel={copy.modelOutput} />
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
                  sampleIndexLabel={language === "zh" ? "最近生成的区间" : "Latest generated intervals"}
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
              <div className="ci-reference-explanation-grid">
                <section className="teaching-panel ci-reference-explanation">
                  <p className="eyebrow">{copy.howToReadThis}</p>
                  <ul className="ci-reference-notes">
                    <li><strong>x̄</strong><span>{copy.whatIsBody}</span></li>
                    <li><strong>SE(x̄) = σ / √n</strong><span>{copy.learningNoteBody}</span></li>
                    <li><strong>{confidencePercent}%</strong><span>{copy.coverageBody}</span></li>
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
                  <p>{copy.formulaNote.replace("{zValue}", critValue.toFixed(2)).replace("{populationMean}", populationMean.toFixed(1))}</p>
                </FormulaCard>
              </div>
          </section>
        </>
      }
      sidebar={
        <div className="ci-reference-rail" aria-label={language === "zh" ? "置信区间参数" : "Confidence interval parameters"}>
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
                <span className="studio-button__icon" aria-hidden="true">+</span>
                <span>{copy.generateOne}</span>
              </button>
              <button
                id="generateMultiple"
                type="button"
                className="studio-button studio-button--secondary"
                onClick={() => addSamples(20)}
              >
                <span className="studio-button__icon" aria-hidden="true">⋯</span>
                <span>{copy.generateTwenty}</span>
              </button>
              <button
                id="reset"
                type="button"
                className="studio-button studio-button--danger"
                onClick={reset}
              >
                <span className="studio-button__icon" aria-hidden="true">↺</span>
                <span>{copy.reset}</span>
              </button>
            </div>
            <span className="studio-control-bar__hint">{copy.controlHint}</span>
          </div>
        </div>
      }
    />
  );
}
