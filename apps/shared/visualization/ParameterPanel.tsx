import type { ReactNode } from "react";

interface ParameterPanelProps {
  eyebrow: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ParameterPanel({ eyebrow, children, className = "" }: ParameterPanelProps) {
  return (
    <section
      className={`teaching-panel parameter-panel ${className}`.trim()}
      data-parameter-panel="true"
    >
      <p className="eyebrow">{eyebrow}</p>
      {children}
    </section>
  );
}
