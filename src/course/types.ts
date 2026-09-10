export type LocalizedText = {
  zh: string;
  en: string;
};

export type ReviewStatus = "draft" | "verified" | "published";

export type CourseManifest = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  chapterIds: string[];
};

export type ChapterManifest = {
  id: string;
  courseId: string;
  order: number;
  title: LocalizedText;
  description: LocalizedText;
  learningObjectives: LocalizedText[];
  topicIds: string[];
};

export type TopicManifest = {
  id: string;
  chapterId: string;
  order: number;
  title: LocalizedText;
  summary: LocalizedText;
  learningObjectives: LocalizedText[];
  prerequisites: string[];
  misconceptions: LocalizedText[];
  formulaIds: string[];
  activityIds: string[];
  rLessonIds: string[];
  pythonLessonIds: string[];
  questionTags: string[];
  reviewStatus: ReviewStatus;
};

export type ActivityType = "visualization" | "example" | "r-lab" | "python-lab" | "practice";

export type ActivityManifest = {
  id: string;
  topicId: string;
  type: ActivityType;
  appId?: string;
  lessonId?: string;
  title: LocalizedText;
  order: number;
};

export type CourseCatalog = {
  courses: CourseManifest[];
  chapters: ChapterManifest[];
  topics: TopicManifest[];
  activities: ActivityManifest[];
};
