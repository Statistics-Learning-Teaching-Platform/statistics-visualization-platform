import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { callStatAi, resolveStatAiModel } from "@/lib/ai-client";
import { consumeRateLimit, requestPrincipal, withConcurrencyLease } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorRequest {
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
    const content = candidate.content.trim().slice(0, 2_000);
    return content ? [{ role: candidate.role, content }] : [];
  });
}

export function createTutorPost(options: {
  runtimeName: "R" | "Python";
  route: "r-tutor" | "python-tutor";
  systemDetail: string;
}) {
  return async function POST(request: NextRequest) {
    try {
      assertSafeOrigin(request);
      const session = await requireRequestSession(request);
      await verifyCsrf(request, session);
      await consumeRateLimit({
        principal: await requestPrincipal(request, session.user.id),
        route: options.route,
        limit: 30,
        windowSeconds: 60 * 60,
      });
      await consumeRateLimit({ principal: "global", route: "ai-tutor-budget", limit: 300, windowSeconds: 60 * 60 });
      const body = await readLimitedJson(request, 32_000) as TutorRequest;
      const question = String(body.question ?? "").trim().slice(0, 3_000);
      if (!question) throw new AuthError(400, "请输入问题");

      const language = body.language === "en" ? "English" : "Simplified Chinese";
      const lesson = body.lesson ?? {};
      const context = [
        `Lesson: ${String(lesson.title ?? "").slice(0, 300)}`,
        `Concepts: ${Array.isArray(lesson.concepts) ? lesson.concepts.join(", ").slice(0, 500) : ""}`,
        `Objective: ${String(lesson.objective ?? "").slice(0, 1_000)}`,
        `Task: ${String(lesson.task ?? "").slice(0, 1_500)}`,
        `Current ${options.runtimeName} code:\n${String(body.code ?? "").slice(0, 8_000)}`,
        `Latest console output:\n${Array.isArray(body.console) ? body.console.join("\n").slice(0, 5_000) : "No output yet."}`,
        `Latest automatic check: ${String(body.review ?? "Not checked yet.").slice(0, 1_000)}`,
      ].join("\n\n");

      return await withConcurrencyLease({
        route: "ai-tutor",
        limit: 8,
        ttlSeconds: 58,
        requestSignal: request.signal,
        work: async (signal) => {
          const answer = await callStatAi({
            signal,
            model: resolveStatAiModel(body.model),
            systemPrompt: `You are StatMind's ${options.runtimeName} programming teaching assistant. Reply in ${language}. ${options.systemDetail} Use the supplied lesson, learner code, console output, and check result as authoritative context. Diagnose the learner's exact current problem, explain the relevant concept, and give one small actionable next step. Prefer hints and short corrected snippets over replacing the whole exercise. Never invent runtime output. If the learner explicitly asks for the full solution, you may provide it with an explanation. Keep the answer concise, well formatted, and under 350 words.`,
            input: `${context}\n\nRECENT CONVERSATION\n${cleanMessages(body.history).map((item) => `${item.role}: ${item.content}`).join("\n")}\n\nLEARNER QUESTION\n${question}`,
          });
          return NextResponse.json({ answer });
        },
      });
    } catch (error) {
      return authErrorResponse(error);
    }
  };
}
