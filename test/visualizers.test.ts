import { describe, expect, it } from "vitest";
import {
  apps,
  DEFAULT_VISUALIZER_ID,
  getDefaultVisualizer,
  getVisualizerById
} from "../scripts/apps";

describe("visualizer registry", () => {
  it("registers all teaching visualizers in grouped navigation order", () => {
    expect(apps.map((visualizer) => visualizer.id)).toEqual([
      "mes-distributions",
      "simulation-random-variable",
      "simulation-clt",
      "confidence-interval",
      "mes-confidence-interval",
      "type-error",
      "mes-anova",
      "regression",
      "mes-linear-regression",
      "simulation-introduction",
      "simulation-resampling",
      "simulation-mcmc",
      "simulation-variance-reduction"
    ]);
  });

  it("groups visualizers by the requested learning sequence", () => {
    expect(apps.map((visualizer) => visualizer.group)).toEqual([
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Foundations",
      "Statistical Simulation",
      "Statistical Simulation",
      "Statistical Simulation",
      "Statistical Simulation"
    ]);
  });

  it("carries a sidebar icon on every record", () => {
    for (const app of apps) {
      expect(typeof app.icon).toBe("string");
      expect(app.icon.length).toBeGreaterThan(0);
    }
  });

  it("selects the confidence interval page as the default", () => {
    expect(DEFAULT_VISUALIZER_ID).toBe("confidence-interval");
    expect(getDefaultVisualizer().id).toBe(DEFAULT_VISUALIZER_ID);
  });

  it("falls back to the default visualizer for unknown ids", () => {
    expect(getVisualizerById("unknown").id).toBe(DEFAULT_VISUALIZER_ID);
  });
});
