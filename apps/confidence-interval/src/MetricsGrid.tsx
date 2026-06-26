interface MetricCard {
  label: string;
  value: string;
  note: string;
}

interface MetricsGridProps {
  metrics: MetricCard[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="metrics-grid">
      {metrics.map((m) => (
        <div className="metric-card" key={m.label}>
          <span className="metric-label">{m.label}</span>
          <span className="metric-value">{m.value}</span>
          <small className="metric-note">{m.note}</small>
        </div>
      ))}
    </div>
  );
}
