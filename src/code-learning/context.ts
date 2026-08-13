import type { CodeLearningContext, CodeLesson } from "./types";

function safeJsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/learn";
}

export function resolveCodeLearningContext(
  search: string,
  lessons: readonly CodeLesson[],
): CodeLearningContext {
  const query = new URLSearchParams(search);
  const requestedLesson = query.get("lessonId");
  const requestedTopic = query.get("topicId") ?? undefined;
  const matchingLesson = lessons.find((lesson) =>
    lesson.id === requestedLesson && (!requestedTopic || lesson.topicId === requestedTopic),
  );
  const topicLesson = requestedTopic
    ? lessons.find((lesson) => lesson.topicId === requestedTopic)
    : undefined;
  const lesson = matchingLesson ?? topicLesson ?? lessons[0];
  if (!lesson) throw new Error("A coding workspace requires at least one lesson");
  return {
    topicId: lesson.topicId,
    lessonId: lesson.id,
    returnTo: safeReturnPath(query.get("returnTo")),
    currentParameters: safeJsonObject(query.get("parameters")),
    caseId: query.get("caseId") ?? lesson.caseId,
  };
}

export function createMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
