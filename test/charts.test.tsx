import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chart } from "../apps/shared/wals/charts";
import type { ChartSpec } from "../apps/shared/wals/types";

describe("shared teaching charts", () => {
  it("renders category labels, full-value tooltips, and a semantic legend for bars", () => {
    const spec: ChartSpec = {
      type: "bars",
      title: "Categorical comparison",
      xLabel: "category",
      yLabel: "count",
      bars: [
        { label: "A very long category", value: 4, color: "#2f6f64" },
        { label: "B", value: 7, color: "#c8665a" },
      ],
      legend: [{ label: "observed count", color: "#2f6f64", shape: "bar" }],
    };
    const { container } = render(<Chart spec={spec} />);
    expect(screen.getByRole("img", { name: "Categorical comparison" })).toBeInTheDocument();
    expect(screen.getByText("A very lo…")).toBeInTheDocument();
    expect(screen.getAllByText("observed count").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector("title")?.textContent).toBe("A very long category: 4");
  });

  it("renders scatter overlays without losing point tooltips", () => {
    const spec: ChartSpec = {
      type: "scatter",
      title: "Geometry and samples",
      xLabel: "x",
      yLabel: "y",
      points: [{ x: 0.2, y: 0.3, label: "draw 1" }],
      circles: [{ cx: 0, cy: 0, radius: 1, label: "unit circle", color: "#8d75b5" }],
      lines: [
        {
          label: "path",
          points: [
            { x: -1, y: -1 },
            { x: 1, y: 1 },
          ],
          dashed: true,
        },
      ],
      legend: [{ label: "recent path", color: "#c8665a", shape: "dashed" }],
      xDomain: [-1.2, 1.2],
      yDomain: [-1.2, 1.2],
    };
    const { container } = render(<Chart spec={spec} />);
    expect(screen.getByText("unit circle")).toBeInTheDocument();
    expect(screen.getAllByText("recent path").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector("title")?.textContent).toContain("draw 1");
    expect(container.querySelector('path[stroke-dasharray="7 5"]')).toBeInTheDocument();
    const dataCircle = container.querySelector(".chart-data-circle");
    expect(dataCircle?.tagName.toLowerCase()).toBe("ellipse");
    expect(Number(dataCircle?.getAttribute("rx"))).toBeGreaterThan(
      Number(dataCircle?.getAttribute("ry")),
    );
  });

  it("shows MCMC target geometry, ordered traces, and current state", () => {
    const spec: ChartSpec = {
      type: "mcmc",
      title: "MCMC learning view",
      xLabel: "x₁",
      yLabel: "x₂",
      targetLabel: "target and path",
      traceLabel: "ordered trace",
      currentStateLabel: "current draw",
      targetDensityLabel: "target density",
      recentPathLabel: "recent path",
      samples: [{ x: 0, y: 0 }],
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      contours: [
        {
          label: "level",
          points: [
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 0 },
          ],
        },
      ],
      traceX: [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
      ],
      traceY: [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
      ],
      xDomain: [-2, 2],
      yDomain: [-2, 2],
    };
    render(<Chart spec={spec} />);
    expect(screen.getByText("target and path")).toBeInTheDocument();
    expect(screen.getByText("ordered trace")).toBeInTheDocument();
    expect(screen.getByText("current draw")).toBeInTheDocument();
    expect(screen.getAllByText("target density").length).toBeGreaterThanOrEqual(2);
  });

  it("shows ANOVA observations, group means, and the grand mean together", () => {
    const spec: ChartSpec = {
      type: "anova",
      title: "ANOVA teaching view",
      xLabel: "group",
      yLabel: "response",
      groups: [
        { label: "A", values: [1, 2, 3], mean: 2 },
        { label: "B", values: [4, 5, 6], mean: 5 },
      ],
      grandMean: 3.5,
      grandMeanLabel: "overall mean",
      observationsLabel: "raw observations",
      groupMeanLabel: "group averages",
    };
    const { container } = render(<Chart spec={spec} />);
    expect(screen.getAllByText("overall mean").length).toBeGreaterThan(0);
    expect(container.querySelector(".chart-legend")?.textContent).toContain("raw observatio…");
    expect(
      [...container.querySelectorAll(".chart-legend title")].map((node) => node.textContent),
    ).toContain("raw observations");
    expect(screen.getAllByText("group averages").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('circle[opacity="0.7"]')).toHaveLength(6);
  });

  it("keeps confidence-interval rows legible and avoids a duplicate reference label", () => {
    const intervals = Array.from({ length: 200 }, (_, index) => ({
      label: `Sample ${index + 1}`,
      lower: index - 0.5,
      center: index,
      upper: index + 0.5,
      color: "#2f6f64",
    }));
    const spec: ChartSpec = {
      type: "intervals",
      title: "Repeated intervals",
      xLabel: "parameter scale",
      yLabel: "sample",
      intervals,
      reference: 100,
      referenceLabel: "true mean μ",
      legend: [{ label: "true mean", color: "#4b73d9", shape: "dashed" }],
      xDomain: [-1, 200],
    };
    const { container } = render(<Chart spec={spec} />);
    expect(container.querySelectorAll(".interval-row")).toHaveLength(200);
    expect(container.querySelectorAll(".interval-row__label").length).toBeLessThanOrEqual(25);
    expect(screen.queryByText("true mean μ")).not.toBeInTheDocument();
    expect(screen.getAllByText("true mean").length).toBeGreaterThanOrEqual(1);
  });
});
