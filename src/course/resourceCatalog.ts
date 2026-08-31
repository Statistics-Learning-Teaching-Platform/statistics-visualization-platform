import { activityManifests, topicManifests } from "./topicRegistry";
import { getActivityRoute, getTopicRoute } from "./routeHelpers";
import {
  getTextbookChapterIdForTopic,
  textbookChapters,
  type TextbookChapterId,
} from "./textbookChapters";
import { rLessons } from "../r-learning/lessons";
import { pythonLessons } from "../python-learning/lessons";
import type { LocalizedText, TopicManifest } from "./types";

export type CatalogLanguage = "zh" | "en";

export type CatalogResource = {
  id: string;
  title: LocalizedText;
  topic: TopicManifest;
  href: string;
};

export type TextbookChapterResources = {
  chapter: (typeof textbookChapters)[number];
  topics: TopicManifest[];
  visualizations: CatalogResource[];
  rLessons: CatalogResource[];
  pythonLessons: CatalogResource[];
  questionBankHref: string;
};

function topicFor(topicId: string): TopicManifest {
  const topic = topicManifests.find(({ id }) => id === topicId);
  if (!topic) throw new Error(`Unknown catalog topic ${topicId}`);
  return topic;
}

export function getTextbookQuestionRoute(chapterId: TextbookChapterId): string {
  return `/st-qselector?textbookChapterId=${encodeURIComponent(chapterId)}`;
}

export const textbookResourceCatalog: TextbookChapterResources[] = textbookChapters.map((chapter) => {
  const topics = topicManifests.filter(
    ({ id }) => getTextbookChapterIdForTopic(id) === chapter.id,
  );
  const visualizations = activityManifests
    .filter(
      (activity) =>
        activity.type === "visualization" &&
        getTextbookChapterIdForTopic(activity.topicId) === chapter.id,
    )
    .sort((left, right) => left.order - right.order)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      topic: topicFor(activity.topicId),
      href: getActivityRoute(activity.id),
    }));
  const chapterRLessons = rLessons
    .filter(({ textbookChapterId }) => textbookChapterId === chapter.id)
    .sort((left, right) => left.order - right.order)
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      topic: topicFor(lesson.topicId),
      href: `/r-learning?topicId=${lesson.topicId}&lessonId=${lesson.id}&returnTo=${encodeURIComponent(`/catalog#${chapter.id}`)}`,
    }));
  const chapterPythonLessons = pythonLessons
    .filter(({ textbookChapterId }) => textbookChapterId === chapter.id)
    .sort((left, right) => left.order - right.order)
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      topic: topicFor(lesson.topicId),
      href: `/python-learning?topicId=${lesson.topicId}&lessonId=${lesson.id}&returnTo=${encodeURIComponent(`/catalog#${chapter.id}`)}`,
    }));

  return {
    chapter,
    topics,
    visualizations,
    rLessons: chapterRLessons,
    pythonLessons: chapterPythonLessons,
    questionBankHref: getTextbookQuestionRoute(chapter.id),
  };
});

export function getTopicCatalogRoute(topic: TopicManifest): string {
  return getTopicRoute(topic.id);
}
