import type { ReactNode } from "react";

interface FormulaCardProps {
  eyebrow: ReactNode;
  formula: ReactNode;
  children?: ReactNode;
}

export function FormulaCard({ eyebrow, formula, children }: FormulaCardProps) {
  return (
    <section className="teaching-panel formula-panel" data-formula-card="true">
      <p className="eyebrow">{eyebrow}</p>
      <div className="latex-formula">{formula}</div>
      {children}
    </section>
  );
}
