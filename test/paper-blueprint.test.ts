import { describe, expect, it } from "vitest";
import {
  createPaperBlueprint,
  evaluatePaperQuality,
} from "../integrations/st-qselector/Program/src/lib/blueprint";
import type { Question } from "../integrations/st-qselector/Program/src/lib/types";

function question(id: string, type: string, difficulty: number, minutes: number): Question {
  return {
    id,
    groupId: id,
    partCount: 1,
    selectionUnit: "atomic",
    chapterId: "Ch06",
    chapterTitle: "第6章",
    chapterNum: 6,
    content: `Complete ${id} about a confidence interval.`,
    source: "test",
    type,
    difficulty,
    estimatedMinutes: minutes,
    keywords: ["confidence interval"],
    topicIds: ["confidence-interval"],
    textbookChapterIds: ["mes-ch06"],
    dataRefs: [],
    attachments: [],
    answer: "A complete independently checked answer.",
    answerIsImage: false,
    isComplete: true,
    isReviewed: true,
    reviewStatus: "reviewed",
    origin: "bank",
  };
}

describe("unified paper blueprint", () => {
  it("normalizes required blueprint fields", () => {
    const blueprint = createPaperBlueprint({
      totalQuestions: 2,
      estimatedMinutes: 20,
      learningObjectives: ["解释置信区间"],
      topicWeights: { "confidence-interval": 1 },
      questionTypeCounts: { 计算题: 1, 简答题: 1 },
      difficultyDistribution: { 2: 1, 3: 1 },
    });
    expect(blueprint.targetCount).toBe(2);
    expect(blueprint.types).toEqual(["计算题", "简答题"]);
    expect(blueprint.learningObjectives).toEqual(["解释置信区间"]);
  });

  it("reports duration and data-answer integrity alongside existing quality dimensions", () => {
    const blueprint = createPaperBlueprint({
      totalQuestions: 2,
      estimatedMinutes: 20,
      targetDifficulty: 2,
      questionTypeCounts: { 计算题: 1, 简答题: 1 },
      knowledgePoints: [{ id: "ci", label: "confidence interval", selected: true, weight: 1 }],
    });
    const report = evaluatePaperQuality(
      [question("q1", "计算题", 2, 12), question("q2", "简答题", 2, 8)],
      blueprint,
    );
    expect(report.estimatedMinutes).toBe(20);
    expect(report.dimensions.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["duration", "integrity", "coverage", "types"]),
    );
    expect(report.dimensions.find(({ id }) => id === "duration")?.score).toBe(100);
    expect(report.dimensions.find(({ id }) => id === "integrity")?.score).toBe(100);
  });
});
