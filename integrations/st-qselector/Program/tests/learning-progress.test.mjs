import assert from "node:assert/strict";
import test from "node:test";
import {
  learningProgressRequestSchema,
  mergeStoredProgress,
  normalizeStoredProgress,
} from "../src/lib/learning/progress.ts";

const base = {
  version: 1,
  completedTopics: ["descriptive-statistics"],
  completedActivities: ["sampling-lab"],
  completedRLessons: ["vectors-and-mean"],
  completedPythonLessons: ["lists-and-mean"],
  lastVisitedRoute: "/r-learning?lessonId=data-frame-filter",
};

test("valid progress payloads pass the request schema", () => {
  const parsed = learningProgressRequestSchema.safeParse({ progress: base, revision: 3 });
  assert.equal(parsed.success, true);
});

test("malformed payloads are rejected instead of stored", () => {
  assert.equal(
    learningProgressRequestSchema.safeParse({ progress: { ...base, version: 2 }, revision: 0 })
      .success,
    false,
  );
  assert.equal(
    learningProgressRequestSchema.safeParse({
      progress: { ...base, completedTopics: "descriptive-statistics" },
      revision: 0,
    }).success,
    false,
  );
  assert.equal(
    learningProgressRequestSchema.safeParse({ progress: base, revision: -1 }).success,
    false,
  );
  assert.equal(
    learningProgressRequestSchema.safeParse({ progress: base, revision: 1.5 }).success,
    false,
  );
});

test("stale writes union completed items instead of overwriting", () => {
  const stored = { ...base, completedRLessons: ["vectors-and-mean", "data-frame-filter"] };
  const incoming = { ...base, completedRLessons: ["vectors-and-mean", "probability-simulation"] };
  const merged = mergeStoredProgress(stored, incoming);
  assert.deepEqual(merged.completedRLessons.sort(), [
    "data-frame-filter",
    "probability-simulation",
    "vectors-and-mean",
  ]);
  assert.equal(merged.lastVisitedRoute, incoming.lastVisitedRoute);
});

test("corrupt database payloads normalise to empty progress", () => {
  assert.deepEqual(normalizeStoredProgress(null).completedTopics, []);
  assert.deepEqual(normalizeStoredProgress({ version: 1 }).completedRLessons, []);
  const kept = normalizeStoredProgress(base);
  assert.equal(kept.completedTopics.length, 1);
});
