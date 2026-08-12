import type { CourseCatalog } from "./types";

export type CourseInventories = {
  appIds: string[];
  rLessonIds: string[];
  pythonLessonIds: string[];
};

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

export function validateCourseCatalog(
  catalog: CourseCatalog,
  inventories: CourseInventories,
): string[] {
  const errors: string[] = [];
  const courseIds = new Set(catalog.courses.map(({ id }) => id));
  const chapterIds = new Set(catalog.chapters.map(({ id }) => id));
  const topicIds = new Set(catalog.topics.map(({ id }) => id));
  const activityIds = new Set(catalog.activities.map(({ id }) => id));
  const appIds = new Set(inventories.appIds);
  const rLessonIds = new Set(inventories.rLessonIds);
  const pythonLessonIds = new Set(inventories.pythonLessonIds);

  for (const [label, values] of [
    ["course", catalog.courses.map(({ id }) => id)],
    ["chapter", catalog.chapters.map(({ id }) => id)],
    ["topic", catalog.topics.map(({ id }) => id)],
    ["activity", catalog.activities.map(({ id }) => id)],
  ] as const) {
    for (const id of duplicates(values)) errors.push(`Duplicate ${label} id: ${id}`);
  }

  for (const course of catalog.courses) {
    for (const chapterId of course.chapterIds) {
      if (!chapterIds.has(chapterId)) errors.push(`Course ${course.id} references missing chapter ${chapterId}`);
    }
  }

  for (const chapter of catalog.chapters) {
    if (!courseIds.has(chapter.courseId)) errors.push(`Chapter ${chapter.id} references missing course ${chapter.courseId}`);
    for (const topicId of chapter.topicIds) {
      if (!topicIds.has(topicId)) errors.push(`Chapter ${chapter.id} references missing topic ${topicId}`);
    }
  }

  for (const course of catalog.courses) {
    const orders = catalog.chapters.filter(({ courseId }) => courseId === course.id).map(({ order }) => String(order));
    for (const order of duplicates(orders)) errors.push(`Course ${course.id} has duplicate chapter order ${order}`);
  }

  for (const topic of catalog.topics) {
    if (!chapterIds.has(topic.chapterId)) errors.push(`Topic ${topic.id} references missing chapter ${topic.chapterId}`);
    for (const prerequisite of topic.prerequisites) {
      if (!topicIds.has(prerequisite)) errors.push(`Topic ${topic.id} references missing prerequisite ${prerequisite}`);
    }
    for (const activityId of topic.activityIds) {
      if (!activityIds.has(activityId)) errors.push(`Topic ${topic.id} references missing activity ${activityId}`);
    }
    for (const lessonId of topic.rLessonIds) {
      if (!rLessonIds.has(lessonId)) errors.push(`Topic ${topic.id} references missing R lesson ${lessonId}`);
    }
    for (const lessonId of topic.pythonLessonIds) {
      if (!pythonLessonIds.has(lessonId)) errors.push(`Topic ${topic.id} references missing Python lesson ${lessonId}`);
    }
  }

  for (const chapter of catalog.chapters) {
    const orders = catalog.topics.filter(({ chapterId }) => chapterId === chapter.id).map(({ order }) => String(order));
    for (const order of duplicates(orders)) errors.push(`Chapter ${chapter.id} has duplicate topic order ${order}`);
  }

  for (const activity of catalog.activities) {
    if (!topicIds.has(activity.topicId)) errors.push(`Activity ${activity.id} references missing topic ${activity.topicId}`);
    if (activity.appId && !appIds.has(activity.appId)) errors.push(`Activity ${activity.id} references missing app ${activity.appId}`);
    const topic = catalog.topics.find(({ id }) => id === activity.topicId);
    if (topic && !topic.activityIds.includes(activity.id)) errors.push(`Activity ${activity.id} is not listed by topic ${activity.topicId}`);
  }

  for (const topic of catalog.topics) {
    const orders = catalog.activities.filter(({ topicId }) => topicId === topic.id).map(({ order }) => String(order));
    for (const order of duplicates(orders)) errors.push(`Topic ${topic.id} has duplicate activity order ${order}`);
  }

  return errors;
}
