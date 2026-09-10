import { z } from "zod";

// Completed-item ids are curriculum slugs; generous caps keep a hostile
// client from storing unbounded junk while never rejecting real progress.
const idList = z.array(z.string().min(1).max(120)).max(2_000);

export const learningProgressPayloadSchema = z.object({
  version: z.literal(1),
  completedTopics: idList,
  completedActivities: idList,
  completedRLessons: idList,
  completedPythonLessons: idList,
  lastVisitedRoute: z.string().min(1).max(300),
});

export const learningProgressRequestSchema = z.object({
  progress: learningProgressPayloadSchema,
  revision: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER),
});

export type StoredLearningProgress = z.infer<typeof learningProgressPayloadSchema>;

const EMPTY_PROGRESS: StoredLearningProgress = {
  version: 1,
  completedTopics: [],
  completedActivities: [],
  completedRLessons: [],
  completedPythonLessons: [],
  lastVisitedRoute: "/teaching-platform",
};

/** DB values are jsonb written by this API, but normalise anyway on read. */
export function normalizeStoredProgress(value: unknown): StoredLearningProgress {
  const parsed = learningProgressPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_PROGRESS;
}

function union(left: readonly string[], right: readonly string[]): string[] {
  return [...new Set([...left, ...right])];
}

/**
 * Completed lists are sets, so a stale-revision write merges by union instead
 * of overwriting; `incoming` wins for lastVisitedRoute (most recent device).
 */
export function mergeStoredProgress(
  stored: StoredLearningProgress,
  incoming: StoredLearningProgress,
): StoredLearningProgress {
  return {
    version: 1,
    completedTopics: union(stored.completedTopics, incoming.completedTopics),
    completedActivities: union(stored.completedActivities, incoming.completedActivities),
    completedRLessons: union(stored.completedRLessons, incoming.completedRLessons),
    completedPythonLessons: union(stored.completedPythonLessons, incoming.completedPythonLessons),
    lastVisitedRoute: incoming.lastVisitedRoute,
  };
}
