import type { ReactNode } from "react";

export type MetricSemantics = "input" | "derived" | "comparison" | "decision";

export interface ExperimentMetricProps {
  label: ReactNode;
  value: ReactNode;
  comparison?: ReactNode;
  note?: ReactNode;
  help?: string;
  semantics?: MetricSemantics;
  metricKey?: string;
}

export function ExperimentMetric({
  label,
  value,
  comparison,
  note,
  help,
  semantics = "derived",
  metricKey,
}: ExperimentMetricProps) {
  return (
    <article
      className="metric-card experiment-metric lab-metric"
      title={help}
      data-metric-key={metricKey}
      data-metric-semantics={semantics}
    >
      <span className="metric-label lab-metric-label">{label}</span>
      <strong className="metric-value lab-metric-value">{value}</strong>
      {comparison && <small className="metric-comparison">{comparison}</small>}
      {note && <small className="metric-note">{note}</small>}
    </article>
  );
}
