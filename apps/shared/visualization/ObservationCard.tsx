import type { ReactNode } from "react";

interface ObservationCardProps {
  eyebrow: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ObservationCard({
  eyebrow,
  title,
  children,
  className = "",
}: ObservationCardProps) {
  return (
    <section
      className={`teaching-panel observation-card ${className}`.trim()}
      data-observation-card="true"
    >
      <p className="eyebrow">{eyebrow}</p>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}
