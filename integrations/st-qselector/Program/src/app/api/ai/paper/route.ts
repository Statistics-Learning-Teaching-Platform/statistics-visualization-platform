import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { evaluatePaperQuality, questionMatchesKnowledge, selectQuestionsFromBlueprint, type PaperBlueprint } from "@/lib/blueprint";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";
import type { Question } from "@/lib/types";
import { normalizeTopicIds } from "@/lib/topic-mapping";
import { getTextbookChapterIdsForTopics } from "@/lib/textbook-chapters";

export const runtime = "nodejs";
export const maxDuration = 120;

const QUESTION_TYPES = new Set(["选择题", "判断题", "填空题", "计算题", "简答题", "综合题"]);

interface GenerationJob {
  concept: string;
  origin: "variant" | "generated";
  variantKind?: "parameter" | "context";
  parentQuestionId: string | null;
  chapterId: string;
}

interface GeneratedDraft {
  index?: number;
  concept?: string;
  type?: string;
  difficulty?: number;
  chapterId?: string;
  content?: string;
  answer?: string;
  verification?: string;
}

function safeJson(value: string): unknown {
  const clean = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(clean);
}

async function callJson(system: string, user: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("未配置服务端 API Key");
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "deepseek-v4-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!response.ok) throw new Error(`AI 服务返回 ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI 没有返回内容");
    return safeJson(content) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function mapConceptToChapter(label: string): string {
  const value = label.toLowerCase();
  if (/regression|correlation|least.?squares/.test(value)) return "Ch13";
  if (/two.?sample|paired|anova/.test(value)) return "Ch10";
  if (/hypothesis|p-value|type i|type ii|power/.test(value)) return "Ch09";
  if (/confidence|estimat|margin of error/.test(value)) return "Ch08";
  if (/central limit|sampling distribution/.test(value)) return "Ch07";
  if (/normal|binomial|poisson|distribution|probability/.test(value)) return "Ch06";
  if (/bootstrap|permutation|monte carlo|mcmc|gibbs|metropolis|simulation/.test(value)) return "Ch12";
  return "Ch01";
}

