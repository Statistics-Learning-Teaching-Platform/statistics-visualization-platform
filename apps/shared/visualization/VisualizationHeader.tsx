import type { ReactNode } from "react";
import { useLanguage } from "../i18n";

interface VisualizationHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  experimentNumber?: number | string;
  category?: ReactNode;
  researchQuestion?: ReactNode;
  children?: ReactNode;
}

export function VisualizationHeader({
  eyebrow,
  title,
  description,
  experimentNumber,
  category,
  researchQuestion,
  children,
}: VisualizationHeaderProps) {
  const language = useLanguage();
  return (
    <header className="experiment-header lab-experiment-header" data-visualization-header="true">
      <div>
        <div className="experiment-header__meta lab-experiment-meta">
          {experimentNumber !== undefined && (
            <span className="experiment-header__number">
              EXPERIMENT {String(experimentNumber).padStart(2, "0")}
            </span>
          )}
          <p className="eyebrow lab-experiment-eyebrow">{category ?? eyebrow}</p>
        </div>
        <h1 className="lab-experiment-title">{title}</h1>
        {description && <p className="lab-experiment-description">{description}</p>}
        {researchQuestion && (
          <p className="research-question">
            <strong>{language === "zh" ? "研究问题：" : "Research question:"}</strong> {researchQuestion}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}
