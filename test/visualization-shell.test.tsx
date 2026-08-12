import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import {
  ChartFrame,
  FormulaCard,
  MetricGrid,
  ObservationCard,
  ParameterPanel,
  ReadingGuide,
  VisualizationFrame,
  VisualizationHeader,
} from "@stats-viz/shared/visualization";
import { WalsApp } from "@stats-viz/shared/wals/WalsApp";
import { describe, expect, it } from "vitest";
import ConfidenceIntervalApp from "../apps/confidence-interval/src/App";
import { moduleConfig as distributionConfig } from "../apps/mes-distributions/src/module-config";
import RegressionApp from "../apps/regression/src/App";
import TypeErrorApp from "../apps/type-error/src/App";

function withLanguage(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("shared visualization shell", () => {
  it("composes the standard header, guide, metrics, chart, parameters, formula, and observation regions", () => {
    render(
      <VisualizationFrame
        content={
          <>
            <VisualizationHeader eyebrow="Core" title="Demo" description="Description" />
            <ReadingGuide title="How to read"><p>Follow the curve.</p></ReadingGuide>
            <MetricGrid ariaLabel="Metrics" metrics={[{ label: "Mean", value: "4.2", note: "Observed" }]} />
            <ChartFrame><svg role="img" aria-label="Demo chart" /></ChartFrame>
          </>
        }
        sidebar={
          <>
            <ParameterPanel eyebrow="Parameters"><label>Value<input /></label></ParameterPanel>
            <FormulaCard eyebrow="Formula" formula={<span>x̄</span>}><p>Formula note</p></FormulaCard>
            <ObservationCard eyebrow="Observe" title="Result"><p>Interpretation</p></ObservationCard>
          </>
        }
      />,
    );

    expect(document.querySelector("[data-visualization-frame='true']")).toBeInTheDocument();
    expect(document.querySelector("[data-visualization-header='true']")).toBeInTheDocument();
    expect(document.querySelector("[data-reading-guide='true']")).toBeInTheDocument();
    expect(document.querySelector("[data-metric-grid='true']")).toBeInTheDocument();
    expect(document.querySelector("[data-chart-frame='true']")).toBeInTheDocument();
    expect(document.querySelector("[data-parameter-panel='true']")).toBeInTheDocument();
    expect(document.querySelector("[data-formula-card='true']")).toBeInTheDocument();
    expect(document.querySelector("[data-observation-card='true']")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Demo chart" })).toBeInTheDocument();
  });

  it("is the common structure used by WALS and the three independent core visualizers", () => {
    const apps = [
      <WalsApp key="wals" moduleConfig={distributionConfig} />,
      <ConfidenceIntervalApp key="confidence" />,
      <RegressionApp key="regression" />,
      <TypeErrorApp key="testing" />,
    ];

    for (const app of apps) {
      const view = withLanguage(app);
      expect(view.container.querySelector("[data-visualization-frame='true']")).toBeInTheDocument();
      expect(view.container.querySelector("[data-reading-guide='true']")).toBeInTheDocument();
      expect(view.container.querySelector("[data-chart-frame='true']")).toBeInTheDocument();
      expect(view.container.querySelector("[data-parameter-panel='true']")).toBeInTheDocument();
      expect(view.container.querySelector("[data-formula-card='true']")).toBeInTheDocument();
      view.unmount();
    }
  });
});
