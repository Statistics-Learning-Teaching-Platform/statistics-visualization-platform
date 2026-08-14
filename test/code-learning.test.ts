import { describe, expect, it } from "vitest";
import { resolveCodeLearningContext } from "../src/code-learning/context";
import type { CodeLesson } from "../src/code-learning/types";
import { loadLearningProgress, saveCodeLessonProgress } from "../src/course/progressStore";

const lesson = (id: string, topicId: string): CodeLesson => ({
  id, topicId, language: "r", unit: "test", order: 1, prerequisites: [], concepts: [],
  title: { zh: id, en: id }, eyebrow: { zh: "", en: "" }, objective: { zh: "", en: "" },
  explanation: { zh: "", en: "" }, task: { zh: "", en: "" }, starterCode: "", solution: "",
  checkCode: "", hint: { zh: "", en: "" }, success: { zh: "", en: "" },
});

describe("shared coding-lab context", () => {
  const lessons = [lesson("one", "topic-a"), lesson("two", "topic-b")];

  it("accepts matching topic and lesson parameters and rejects open redirects", () => {
    expect(resolveCodeLearningContext("?topicId=topic-b&lessonId=two&returnTo=/learn/topic-b&parameters=%7B%22n%22%3A30%7D", lessons)).toEqual({
      topicId: "topic-b", lessonId: "two", returnTo: "/learn/topic-b", currentParameters: { n: 30 }, caseId: undefined,
    });
    expect(resolveCodeLearningContext("?lessonId=two&returnTo=https://evil.example", lessons).returnTo).toBe("/");
  });
});

describe("unified learning progress", () => {
  it("migrates legacy language arrays into the versioned schema", () => {
    const values = new Map([
      ["statmind-r-learning-progress-v1", JSON.stringify(["r-one"])],
      ["statmind-python-learning-progress-v1", JSON.stringify(["py-one"])],
    ]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(loadLearningProgress(storage)).toMatchObject({ completedRLessons: ["r-one"], completedPythonLessons: ["py-one"] });
    const next = saveCodeLessonProgress("r", ["r-one", "r-two"], "topic-a", "/r-learning", storage);
    expect(next.completedTopics).toContain("topic-a");
    expect(JSON.parse(values.get("statmind-learning-progress-v1") ?? "{}").version).toBe(1);
  });
});
