import { describe, expect, it } from "vitest";
import { computeCriticalValues, computePValue } from "../apps/type-error/src/App";

describe("hypothesis-test calculations", () => {
  it("computes left, right, and two-tailed critical values", () => {
    expect(computeCriticalValues(0.05, 0, 1, "left-tailed")[0]).toBeCloseTo(-1.645, 2);
    expect(computeCriticalValues(0.05, 0, 1, "right-tailed")[0]).toBeCloseTo(1.645, 2);
    expect(computeCriticalValues(0.05, 0, 1, "two-tailed")).toEqual([
      expect.closeTo(-1.96, 2),
      expect.closeTo(1.96, 2),
    ]);
  });

  it("uses tail direction when computing p values", () => {
    expect(computePValue(1.96, 0, 1, "right-tailed")).toBeCloseTo(0.025, 3);
    expect(computePValue(-1.96, 0, 1, "left-tailed")).toBeCloseTo(0.025, 3);
    expect(computePValue(1.96, 0, 1, "two-tailed")).toBeCloseTo(0.05, 2);
    expect(computePValue(0, 0, 1, "two-tailed")).toBeCloseTo(1, 5);
  });
});
