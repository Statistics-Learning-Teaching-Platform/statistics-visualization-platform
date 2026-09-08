import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { evaluatePaperQuality, questionMatchesKnowledge, selectQuestionsFromBlueprint, type PaperBlueprint } from "@/lib/blueprint";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";
import {
  callStatAi,
  requireLoadedStatAiModel,
  resolveStatAiModel,
  StatAiModelSelectionError,
} from "@/lib/ai-client";
import { statAiInputByteBudget } from "@/lib/ai-context-budget";
import { formatPaperGenerationInput, formatPaperVerificationInput } from "@/lib/ai-paper-context";
import { persistAiDrafts } from "@/lib/ai-drafts";
import { consumeRateLimit, requestPrincipal, withConcurrencyLease } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";
import type { Question } from "@/lib/types";
import { normalizeTopicIds } from "@/lib/topic-mapping";
import { getTextbookChapterIdsForTopics } from "@/lib/textbook-chapters";
import { canonicalVisualizationAlt, validateQuestionVisualizations, visualizationsMatchQuestionContent } from "@/lib/question-visualizations";

export const runtime = "nodejs";
export const maxDuration = 180;

const AI_STAGE_TIMEOUT_MS = 80_000;
const AI_MODEL_PREFLIGHT_TIMEOUT_MS = 20_000;
const AI_GENERATION_BATCH_SIZE = 3;
const AI_GENERATION_MAX_OUTPUT_TOKENS = 3_072;
const AI_VERIFICATION_MAX_OUTPUT_TOKENS = 3_072;
const AI_GENERATION_SYSTEM_PROMPT = "Return compact JSON only: {questions:[{index,concept,type,difficulty,chapterId,content,answer,visualizations}]}. Write exactly one self-contained English statistics question per job with the same index. Include every raw value in content and state categorical chart data as unambiguous label-value pairs; never require an external figure, file, table, or prior exercise. If a question depends on a categorical bar chart, line chart, or pie chart, visualizations must contain one or two objects {kind:\"mermaid\",title,alt,source}; alt must truthfully list the same label-value pairs. Source may use only this canonical Mermaid subset: xychart-beta with quoted title, quoted-string categorical x-axis JSON array, finite numeric y-axis min --> max, and bar/line numeric JSON arrays; every bar/line must have a unique quoted series name when there is more than one series; or pie showData with an optional quoted title and quoted labels with nonnegative numeric values. Do not emit directives, comments, HTML, links, click handlers, styles, classes, or fenced Markdown. Mermaid does not faithfully support scatterplots, histograms, dotplots, stem-and-leaf displays, or boxplots here: do not create chart-dependent questions of those kinds and never substitute a line or categorical bar chart for them. Otherwise set visualizations to []. A variant must change its context and numbers and recompute its answer. Show essential calculations and a conclusion. Keep each content and answer under 450 characters. Allowed types: 选择题, 判断题, 填空题, 计算题, 简答题, 综合题.";
const AI_VERIFICATION_SYSTEM_PROMPT = "Act as a second-pass statistics verifier. Solve each proposed question yourself. Correct any ambiguity, arithmetic, units, rounding, hypotheses, direction, degrees of freedom, p-value, interval, and visualization/data mismatch. Return compact JSON only: {questions:[{index,concept,type,difficulty,chapterId,content,answer,verification,visualizations}]}, preserving every index and the exact visualization object contract. Every plotted raw value must also appear in content as an unambiguous label-value pair. For chart-dependent categorical bar, line, or pie questions, preserve or correct the canonical Mermaid visualization and make alt list the same pairs. Use [] for questions without one. Reject the idea by rewriting the question if it would require a scatterplot, histogram, dotplot, stem-and-leaf display, or boxplot because this Mermaid subset cannot faithfully encode those. Never emit directives, comments, HTML, links, clicks, styles, classes, or Mermaid Markdown fences. In verification, state concrete checks performed; never claim independent human review. Questions must remain self-contained. Keep each content and corrected answer under 450 characters.";
// One generation batch plus one verification batch fits the 175-second lease
// even when both approach their 80-second stage deadline. More sequential
// batches could never be guaranteed to finish inside the Worker duration.
const MAX_AI_GENERATED_QUESTIONS = AI_GENERATION_BATCH_SIZE;

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
  visualizations?: unknown;
}

