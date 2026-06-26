import { describe, expect, it } from "vitest";
import { createState } from "@stats-viz/shared/wals/WalsApp";
import { runExample } from "@stats-viz/shared/wals/engine";
import type { ModuleConfig } from "@stats-viz/shared/wals/types";

// Discover every module config via Vite's glob. This single parameterized
// sweep replaces the ten near-identical apps/*/test/module.test.ts copies.
const configModules = import.meta.glob("../apps/*/src/module-config.ts", {
  eager: true,
}) as Record<string, { moduleConfig: ModuleConfig }>;

const modules = Object.values(configModules).map((entry) => entry.moduleConfig);

describe("WALS module configs", () => {
  it("discovers all module configs", () => {
    expect(modules.length).toBe(10);
    expect(new Set(modules.map((config) => config.id)).size).toBe(modules.length);
  });

  for (const config of modules) {
    describe(config.id, () => {
      it("builds a renderable state for its default example", () => {
        const state = createState(config, undefined, undefined, 510, "zh");
        expect(state.result.metrics.length).toBeGreaterThan(0);
        expect(state.result.chart.title.length).toBeGreaterThan(0);
        // At least one metric must be a finite number (guards against NaN output).
        expect(state.result.metrics.some((m) => Number.isFinite(Number(m.value)))).toBe(true);
      });

      it("runs every example without throwing and yields metrics", () => {
        for (const example of config.examples) {
          const controls = Object.fromEntries(
            example.controls.map((control) => [control.id, control.defaultValue]),
          );
          const result = runExample(example, controls, 510, config.data);
          expect(result.headline.length).toBeGreaterThan(0);
          expect(result.metrics.length).toBeGreaterThan(0);
        }
      });
    });
  }
});
