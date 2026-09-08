import { truncateStatAiUtf8 } from "@/lib/ai-context-budget";

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CodeTutorRequest {
  language?: "zh" | "en";
  model?: string;
  question?: string;
  lesson?: { title?: string; objective?: string; task?: string; concepts?: string[] };
  code?: string;
  console?: string[];
  review?: string;
  history?: TutorMessage[];
}

function cleanMessages(value: unknown): TutorMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<TutorMessage>;
    if ((candidate.role !== "user" && candidate.role !== "assistant") || typeof candidate.content !== "string") return [];
    const content = truncateStatAiUtf8(candidate.content.trim(), 180);
    return content ? [{ role: candidate.role, content }] : [];
  });
}

export function formatCodeTutorInput(
  body: CodeTutorRequest,
  runtimeName: "R" | "Python",
  maximumBytes: number,
): string {
  const lesson = body.lesson ?? {};
  const input = [
    "LEARNER QUESTION",
    truncateStatAiUtf8(String(body.question ?? "").trim(), 700),
    `CURRENT ${runtimeName} CODE`,
    truncateStatAiUtf8(String(body.code ?? ""), 1_300),
    "LATEST CONSOLE OUTPUT",
    truncateStatAiUtf8(
      Array.isArray(body.console) ? body.console.join("\n") : "No output yet.",
      500,
    ),
    "LATEST AUTOMATIC CHECK",
    truncateStatAiUtf8(String(body.review ?? "Not checked yet."), 200),
    "LESSON CONTEXT",
    [
      `Title: ${truncateStatAiUtf8(String(lesson.title ?? ""), 150)}`,
      `Concepts: ${truncateStatAiUtf8(Array.isArray(lesson.concepts) ? lesson.concepts.join(", ") : "", 250)}`,
      `Objective: ${truncateStatAiUtf8(String(lesson.objective ?? ""), 350)}`,
      `Task: ${truncateStatAiUtf8(String(lesson.task ?? ""), 450)}`,
    ].join("\n"),
    "RECENT CONVERSATION",
    cleanMessages(body.history).map((item) => `${item.role}: ${item.content}`).join("\n"),
  ].join("\n\n");
  return truncateStatAiUtf8(input, maximumBytes);
}