function safeJson(value: string): unknown {
  const clean = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(clean);
}

async function callJson(
  system: string,
  user: string,
  requestSignal: AbortSignal,
  model: string,
  maxOutputTokens: number,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_STAGE_TIMEOUT_MS);
  try {
    const parsed = safeJson(await callStatAi({
      systemPrompt: system,
      input: user,
      model,
      maxOutputTokens,
      signal: AbortSignal.any([requestSignal, controller.signal]),
    }));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("AI 返回的 JSON 结构无效");
    return parsed as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function parseBlueprint(value: unknown): PaperBlueprint {
  if (!value || typeof value !== "object") throw new AuthError(400, "缺少有效的组卷蓝图");
  const raw = value as Partial<PaperBlueprint>;
  if (!Array.isArray(raw.knowledgePoints) || raw.knowledgePoints.length === 0 || raw.knowledgePoints.length > 60) {
    throw new AuthError(400, "知识点数量必须在 1 到 60 之间");
  }
  const requestedCount = Number.isFinite(raw.totalQuestions) ? Number(raw.totalQuestions) : Number(raw.targetCount);
  if (!Number.isFinite(requestedCount) || !Number.isFinite(raw.targetDifficulty)) {
    throw new AuthError(400, "组卷数量或难度无效");
  }
  const knowledgePoints = raw.knowledgePoints.map((point, index) => {
    if (!point || typeof point !== "object") throw new AuthError(400, "知识点结构无效");
    const label = typeof point.label === "string" ? point.label.trim() : "";
    if (!label || label.length > 160) throw new AuthError(400, "知识点名称不能为空且不能超过 160 个字符");
    return {
      id: typeof point.id === "string" && point.id.trim() ? point.id.trim().slice(0, 160) : `concept-${index + 1}`,
      label,
      selected: point.selected === true,
      weight: Number.isFinite(point.weight) ? Math.max(0.25, Math.min(4, Number(point.weight))) : 1,
      confidence: Number.isFinite(point.confidence) ? Math.max(0, Math.min(1, Number(point.confidence))) : undefined,
      evidence: typeof point.evidence === "string" ? point.evidence.slice(0, 500) : undefined,
    };
  });
  const targetCount = Math.max(1, Math.min(60, Math.round(requestedCount)));
  const targetDifficulty = Math.max(1, Math.min(5, Math.round(Number(raw.targetDifficulty))));
  const types = Array.isArray(raw.types)
    ? [...new Set(raw.types.filter((type): type is string => typeof type === "string" && QUESTION_TYPES.has(type)))].slice(0, QUESTION_TYPES.size)
    : [];
  return {
    learningObjectives: Array.isArray(raw.learningObjectives)
      ? raw.learningObjectives.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 60)
      : knowledgePoints.filter((point) => point.selected).map((point) => point.label),
    topicWeights: Object.fromEntries(knowledgePoints.map((point) => [point.id, point.weight])),
    questionTypeCounts: Object.fromEntries(types.map((type) => [
      type,
      Math.max(0, Math.min(targetCount, Math.round(Number(raw.questionTypeCounts?.[type]) || 0))),
    ])),
    difficultyDistribution: Object.fromEntries([1, 2, 3, 4, 5].map((difficulty) => [
      difficulty,
      Math.max(0, Math.min(targetCount, Math.round(Number(raw.difficultyDistribution?.[difficulty]) || 0))),
    ])),
    totalQuestions: targetCount,
    estimatedMinutes: Math.max(1, Math.min(600, Math.round(Number(raw.estimatedMinutes) || targetCount * 4))),
    targetCount,
    targetDifficulty,
    types,
    knowledgePoints,
  };
}

