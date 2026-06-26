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
      "confidence-interval",
      "type-error",
      "regression",
      "simulation-introduction",
      "simulation-random-variable",
      "simulation-clt",
      "simulation-variance-reduction",
      "simulation-resampling",
      "simulation-mcmc",
      "mes-anova",
      "mes-confidence-interval",
      "mes-distributions",
      "mes-linear-regression"
    ]);
  });

  it("groups the existing and WALS visualizers separately", () => {
    expect(apps.map((visualizer) => visualizer.group)).toEqual([
      "Core Visualizers",
      "Core Visualizers",
      "Core Visualizers",
      "WALS Simulation",
      "WALS Simulation",
      "WALS Simulation",
      "WALS Simulation",
      "WALS Simulation",
      "WALS Simulation",
      "WALS MES",
      "WALS MES",
      "WALS MES",
      "WALS MES"
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
