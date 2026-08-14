import type { ReactNode } from "react";

interface VisualizationHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

export function VisualizationHeader({
  eyebrow,
  title,
  description,
  children,
}: VisualizationHeaderProps) {
  return (
    <header className="experiment-header" data-visualization-header="true">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
    </header>
  );
}
