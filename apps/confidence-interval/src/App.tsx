import { useMemo, useState } from "react";
import { useLanguage, confidenceIntervalCopy } from "@stats-viz/shared/i18n";
import { criticalValue } from "@stats-viz/shared/confidence-interval";

import { defaultConfig } from "./constants";
import { useConfidenceIntervals } from "./useConfidenceIntervals";
import { ConfidenceIntervalChart } from "./ConfidenceIntervalChart";
import { MetricsGrid } from "./MetricsGrid";
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
    <div className="module-shell">
      <div className="module-layout">
        <div className="experiment-board">
          <div className="experiment-header">
            <div>
              <p className="eyebrow">{copy.coreVisualizer}</p>
              <h1>{copy.title}</h1>
              <p className="module-kicker">{copy.kicker}</p>
              <p className="module-description">{copy.description}</p>
            </div>
          </div>
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
            <div className="chart-frame">
              <ConfidenceIntervalChart
                samples={samples}
                scales={scales}
                trueMeanLabel={trueMeanLabel}
                populationScaleLabel={copy.populationScale}
                sampleIndexLabel={copy.sampleIndex}
              />
            </div>
          </div>
          <MetricsGrid metrics={metrics} />
        </div>
        <div className="teaching-area">
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
                className="studio-button studio-button--primary"
                onClick={() => addSamples(1)}
              >
                <span className="studio-button__icon">+</span>
                <span>{copy.generateOne}</span>
              </button>
              <button
                id="generateMultiple"
                className="studio-button studio-button--secondary"
                onClick={() => addSamples(20)}
              >
                <span className="studio-button__icon">⋯</span>
                <span>{copy.generateTwenty}</span>
              </button>
              <button
                id="reset"
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
          <div className="teaching-panel">
            <p className="eyebrow">{copy.formula}</p>
            <div className="latex-formula">
              <div className="math-expression">
                <span>{copy.estimate}</span>
                <span className="math-symbol">±</span>
                <span>{copy.criticalValue}</span>
                <span className="math-symbol">×</span>
                <span>{copy.se}</span>
              </div>
            </div>
            <p>{copy.formulaNote.replace("{zValue}", critValue.toFixed(2)).replace("{populationMean}", defaultConfig.populationMean.toFixed(1))}</p>
          </div>
          <div className="teaching-panel">
            <p className="eyebrow">{copy.howToReadThis}</p>
            <h3>{copy.currentInterpretation}</h3>
            <p>{interpretation}</p>
            <p>{sampleCount === 0 ? copy.emptyPrompt : copy.missPrompt.replace("{misses}", String(misses))}</p>
          </div>
          <div className="teaching-panel learning-note">
            <p className="eyebrow">{copy.learningNote}</p>
            <p>{copy.learningNoteBody}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
