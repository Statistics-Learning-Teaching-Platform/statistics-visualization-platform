import { loadPortalSession } from "../auth/session";
import { authenticatedFetch } from "../authenticatedFetch";
import {
  hasRecordedProgress,
  type LearningProgress,
  loadLearningProgress,
  mergeLearningProgress,
  saveLearningProgress,
  setProgressChangeHandler,
} from "./progressStore";

const ENDPOINT = "/st-qselector/api/learning/progress";

type ServerProgressResponse = {
  progress: LearningProgress | null;
  revision?: number;
};

type ServerWriteResponse = {
  progress?: LearningProgress;
  revision?: number;
  merged?: boolean;
};

let serverRevision: number | null = null;
let syncPromise: Promise<void> | null = null;
let pushChain: Promise<void> = Promise.resolve();
let pushCount = 0;
let changeHandlerInstalled = false;

function sameProgress(a: LearningProgress, b: LearningProgress): boolean {
  const key = (progress: LearningProgress) =>
    JSON.stringify({
      t: [...progress.completedTopics].sort(),
      a: [...progress.completedActivities].sort(),
      r: [...progress.completedRLessons].sort(),
      p: [...progress.completedPythonLessons].sort(),
    });
  return key(a) === key(b);
}

function normalizeServerProgress(
  value: ServerProgressResponse["progress"],
): LearningProgress | null {
  if (!value || typeof value !== "object") return null;
  const list = (items: unknown): string[] =>
    Array.isArray(items)
      ? [
          ...new Set(
            items.filter((item): item is string => typeof item === "string" && item.length > 0),
          ),
        ]
      : [];
  return {
    version: 1,
    completedTopics: list(value.completedTopics),
    completedActivities: list(value.completedActivities),
    completedRLessons: list(value.completedRLessons),
    completedPythonLessons: list(value.completedPythonLessons),
    lastVisitedRoute:
      typeof value.lastVisitedRoute === "string" && value.lastVisitedRoute
        ? value.lastVisitedRoute
        : "/teaching-platform",
  };
}

async function readServerProgress(): Promise<ServerProgressResponse | null> {
  try {
    const response = await fetch(ENDPOINT, { credentials: "same-origin" });
    if (!response.ok) return null;
    return (await response.json()) as ServerProgressResponse;
  } catch {
    return null;
  }
}

async function writeToServer(progress: LearningProgress): Promise<void> {
  try {
    const response = await authenticatedFetch(ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress, revision: serverRevision ?? 0 }),
    });
    // 401 means the session lapsed; the local copy stays until the next
    // sign-in triggers a fresh bootstrap merge.
    if (response.status === 401 || !response.ok) return;
    const payload = (await response.json()) as ServerWriteResponse;
    if (typeof payload.revision === "number") serverRevision = payload.revision;
    if (payload.merged && payload.progress) {
      saveLearningProgress(normalizeServerProgress(payload.progress) ?? progress);
    }
  } catch {
    // Offline or worker unavailable: localStorage keeps being the fallback.
  }
}

function queuePush(progress: LearningProgress): void {
  pushCount += 1;
  pushChain = pushChain.then(() => writeToServer(progress));
}

/**
 * Pulls the account's server-side progress, union-merges it with the local
 * copy, and pushes the merged state back when either side changed. Anonymous
 * visitors keep the localStorage-only behaviour.
 */
export async function syncLearningProgress(): Promise<void> {
  const session = await loadPortalSession();
  if (session.status !== "authenticated") return;

  const pushCountAtStart = pushCount;
  const server = await readServerProgress();
  if (!server) return;
  // A push that raced this GET already carries a fresher revision.
  if (pushCount === pushCountAtStart && typeof server.revision === "number") {
    serverRevision = server.revision;
  }

  const serverProgress = normalizeServerProgress(server.progress);
  if (!serverProgress) {
    if (serverRevision === null) serverRevision = 0;
    const local = loadLearningProgress();
    if (hasRecordedProgress(local)) await writeToServer(local);
    return;
  }

  if (serverRevision === null) serverRevision = 0;
  const local = loadLearningProgress();
  const merged = mergeLearningProgress(serverProgress, local);
  if (!sameProgress(local, merged)) saveLearningProgress(merged);
  if (!sameProgress(serverProgress, merged)) await writeToServer(merged);
}

/** Runs the sync once per page load; repeated calls share the promise. */
export function ensureLearningProgressSynced(): Promise<void> {
  syncPromise ??= syncLearningProgress().catch(() => undefined);
  return syncPromise;
}

/**
 * Wires localStorage writes through to the account store. Installed at app
 * bootstrap; pushes are skipped until a signed-in session is cached.
 */
export function bootstrapProgressSync(): void {
  if (changeHandlerInstalled) return;
  changeHandlerInstalled = true;
  setProgressChangeHandler((progress) => {
    void loadPortalSession().then((session) => {
      if (session.status === "authenticated") queuePush(progress);
    });
  });
  void ensureLearningProgressSynced();
}

/** Test hook: clears cached sync state between cases. */
export function resetProgressSyncForTests(): void {
  serverRevision = null;
  syncPromise = null;
  pushChain = Promise.resolve();
  pushCount = 0;
  changeHandlerInstalled = false;
  setProgressChangeHandler(null);
}
