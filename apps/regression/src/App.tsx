import { useEffect, useMemo, useState } from "react";
import { localizeText, regressionCopy, useLanguage } from "@stats-viz/shared/i18n";
import { linearRegression } from "@stats-viz/shared/math";
import { computeSSE } from "@stats-viz/shared/regression";
import { createLinearScales } from "@stats-viz/shared/chart-utils";

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

  const { customLine, tempLine, isDragging, handlers, clear } = useCustomLine({
    scales: scalesRaw,
    chartLayoutMargin: CHART_LAYOUT.margin,
    resetDeps: [selectedId, showOutliers],
  });

  const customLineParams = useMemo(() => getCustomLineParams(customLine), [customLine]);

  const sse = useMemo(() => {
    if (showRegression) {
      return { value: regression.sse, lineType: "regression" as const };
    }
    if (customLineParams) {
      return { value: computeSSE(visibleData, customLineParams.slope, customLineParams.intercept), lineType: "custom" as const };
    }
    return { value: 0, lineType: null };
  }, [visibleData, showRegression, regression, customLineParams]);

  const hoverInfo = useMemo(
    () => computeHoverInfo(hoverPoint, showRegression, regression, customLineParams),
    [hoverPoint, showRegression, regression, customLineParams],
  );

  return (
    <div className="module-shell">
      <main className="module-layout">
        <section className="experiment-board">
          <header className="experiment-header">
            <div>
              <p className="eyebrow">{copy.coreVisualizer}</p>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </div>
          </header>
          <section className="output-dock">
            <div className="output-heading">
              <p className="eyebrow">{copy.modelOutput}</p>
              <h2>{copy.chartTitle}</h2>
              <p>{copy.chartDescription}</p>
            </div>
            <div className="chart-frame">
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
            </div>
          </section>
          <section className="metrics-grid">
            <StatisticsPanel sse={sse} hoverInfo={hoverInfo} copy={copy} />
          </section>
        </section>
        <aside className="teaching-area">
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
            translate={t}
          />
          <section className="teaching-panel">
            <p className="eyebrow">{copy.conceptKeyIdea}</p>
            <h2>{copy.leastSquaresRegression}</h2>
            <p>{copy.regressionBody}</p>
            <h3>{copy.residualsExplainFit}</h3>
            <p>{copy.residualsBody}</p>
          </section>
          <section className="teaching-panel">
            <p className="eyebrow">{copy.formula}</p>
            <div className="latex-formula">
              <div className="math-expression">
                <span>SSE =</span>
                <span className="math-symbol">Σ</span>
                <span>(y<sub>i</sub> − ŷ<sub>i</sub>)</span>
                <sup>2</sup>
              </div>
            </div>
            <p>{copy.formulaNote}</p>
          </section>
          <section className="teaching-panel">
            <p className="eyebrow">{copy.teachingNotes}</p>
            <h3>{copy.classroomFocus}</h3>
            <p>{copy.classroomFocusBody}</p>
          </section>
        </aside>
      </main>
    </div>
  );
}
