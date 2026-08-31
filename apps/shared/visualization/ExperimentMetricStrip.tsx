import { ExperimentMetric as ExperimentMetricCard, type ExperimentMetricProps } from "./ExperimentMetric";

export type { MetricSemantics } from "./ExperimentMetric";

export interface ExperimentMetricConfig extends Omit<ExperimentMetricProps, "metricKey"> {
  key?: string;
}

export function ExperimentMetricStrip({ metrics, ariaLabel, maxVisible = 5 }: { metrics: ExperimentMetricConfig[]; ariaLabel?: string; maxVisible?: number }) {
  const visible = metrics.slice(0, maxVisible);
  return (
    <section className="metrics-grid experiment-metric-strip lab-metric-strip" aria-label={ariaLabel} data-metric-grid="true" data-metric-count={visible.length}>
      {visible.map((metric, index) => (
        <ExperimentMetricCard
          key={metric.key ?? `${String(metric.label)}-${index}`}
          metricKey={metric.key}
          label={metric.label}
          value={metric.value}
          comparison={metric.comparison}
          note={metric.note}
          help={metric.help}
          semantics={metric.semantics}
        />
      ))}
    </section>
  );
}
