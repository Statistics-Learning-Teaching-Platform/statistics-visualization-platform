import { describe, expect, it } from "vitest";
import { useDatasets } from "../apps/regression/src/useDatasets";
import { DATASET_PATHS } from "../apps/regression/src/constants";
import { computeHoverInfo } from "../apps/regression/src/useCustomLine";

describe("regression app bootstrap", () => {
  it("bundles all declared datasets at build time", () => {
    const { datasets } = useDatasets();
    expect(datasets).toHaveLength(DATASET_PATHS.length);
    expect(datasets.every((d) => d.data.length > 0)).toBe(true);
  });

  it("seeds the initial selection with the first declared dataset", () => {
    const { datasets, initialId } = useDatasets();
    expect(initialId).toBe(datasets[0].id);
    expect(initialId).toBe("outlier-impact");
  });

  it("uses a hand-drawn line for diagnostics when it is present", () => {
    const result = computeHoverInfo(
      { x: 2, y: 8 },
      true,
      { slope: 1, intercept: 0 },
      { slope: 3, intercept: 1 },
    );

    expect(result).toMatchObject({ lineType: "custom", lineY: 7, residual: 1 });
  });
});
