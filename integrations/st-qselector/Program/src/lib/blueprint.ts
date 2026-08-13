import type { Question } from "./types";

export interface KnowledgePointDraft {
  id: string;
  label: string;
  selected: boolean;
  weight: number;
  confidence?: number;
  evidence?: string;
}

export interface PaperBlueprint {
  learningObjectives: string[];
  topicWeights: Record<string, number>;
  questionTypeCounts: Record<string, number>;
  difficultyDistribution: Record<number, number>;
  totalQuestions: number;
  estimatedMinutes: number;
  /** Legacy compatibility fields consumed by the existing selector. */
  targetCount: number;
  targetDifficulty: number;
  types: string[];
  knowledgePoints: KnowledgePointDraft[];
}

export interface QualityDimension {
  id: "coverage" | "difficulty" | "types" | "duration" | "reliability" | "variety" | "integrity";
  label: string;
  score: number;
  detail: string;
}

export interface PaperQualityReport {
  overall: number;
  stars: number;
  dimensions: QualityDimension[];
  comment: string;
  missingKnowledge: string[];
  estimatedMinutes: number;
}

export interface BlueprintSelection {
  ids: string[];
  questions: Question[];
  unitCount: number;
  report: PaperQualityReport;
}

interface QuestionUnit {
  id: string;
  questions: Question[];
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");
}

function questionText(question: Question): string {
  return `${question.content} ${question.keywords.join(" ")} ${question.chapterTitle}`.toLowerCase();
}

export function questionMatchesKnowledge(question: Question, label: string): boolean {
  const labelKey = normalized(label);
  const haystack = questionText(question);
  const haystackKey = normalized(haystack);
  if (labelKey.length >= 2 && haystackKey.includes(labelKey)) return true;

  const stopWords = new Set(["and", "the", "with", "from", "test", "statistics", "statistical"]);
  const terms = label
    .toLowerCase()
    .split(/[\s/、，,;；()（）-]+/)
    .map((term) => term.trim())
    .filter((term) => (/[\u4e00-\u9fff]/.test(term) ? term.length >= 2 : term.length > 2) && !stopWords.has(term));
  const keywordKeys = question.keywords.map(normalized).filter(Boolean);
  const matchedTerms = terms.filter((term) => {
    const termKey = normalized(term);
    return haystack.includes(term) || keywordKeys.some((keyword) => keyword === termKey || keyword.includes(termKey));
  });
  if (terms.length <= 1) return matchedTerms.length === 1;

  // 多词知识点不能仅因命中 “sample / analysis / prior” 等单个泛词就判定为已有。
  // 至少匹配 60% 的实义词；二词短语要求两个词都出现。
  const requiredMatches = Math.max(2, Math.ceil(terms.length * 0.6));
  return matchedTerms.length >= requiredMatches;
}

function unitMatchesKnowledge(unit: QuestionUnit, label: string): boolean {
  return unit.questions.some((question) => questionMatchesKnowledge(question, label));
}

function seededTieBreak(id: string): number {
  let value = 2166136261;
  for (const char of id) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return (value >>> 0) / 4294967295;
}

function scoreQuestion(question: Question, blueprint: PaperBlueprint, covered: Set<string>): number {
  const selectedKnowledge = blueprint.knowledgePoints.filter((point) => point.selected);
  const knowledgeScore = selectedKnowledge.reduce((score, point) => {
    if (!questionMatchesKnowledge(question, point.label)) return score;
    return score + (covered.has(point.id) ? 7 : 28) * Math.max(0.25, point.weight);
  }, 0);
  const difficultyScore = 22 * (1 - Math.min(4, Math.abs(question.difficulty - blueprint.targetDifficulty)) / 4);
  const typeScore = blueprint.types.length === 0 || blueprint.types.includes(question.type) ? 16 : -18;
  const reliabilityScore = (question.isReviewed ? 16 : 0) + (question.isComplete && question.answer ? 12 : -40);
  return knowledgeScore + difficultyScore + typeScore + reliabilityScore + seededTieBreak(question.id);
}

function buildQuestionUnits(questions: Question[]): QuestionUnit[] {
  const groups = new Map<string, Question[]>();
  for (const question of questions) {
    const groupId = question.groupId || question.id;
    const group = groups.get(groupId) ?? [];
    group.push(question);
    groups.set(groupId, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.every((question) => question.isReviewed && question.isComplete && Boolean(question.answer)))
    .map(([id, group]) => ({ id, questions: group }));
}

function scoreUnit(unit: QuestionUnit, blueprint: PaperBlueprint, covered: Set<string>): number {
  const scores = unit.questions.map((question) => scoreQuestion(question, blueprint, covered));
  return scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length);
}

