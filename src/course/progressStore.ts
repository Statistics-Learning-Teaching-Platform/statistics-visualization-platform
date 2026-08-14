export type LearningProgress = {
  version: 1;
  completedTopics: string[];
  completedActivities: string[];
  completedRLessons: string[];
  completedPythonLessons: string[];
  lastVisitedRoute: string;
};

const PROGRESS_KEY = "statmind-learning-progress-v1";
const LEGACY_KEYS = {
  r: "statmind-r-learning-progress-v1",
  python: "statmind-python-learning-progress-v1",
} as const;

const emptyProgress = (): LearningProgress => ({
  version: 1,
  completedTopics: [],
  completedActivities: [],
  completedRLessons: [],
  completedPythonLessons: [],
  lastVisitedRoute: "/teaching-platform",
});

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))]
    : [];
}

function parseList(value: string | null): string[] {
  if (!value) return [];
  try { return stringList(JSON.parse(value)); } catch { return []; }
}

export function loadLearningProgress(storage: Pick<Storage, "getItem"> = localStorage): LearningProgress {
  const fallback = emptyProgress();
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LearningProgress>;
      return {
        version: 1,
        completedTopics: stringList(parsed.completedTopics),
        completedActivities: stringList(parsed.completedActivities),
        completedRLessons: stringList(parsed.completedRLessons),
        completedPythonLessons: stringList(parsed.completedPythonLessons),
        lastVisitedRoute: typeof parsed.lastVisitedRoute === "string" ? parsed.lastVisitedRoute : fallback.lastVisitedRoute,
      };
    }
    return {
      ...fallback,
      completedRLessons: parseList(storage.getItem(LEGACY_KEYS.r)),
      completedPythonLessons: parseList(storage.getItem(LEGACY_KEYS.python)),
    };
  } catch {
    return fallback;
  }
}

export function saveLearningProgress(
  progress: LearningProgress,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try { storage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* storage is optional */ }
}

export function saveCodeLessonProgress(
  language: "r" | "python",
  lessonIds: string[],
  completedTopicId: string | undefined,
  lastVisitedRoute: string,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): LearningProgress {
  const current = loadLearningProgress(storage);
  const next: LearningProgress = {
    ...current,
    completedTopics: [...new Set([...current.completedTopics, ...(completedTopicId ? [completedTopicId] : [])])],
    completedRLessons: language === "r" ? stringList(lessonIds) : current.completedRLessons,
    completedPythonLessons: language === "python" ? stringList(lessonIds) : current.completedPythonLessons,
    lastVisitedRoute,
  };
  saveLearningProgress(next, storage);
  return next;
}
