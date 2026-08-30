import { describe, expect, it } from "vitest";
import { apps } from "../scripts/apps";
import { courseManifests, chapterManifests } from "../src/course/courseManifest";
import {
  activityManifests,
  courseCatalog,
  getTopicById,
  topicManifests,
} from "../src/course/topicRegistry";
import { validateCourseCatalog } from "../src/course/validation";
import { pythonLessons } from "../src/python-learning/lessons";
import { rLessons } from "../src/r-learning/lessons";
import {
  getTextbookChapterIdForTopic,
  textbookChapterIds,
} from "../src/course/textbookChapters";

describe("course content model", () => {
  it("defines the thirteen-chapter statistics path in learning order", () => {
    const statistics = courseManifests.find(({ id }) => id === "statistics");
    expect(statistics?.chapterIds).toHaveLength(13);
    expect(statistics?.chapterIds[0]).toBe("statistics-introduction");
    expect(statistics?.chapterIds[12]).toBe("time-series");

    const chapters = chapterManifests
      .filter(({ courseId }) => courseId === "statistics")
      .sort((left, right) => left.order - right.order);
    expect(chapters.map(({ order }) => order)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it("keeps every id and reference in the shared catalog valid", () => {
    expect(
      validateCourseCatalog(courseCatalog, {
        appIds: apps.map(({ id }) => id),
        rLessonIds: rLessons.map(({ id }) => id),
        pythonLessonIds: pythonLessons.map(({ id }) => id),
      }),
    ).toEqual([]);
  });

  it("maps every existing visualizer to exactly one shared topic and activity", () => {
    for (const app of apps) {
      const topic = getTopicById(app.topicId);
      const activity = activityManifests.find(({ id }) => id === app.activityId);
      expect(topic, app.id).toBeDefined();
      expect(activity, app.id).toMatchObject({
        appId: app.id,
        topicId: app.topicId,
      });
      expect(topic?.activityIds).toContain(app.activityId);
      expect(app.textbookChapterIds.length, app.id).toBeGreaterThan(0);
      expect(
        app.textbookChapterIds.every((chapterId) => textbookChapterIds.includes(chapterId)),
        app.id,
      ).toBe(true);
    }
  });

  it("maps every R and Python lesson to a valid shared topic", () => {
    for (const lesson of rLessons) {
      const topic = getTopicById(lesson.topicId);
      expect(topic, `R lesson ${lesson.id}`).toBeDefined();
      expect(topic?.rLessonIds).toContain(lesson.id);
      expect(lesson.textbookChapterId).toBe(getTextbookChapterIdForTopic(lesson.topicId));
    }

    for (const lesson of pythonLessons) {
      const topic = getTopicById(lesson.topicId);
      expect(topic, `Python lesson ${lesson.id}`).toBeDefined();
      expect(topic?.pythonLessonIds).toContain(lesson.id);
      expect(lesson.textbookChapterId).toBe(getTextbookChapterIdForTopic(lesson.topicId));
    }
  });

  it("keeps textbook chapter metadata internal and complete", () => {
    expect(textbookChapterIds).toEqual([
      "mes-ch00", "mes-ch01", "mes-ch02", "mes-ch03", "mes-ch04", "mes-ch05",
      "mes-ch06", "mes-ch07", "mes-ch08", "mes-ch09", "mes-ch10", "mes-ch11",
    ]);
    expect(new Set(pythonLessons.map(({ textbookChapterId }) => textbookChapterId))).toEqual(
      new Set(textbookChapterIds),
    );
    expect(new Set(rLessons.map(({ textbookChapterId }) => textbookChapterId))).toEqual(
      new Set(textbookChapterIds),
    );
  });

  it("keeps topic and activity ordering unique within each parent", () => {
    for (const chapter of chapterManifests) {
      const orders = topicManifests
        .filter(({ chapterId }) => chapterId === chapter.id)
        .map(({ order }) => order);
      expect(new Set(orders).size, chapter.id).toBe(orders.length);
    }

    for (const topic of topicManifests) {
      const orders = activityManifests
        .filter(({ topicId }) => topicId === topic.id)
        .map(({ order }) => order);
      expect(new Set(orders).size, topic.id).toBe(orders.length);
    }
  });
});