function sanitizeDraft(draft: GeneratedDraft, job: GenerationJob, position: number): Question | null {
  const content = String(draft.content ?? "").trim();
  const answer = String(draft.answer ?? "").trim();
  if (content.length < 20 || answer.length < 8) return null;
  const type = QUESTION_TYPES.has(String(draft.type)) ? String(draft.type) : "简答题";
  const difficulty = Math.max(1, Math.min(5, Math.round(Number(draft.difficulty) || 2)));
  const chapterId = /^Ch(?:0[1-9]|1[0-3])$/.test(String(draft.chapterId)) ? String(draft.chapterId) : job.chapterId;
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
  const id = `ai_${chapterId.toLowerCase()}_${Date.now()}_${position + 1}_${suffix}`;
  const keywords = [String(draft.concept ?? job.concept).trim() || job.concept];
  const topicIds = normalizeTopicIds(chapterId, keywords);
  return {
    id,
    groupId: id,
    partCount: Math.max(1, (content.match(/(?:^|\n)\s*(?:[a-h][.)]|\([a-h]\))\s+/gim) ?? []).length || 1),
    selectionUnit: "atomic",
    chapterId,
    chapterTitle: `第${Number(chapterId.slice(2))}章`,
    chapterNum: Number(chapterId.slice(2)),
    content,
    source: job.origin === "variant" && job.parentQuestionId
      ? `AI variant based on ${job.parentQuestionId}`
      : `AI generated for ${job.concept}`,
    type,
    difficulty,
    estimatedMinutes: Math.max(1, Math.min(60, difficulty * (type === "综合题" ? 5 : 3))),
    keywords,
    topicIds,
    textbookChapterIds: getTextbookChapterIdsForTopics(topicIds),
    dataRefs: [],
    attachments: [],
    answer,
    answerIsImage: false,
    isComplete: true,
    isReviewed: false,
    reviewStatus: "AI independently generated and verified; teacher confirmation required",
    origin: job.origin,
    variantKind: job.variantKind,
    parentQuestionId: job.parentQuestionId,
    verification: String(draft.verification ?? "").trim() || "Independent verifier confirmed that the question is self-contained and the answer follows from the stated information.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { blueprint?: PaperBlueprint; variantPercent?: number };
    const blueprint = body.blueprint;
    if (!blueprint || !Array.isArray(blueprint.knowledgePoints)) {
      return NextResponse.json({ error: "缺少有效的组卷蓝图" }, { status: 400 });
    }
    const selectedConcepts = blueprint.knowledgePoints.filter((point) => point.selected && point.label.trim());
    if (!selectedConcepts.length) {
      return NextResponse.json({ error: "请先确认至少一个知识点" }, { status: 400 });
    }
    const targetCount = Math.max(1, Math.min(40, Math.round(blueprint.totalQuestions || blueprint.targetCount)));
    const variantPercent = Math.max(0, Math.min(70, Number(body.variantPercent) || 30));
    const desiredAiCount = Math.min(targetCount, Math.round(targetCount * variantPercent / 100));
    const bankTarget = Math.max(Math.min(targetCount, selectedConcepts.length), targetCount - desiredAiCount);
    const bankBlueprint = { ...blueprint, targetCount: bankTarget };
    const bankQuestionsSource = reviewedQuestionIndex.questions;
    const bankSelection = selectQuestionsFromBlueprint(bankQuestionsSource, bankBlueprint, { relevantOnly: true });
    const bankQuestions: Question[] = bankSelection.questions.map((question) => ({
      ...question,
      origin: question.origin ?? "bank",
    }));
    const generatedNeeded = Math.max(0, targetCount - bankSelection.unitCount);

    if (!generatedNeeded) {
      const report = evaluatePaperQuality(bankQuestions, blueprint);
      return NextResponse.json({
        ids: bankQuestions.map((question) => question.id),
        questions: bankQuestions,
        generatedQuestions: [],
        report,
        sources: { bank: bankSelection.unitCount, variant: 0, generated: 0 },
      });
    }

    const jobs: GenerationJob[] = [];
    // Exhaust reviewed-bank seeds as parameter variants, then context variants.
    // Only create an entirely new item if no reviewed seed exists for the target.
    for (let index = 0; index < generatedNeeded; index++) {
      const point = selectedConcepts[index % selectedConcepts.length];
      const seed = bankQuestions.find((question) => questionMatchesKnowledge(question, point.label)) ?? bankQuestions[index % Math.max(1, bankQuestions.length)];
      jobs.push({
        concept: point.label,
        origin: seed ? "variant" : "generated",
        variantKind: seed ? (index % 2 === 0 ? "parameter" : "context") : undefined,
        parentQuestionId: seed?.id ?? null,
        chapterId: seed?.chapterId ?? mapConceptToChapter(point.label),
      });
    }
    const seeds = jobs.map((job, index) => {
      const seed = job.parentQuestionId ? bankQuestions.find((question) => question.id === job.parentQuestionId) : null;
      return { index, ...job, seed: seed ? { id: seed.id, type: seed.type, difficulty: seed.difficulty, content: seed.content, answer: seed.answer } : null };
    });
    const generatedPayload = await callJson(
      "You are a statistics assessment author. Create self-contained English questions with complete, independently derivable English answers. Return JSON only as {questions:[{index,concept,type,difficulty,chapterId,content,answer,verification}]}, with exactly one item for every input job and the same index. Never refer to a missing figure, previous exercise, external table, file, or unstated data. Use Markdown tables and $...$/$$...$$ LaTeX. For a variant preserve only the tested concept and solution structure; change context, values, wording, and recompute every result. The answer must show all calculations and conclusions for computation questions. Allowed question types are: 选择题, 判断题, 填空题, 计算题, 简答题, 综合题.",
      JSON.stringify({ targetDifficulty: blueprint.targetDifficulty, difficultyDistribution: blueprint.difficultyDistribution, questionTypeCounts: blueprint.questionTypeCounts, estimatedMinutes: blueprint.estimatedMinutes, allowedTypes: blueprint.types, jobs: seeds }),
    );
    const firstPass = Array.isArray(generatedPayload.questions) ? generatedPayload.questions as GeneratedDraft[] : [];
    if (firstPass.length !== jobs.length) throw new Error(`AI 只生成了 ${firstPass.length}/${jobs.length} 道题`);

    const verificationPayload = await callJson(
      "You are an independent statistics answer verifier. Do not trust the proposed answers. Solve each question from scratch, check every subpart, units, rounding, hypotheses, test direction, degrees of freedom, p-values and confidence intervals. Rewrite any flawed or unclear question into a self-contained solvable English question and provide the corrected complete English answer. Return JSON only: {questions:[{index,concept,type,difficulty,chapterId,content,answer,verification}]}. Keep the same number and indices. Do not output uncertainty or pending-review language.",
      JSON.stringify({ questions: firstPass.map((item, index) => ({ index, ...item })) }),
    );
    const verifiedDrafts = Array.isArray(verificationPayload.questions) ? verificationPayload.questions as GeneratedDraft[] : [];
    if (verifiedDrafts.length !== jobs.length) throw new Error(`独立校验只返回了 ${verifiedDrafts.length}/${jobs.length} 道题`);
    const generatedQuestions = verifiedDrafts
      .map((draft, index) => sanitizeDraft(draft, jobs[index], index))
      .filter((question): question is Question => Boolean(question));
    if (generatedQuestions.length !== jobs.length) throw new Error("部分 AI 题目未通过完整性校验");

    const allQuestions = [...bankQuestions, ...generatedQuestions];
    const report = evaluatePaperQuality(allQuestions, blueprint);
    return NextResponse.json({
      ids: allQuestions.map((question) => question.id),
      questions: allQuestions,
      generatedQuestions,
      report,
      sources: {
        bank: bankSelection.unitCount,
        variant: generatedQuestions.filter((question) => question.origin === "variant").length,
        generated: generatedQuestions.filter((question) => question.origin === "generated").length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 组卷失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
