import type { ReactNode } from "react";

export interface ExperimentChangeSummaryProps {
  eyebrow?: ReactNode;
  parameter: string;
  previousValue: ReactNode;
  currentValue: ReactNode;
  metric?: string;
  previousMetric?: ReactNode;
  currentMetric?: ReactNode;
  interpretation?: ReactNode;
}

export function ExperimentChangeSummary({
  eyebrow = "What changed?",
  parameter,
  previousValue,
  currentValue,
  metric,
  previousMetric,
  currentMetric,
  interpretation,
}: ExperimentChangeSummaryProps) {
  return (
    <section className="change-summary" aria-live="polite" data-change-summary="true">
      <p className="eyebrow">{eyebrow}</p>
      <p>
        <strong>{parameter}</strong> <span>{previousValue}</span> <span aria-hidden="true">→</span>{" "}
        <span>{currentValue}</span>
      </p>
      {metric && (
        <p>
          <strong>{metric}</strong> <span>{previousMetric}</span> <span aria-hidden="true">→</span>{" "}
          <span>{currentMetric}</span>
        </p>
      )}
      {interpretation && <p className="change-summary__interpretation">{interpretation}</p>}
    </section>
  );
}
