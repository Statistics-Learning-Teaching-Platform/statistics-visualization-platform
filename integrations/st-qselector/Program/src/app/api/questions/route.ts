import { NextResponse } from "next/server";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";
import type { QuestionsResponse } from "@/lib/types";

// 返回全部题目 + 章节/难度汇总，前端本地做筛选（题量约数百，足够快）。
export async function GET() {
  try {
    // The reviewed index is generated from Data/Formed at authoring time and
    // checked into the app, so the question bank works on read-only hosts too.
    const body: QuestionsResponse = reviewedQuestionIndex;
    const response = NextResponse.json(body);
    // 题库会在教师采用 AI 题后发生变化；禁止浏览器复用旧响应，确保新题立即可见。
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (err) {
    console.error("加载题库失败:", err);
    return NextResponse.json(
      { error: "加载题库失败，请检查 config.yaml 与数据目录。" },
      { status: 500 }
    );
  }
}
