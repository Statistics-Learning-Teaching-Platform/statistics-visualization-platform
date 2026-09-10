type TutorHistoryMessage = { role: "user" | "assistant"; content: string };

type CodeTutorPayloadInput = {
  language: "zh" | "en";
  model: string;
  question: string;
  lesson: {
    title: string;
    objective: string;
    task: string;
    concepts: readonly string[];
  };
  code: string;
  console: readonly string[];
  review: string;
  history: readonly TutorHistoryMessage[];
};

const encoder = new TextEncoder();

function jsonBytes(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).length;
}

/** Bound a string by its encoded JSON size, including escaping overhead. */
export function truncateJsonString(value: string, maxBytes: number): string {
  if (jsonBytes(value) <= maxBytes) return value;
  const characters = Array.from(value);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (jsonBytes(characters.slice(0, middle).join("")) <= maxBytes) low = middle;
    else high = middle - 1;
  }
  return characters.slice(0, low).join("");
}

function boundedStringList(values: readonly string[], maxBytes: number): string[] {
  const result: string[] = [];
  for (const value of values) {
    const remaining = maxBytes - jsonBytes(result) - 1;
    if (remaining <= 2) break;
    const bounded = truncateJsonString(value, remaining);
    if (!bounded) break;
    const candidate = [...result, bounded];
    if (jsonBytes(candidate) > maxBytes) break;
    result.push(bounded);
  }
  return result;
}

function boundedHistory(
  history: readonly TutorHistoryMessage[],
  maxBytes: number,
): TutorHistoryMessage[] {
  const result: TutorHistoryMessage[] = [];
  for (const message of history.slice(-6).reverse()) {
    const emptyEntry = { role: message.role, content: "" };
    const remaining = maxBytes - jsonBytes(result) - jsonBytes(emptyEntry) - 2;
    if (remaining <= 2) break;
    const content = truncateJsonString(message.content.trim(), remaining);
    if (!content) continue;
    const candidate = [{ role: message.role, content }, ...result];
    if (jsonBytes(candidate) > maxBytes) break;
    result.unshift({ role: message.role, content });
  }
  return result;
}

/**
 * Serialize exactly the fields consumed by the tutor route. Per-field JSON
 * budgets leave headroom under its 32 KB byte envelope, even for CJK, emoji,
 * quotes, backslashes, and control characters that expand during stringify.
 */
export function prepareCodeTutorRequest(input: CodeTutorPayloadInput): {
  question: string;
  body: string;
} {
  const question = truncateJsonString(input.question.trim(), 2_400);
  const consoleText = truncateJsonString(input.console.join("\n"), 1_800);
  const payload = {
    language: input.language,
    model: input.model,
    question,
    lesson: {
      title: truncateJsonString(input.lesson.title, 300),
      objective: truncateJsonString(input.lesson.objective, 700),
      task: truncateJsonString(input.lesson.task, 900),
      concepts: boundedStringList(input.lesson.concepts, 600),
    },
    code: truncateJsonString(input.code, 4_000),
    console: consoleText ? [consoleText] : [],
    review: truncateJsonString(input.review, 400),
    history: boundedHistory(input.history, 2_200),
  };
  const body = JSON.stringify(payload);
  if (encoder.encode(body).length > 20_000) {
    throw new Error("Tutor request exceeded its bounded client envelope");
  }
  return { question, body };
}
