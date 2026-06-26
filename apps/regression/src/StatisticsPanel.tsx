import type { HoverInfo } from "./useCustomLine";

interface StatisticsPanelProps {
  sse: { value: number; lineType: "regression" | "custom" | null };
  hoverInfo: HoverInfo;
  copy: {
    statistics: string;
    sse: string;
    lineType: string;
    regressionLine: string;
    customLine: string;
    noLine: string;
    hover: string;
    res: string;
    yHat: string;
    hoverOverAPoint: string;
  };
}

export function StatisticsPanel({ sse, hoverInfo, copy }: StatisticsPanelProps) {
  return (
    <div className="statistics-panel">
      <h4 className="statistics-title">{copy.statistics}</h4>
      <div className="sse-section">
        <div className="stat-row">
          <span className="stat-label">{copy.sse}</span>
          <span className="stat-value">{sse.value.toFixed(4)}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">{copy.lineType}</span>
          <span className={`line-badge ${
            sse.lineType === "regression"
              ? "line-badge--regression"
              : sse.lineType === "custom"
                ? "line-badge--custom"
                : "line-badge--none"
          }`}>
            {sse.lineType === "regression"
              ? copy.regressionLine
              : sse.lineType === "custom"
                ? copy.customLine
                : copy.noLine}
          </span>
        </div>
      </div>
      <div className="residual-section">
        <div className="residual-row">
          <span className="stat-label">{copy.hover}</span>
          {hoverInfo ? (
            <div>
              <span className="stat-value">
                ({hoverInfo.point.x.toFixed(2)}, {hoverInfo.point.y.toFixed(2)})
              </span>
              <small className="stat-divider">|</small>
              <span className="stat-label">{copy.res}</span>
              <span className="stat-value">{hoverInfo.residual.toFixed(4)}</span>
              <small className="stat-divider">|</small>
              <span className="stat-label">{copy.yHat}</span>
              <span className="stat-value">{hoverInfo.lineY.toFixed(4)}</span>
            </div>
          ) : (
            <span className="stat-value stat-value--muted">{copy.hoverOverAPoint}</span>
          )}
        </div>
      </div>
    </div>
  );
}
