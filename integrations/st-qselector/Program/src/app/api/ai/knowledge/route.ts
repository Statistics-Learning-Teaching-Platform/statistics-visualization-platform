import { NextRequest, NextResponse } from "next/server";
import { CoursewareInputError, extractCoursewareText } from "@/lib/courseware";
import {
  aiKnowledgeExtraction,
  localKnowledgeExtraction,
  type ExtractedKnowledgePoint,
} from "@/lib/knowledge-extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DIRECT_TEXT_LENGTH = 80_000;
const MAX_COMBINED_TEXT_LENGTH = 100_000;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const directText = String(form.get("text") ?? "").trim();
    if (directText.length > MAX_DIRECT_TEXT_LENGTH) {
      return NextResponse.json({ error: "直接输入的文本不能超过 80,000 个字符。" }, { status: 413 });
    }
    const fileValue = form.get("file");
    const fileText = fileValue instanceof File && fileValue.size > 0
      ? await extractCoursewareText(fileValue)
      : "";
    const text = [directText, fileText].filter(Boolean).join("\n\n").trim();
    if (text.length > MAX_COMBINED_TEXT_LENGTH) {
      return NextResponse.json({ error: "课件和考试目标的文本总量不能超过 100,000 个字符。" }, { status: 413 });
    }
    if (text.length < 12) {
      return NextResponse.json({ error: "请上传课件或输入更完整的考试目标。" }, { status: 400 });
    }

    let mode: "ai" | "local" = "local";
    let warning: string | undefined;
    let concepts: ExtractedKnowledgePoint[] | null = null;
    try {
      concepts = await aiKnowledgeExtraction(text);
      if (concepts?.length) mode = "ai";
    } catch (error) {
      warning = error instanceof Error ? `AI 暂不可用，已使用本地提取：${error.message}` : "AI 暂不可用，已使用本地提取";
    }
    if (!concepts?.length) {
      concepts = localKnowledgeExtraction(text);
      if (!process.env.OPENAI_API_KEY?.trim()) {
        warning = "未配置服务端 API Key，已使用本地统计学规则完成提取。";
      }
    }

    return NextResponse.json({ concepts, mode, warning, extractedCharacters: text.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "课件分析失败";
    return NextResponse.json(
      { error: message },
      { status: error instanceof CoursewareInputError ? error.status : 500 },
    );
  }
}
