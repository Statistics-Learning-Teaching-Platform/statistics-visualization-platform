import { NextResponse } from "next/server";
import { loadAllQuestions, loadConfig } from "@/lib/data";
import type { QuestionsResponse } from "@/lib/types";

// 返回全部题目 + 章节/难度汇总，前端本地做筛选（题量约数百，足够快）。
export async function GET() {
  try {
    const cfg = loadConfig();
    const questions = loadAllQuestions();

    const countByChapter = new Map<string, number>();
    for (const q of questions) {
      countByChapter.set(q.chapterId, (countByChapter.get(q.chapterId) || 0) + 1);
    }

    const chapters = cfg.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      num: parseInt(c.id.replace(/\D/g, ""), 10) || 0,
      count: countByChapter.get(c.id) || 0,
    }));

    const difficulties = [...new Set(questions.map((q) => q.difficulty))].sort(
      (a, b) => a - b
    );

    const body: QuestionsResponse = { chapters, difficulties, questions };
    const response = NextResponse.json(body);
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=3600");
    return response;
  } catch (err) {
    console.error("加载题库失败:", err);
    return NextResponse.json(
      { error: "加载题库失败，请检查 config.yaml 与数据目录。" },
      { status: 500 }
    );
  }
}
