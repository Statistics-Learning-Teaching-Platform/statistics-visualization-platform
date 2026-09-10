import { useEffect, useMemo, useState } from "react";
import { localizeText, regressionCopy, useLanguage } from "@stats-viz/shared/i18n";
import { linearRegression } from "@stats-viz/shared/math";
import { computeSSE } from "@stats-viz/shared/regression";
import { createLinearScales } from "@stats-viz/shared/chart-utils";
import {
  ChartFrame,
  ExperimentMetricStrip,
  FormulaCard,
  localizedExperimentMetadata,
  ObservationCard,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";

import { CHART_LAYOUT, type Point } from "./constants";
import { useDatasets } from "./useDatasets";
import {
  useCustomLine,
  getCustomLineParams,
  computeHoverInfo,
} from "./useCustomLine";
import { RegressionChart } from "./RegressionChart";
import { StatisticsPanel } from "./StatisticsPanel";
import { ControlPanel } from "./ControlPanel";

export default function RegressionApp() {
  const language = useLanguage();
  const copy = regressionCopy[language];
  const metadata = localizedExperimentMetadata("regression", language);
  const t = (text: string) => localizeText(text, language);

  const { datasets, initialId } = useDatasets();
  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [showRegression, setShowRegression] = useState(true);
  const [showOutliers, setShowOutliers] = useState(true);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // Sync selectedId once datasets load (initialId starts empty).
  useEffect(() => {
    if (selectedId === "" && initialId !== "") setSelectedId(initialId);
  }, [initialId, selectedId]);

  const selectedDataset = useMemo(
    () => datasets.find((d) => d.id === selectedId) ?? datasets[0],
    [datasets, selectedId],
  );

  const visibleData = useMemo(() => {
    if (!selectedDataset) return [];
    return showOutliers ? selectedDataset.data : selectedDataset.data.filter((p) => !p.outlier);
  }, [selectedDataset, showOutliers]);

  const domains = useMemo(() => {
    if (visibleData.length === 0) return { x: [0, 1] as [number, number], y: [0, 1] as [number, number] };
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of visibleData) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    const xPad = (xMax - xMin) * 0.1 || 1;
    const yPad = (yMax - yMin) * 0.1 || 1;
    return { x: [xMin - xPad, xMax + xPad] as [number, number], y: [yMin - yPad, yMax + yPad] as [number, number] };
  }, [visibleData]);

  const scalesRaw = useMemo(() => createLinearScales(CHART_LAYOUT, domains.x, domains.y), [domains]);
  const scales = useMemo(
    () => ({
      xScale: scalesRaw.xScale,
      yScale: scalesRaw.yScale,
      xScaleTicks: scalesRaw.xScale.ticks(6),
      yScaleTicks: scalesRaw.yScale.ticks(6),
    }),
    [scalesRaw],
  );

  const regression = useMemo(() => linearRegression(visibleData), [visibleData]);
  const correlation = Math.sign(regression.slope) * Math.sqrt(Math.max(0, regression.rSquared));

  const { customLine, tempLine, isDragging, handlers, clear, setNumericParams } = useCustomLine({
    scales: scalesRaw,
    chartLayoutMargin: CHART_LAYOUT.margin,
    resetDeps: [selectedId, showOutliers],
  });

  const customLineParams = useMemo(() => getCustomLineParams(customLine), [customLine]);

  const sse = useMemo(() => {
    if (customLineParams) {
      return { value: computeSSE(visibleData, customLineParams.slope, customLineParams.intercept), lineType: "custom" as const };
    }
    if (showRegression) {
      return { value: regression.sse, lineType: "regression" as const };
    }
    return { value: 0, lineType: null };
  }, [visibleData, showRegression, regression, customLineParams]);

  const hoverInfo = useMemo(
    () => computeHoverInfo(hoverPoint, showRegression, regression, customLineParams),
    [hoverPoint, showRegression, regression, customLineParams],
  );

  return (
    <VisualizationFrame
      moduleId="regression"
      content={
        <>
          <VisualizationHeader eyebrow={copy.coreVisualizer} title={copy.title} description={copy.description} experimentNumber={metadata?.number} category={metadata?.localizedCategory} researchQuestion={metadata?.localizedQuestion} />
          <div className="regression-workbench">
            <section className="regression-stage" aria-label={copy.chartTitle}>
              <ExperimentMetricStrip
                ariaLabel={copy.statistics}
                metrics={[
                  { key: "current-sse", label: copy.sse, value: sse.value.toFixed(3), semantics: "derived" as const },
                  { key: "ols-sse", label: language === "zh" ? "OLS SSE" : "OLS SSE", value: regression.sse.toFixed(3), semantics: "comparison" as const },
                  { key: "delta-sse", label: language === "zh" ? "SSE 差值" : "SSE delta", value: (sse.value - regression.sse).toFixed(3), semantics: "comparison" as const },
                  { key: "r", label: "r", value: correlation.toFixed(3), semantics: "derived" as const },
                  { key: "r2", label: "R²", value: regression.rSquared.toFixed(3), semantics: "derived" as const },
                ]}
              />

              <div className="regression-line-guide" role="list" aria-label={copy.lineType}>
                {showRegression && (
                  <span className="regression-line-guide__item" role="listitem">
                    <span className="regression-line-guide__swatch regression-line-guide__swatch--fit" aria-hidden="true" />
                    {copy.regressionLine}
                  </span>
                )}
                {customLineParams && (
                  <span className="regression-line-guide__item regression-line-guide__item--active" role="listitem">
                    <span className="regression-line-guide__swatch regression-line-guide__swatch--custom" aria-hidden="true" />
                    {copy.customLine}
                  </span>
                )}
              </div>

              <ChartFrame>
                <div className="chart-shell">
                  <RegressionChart
                    visibleData={visibleData}
                    domains={domains}
                    scales={scales}
                    showRegression={showRegression}
                    regression={regression}
                    customLineParams={customLineParams}
                    tempLine={tempLine}
                    isDragging={isDragging}
                    hoverInfo={hoverInfo}
                    xAxisLabel={t(selectedDataset?.xLabel || copy.explanatoryVariable)}
                    yAxisLabel={t(selectedDataset?.yLabel || copy.response)}
                    onPointerDown={handlers.handlePointerDown}
                    onPointerMove={handlers.handlePointerMove}
                    onPointerUp={handlers.handlePointerUp}
                    onHoverPoint={setHoverPoint}
                  />
                </div>
              </ChartFrame>
              <StatisticsPanel sse={sse} hoverInfo={hoverInfo} copy={copy} />
            </section>

            <section className="regression-learning-grid" aria-label={copy.teachingNotes}>
              <section className="teaching-panel regression-concept-card">
                <p className="eyebrow">{copy.conceptKeyIdea}</p>
                <h2>{copy.leastSquaresRegression}</h2>
                <p>{copy.regressionBody}</p>
                <h3>{copy.residualsExplainFit}</h3>
                <p>{copy.residualsBody}</p>
              </section>
              <FormulaCard
                eyebrow={copy.formula}
                formula={
                  <div className="math-expression">
                    <span>SSE =</span>
                    <span className="math-symbol">Σ</span>
                    <span>(y<sub>i</sub> − ŷ<sub>i</sub>)</span>
                    <sup>2</sup>
                  </div>
                }
              >
                <p>{copy.formulaNote}</p>
              </FormulaCard>
              <ObservationCard eyebrow={copy.teachingNotes} title={copy.classroomFocus}>
                <p>{copy.classroomFocusBody}</p>
              </ObservationCard>
            </section>
          </div>
        </>
      }
      sidebar={
        <ControlPanel
          copy={copy}
          datasets={datasets}
          selectedId={selectedId}
          showRegression={showRegression}
          showOutliers={showOutliers}
          selectedDataset={selectedDataset}
          onSelectDataset={setSelectedId}
          onToggleRegression={setShowRegression}
          onToggleOutliers={setShowOutliers}
          onClearCustomLine={clear}
          customLineParams={customLineParams}
          onNumericLine={setNumericParams}
          translate={t}
        />
      }
    />
  );
}