function mapConceptToChapter(label: string): string | null {
  const value = label.toLowerCase();
  if (/regression|correlation|least.?squares/.test(value)) return "Ch13";
  if (/two.?sample|paired|anova/.test(value)) return "Ch10";
  if (/hypothesis|p-value|type i|type ii|power/.test(value)) return "Ch09";
  if (/confidence|estimat|margin of error/.test(value)) return "Ch08";
  if (/central limit|sampling distribution/.test(value)) return "Ch07";
  if (/normal|continuous distribution/.test(value)) return "Ch06";
  if (/binomial|poisson|discrete distribution|probability distributions?|random variable/.test(value)) return "Ch05";
  if (/conditional probability|bayes|independence|probability/.test(value)) return "Ch04";
  if (/histogram|box.?plot|stem.?and.?leaf|descriptive|mean|median|variance|standard deviation/.test(value)) return "Ch02";
  if (/bootstrap|permutation|monte carlo|mcmc|gibbs|metropolis|simulation/.test(value)) return "Ch12";
  if (/population|sample|sampling method|data type|categorical|quantitative|qualitative/.test(value)) return "Ch01";
  return null;
}

function requireMappedChapter(concept: string): string {
  const chapterId = mapConceptToChapter(concept);
  if (!chapterId) {
    throw new Error(`知识点“${concept}”无法映射到当前统计学课程章节，请调整知识点后重试。`);
  }
  return chapterId;
}

function sanitizeDraft(draft: GeneratedDraft, job: GenerationJob, position: number): Question | null {
  const content = String(draft.content ?? "").trim();
  const answer = String(draft.answer ?? "").trim();
  if (content.length < 20 || content.length > 1_200 || answer.length < 8 || answer.length > 1_200) return null;
  // Mermaid is accepted only through the structured field below. A Markdown
  // fence would otherwise bypass the server-side grammar and complexity gate.
  if (/```\s*mermaid\b/i.test(content) || /```\s*mermaid\b/i.test(answer)) return null;
  const validatedVisualizations = validateQuestionVisualizations(draft.visualizations);
  if (!validatedVisualizations || !visualizationsMatchQuestionContent(content, validatedVisualizations)) return null;
  const visualizations = validatedVisualizations.map((visualization) => ({
    ...visualization,
    alt: canonicalVisualizationAlt(visualization) ?? visualization.alt,
  }));
  const type = QUESTION_TYPES.has(String(draft.type)) ? String(draft.type) : "简答题";
  const difficulty = Math.max(1, Math.min(5, Math.round(Number(draft.difficulty) || 2)));
  const verification = String(draft.verification ?? "").trim();
  if (verification.length < 20 || verification.length > 2_000) return null;
  const chapterId = job.chapterId;
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
    reviewStatus: "pending:ai-secondary-check",
    origin: job.origin,
    variantKind: job.variantKind,
    parentQuestionId: job.parentQuestionId,
    verification,
    visualizations,
  };
}

function indexedDrafts(value: unknown, jobs: readonly GenerationJob[], stage: string): GeneratedDraft[] {
  if (!Array.isArray(value) || value.length !== jobs.length) {
    throw new Error(`${stage}返回了 ${Array.isArray(value) ? value.length : 0}/${jobs.length} 道题`);
  }
  const byIndex = new Map<number, GeneratedDraft>();
  for (const item of value) {
    if (!item || typeof item !== "object") throw new Error(`${stage}题目结构无效`);
    const draft = item as GeneratedDraft;
    if (!Number.isInteger(draft.index) || Number(draft.index) < 0 || Number(draft.index) >= jobs.length) {
      throw new Error(`${stage}返回了越界 index`);
    }
    const index = Number(draft.index);
    if (byIndex.has(index)) throw new Error(`${stage}返回了重复 index ${index}`);
    byIndex.set(index, draft);
  }
  return jobs.map((_, index) => {
    const draft = byIndex.get(index);
    if (!draft) throw new Error(`${stage}缺少 index ${index}`);
    return draft;
  });
}

