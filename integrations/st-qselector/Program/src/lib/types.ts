// 共享数据类型（前后端通用）

export interface ChapterConfig {
  id: string; // 如 "Ch01"
  title: string; // 显示标题，如 "第1章"
  dir: string; // 相对 dataRoot 的目录名
}

export interface AppConfig {
  dataRoot: string;
  chapters: ChapterConfig[];
}

export interface Question {
  id: string; // 如 "ch01_q01"
  groupId: string; // 组卷原子；同一大题的所有小问共享此 ID
  partCount: number; // 顶层小问数量；单问题为 1
  selectionUnit: "atomic"; // 大题及其小问必须整体选择
  chapterId: string; // "Ch01"
  chapterTitle: string; // "第1章"
  chapterNum: number; // 1
  content: string;
  source: string;
  type: string;
  difficulty: number;
  keywords: string[];
  dataRefs: string[];
  attachments: { name: string; available: boolean }[];
  answer: string | null;
  answerIsImage: boolean; // answer 是否为图片相对路径
  isComplete: boolean;
  isReviewed: boolean;
  reviewStatus: string | null;
}

export interface QuestionsResponse {
  totalCount?: number;
  chapters: { id: string; title: string; num: number; count: number }[];
  difficulties: number[];
  questions: Question[];
}
