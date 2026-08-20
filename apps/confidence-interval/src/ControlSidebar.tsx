interface ControlSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  copy: {
    parameters: string;
    controlsTitle: string;
    controlsIntro: string;
    sampleSize: string;
    sampleSizeHint: string;
    populationSD: string;
    populationSDHint: string;
    confidenceLevel: string;
    confidenceLevelHint: string;
    sigmaAssumption: string;
    sigmaKnownHint: string;
    sigmaUnknownHint: string;
    confidenceInfo: string;
    sigmaKnown: string;
    sigmaUnknown: string;
  };
  sampleSize: number;
  populationSD: number;
  confidenceLevel: number;
  sigmaKnown: boolean;
  onSampleSize: (v: number) => void;
  onPopulationSD: (v: number) => void;
  onConfidenceLevel: (v: number) => void;
  onSigmaKnown: (v: boolean) => void;
}

export function ControlSidebar({
  collapsed,
  onToggleCollapsed,
  copy,
  sampleSize,
  populationSD,
  confidenceLevel,
  sigmaKnown,
  onSampleSize,
  onPopulationSD,
  onConfidenceLevel,
  onSigmaKnown,
}: ControlSidebarProps) {
  return (
    <ParameterPanel eyebrow={copy.parameters}>
      <div id="sidebar" className={`control-sidebar${collapsed ? " collapsed" : ""}`}>
        <button
          id="toggleSidebar"
          type="button"
          className="control-panel__toggle"
          aria-label={collapsed ? `Show ${copy.controlsTitle}` : `Hide ${copy.controlsTitle}`}
          aria-expanded={!collapsed}
          aria-controls="confidence-control-panel"
          onClick={onToggleCollapsed}
        >
          {collapsed ? "❯" : "❮"}
        </button>
        {!collapsed && (
          <div className="control-panel" id="confidence-control-panel">
            <div className="control-panel__title">{copy.controlsTitle}</div>
            <div className="control-panel__intro">{copy.controlsIntro}</div>
            <div className="control-panel__group">
              <div className="control-panel__label-row">
                <label className="control-panel__label" htmlFor="sampleSize">{copy.sampleSize}</label>
                <div className="control-panel__value">{sampleSize}</div>
              </div>
              <div className="control-panel__hint">{copy.sampleSizeHint}</div>
              <input
                id="sampleSize"
                type="range"
                className="form-range control-panel__input"
                min={sigmaKnown ? 1 : 2}
                max={100}
                value={sampleSize}
                onChange={(e) => onSampleSize(Number(e.target.value))}
              />
            </div>
            <div className="control-panel__group">
              <div className="control-panel__label-row">
                <label className="control-panel__label" htmlFor="populationSD">{copy.populationSD}</label>
                <div className="control-panel__value">{populationSD.toFixed(1)}</div>
              </div>
              <div className="control-panel__hint">{copy.populationSDHint}</div>
              <input
                id="populationSD"
                type="range"
                className="form-range control-panel__input"
                min={0.1}
                max={10}
                step={0.1}
                value={populationSD}
                onChange={(e) => onPopulationSD(Number(e.target.value))}
              />
            </div>
            <div className="control-panel__group">
              <div className="control-panel__label-row">
                <label className="control-panel__label" htmlFor="confidenceLevel">{copy.confidenceLevel}</label>
                <div className="control-panel__value">{Math.round(confidenceLevel * 100)}%</div>
              </div>
              <div className="control-panel__hint">{copy.confidenceLevelHint}</div>
              <select
                id="confidenceLevel"
                className="form-select control-panel__select"
                value={String(confidenceLevel)}
                onChange={(e) => onConfidenceLevel(Number(e.target.value))}
              >
                <option value="0.8">80%</option>
                <option value="0.9">90%</option>
                <option value="0.95">95%</option>
                <option value="0.99">99%</option>
              </select>
            </div>
            <div className="control-panel__group">
              <div className="control-panel__label-row">
                <label className="control-panel__label" htmlFor="sigmaAssumption">{copy.sigmaAssumption}</label>
                <div className="control-panel__value">{sigmaKnown ? "z" : "t"}</div>
              </div>
              <div className="control-panel__hint">
                {sigmaKnown ? copy.sigmaKnownHint : copy.sigmaUnknownHint}
              </div>
              <select
                id="sigmaAssumption"
                className="form-select control-panel__select"
                value={String(sigmaKnown)}
                onChange={(e) => onSigmaKnown(e.target.value === "true")}
              >
                <option value="true">{copy.sigmaKnown}</option>
                <option value="false">{copy.sigmaUnknown}</option>
              </select>
            </div>
            <div className="control-panel__info-box">
              <div className="control-panel__info-icon">i</div>
              <div>{copy.confidenceInfo}</div>
            </div>
          </div>
        )}
      </div>
    </ParameterPanel>
  );
}
import { ParameterPanel } from "@stats-viz/shared/visualization";
