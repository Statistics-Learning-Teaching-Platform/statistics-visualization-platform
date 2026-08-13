import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorRequest {
  topicId?: string;
  lessonId?: string;
  learningObjective?: string;
  currentParameters?: Record<string, unknown>;
  currentCode?: string;
  consoleOutput?: string[];
  chartSummary?: string;
  language?: "zh" | "en";
  question?: string;
  lesson?: {
    title?: string;
    objective?: string;
    task?: string;
    concepts?: string[];
  };
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
    const content = candidate.content.trim().slice(0, 2_000);
    return content ? [{ role: candidate.role, content }] : [];
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TutorRequest;
    const question = String(body.question ?? "").trim().slice(0, 3_000);
    if (!question) return NextResponse.json({ error: "请输入问题" }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "服务端尚未配置 AI API Key" }, { status: 503 });

    const language = body.language === "en" ? "English" : "Simplified Chinese";
    const lesson = body.lesson ?? {};
    const context = [
      `Lesson: ${String(lesson.title ?? "").slice(0, 300)}`,
      `Topic ID: ${String(body.topicId ?? "").slice(0, 200)}`,
      `Lesson ID: ${String(body.lessonId ?? "").slice(0, 200)}`,
      `Concepts: ${Array.isArray(lesson.concepts) ? lesson.concepts.join(", ").slice(0, 500) : ""}`,
      `Objective: ${String(lesson.objective ?? "").slice(0, 1_000)}`,
      `Learning objective: ${String(body.learningObjective ?? "").slice(0, 1_000)}`,
      `Task: ${String(lesson.task ?? "").slice(0, 1_500)}`,
      `Current parameters: ${JSON.stringify(body.currentParameters ?? {}).slice(0, 2_000)}`,
      `Current Python code:\n${String(body.currentCode ?? body.code ?? "").slice(0, 8_000)}`,
      `Latest console output:\n${Array.isArray(body.consoleOutput) ? body.consoleOutput.join("\n").slice(0, 5_000) : Array.isArray(body.console) ? body.console.join("\n").slice(0, 5_000) : "No output yet."}`,
      `Chart summary: ${String(body.chartSummary ?? "No chart summary.").slice(0, 1_000)}`,
      `Latest automatic check: ${String(body.review ?? "Not checked yet.").slice(0, 1_000)}`,
    ].join("\n\n");

    const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `You are StatMind's Python programming teaching assistant. Reply in ${language}. Use the supplied lesson, learner code, console output, and check result as authoritative context. Teach Python for statistical analysis with NumPy, pandas, Matplotlib, and SciPy. Diagnose the learner's exact current problem, explain the relevant concept, and give one small actionable next step. Prefer hints and short corrected snippets over replacing the whole exercise. Never invent runtime output. If the learner explicitly asks for the full solution, you may provide it with an explanation. Keep the answer concise, well formatted, and under 350 words.`,
            },
            { role: "system", content: `CURRENT LEARNING CONTEXT\n\n${context}` },
            ...cleanMessages(body.history),
            { role: "user", content: question },
          ],
        }),
      });

      if (!response.ok) throw new Error(`AI service returned ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error("AI returned an empty response");
      return NextResponse.json({ answer });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