function dedupeUnits(units: QuestionUnit[]): QuestionUnit[] {
  const seen = new Set<string>();
  return units.filter((unit) => {
    const key = normalized(unit.questions.map((question) => question.content).join(" "));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function selectQuestionsFromBlueprint(
  questions: Question[],
  blueprint: PaperBlueprint,
  options: { relevantOnly?: boolean } = {},
): BlueprintSelection {
  const targetCount = Math.max(1, Math.min(60, Math.round(blueprint.totalQuestions || blueprint.targetCount)));
  const selectedKnowledge = blueprint.knowledgePoints.filter((point) => point.selected);
  const eligible = dedupeUnits(buildQuestionUnits(questions)).filter((unit) =>
    !options.relevantOnly || selectedKnowledge.length === 0 ||
    selectedKnowledge.some((point) => unitMatchesKnowledge(unit, point.label)),
  );
  const covered = new Set<string>();
  const selectedUnits: QuestionUnit[] = [];
  const selectedUnitIds = new Set<string>();

  for (const point of [...selectedKnowledge].sort((a, b) => b.weight - a.weight)) {
    const candidate = eligible
      .filter((unit) => !selectedUnitIds.has(unit.id) && unitMatchesKnowledge(unit, point.label))
      .sort((a, b) => scoreUnit(b, blueprint, covered) - scoreUnit(a, blueprint, covered))[0];
    if (!candidate || selectedUnits.length >= targetCount) continue;
    selectedUnits.push(candidate);
    selectedUnitIds.add(candidate.id);
    covered.add(point.id);
  }

  const remaining = eligible
    .filter((unit) => !selectedUnitIds.has(unit.id))
    .sort((a, b) => scoreUnit(b, blueprint, covered) - scoreUnit(a, blueprint, covered));
  for (const unit of remaining) {
    if (selectedUnits.length >= targetCount) break;
    selectedUnits.push(unit);
    selectedUnitIds.add(unit.id);
    for (const point of selectedKnowledge) {
      if (unitMatchesKnowledge(unit, point.label)) covered.add(point.id);
    }
  }

  const selected = selectedUnits.flatMap((unit) => unit.questions);
  const report = evaluatePaperQuality(selected, blueprint);
  return {
    ids: selected.map((question) => question.id),
    questions: selected,
    unitCount: selectedUnits.length,
    report,
  };
}

export function evaluatePaperQuality(
  selectedQuestions: Question[],
  blueprint: PaperBlueprint,
): PaperQualityReport {
  const selectedKnowledge = blueprint.knowledgePoints.filter((point) => point.selected);
  const coveredKnowledge = selectedKnowledge.filter((point) =>
    selectedQuestions.some((question) => questionMatchesKnowledge(question, point.label)),
  );
  const missingKnowledge = selectedKnowledge
    .filter((point) => !coveredKnowledge.includes(point))
    .map((point) => point.label);
  const coverageScore = selectedKnowledge.length
    ? (coveredKnowledge.length / selectedKnowledge.length) * 100
    : 100;
  const averageDifficulty = selectedQuestions.length
    ? selectedQuestions.reduce((sum, question) => sum + question.difficulty, 0) / selectedQuestions.length
    : 0;
  const difficultyScore = selectedQuestions.length
    ? Math.max(0, 100 - Math.abs(averageDifficulty - blueprint.targetDifficulty) * 28)
    : 0;
  const representedTypes = new Set(selectedQuestions.map((question) => question.type));
  const requestedTypeCounts = Object.entries(blueprint.questionTypeCounts ?? {}).filter(([, count]) => count > 0);
  const actualTypeCounts = new Map<string, number>();
  for (const question of selectedQuestions) actualTypeCounts.set(question.type, (actualTypeCounts.get(question.type) ?? 0) + 1);
  const typeScore = requestedTypeCounts.length
    ? Math.max(0, 100 - requestedTypeCounts.reduce((gap, [type, count]) => gap + Math.abs((actualTypeCounts.get(type) ?? 0) - count), 0) * 8)
    : blueprint.types.length
      ? (blueprint.types.filter((type) => representedTypes.has(type)).length / blueprint.types.length) * 100
      : 100;
  const estimatedMinutes = selectedQuestions.reduce((sum, question) => sum + (question.estimatedMinutes || Math.max(1, question.difficulty * 3)), 0);
  const targetMinutes = Math.max(1, blueprint.estimatedMinutes || estimatedMinutes || 1);
  const durationScore = Math.max(0, 100 - Math.abs(estimatedMinutes - targetMinutes) / targetMinutes * 100);
  const reliable = selectedQuestions.reduce((score, question) => {
    if (question.isReviewed && question.isComplete && question.answer) return score + 1;
    if ((question.origin === "variant" || question.origin === "generated") && question.isComplete && question.answer && question.verification) {
      return score + 0.85;
    }
    return score;
  }, 0);
  const reliabilityScore = selectedQuestions.length ? (reliable / selectedQuestions.length) * 100 : 0;
  const duplicateKeys = selectedQuestions.map((question) => normalized(question.content));
  const uniqueCount = new Set(duplicateKeys).size;
  const varietyScore = selectedQuestions.length ? (uniqueCount / selectedQuestions.length) * 100 : 0;
  const consistent = selectedQuestions.filter((question) => question.isComplete && Boolean(question.answer) && question.attachments.every((item) => item.available)).length;
  const integrityScore = selectedQuestions.length ? consistent / selectedQuestions.length * 100 : 0;
  const dimensions: QualityDimension[] = [
    { id: "coverage", label: "知识点覆盖", score: coverageScore, detail: `${coveredKnowledge.length}/${selectedKnowledge.length || 0} 个目标知识点` },
    { id: "difficulty", label: "难度匹配", score: difficultyScore, detail: selectedQuestions.length ? `平均难度 ${averageDifficulty.toFixed(1)} / 目标 ${blueprint.targetDifficulty}` : "尚未选题" },
    { id: "types", label: "题型平衡", score: typeScore, detail: `${representedTypes.size} 种题型` },
    { id: "duration", label: "预计完成时间", score: durationScore, detail: `预计 ${estimatedMinutes} 分钟 / 目标 ${targetMinutes} 分钟` },
    { id: "reliability", label: "答案可靠", score: reliabilityScore, detail: `${reliable.toFixed(1)}/${selectedQuestions.length} 题已审核或完成 AI 双阶段校验` },
    { id: "variety", label: "题目多样性", score: varietyScore, detail: uniqueCount === selectedQuestions.length ? "未发现重复题" : `${selectedQuestions.length - uniqueCount} 道内容相似` },
    { id: "integrity", label: "数据与答案一致性", score: integrityScore, detail: `${consistent}/${selectedQuestions.length} 题具有完整题干、可用数据和答案` },
  ];
  const weights: Record<QualityDimension["id"], number> = {
    coverage: 0.25,
    difficulty: 0.16,
    types: 0.12,
    duration: 0.1,
    reliability: 0.16,
    variety: 0.08,
    integrity: 0.13,
  };
  const overall = dimensions.reduce((sum, dimension) => sum + dimension.score * weights[dimension.id], 0);
  const stars = Math.max(1, Math.min(5, Math.round(overall / 20)));
  const comments: string[] = [];
  if (missingKnowledge.length) comments.push(`仍缺少 ${missingKnowledge.slice(0, 3).join("、")} 的直接考查。`);
  if (difficultyScore < 80) comments.push("当前难度结构与目标存在偏差，可替换部分题目。 ");
  if (typeScore < 80) comments.push("目标题型尚未全部覆盖。 ");
  if (comments.length === 0) comments.push("知识点、难度和题型与当前蓝图匹配良好，可进入人工确认。 ");
  return {
    overall: Math.round(overall),
    stars,
    dimensions: dimensions.map((dimension) => ({ ...dimension, score: Math.round(dimension.score) })),
    comment: comments.join("").trim(),
    missingKnowledge,
    estimatedMinutes,
  };
}

export function createPaperBlueprint(input: Partial<PaperBlueprint> = {}): PaperBlueprint {
  const totalQuestions = Math.max(1, Math.min(60, Math.round(input.totalQuestions ?? input.targetCount ?? 20)));
  const targetDifficulty = Math.max(1, Math.min(5, Math.round(input.targetDifficulty ?? 3)));
  return {
    learningObjectives: input.learningObjectives ?? [],
    topicWeights: input.topicWeights ?? {},
    questionTypeCounts: input.questionTypeCounts ?? {},
    difficultyDistribution: input.difficultyDistribution ?? { [targetDifficulty]: totalQuestions },
    totalQuestions,
    estimatedMinutes: Math.max(1, Math.round(input.estimatedMinutes ?? totalQuestions * targetDifficulty * 3)),
    targetCount: totalQuestions,
    targetDifficulty,
    types: input.types ?? Object.keys(input.questionTypeCounts ?? {}),
    knowledgePoints: input.knowledgePoints ?? [],
  };
}