export async function POST(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSession(request, ["teacher", "superadmin"]);
    await verifyCsrf(request, session);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "ai-paper",
      limit: 8,
      windowSeconds: 60 * 60,
    });
    const body = await readLimitedJson(request, 128 * 1024) as { blueprint?: unknown; variantPercent?: unknown; model?: unknown };
    const blueprint = parseBlueprint(body.blueprint);
    const requestedModel = resolveStatAiModel(body.model);
    const selectedConcepts = blueprint.knowledgePoints.filter((point) => point.selected && point.label.trim());
    if (!selectedConcepts.length) {
      return NextResponse.json({ error: "请先确认至少一个知识点" }, { status: 400 });
    }
    const targetCount = blueprint.targetCount;
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
      // A bank-only result is still the outcome of an explicitly model-bound
      // AI-paper action. Do not let a stale selection bypass the same live
      // loaded-model check used immediately before inference.
      await requireLoadedStatAiModel(
        requestedModel,
        AbortSignal.any([request.signal, AbortSignal.timeout(AI_MODEL_PREFLIGHT_TIMEOUT_MS)]),
      );
      const report = evaluatePaperQuality(bankQuestions, blueprint);
      return NextResponse.json({
        ids: bankQuestions.map((question) => question.id),
        questions: bankQuestions,
        generatedQuestions: [],
        report,
        sources: { bank: bankSelection.unitCount, variant: 0, generated: 0 },
      });
    }
    if (generatedNeeded > MAX_AI_GENERATED_QUESTIONS) {
      throw new AuthError(
        400,
        `当前蓝图需要实时生成 ${generatedNeeded} 道题，单次安全上限为 ${MAX_AI_GENERATED_QUESTIONS} 道；请降低题目数量或 AI 比例后重试`,
      );
    }

    const missingConcepts = selectedConcepts.filter((point) =>
      !bankQuestionsSource.some((question) =>
        question.isReviewed && question.isComplete && question.answer && questionMatchesKnowledge(question, point.label)
      ),
    );
    const jobs: GenerationJob[] = [];
    // Exhaust reviewed-bank seeds as parameter variants, then context variants.
    // Only create an entirely new item if no reviewed seed exists for the target.
    for (const point of missingConcepts) {
      if (jobs.length >= generatedNeeded) break;
      jobs.push({ concept: point.label, origin: "generated", parentQuestionId: null, chapterId: requireMappedChapter(point.label) });
    }
    for (let index = jobs.length; index < generatedNeeded; index++) {
      const point = selectedConcepts[index % selectedConcepts.length];
      const seed = bankQuestions.find((question) => questionMatchesKnowledge(question, point.label)) ?? bankQuestions[index % Math.max(1, bankQuestions.length)];
      jobs.push({
        concept: point.label,
        origin: seed ? "variant" : "generated",
        variantKind: seed ? (index % 2 === 0 ? "parameter" : "context") : undefined,
        parentQuestionId: seed?.id ?? null,
        chapterId: seed?.chapterId ?? requireMappedChapter(point.label),
      });
    }
    const seeds = jobs.map((job, index) => {
      const seed = job.parentQuestionId ? bankQuestions.find((question) => question.id === job.parentQuestionId) : null;
      return { index, ...job, seed: seed ? { id: seed.id, type: seed.type, difficulty: seed.difficulty, content: seed.content, answer: seed.answer } : null };
    });
    try {
      await consumeRateLimit({ principal: "global", route: "ai-paper-budget", limit: 120, windowSeconds: 60 * 60 });
      return await withConcurrencyLease({
        route: "ai-paper",
        limit: 4,
        ttlSeconds: 175,
        requestSignal: request.signal,
        work: async (signal) => {
      // Keep each generation and verification response comfortably inside an
      // 8K-context local model. Large single JSON arrays were predictably
      // truncated; three compact questions per batch remain independently
      // indexed and no draft is persisted until every batch has passed.
      const verifiedDrafts: GeneratedDraft[] = [];
      for (let batchStart = 0; batchStart < jobs.length; batchStart += AI_GENERATION_BATCH_SIZE) {
        const batchJobs = jobs.slice(batchStart, batchStart + AI_GENERATION_BATCH_SIZE);
        const batchSeeds = seeds.slice(batchStart, batchStart + AI_GENERATION_BATCH_SIZE);
        const generatedPayload = await callJson(
          AI_GENERATION_SYSTEM_PROMPT,
          formatPaperGenerationInput({
            targetDifficulty: blueprint.targetDifficulty,
            allowedTypes: blueprint.types,
            seeds: batchSeeds,
            maximumBytes: statAiInputByteBudget(
              AI_GENERATION_SYSTEM_PROMPT,
              AI_GENERATION_MAX_OUTPUT_TOKENS,
            ),
          }),
          signal,
          requestedModel,
          AI_GENERATION_MAX_OUTPUT_TOKENS,
        );
        const firstPass = indexedDrafts(generatedPayload.questions, batchJobs, "AI 生成阶段");
        const verificationPayload = await callJson(
          AI_VERIFICATION_SYSTEM_PROMPT,
          formatPaperVerificationInput(
            firstPass,
            statAiInputByteBudget(
              AI_VERIFICATION_SYSTEM_PROMPT,
              AI_VERIFICATION_MAX_OUTPUT_TOKENS,
            ),
          ),
          signal,
          requestedModel,
          AI_VERIFICATION_MAX_OUTPUT_TOKENS,
        );
        verifiedDrafts.push(
          ...indexedDrafts(verificationPayload.questions, batchJobs, "AI 二次校验阶段"),
        );
      }
      const generatedQuestions = verifiedDrafts
        .map((draft, index) => sanitizeDraft(draft, jobs[index], index))
        .filter((question): question is Question => Boolean(question));
      if (generatedQuestions.length !== jobs.length) throw new Error("部分 AI 题目未通过完整性校验");

      const storedQuestions = await persistAiDrafts(
        session.user.id,
        generatedQuestions.map((question, index) => ({
          question,
          generationJob: jobs[index],
          verifierOutput: verifiedDrafts[index],
        })),
      );

      const allQuestions = [...bankQuestions, ...storedQuestions];
      const report = evaluatePaperQuality(allQuestions, blueprint);
      return NextResponse.json({
        ids: allQuestions.map((question) => question.id),
        questions: allQuestions,
        generatedQuestions: storedQuestions,
        report,
        sources: {
          bank: bankSelection.unitCount,
          variant: storedQuestions.filter((question) => question.origin === "variant").length,
          generated: storedQuestions.filter((question) => question.origin === "generated").length,
        },
      });
        },
      });
    } catch (error) {
      if (error instanceof StatAiModelSelectionError) throw error;
      console.error("AI paper stages failed; considering reviewed-bank fallback", error);
      const fallback = selectQuestionsFromBlueprint(bankQuestionsSource, blueprint, { relevantOnly: true });
      if (missingConcepts.length > 0 || fallback.unitCount < targetCount) throw error;
      const fallbackQuestions: Question[] = fallback.questions.map((question) => ({
        ...question,
        origin: question.origin ?? "bank",
      }));
      return NextResponse.json({
        ids: fallbackQuestions.map((question) => question.id),
        questions: fallbackQuestions,
        generatedQuestions: [],
        report: evaluatePaperQuality(fallbackQuestions, blueprint),
        sources: { bank: fallback.unitCount, variant: 0, generated: 0 },
        warning: "AI 服务暂时不稳定，本次已安全回退为仅使用已审核题库原题。",
      });
    }
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("AI paper generation failed", error);
    return NextResponse.json({ error: "AI 组卷失败，请稍后重试" }, { status: 502 });
  }
}
