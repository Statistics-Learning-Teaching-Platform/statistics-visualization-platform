// The question-bank app is deployed from its Program directory on its own, so
// the framework-neutral textbook registry lives there and is re-exported here.
// This keeps both applications on one canonical mapping instead of two copies.

export type { TextbookChapterId } from "../../integrations/st-qselector/Program/src/lib/textbook-chapters";
export {
  getTextbookChapterIdForTopic,
  getTextbookChapterIdsForTopics,
  isTextbookChapterId,
  textbookChapterByTopicId,
  textbookChapterIds,
  textbookChapters,
} from "../../integrations/st-qselector/Program/src/lib/textbook-chapters";
