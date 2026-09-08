import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { callStatAiWithReasoning, resolveStatAiModel } from "@/lib/ai-client";
import { statAiInputByteBudget } from "@/lib/ai-context-budget";
import { consumeRateLimit, requestPrincipal, withConcurrencyLease } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";
import { formatCodeTutorInput, type CodeTutorRequest } from "@/lib/code-tutor-context";

const SAFE_MERMAID_GUIDANCE =
  "When a categorical comparison or proportion breakdown is clearer as a chart, you may include at most one Mermaid fenced block. Use only this exact safe subset: xychart-beta with an optional quoted title, quoted categorical x-axis JSON array, finite numeric y-axis min --> max, and bar/line numeric JSON arrays; when an xychart has multiple bar/line series, every series must have a unique non-empty quoted name; or pie showData with an optional quoted title and quoted labels with nonnegative numeric values. Put every plotted value in the prose too. Never emit directives, comments, HTML, links, click handlers, styles, classes, or a Mermaid block for scatterplots, histograms, dotplots, stem-and-leaf displays, boxplots, or any chart whose values are not supplied. Otherwise do not include a Mermaid block.";
const CODE_TUTOR_MAX_OUTPUT_TOKENS = 2_048;

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
      const body = await readLimitedJson(request, 32_000) as CodeTutorRequest;
      const question = String(body.question ?? "").trim().slice(0, 3_000);
      if (!question) throw new AuthError(400, "请输入问题");
      const model = resolveStatAiModel(body.model);

      const language = body.language === "en" ? "English" : "Simplified Chinese";
      const systemPrompt = `You are StatMind's ${options.runtimeName} programming teaching assistant. Reply in ${language}. ${options.systemDetail} Use the supplied lesson, learner code, console output, and check result as authoritative context. Diagnose the learner's exact current problem, explain the relevant concept, and give one small actionable next step. Prefer hints and short corrected snippets over replacing the whole exercise. Never invent runtime output. ${SAFE_MERMAID_GUIDANCE} If the learner explicitly asks for the full solution, you may provide it with an explanation. Keep the answer concise, well formatted, and under 350 words.`;
      const input = formatCodeTutorInput(
        body,
        options.runtimeName,
        statAiInputByteBudget(systemPrompt, CODE_TUTOR_MAX_OUTPUT_TOKENS),
      );

      return await withConcurrencyLease({
        route: "ai-tutor",
        limit: 8,
        ttlSeconds: 58,
        requestSignal: request.signal,
        work: async (signal) => {
          const completion = await callStatAiWithReasoning({
            signal,
            model,
            maxOutputTokens: CODE_TUTOR_MAX_OUTPUT_TOKENS,
            systemPrompt,
            input,
          });
          return NextResponse.json({ answer: completion.message, reasoning: completion.reasoning });
        },
      });
    } catch (error) {
      return authErrorResponse(error);
    }
  };
}
