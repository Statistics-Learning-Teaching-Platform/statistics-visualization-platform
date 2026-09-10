import { NextRequest, NextResponse } from "next/server";
import { resolveStatAiModel, StatAiModelSelectionError } from "@/lib/ai-client";
import { CoursewareInputError, extractCoursewareText } from "@/lib/courseware";
import {
  aiKnowledgeExtraction,
  localKnowledgeExtraction,
  type ExtractedKnowledgePoint,
} from "@/lib/knowledge-extraction";
import { consumeRateLimit, requestPrincipal, withConcurrencyLease } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedFormData } from "@/lib/auth/security";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_DIRECT_TEXT_LENGTH = 80_000;
const MAX_COMBINED_TEXT_LENGTH = 100_000;
const MAX_FORM_BYTES = 16 * 1024 * 1024;

async function readKnowledgeInput(request: NextRequest): Promise<{ text: string; model: string }> {
  return withConcurrencyLease({
    route: "ai-knowledge-parse",
    limit: 3,
    ttlSeconds: 58,
    busyMessage: "课件解析服务当前请求较多，请稍后重试",
    requestSignal: request.signal,
    work: async (signal) => {
      if (signal.aborted) throw signal.reason;
      const form = await readLimitedFormData(request, MAX_FORM_BYTES);
      const model = resolveStatAiModel(form.get("model"));
      const directText = String(form.get("text") ?? "").trim();
      if (directText.length > MAX_DIRECT_TEXT_LENGTH) {
        throw new CoursewareInputError("直接输入的文本不能超过 80,000 个字符。", 413);
      }
      const fileValue = form.get("file");
      const fileText = fileValue instanceof File && fileValue.size > 0
        ? await extractCoursewareText(fileValue)
        : "";
      const text = [directText, fileText].filter(Boolean).join("\n\n").trim();
      if (text.length > MAX_COMBINED_TEXT_LENGTH) {
        throw new CoursewareInputError("课件和考试目标的文本总量不能超过 100,000 个字符。", 413);
      }
      if (text.length < 12) {
        throw new CoursewareInputError("请上传课件或输入更完整的考试目标。");
      }
      return { text, model };
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSession(request, ["teacher", "superadmin"]);
    await verifyCsrf(request, session);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "ai-knowledge",
      limit: 12,
      windowSeconds: 60 * 60,
    });
    const { text, model } = await readKnowledgeInput(request);

    let mode: "ai" | "local" = "local";
    let warning: string | undefined;
    let concepts: ExtractedKnowledgePoint[] | null = null;
    try {
      await consumeRateLimit({ principal: "global", route: "ai-knowledge-budget", limit: 180, windowSeconds: 60 * 60 });
      concepts = await withConcurrencyLease({
        route: "ai-knowledge",
        limit: 6,
        ttlSeconds: 58,
        requestSignal: request.signal,
        work: (signal) => aiKnowledgeExtraction(text, signal, model),
      });
      if (concepts?.length) mode = "ai";
    } catch (error) {
      // A model disappearing between the manual scan and this request must be
      // reported to the user. Silently switching models (or disguising the
      // failure as a local extraction) would make the selection meaningless.
      if (error instanceof StatAiModelSelectionError) throw error;
      warning = error instanceof Error ? `AI 暂不可用，已使用本地提取：${error.message}` : "AI 暂不可用，已使用本地提取";
    }
    if (!concepts?.length) {
      concepts = localKnowledgeExtraction(text);
    }

    return NextResponse.json({ concepts, mode, warning, extractedCharacters: text.length });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    const message = error instanceof Error ? error.message : "课件分析失败";
    return NextResponse.json(
      { error: message },
      { status: error instanceof CoursewareInputError ? error.status : 500 },
    );
  }
}
