import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { topicManifests } from "../src/course/topicRegistry";
import { inferTopicIds, topicLabels } from "../integrations/st-qselector/Program/src/lib/topic-mapping";

function readServerQuestionIndex(): {
  totalCount: number;
  questions: Array<{ topicIds?: string[] }>;
} {
  const file = path.resolve("integrations/st-qselector/Program/src/generated/reviewed-questions.ts");
  const source = fs.readFileSync(file, "utf8");
  const marker = "export const reviewedQuestionIndex: QuestionsResponse = ";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("Server question index export was not found");
  return JSON.parse(source.slice(start + marker.length).trim().replace(/;$/, ""));
}

describe("question bank topic mapping", () => {
  const validTopicIds = new Set(topicManifests.map(({ id }) => id));

  it("only exposes topic IDs registered by the course", () => {
    expect(Object.keys(topicLabels).every((id) => validTopicIds.has(id))).toBe(true);
    expect(inferTopicIds("Ch06", ["central limit theorem", "sampling distribution"]))
      .toEqual(expect.arrayContaining(["central-limit-theorem", "sampling-distributions"]));
  });

  it("keeps all 293 reviewed-index questions and gives each a valid topic", () => {
    const reviewedQuestionIndex = readServerQuestionIndex();
    expect(reviewedQuestionIndex.totalCount).toBe(293);
    expect(reviewedQuestionIndex.questions).toHaveLength(293);
    for (const question of reviewedQuestionIndex.questions) {
      expect(question.topicIds?.length).toBeGreaterThan(0);
      expect(question.topicIds?.every((id) => validTopicIds.has(id))).toBe(true);
    }
  });
});
