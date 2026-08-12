import type { ReactNode } from "react";

export interface VisualizationMetric {
  key?: string;
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  help?: string;
}

interface MetricGridProps {
  metrics?: VisualizationMetric[];
  children?: ReactNode;
  ariaLabel?: string;
}

export function MetricGrid({ metrics, children, ariaLabel }: MetricGridProps) {
  return (
    <section className="metrics-grid" aria-label={ariaLabel} data-metric-grid="true">
      {metrics?.map((metric, index) => (
        <article className="metric-card" key={metric.key ?? `${String(metric.label)}-${index}`} title={metric.help}>
          <span className="metric-label">{metric.label}</span>
          <strong className="metric-value">{metric.value}</strong>
          {metric.note && <small className="metric-note">{metric.note}</small>}
        </article>
      ))}
      {children}
    </section>
  );
}
