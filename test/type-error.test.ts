import { describe, expect, it } from "vitest";
import {
  computeChartDomain,
  computeCriticalValues,
  computeTypeTwoErrorRate,
  resolveTestType,
} from "../apps/type-error/src/App";

describe("Type I / II error semantics", () => {
  it("aims a one-sided alternative toward the configured real effect", () => {
    expect(resolveTestType("one-tailed", 1, -1)).toBe("left-tailed");
    expect(resolveTestType("one-tailed", 1, 2)).toBe("right-tailed");
    expect(resolveTestType("two-tailed", 1, -1)).toBe("two-tailed");
  });

  it("computes symmetric beta values for mirrored one-sided effects", () => {
    const rightCritical = computeCriticalValues(0.05, 0, 1, "right-tailed");
    const leftCritical = computeCriticalValues(0.05, 0, 1, "left-tailed");
    expect(computeTypeTwoErrorRate(rightCritical, 1, 1, "right-tailed")).toBeCloseTo(
      computeTypeTwoErrorRate(leftCritical, -1, 1, "left-tailed"),
      10,
    );
  });

  it("expands and contracts the chart domain with means and standard deviation", () => {
    const narrow = computeChartDomain(0, 1, 0.1, [0.2]);
    const wide = computeChartDomain(-2, 3, 2, [-5, 5]);
    expect(narrow[0]).toBeGreaterThan(-1);
    expect(narrow[1]).toBeLessThan(2);
    expect(wide[0]).toBeLessThan(-10);
    expect(wide[1]).toBeGreaterThan(10);
  });
});
