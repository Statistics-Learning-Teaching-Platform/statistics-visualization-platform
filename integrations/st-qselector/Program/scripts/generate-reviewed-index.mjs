import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as yamlLoad } from "js-yaml";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const programDir = path.resolve(scriptDir, "..");
const dataDir = path.resolve(programDir, "..", "Data", "Formed");
const outputFile = path.resolve(programDir, "public", "data", "reviewed-questions.json");
const outputModule = path.resolve(programDir, "src", "generated", "reviewed-questions.ts");
const imagePathPattern = /^[\w./\- ]+\.(png|jpe?g|gif|webp)$/i;
const partMarkerPattern = /(?:^|\n)\s*(?:[a-h][.)]|\([a-h]\))\s+/gm;

const config = yamlLoad(fs.readFileSync(path.join(dataDir, "config.yaml"), "utf8"));
const root = path.resolve(dataDir, config.dataRoot || ".");
const questions = [];
let totalCount = 0;

function attachmentExists(chapterDir, name) {
  return [path.resolve(chapterDir, name), path.resolve(chapterDir, "Assests", name)].some(
    (candidate) =>
      candidate.startsWith(chapterDir + path.sep) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
  );
}

function detectPartCount(content) {
  const markers = String(content || "").match(partMarkerPattern) || [];
  return markers.length >= 2 ? markers.length : 1;
}

for (const chapter of config.chapters || []) {
  const chapterDir = path.resolve(root, chapter.dir || chapter.id);
  const questionFile = path.join(chapterDir, "questions.json");
  const answerFile = path.join(chapterDir, "answers.json");
  if (!fs.existsSync(questionFile)) continue;

  const answerMap = new Map();
  if (fs.existsSync(answerFile)) {
    const answerData = JSON.parse(fs.readFileSync(answerFile, "utf8"));
    for (const answer of answerData.answers || []) {
      if (answer?.id) answerMap.set(answer.id, answer);
    }
  }

  const questionData = JSON.parse(fs.readFileSync(questionFile, "utf8"));
  for (const question of questionData.questions || []) {
    totalCount += 1;
    const answerRecord = answerMap.get(question.id);
    const reviewStatus = question.review_status || answerRecord?.review_status || null;
    if (!reviewStatus || !/审核|审校|reviewed/i.test(reviewStatus)) continue;

    const dataRefs = Array.isArray(question.data_refs) ? question.data_refs : [];
    const attachments = dataRefs.map((name) => ({
      name,
      available: attachmentExists(chapterDir, name),
    }));
    const answer = answerRecord?.answer ?? null;

    questions.push({
      id: question.id,
      groupId: String(question.group_id || question.id),
      partCount:
        typeof question.part_count === "number" && question.part_count > 0
          ? Math.floor(question.part_count)
          : detectPartCount(question.content),
      selectionUnit: "atomic",
      chapterId: String(chapter.id),
      chapterTitle: String(chapter.title || chapter.id),
      chapterNum: Number.parseInt(String(chapter.id).replace(/\D/g, ""), 10) || 0,
      content: question.content || "",
      source: question.source || "",
      type: question.type || "简答题",
      difficulty: typeof question.difficulty === "number" ? question.difficulty : 1,
      keywords: Array.isArray(question.keywords) ? question.keywords : [],
      dataRefs,
      attachments,
      answer,
      answerIsImage:
        typeof answer === "string" && !answer.includes("\n") && imagePathPattern.test(answer.trim()),
      isComplete: Boolean(question.content?.trim()) && attachments.every((item) => item.available),
      isReviewed: true,
      reviewStatus: String(reviewStatus),
    });
  }
}

const countByChapter = new Map();
for (const question of questions) {
  countByChapter.set(question.chapterId, (countByChapter.get(question.chapterId) || 0) + 1);
}

const body = {
  totalCount,
  chapters: (config.chapters || []).map((chapter) => ({
    id: String(chapter.id),
    title: String(chapter.title || chapter.id),
    num: Number.parseInt(String(chapter.id).replace(/\D/g, ""), 10) || 0,
    count: countByChapter.get(String(chapter.id)) || 0,
  })),
  difficulties: [...new Set(questions.map((question) => question.difficulty))].sort((a, b) => a - b),
  questions,
};

const serialized = JSON.stringify(body);
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.mkdirSync(path.dirname(outputModule), { recursive: true });
fs.writeFileSync(outputFile, serialized);
fs.writeFileSync(
  outputModule,
  `import type { QuestionsResponse } from "@/lib/types";\n\nexport const reviewedQuestionIndex: QuestionsResponse = ${serialized};\n`
);
console.log(`Generated ${questions.length} reviewed questions at ${outputFile}`);
