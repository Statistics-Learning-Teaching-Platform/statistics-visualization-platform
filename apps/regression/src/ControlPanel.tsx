import type { Dataset } from "./constants";

interface ControlPanelProps {
  copy: {
    parameters: string;
    controlPanel: string;
    controlIntro: string;
    dataset: string;
    datasetHint: string;
    selectDataset: string;
    regressionLineLabel: string;
    regressionLineHint: string;
    outliersRemoved: string;
    outliersHint: string;
    clearCustomLine: string;
    selectedDataset: string;
    dataPoints: string;
    outliers: string;
    included: string;
    removed: string;
    source: string;
    xVariable: string;
    yVariable: string;
  };
  datasets: Dataset[];
  selectedId: string;
  showRegression: boolean;
  showOutliers: boolean;
  selectedDataset: Dataset | undefined;
  onSelectDataset: (id: string) => void;
  onToggleRegression: (checked: boolean) => void;
  onToggleOutliers: (checked: boolean) => void;
  onClearCustomLine: () => void;
  translate: (text: string) => string;
}

export function ControlPanel({
  copy,
  datasets,
  selectedId,
  showRegression,
  showOutliers,
  selectedDataset,
  onSelectDataset,
  onToggleRegression,
  onToggleOutliers,
  onClearCustomLine,
  translate,
}: ControlPanelProps) {
  const t = translate;
  return (
    <section className="teaching-panel parameter-panel">
      <p className="eyebrow">{copy.parameters}</p>
      <div className="control-panel">
        <h2 className="control-panel__title">{copy.controlPanel}</h2>
        <p className="control-panel__intro">{copy.controlIntro}</p>
        <div className="control-panel__group">
          <div className="control-panel__label-row">
            <span className="control-panel__label">{copy.dataset}</span>
            <span className="control-panel__value">{String(datasets.length)}</span>
          </div>
          <p className="control-panel__hint">{copy.datasetHint}</p>
          <label className="sr-only" htmlFor="dataset-select">{copy.selectDataset}</label>
          <select
            id="dataset-select"
            className="dataset-select control-panel__select"
            value={selectedId}
            disabled={datasets.length === 0}
            onChange={(e) => onSelectDataset(e.target.value)}
          >
            {datasets.length === 0 && (
              <option value="" disabled>No datasets available</option>
            )}
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>{t(d.name)}</option>
            ))}
          </select>
        </div>
        <div className="control-panel__group">
          <label className="toggle-row" htmlFor="regression-toggle">
            <span className="toggle-row__copy">
              <span className="control-panel__label">{copy.regressionLineLabel}</span>
              <span className="control-panel__hint">{copy.regressionLineHint}</span>
            </span>
            <input
              id="regression-toggle"
              type="checkbox"
              className="regression-toggle toggle-row__input"
              checked={showRegression}
              onChange={(e) => onToggleRegression(e.target.checked)}
            />
          </label>
        </div>
        <div className="control-panel__group">
          <label className="toggle-row" htmlFor="outlier-toggle">
            <span className="toggle-row__copy">
              <span className="control-panel__label">{copy.outliersRemoved}</span>
              <span className="control-panel__hint">{copy.outliersHint}</span>
            </span>
            <input
              id="outlier-toggle"
              type="checkbox"
              className="outlier-toggle toggle-row__input"
              checked={!showOutliers}
              onChange={(e) => onToggleOutliers(!e.target.checked)}
            />
          </label>
        </div>
        <div className="control-panel__actions">
          <button
            type="button"
            className="clear-custom-line control-panel__button"
            onClick={onClearCustomLine}
          >
            {copy.clearCustomLine}
          </button>
        </div>
        {selectedDataset && (
          <div className="control-panel__summary-card">
            <div className="info-item">
              <span className="metric-label">{copy.selectedDataset}</span>
              <span className="metric-value">{t(selectedDataset.name)}</span>
            </div>
            <div className="info-item">
              <span className="metric-label">{copy.dataPoints}</span>
              <span className="metric-value">
                {selectedDataset.data.length -
                  (showOutliers ? 0 : selectedDataset.data.filter((p) => p.outlier).length)}
              </span>
            </div>
            <div className="info-item">
              <span className="metric-label">{copy.outliers}</span>
              <span className="metric-value metric-value--compact">
                {showOutliers ? copy.included : copy.removed}
              </span>
            </div>
            {selectedDataset.source && (
              <div className="info-item">
                <span className="metric-label">{copy.source}</span>
                <span className="metric-value metric-value--compact">{t(selectedDataset.source)}</span>
              </div>
            )}
            {selectedDataset.xLabel && (
              <div className="info-item">
                <span className="metric-label">{copy.xVariable}</span>
                <span className="metric-value metric-value--compact">{t(selectedDataset.xLabel)}</span>
              </div>
            )}
            {selectedDataset.yLabel && (
              <div className="info-item">
                <span className="metric-label">{copy.yVariable}</span>
                <span className="metric-value metric-value--compact">{t(selectedDataset.yLabel)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
