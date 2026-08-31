import { beforeEach, describe, expect, it } from "vitest";
import { loadProgress, normalizeProgress, saveProgress } from "../src/learningProgress";

describe("learning progress storage", () => {
  beforeEach(() => localStorage.clear());

  it("filters malformed values and de-duplicates lesson ids", () => {
    expect(normalizeProgress(["lesson-1", 7, "lesson-1", "lesson-2", null])).toEqual([
      "lesson-1",
      "lesson-2",
    ]);
  });

  it("drops stale ids when the current curriculum is provided", () => {
    expect(
      normalizeProgress(["lesson-1", "removed", "lesson-2"], ["lesson-1", "lesson-2"]),
    ).toEqual(["lesson-1", "lesson-2"]);

    localStorage.setItem("progress", JSON.stringify(["lesson-1", "removed"]));
    expect(loadProgress("progress", ["lesson-1"])).toEqual(["lesson-1"]);
    saveProgress("progress", ["lesson-1", "removed"], ["lesson-1"]);
    expect(JSON.parse(localStorage.getItem("progress") ?? "[]")).toEqual(["lesson-1"]);
  });

  it("shares the same safe round trip for R and Python progress keys", () => {
    for (const key of ["statmind-r-learning-progress-v1", "statmind-python-learning-progress-v1"]) {
      saveProgress(key, ["lesson-1", "lesson-1"]);
      expect(loadProgress(key)).toEqual(["lesson-1"]);
    }
  });
});
