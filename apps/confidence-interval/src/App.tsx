import { useMemo, useState } from "react";
import { useLanguage, confidenceIntervalCopy } from "@stats-viz/shared/i18n";
import { criticalValue } from "@stats-viz/shared/confidence-interval";
import {
  ChartFrame,
  FormulaCard,
  MetricGrid,
  ObservationCard,
  ReadingGuide,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";

import { defaultConfig } from "./constants";
import { useConfidenceIntervals } from "./useConfidenceIntervals";
import { ConfidenceIntervalChart } from "./ConfidenceIntervalChart";
import { ControlSidebar } from "./ControlSidebar";

export default function ConfidenceIntervalApp() {
  const language = useLanguage();
  const copy = confidenceIntervalCopy[language];
  const [collapsed, setCollapsed] = useState(false);

  const {
    sampleSize,
    populationSD,
    confidenceLevel,
    sigmaKnown,
    samples,
    coverage,
    scales,
    setSampleSize,
    setPopulationSD,
    setConfidenceLevel,
    setSigmaKnown,
    addSamples,
    reset,
  } = useConfidenceIntervals();

  const sampleCount = samples.length;
  const misses = sampleCount - samples.filter((s) => s.contains).length;
  const averageWidth =
    sampleCount === 0
      ? 0
      : samples.reduce((sum, s) => sum + (s.upper - s.lower), 0) / sampleCount;
  const critValue = criticalValue(confidenceLevel, sampleSize, sigmaKnown);
  const interpretation =
    sampleCount === 0
      ? copy.emptyInterpretation
      : coverage >= confidenceLevel
        ? copy.healthyInterpretation
        : copy.lowCoverageInterpretation;

  const metrics = useMemo(
    () => [
      { label: copy.observedCoverage, value: `${(coverage * 100).toFixed(1)}%`, note: copy.observedCoverageNote },
      { label: copy.samplesDrawn, value: String(sampleCount), note: copy.samplesDrawnNote },
      { label: copy.averageIntervalWidth, value: averageWidth.toFixed(2), note: copy.averageIntervalWidthNote },
      { label: copy.criticalMultiplier, value: critValue.toFixed(2), note: copy.zMultiplierNote },
    ],
    [copy, coverage, sampleCount, averageWidth, critValue],
  );

  const trueMeanLabel = copy.trueMean.replace("{mean}", String(defaultConfig.populationMean));

  return (
    <VisualizationFrame
      content={
        <>
          <VisualizationHeader eyebrow={copy.coreVisualizer} title={copy.title} description={copy.kicker}>
            <p className="module-description">{copy.description}</p>
          </VisualizationHeader>
          <div className="output-dock">
            <div className="output-heading">
              <div>
                <p className="eyebrow">{copy.modelOutput}</p>
                <h2>{copy.chartTitle}</h2>
                <p>{copy.chartDescription}</p>
              </div>
              <span className="sample-pill">{copy.samples.replace("{count}", String(sampleCount))}</span>
            </div>
            <div className="chart-legend">
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
            <ReadingGuide title={copy.coverageTitle}>
              <p>{sampleCount === 0 ? copy.emptyPrompt : copy.missPrompt.replace("{misses}", String(misses))}</p>
            </ReadingGuide>
            <MetricGrid metrics={metrics} ariaLabel={copy.modelOutput} />
            <ChartFrame>
              <ConfidenceIntervalChart
                samples={samples}
                scales={scales}
                trueMeanLabel={trueMeanLabel}
                populationScaleLabel={copy.populationScale}
                sampleIndexLabel={copy.sampleIndex}
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
          </div>
        </>
      }
      sidebar={
        <>
          <ControlSidebar
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            copy={copy}
            sampleSize={sampleSize}
            populationSD={populationSD}
            confidenceLevel={confidenceLevel}
            sigmaKnown={sigmaKnown}
            onSampleSize={setSampleSize}
            onPopulationSD={setPopulationSD}
            onConfidenceLevel={setConfidenceLevel}
            onSigmaKnown={setSigmaKnown}
          />
          <div className="studio-control-bar studio-control-bar--side">
            <div className="studio-control-bar__buttons">
              <button
                id="generateSample"
                type="button"
                className="studio-button studio-button--primary"
                onClick={() => addSamples(1)}
              >
                <span className="studio-button__icon">+</span>
                <span>{copy.generateOne}</span>
              </button>
              <button
                id="generateMultiple"
                type="button"
                className="studio-button studio-button--secondary"
                onClick={() => addSamples(20)}
              >
                <span className="studio-button__icon">⋯</span>
                <span>{copy.generateTwenty}</span>
              </button>
              <button
                id="reset"
                type="button"
                className="studio-button studio-button--danger"
                onClick={reset}
              >
                <span className="studio-button__icon">↺</span>
                <span>{copy.reset}</span>
              </button>
            </div>
            <span className="studio-control-bar__hint">{copy.controlHint}</span>
          </div>
          <div className="teaching-panel">
            <p className="eyebrow">{copy.conceptKeyIdea}</p>
            <div className="concept-block">
              <span className="concept-icon">◎</span>
              <div>
                <h2>{copy.whatIsTitle}</h2>
                <p>{copy.whatIsBody}</p>
              </div>
            </div>
            <div className="concept-divider" />
            <div className="concept-block">
              <span className="concept-icon">▥</span>
              <div>
                <h3>{copy.coverageTitle}</h3>
                <p>{copy.coverageBody}</p>
              </div>
            </div>
          </div>
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
            <p>{copy.formulaNote.replace("{zValue}", critValue.toFixed(2)).replace("{populationMean}", defaultConfig.populationMean.toFixed(1))}</p>
          </FormulaCard>
          <ObservationCard eyebrow={copy.howToReadThis} title={copy.currentInterpretation}>
            <p>{interpretation}</p>
            <p>{sampleCount === 0 ? copy.emptyPrompt : copy.missPrompt.replace("{misses}", String(misses))}</p>
          </ObservationCard>
          <div className="teaching-panel learning-note">
            <p className="eyebrow">{copy.learningNote}</p>
            <p>{copy.learningNoteBody}</p>
          </div>
        </>
      }
    />
  );
}
