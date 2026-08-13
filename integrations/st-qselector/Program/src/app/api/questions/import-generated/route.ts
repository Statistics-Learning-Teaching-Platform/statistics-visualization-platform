import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getChapterDir, invalidateQuestionCache, loadAllQuestions, loadConfig } from "@/lib/data";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";

const QUESTION_TYPES = new Set(["选择题", "判断题", "填空题", "计算题", "简答题", "综合题"]);

function normalized(value: string): string {
  return value.toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");
}

function validQuestion(value: unknown, chapterIds: Set<string>): value is Question {
  if (!value || typeof value !== "object") return false;
  const question = value as Partial<Question>;
  return Boolean(
    typeof question.id === "string" && /^ai_[a-z0-9_]+$/i.test(question.id) &&
    (question.origin === "variant" || question.origin === "generated") &&
    typeof question.content === "string" && question.content.trim().length >= 20 && question.content.length <= 30_000 &&
    typeof question.answer === "string" && question.answer.trim().length >= 8 && question.answer.length <= 30_000 &&
    typeof question.chapterId === "string" && chapterIds.has(question.chapterId) &&
    typeof question.type === "string" && QUESTION_TYPES.has(question.type) &&
    typeof question.difficulty === "number" && question.difficulty >= 1 && question.difficulty <= 5 &&
    Array.isArray(question.keywords) && question.keywords.length > 0 &&
    Array.isArray(question.attachments) && question.attachments.length === 0 &&
    Array.isArray(question.dataRefs) && question.dataRefs.length === 0 &&
    typeof question.verification === "string" && question.verification.trim().length > 0
  );
}

function writeJsonAtomic(file: string, value: unknown): void {
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temp, file);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { questions?: unknown[] };
    const incoming = Array.isArray(body.questions) ? body.questions.slice(0, 40) : [];
    if (!incoming.length) return NextResponse.json({ imported: 0, reused: 0, idMap: {} });

    const readOnlyDeployment = process.env.VERCEL === "1";
    const chapterIds = new Set(
      (readOnlyDeployment ? reviewedQuestionIndex.chapters : loadConfig().chapters).map((chapter) => chapter.id),
    );
    if (!incoming.every((question) => validQuestion(question, chapterIds))) {
      return NextResponse.json({ error: "AI 题目未通过入库校验" }, { status: 400 });
    }

    const existing = readOnlyDeployment ? reviewedQuestionIndex.questions : loadAllQuestions();
    const existingIds = new Set(existing.map((question) => question.id));
    const contentToId = new Map(existing.map((question) => [normalized(question.content), question.id]));
    const idMap: Record<string, string> = {};
    const acceptedByChapter = new Map<string, Question[]>();
    let reused = 0;

    for (const question of incoming as Question[]) {
      if (existingIds.has(question.id)) {
        idMap[question.id] = question.id;
        reused++;
        continue;
      }
      const duplicateId = contentToId.get(normalized(question.content));
      if (duplicateId) {
        idMap[question.id] = duplicateId;
        reused++;
        continue;
      }
      const group = acceptedByChapter.get(question.chapterId) ?? [];
      group.push(question);
      acceptedByChapter.set(question.chapterId, group);
      existingIds.add(question.id);
      contentToId.set(normalized(question.content), question.id);
      idMap[question.id] = question.id;
    }

    // Serverless deployments have a read-only bundle. The browser selection
    // store is the durable session-level bank for generated questions there;
    // return the accepted IDs so the teacher can continue assembling/exporting.
    if (readOnlyDeployment) {
      return NextResponse.json({
        imported: [...acceptedByChapter.values()].reduce((sum, questions) => sum + questions.length, 0),
        reused,
        idMap,
        persisted: false,
      });
    }

    let imported = 0;
    for (const [chapterId, questions] of acceptedByChapter) {
      const chapterDir = getChapterDir(chapterId);
      if (!chapterDir) throw new Error(`找不到章节 ${chapterId}`);
      const questionFile = path.join(chapterDir, "questions.json");
      const answerFile = path.join(chapterDir, "answers.json");
      const questionData = JSON.parse(fs.readFileSync(questionFile, "utf8")) as { chapter?: string; questions?: unknown[] };
      const answerData = fs.existsSync(answerFile)
        ? JSON.parse(fs.readFileSync(answerFile, "utf8")) as { chapter?: string; answers?: unknown[] }
        : { chapter: chapterId, answers: [] };
      const rawQuestions = Array.isArray(questionData.questions) ? questionData.questions : [];
      const rawAnswers = Array.isArray(answerData.answers) ? answerData.answers : [];
      for (const question of questions) {
        const reviewStatus = "AI generated, independently verified, and accepted by teacher during paper assembly; reviewed";
        rawQuestions.push({
          id: question.id,
          group_id: question.groupId,
          part_count: question.partCount,
          content: question.content,
          source: question.source,
          type: question.type,
          difficulty: question.difficulty,
          keywords: question.keywords,
          topic_ids: question.topicIds,
          formula_refs: [],
          data_refs: [],
          origin: question.origin,
          parent_question_id: question.parentQuestionId ?? null,
          verification: question.verification,
          review_status: reviewStatus,
          audit_pack: "ai-paper-assembly-v1",
        });
        rawAnswers.push({
          id: question.id,
          answer: question.answer,
          review_status: reviewStatus,
          audit_pack: "ai-paper-assembly-v1",
        });
        imported++;
      }
      writeJsonAtomic(questionFile, { ...questionData, questions: rawQuestions });
      writeJsonAtomic(answerFile, { ...answerData, answers: rawAnswers });
    }

    invalidateQuestionCache();
    return NextResponse.json({ imported, reused, idMap });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 题目入库失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
