import type { LocalizedText } from "../course/types";

export type CodeLanguage = "r" | "python";

export type CodeLesson<Unit extends string = string, Language extends CodeLanguage = CodeLanguage> = {
  id: string;
  topicId: string;
  caseId?: string;
  language: Language;
  visualizerId?: string;
  datasetId?: string;
  prerequisites: string[];
  unit: Unit;
  order: number;
  title: LocalizedText;
  eyebrow: LocalizedText;
  objective: LocalizedText;
  explanation: LocalizedText;
  task: LocalizedText;
  concepts: string[];
  packages?: string[];
  starterCode: string;
  solution: string;
  checkCode: string;
  hint: LocalizedText;
  success: LocalizedText;
};

export type CodeLearningContext = {
  topicId?: string;
  lessonId: string;
  returnTo: string;
  currentParameters: Record<string, unknown>;
  caseId?: string;
};

export type CodeLessonUnit<Unit extends string = string> = {
  id: Unit;
  number: string;
  zh: string;
  en: string;
};

export type AiTutorRequest = {
  topicId: string;
  lessonId: string;
  learningObjective: string;
  currentParameters: Record<string, unknown>;
  currentCode: string;
  consoleOutput: string[];
  chartSummary: string;
  question: string;
};
