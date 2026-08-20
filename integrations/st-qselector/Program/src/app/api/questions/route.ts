import { NextRequest, NextResponse } from "next/server";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";
import type { QuestionsResponse } from "@/lib/types";
import { requireRequestSession } from "@/lib/auth/session";
import { authErrorResponse } from "@/lib/auth/security";

// 返回全部题目 + 章节/难度汇总，前端本地做筛选（题量约数百，足够快）。
export async function GET(request: NextRequest) {
  try {
    const session = await requireRequestSession(request);
    // The reviewed index is generated from Data/Formed at authoring time and
    // checked into the app, so the question bank works on read-only hosts too.
    const body: QuestionsResponse = session.user.role === "student"
      ? {
          ...reviewedQuestionIndex,
          questions: reviewedQuestionIndex.questions.map((question) => ({
            ...question,
            answer: null,
            answerIsImage: false,
          })),
        }
      : reviewedQuestionIndex;
    const etag = `"questions-${body.revision ?? "unversioned"}-${session.user.role}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { "Cache-Control": "private, max-age=0, must-revalidate", ETag: etag, Vary: "Cookie" },
      });
    }
    const response = NextResponse.json(body);
    response.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    response.headers.set("ETag", etag);
    response.headers.set("Vary", "Cookie");
    return response;
  } catch (err) {
    if ((err as { status?: number }).status) return authErrorResponse(err);
    console.error("加载题库失败:", err);
    return NextResponse.json(
      { error: "加载题库失败，请检查 config.yaml 与数据目录。" },
      { status: 500 }
    );
  }
}
