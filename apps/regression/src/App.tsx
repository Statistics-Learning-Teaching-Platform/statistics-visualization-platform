import {
  type ExperimentTelemetrySnapshot,
  useExperimentTelemetryPublisher,
} from "@stats-viz/shared/ai/experimentTelemetry";
import { createLinearScales } from "@stats-viz/shared/chart-utils";
import { localizeText, regressionCopy, useLanguage } from "@stats-viz/shared/i18n";
import { linearRegression } from "@stats-viz/shared/math";
import { computeSSE } from "@stats-viz/shared/regression";
import {
  ChartFrame,
  ExperimentMetricStrip,
  FormulaCard,
  localizedExperimentMetadata,
  ObservationCard,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";
import { useEffect, useMemo, useState } from "react";
import { ControlPanel } from "./ControlPanel";
import { CHART_LAYOUT, type Point } from "./constants";
import { RegressionChart } from "./RegressionChart";
import { StatisticsPanel } from "./StatisticsPanel";
import { computeHoverInfo, getCustomLineParams, useCustomLine } from "./useCustomLine";
import { useDatasets } from "./useDatasets";

const TELEMETRY_POINT_LIMIT = 80;

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
    if (visibleData.length === 0)
      return { x: [0, 1] as [number, number], y: [0, 1] as [number, number] };
    let xMin = Infinity,
      xMax = -Infinity,
      yMin = Infinity,
      yMax = -Infinity;
    for (const p of visibleData) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    const xPad = (xMax - xMin) * 0.1 || 1;
    const yPad = (yMax - yMin) * 0.1 || 1;
    return {
      x: [xMin - xPad, xMax + xPad] as [number, number],
      y: [yMin - yPad, yMax + yPad] as [number, number],
    };
  }, [visibleData]);

  const scalesRaw = useMemo(
    () => createLinearScales(CHART_LAYOUT, domains.x, domains.y),
    [domains],
  );
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
      return {
        value: computeSSE(visibleData, customLineParams.slope, customLineParams.intercept),
        lineType: "custom" as const,
      };
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

  const telemetrySnapshot = useMemo<ExperimentTelemetrySnapshot>(() => {
    const selectedPoints = selectedDataset?.data ?? [];
    const sentPoints = selectedPoints.slice(0, TELEMETRY_POINT_LIMIT);
    const originalCount = selectedPoints.length;
    const sentCount = sentPoints.length;
    const truncatedCount = originalCount - sentCount;
    const outlierCount = selectedPoints.reduce((count, point) => count + Number(point.outlier), 0);
    const excludedCount = originalCount - visibleData.length;
    const xLabel = localizeText(selectedDataset?.xLabel || copy.explanatoryVariable, language);
    const yLabel = localizeText(selectedDataset?.yLabel || copy.response, language);
    const datasetName = selectedDataset
      ? localizeText(selectedDataset.name, language)
      : "No dataset selected";
    const source = selectedDataset?.source
      ? localizeText(selectedDataset.source, language)
      : "No source supplied";
    const activeLine = customLineParams
      ? `custom line y=${customLineParams.slope.toFixed(8)}x + ${customLineParams.intercept.toFixed(8)}`
      : showRegression
        ? `OLS line y=${regression.slope.toFixed(8)}x + ${regression.intercept.toFixed(8)}`
        : "no active comparison line";

    return {
      appId: "regression",
      updatedAt: Date.now(),
      experiment: {
        title: copy.title,
        description: copy.description,
        researchQuestion: metadata?.localizedQuestion,
        category: metadata?.localizedCategory,
        exampleTitle: datasetName,
        exampleDescription: `${copy.chartDescription} ${copy.regressionBody}`,
        teachingPoints: [copy.regressionBody, copy.residualsBody, copy.classroomFocusBody],
      },
      parameters: [
        { id: "dataset-id", label: copy.dataset, value: selectedDataset?.id ?? "none" },
        { id: "dataset-name", label: copy.selectedDataset, value: datasetName },
        { id: "dataset-source", label: copy.source, value: source },
        { id: "x-variable", label: copy.xVariable, value: xLabel },
        { id: "y-variable", label: copy.yVariable, value: yLabel },
        { id: "show-regression", label: copy.regressionLineLabel, value: showRegression },
        {
          id: "include-outliers",
          label: copy.outliers,
          value: showOutliers ? copy.included : copy.removed,
        },
        {
          id: "custom-line-slope",
          label: `${copy.customLine} — ${copy.slope}`,
          value: customLineParams?.slope ?? "not set",
        },
        {
          id: "custom-line-intercept",
          label: `${copy.customLine} — ${copy.intercept}`,
          value: customLineParams?.intercept ?? "not set",
        },
      ],
      outputs: {
        headline: `${datasetName}: ${visibleData.length} points in the active fit; ${activeLine}.`,
        narrative: [
          `Selected dataset id=${selectedDataset?.id ?? "none"}; source=${source}; axes=${xLabel} (x) and ${yLabel} (y).`,
          `Selected dataset points=${originalCount}; marked outliers=${outlierCount}; visible/used points=${visibleData.length}; excluded by current outlier filter=${excludedCount}.`,
          `OLS slope=${regression.slope.toFixed(8)}, intercept=${regression.intercept.toFixed(8)}, SSE=${regression.sse.toFixed(8)}, R²=${regression.rSquared.toFixed(8)}, r=${correlation.toFixed(8)}.`,
          `Current comparison=${activeLine}; current SSE=${sse.value.toFixed(8)}; SSE delta from OLS=${(sse.value - regression.sse).toFixed(8)}.`,
          hoverInfo
            ? `Hovered point=(${hoverInfo.point.x}, ${hoverInfo.point.y}); fitted y=${hoverInfo.lineY.toFixed(8)}; residual=${hoverInfo.residual.toFixed(8)}; line type=${hoverInfo.lineType}.`
            : "No data point is currently hovered.",
        ].join("\n"),
        metrics: [
          {
            label: copy.dataPoints,
            value: String(visibleData.length),
            detail: `${originalCount} selected; ${excludedCount} excluded by current filter`,
          },
          { label: `${copy.regressionLine} ${copy.slope}`, value: regression.slope.toFixed(8) },
          {
            label: `${copy.regressionLine} ${copy.intercept}`,
            value: regression.intercept.toFixed(8),
          },
          { label: "OLS SSE", value: regression.sse.toFixed(8) },
          {
            label: copy.sse,
            value: sse.value.toFixed(8),
            detail: sse.lineType ?? "no active line",
          },
          { label: "SSE delta", value: (sse.value - regression.sse).toFixed(8) },
          { label: "r", value: correlation.toFixed(8) },
          { label: "R²", value: regression.rSquared.toFixed(8) },
        ],
        tables: [
          {
            title: `${datasetName} — original=${originalCount}, sent=${sentCount}, truncated=${truncatedCount}; active-fit points=${visibleData.length}, filter-excluded=${excludedCount}`,
            columns: ["original row", xLabel, yLabel, "marked outlier", "included in active fit"],
            rows: sentPoints.map((point, index) => [
              index + 1,
              point.x,
              point.y,
              point.outlier ? "yes" : "no",
              showOutliers || !point.outlier ? "yes" : "no",
            ]),
          },
        ],
        chartTitle: copy.chartTitle,
        chartSummary: [
          `Scatterplot for ${datasetName}; x=${xLabel}, y=${yLabel}; plotted points=${visibleData.length}.`,
          `Plot domains: x=[${domains.x[0].toFixed(8)}, ${domains.x[1].toFixed(8)}], y=[${domains.y[0].toFixed(8)}, ${domains.y[1].toFixed(8)}].`,
          `OLS line visible=${showRegression}; custom line visible=${Boolean(customLineParams)}; residual segments use ${activeLine}.`,
        ].join("\n"),
        rawSampleSummary: `Selected regression data rows: original=${originalCount}, sent=${sentCount}, truncated=${truncatedCount}. The table sends the first ${sentCount} rows in source order. Active-fit rows=${visibleData.length}; rows excluded by the outlier filter=${excludedCount}.`,
      },
    };
  }, [
    copy,
    correlation,
    customLineParams,
    domains,
    hoverInfo,
    language,
    metadata,
    regression,
    selectedDataset,
    showOutliers,
    showRegression,
    sse,
    visibleData,
  ]);
  useExperimentTelemetryPublisher(telemetrySnapshot);

  return (
    <VisualizationFrame
      moduleId="regression"
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
          <div className="regression-workbench">
            <section className="regression-stage" aria-labelledby="regression-chart-title">
              <div className="regression-stage__header">
                <div className="regression-stage__intro">
                  <p className="eyebrow">{copy.modelOutput}</p>
                  <h2 id="regression-chart-title">{copy.chartTitle}</h2>
                  <p>{copy.chartDescription}</p>
                </div>
                <div className="regression-line-guide" role="list" aria-label={copy.lineType}>
                  {showRegression && (
                    <span className="regression-line-guide__item" role="listitem">
                      <span
                        className="regression-line-guide__swatch regression-line-guide__swatch--fit"
                        aria-hidden="true"
                      />
                      {copy.regressionLine}
                    </span>
                  )}
                  {customLineParams ? (
                    <span
                      className="regression-line-guide__item regression-line-guide__item--active"
                      role="listitem"
                    >
                      <span
                        className="regression-line-guide__swatch regression-line-guide__swatch--custom"
                        aria-hidden="true"
                      />
                      {copy.customLine}
                    </span>
                  ) : (
                    <span className="regression-line-guide__hint">{copy.chartDescription}</span>
                  )}
                </div>
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
                    onPointerCancel={handlers.handlePointerCancel}
                    onHoverPoint={setHoverPoint}
                  />
                </div>
              </ChartFrame>

              <ExperimentMetricStrip
                ariaLabel={copy.statistics}
                metrics={[
                  {
                    key: "current-sse",
                    label: copy.sse,
                    value: sse.value.toFixed(3),
                    semantics: "derived" as const,
                  },
                  {
                    key: "ols-sse",
                    label: language === "zh" ? "OLS SSE" : "OLS SSE",
                    value: regression.sse.toFixed(3),
                    semantics: "comparison" as const,
                  },
                  {
                    key: "delta-sse",
                    label: language === "zh" ? "SSE 差值" : "SSE delta",
                    value: (sse.value - regression.sse).toFixed(3),
                    semantics: "comparison" as const,
                  },
                  {
                    key: "r",
                    label: "r",
                    value: correlation.toFixed(3),
                    semantics: "derived" as const,
                  },
                  {
                    key: "r2",
                    label: "R²",
                    value: regression.rSquared.toFixed(3),
                    semantics: "derived" as const,
                  },
                ]}
              />
              <StatisticsPanel sse={sse} hoverInfo={hoverInfo} copy={copy} />
            </section>

            <aside className="regression-control-rail" aria-label={copy.parameters}>
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
            </aside>

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
                    <span>
                      (y<sub>i</sub> − ŷ<sub>i</sub>)
                    </span>
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
      sidebar={null}
    />
  );
}
