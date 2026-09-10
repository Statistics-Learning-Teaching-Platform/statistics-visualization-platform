import type { CodeLearningContext, CodeLesson } from "./types";

type TutorHistoryMessage = { role: "user" | "assistant"; content: string };

/** Keep follow-up requests within the tutor routes' history and body limits. */
export function buildTutorHistory(messages: readonly TutorHistoryMessage[]): TutorHistoryMessage[] {
  const encoder = new TextEncoder();
  let remainingBytes = 8_000;
  const history: TutorHistoryMessage[] = [];
  for (const message of messages.slice(-6).reverse()) {
    const bounded = message.content
      .trim()
      .slice(0, 2_000)
      .replace(/[\uD800-\uDBFF]$/, "");
    let content = "";
    for (const character of bounded) {
      const bytes = encoder.encode(character).length;
      if (bytes > remainingBytes) break;
      content += character;
      remainingBytes -= bytes;
    }
    if (content.trim()) history.unshift({ role: message.role, content });
    if (remainingBytes === 0) break;
  }
  return history;
}

function safeJsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function safeReturnPath(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const base = new URL("https://statmind.invalid/");
    const target = new URL(value, base);
    if (target.origin !== base.origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export function resolveCodeLearningContext(
  search: string,
  lessons: readonly CodeLesson[],
): CodeLearningContext {
  const query = new URLSearchParams(search);
  const requestedLesson = query.get("lessonId");
  const requestedTopic = query.get("topicId") ?? undefined;
  const matchingLesson = lessons.find(
    (lesson) =>
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
  return (
    globalThis.crypto?.randomUUID?.() ??
    `message-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
