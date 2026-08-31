import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as yamlLoad } from "js-yaml";
import { normalizeTopicIds } from "../src/lib/topic-mapping.ts";
import { getTextbookChapterIdsForTopics } from "../src/lib/textbook-chapters.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const programDir = path.resolve(scriptDir, "..");
const integrationDir = path.resolve(programDir, "..");
const dataDir = path.resolve(integrationDir, "Data", "Formed");
const manifestPath = path.resolve(integrationDir, "Data", "Audit", "question-audit-manifest.json");
const outputModule = path.resolve(programDir, "src", "generated", "reviewed-questions.ts");
const assetManifestFile = path.resolve(programDir, "database", "private-assets-manifest.json");
const reviewLockFile = path.resolve(programDir, "config", "reviewed-content-lock.json");
const legacyPublicIndex = path.resolve(programDir, "public", "data", "reviewed-questions.json");
const legacyPublicAssetDir = path.resolve(programDir, "public", "assets");
const writeReviewLock = process.argv.includes("--write-review-lock");

const requiredReviewGates = [
  "english",
  "source",
  "grouping",
  "independent_solution",
  "verification",
  "metadata",
  "render",
];
const imagePathPattern = /^[\w./\- ]+\.(png|jpe?g|gif|webp)$/i;
const partMarkerPattern = /(?:^|\n)\s*(?:[a-h][.)]|\([a-h]\))\s+/gim;
const embeddedAssetPattern = /\[(?:IMG|FORMULA|DATA):([^|\]]+)/g;
const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function inside(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function resolveAsset(chapterDir, name) {
  const candidates = [
    path.resolve(chapterDir, name),
    path.resolve(chapterDir, "Assests", name),
    path.resolve(chapterDir, "Answers", name),
    path.resolve(chapterDir, "Answer", name),
  ];
  return candidates.find((candidate) =>
    inside(chapterDir, candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  ) ?? null;
}

function collectTextAssetReferences(value) {
  const references = new Set();
  for (const match of String(value || "").matchAll(embeddedAssetPattern)) references.add(match[1].trim());
  return [...references].filter(Boolean);
}

function describeAsset(chapterId, chapterDir, reference, accessScope) {
  const source = resolveAsset(chapterDir, reference);
  if (!source) throw new Error(`${chapterId}: referenced asset is missing: ${reference}`);
  const relative = path.relative(chapterDir, source);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${chapterId}: referenced asset escapes its chapter: ${reference}`);
  }
  const extension = path.extname(source).toLowerCase();
  return {
    key: `${chapterId}/${relative.split(path.sep).join("/")}`,
    source: path.relative(integrationDir, source).split(path.sep).join("/"),
    contentType: mimeTypes[extension] || "application/octet-stream",
    accessScope,
    sha256: sha256File(source),
    size: fs.statSync(source).size,
  };
}

function canonicalReviewRecord(chapter, question, answer, assets) {
  return {
    id: String(question.id),
    groupId: String(question.group_id || question.id),
    partCount: typeof question.part_count === "number" ? Math.floor(question.part_count) : detectPartCount(question.content),
    chapterId: String(chapter.id),
    chapterTitle: String(chapter.title || chapter.id),
    content: String(question.content || ""),
    answer,
    source: String(question.source || ""),
    type: String(question.type || "简答题"),
    difficulty: typeof question.difficulty === "number" ? question.difficulty : 1,
    keywords: Array.isArray(question.keywords) ? question.keywords.map(String) : [],
    dataRefs: Array.isArray(question.data_refs) ? question.data_refs.map(String) : [],
    formulaRefs: Array.isArray(question.formula_refs) ? question.formula_refs.map(String) : [],
    origin: question.origin === "variant" || question.origin === "generated" ? question.origin : "bank",
    parentQuestionId: question.parent_question_id ?? null,
    assets: assets.map(({ key, sha256 }) => ({ key, sha256 })).sort((a, b) => a.key.localeCompare(b.key)),
  };
}

function detectPartCount(content) {
  const markers = String(content || "").match(partMarkerPattern) || [];
  return markers.length >= 2 ? markers.length : 1;
}

function reviewErrors(question, answerRecord, manifestRecord) {
  const errors = [];
  const content = String(question.content || "");
  const answer = answerRecord?.answer == null ? "" : String(answerRecord.answer);
  const questionHash = sha256Text(content);
  const answerHash = sha256Text(answer);
  const reviews = [question.review, answerRecord?.review];
  for (const [index, review] of reviews.entries()) {
    const label = index === 0 ? "question" : "answer";
    if (!review || typeof review !== "object") {
      errors.push(`${label}_review_missing`);
      continue;
    }
    if (review.schema_version !== 1) errors.push(`${label}_review_schema_invalid`);
    if (review.status !== "approved") errors.push(`${label}_review_not_approved`);
    if (typeof review.pack_id !== "string" || !review.pack_id.trim()) errors.push(`${label}_review_pack_missing`);
    if (review.question_hash !== questionHash) errors.push(`${label}_question_hash_mismatch`);
    if (review.answer_hash !== answerHash) errors.push(`${label}_answer_hash_mismatch`);
    for (const gate of requiredReviewGates) {
      if (review.gates?.[gate] !== "passed") errors.push(`${label}_${gate}_not_passed`);
    }
  }
  if (!content.trim()) errors.push("question_empty");
  if (!answer.trim()) errors.push("answer_empty");
  if (reviews[0]?.pack_id !== reviews[1]?.pack_id) errors.push("review_pack_mismatch");
  if (reviews[0]?.question_hash !== reviews[1]?.question_hash) errors.push("review_question_hash_mismatch");
  if (reviews[0]?.answer_hash !== reviews[1]?.answer_hash) errors.push("review_answer_hash_mismatch");
  if (!manifestRecord) {
    errors.push("audit_manifest_record_missing");
  } else {
    if (manifestRecord.original?.question_hash !== questionHash) errors.push("manifest_question_hash_mismatch");
    if (manifestRecord.original?.answer_hash !== answerHash) errors.push("manifest_answer_hash_mismatch");
    if (manifestRecord.workflow?.eligible_for_paper !== true) errors.push("manifest_not_eligible");
    if (manifestRecord.diagnostics?.structured_review_valid !== true) errors.push("manifest_review_invalid");
  }
  return [...new Set(errors)];
}

const config = yamlLoad(fs.readFileSync(path.join(dataDir, "config.yaml"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestById = new Map((manifest.questions || []).map((record) => [record.id, record]));
const reviewLock = fs.existsSync(reviewLockFile)
  ? JSON.parse(fs.readFileSync(reviewLockFile, "utf8"))
  : { schemaVersion: 1, questions: {} };
const root = path.resolve(dataDir, config.dataRoot || ".");
const questions = [];
const fullReviewHashes = {};
const privateAssets = new Map();
const rejected = [];
const excluded = [];
let totalCount = 0;
const seenIds = new Set();

for (const chapter of config.chapters || []) {
  const chapterDir = path.resolve(root, chapter.dir || chapter.id);
  if (!inside(root, chapterDir)) throw new Error(`chapter escapes data root: ${chapter.id}`);
  const questionFile = path.join(chapterDir, "questions.json");
  const answerFile = path.join(chapterDir, "answers.json");
  if (!fs.existsSync(questionFile)) continue;

  const answerMap = new Map();
  if (fs.existsSync(answerFile)) {
    const answerData = JSON.parse(fs.readFileSync(answerFile, "utf8"));
    for (const answer of answerData.answers || []) {
      if (!answer?.id || answerMap.has(answer.id)) {
        throw new Error(`${chapter.id}: missing or duplicate answer id: ${answer?.id}`);
      }
      answerMap.set(answer.id, answer);
    }
  }

  const questionData = JSON.parse(fs.readFileSync(questionFile, "utf8"));
  const chapterQuestionIds = new Set();
  for (const question of questionData.questions || []) {
    totalCount += 1;
    if (!question?.id || seenIds.has(question.id)) throw new Error(`missing or duplicate question id: ${question?.id}`);
    seenIds.add(question.id);
    chapterQuestionIds.add(question.id);
    const answerRecord = answerMap.get(question.id);
    const manifestRecord = manifestById.get(question.id);
    const errors = reviewErrors(question, answerRecord, manifestRecord);
    if (errors.length) {
      const claimsApproval =
        question.review?.status === "approved" ||
        answerRecord?.review?.status === "approved" ||
        manifestRecord?.workflow?.eligible_for_paper === true;
      (claimsApproval ? rejected : excluded).push({ id: question.id, errors });
      continue;
    }

    const answer = String(answerRecord.answer);
    const dataRefs = Array.isArray(question.data_refs) ? question.data_refs.map(String) : [];
    const questionRefs = new Set([
      ...collectTextAssetReferences(question.content),
      ...(Array.isArray(question.formula_refs) ? question.formula_refs.map(String) : []),
    ]);
    const answerRefs = new Set(collectTextAssetReferences(answer));
    if (!answer.includes("\n") && imagePathPattern.test(answer.trim())) answerRefs.add(answer.trim());
    const describedAssets = [];
    for (const [scope, references] of [
      ["question", questionRefs],
      ["attachment", new Set(dataRefs)],
      ["answer", answerRefs],
    ]) {
      for (const reference of references) {
        const asset = describeAsset(String(chapter.id), chapterDir, reference, scope);
        const existing = privateAssets.get(asset.key);
        if (!existing || (existing.accessScope === "answer" && scope !== "answer")) privateAssets.set(asset.key, asset);
        describedAssets.push(asset);
      }
    }
    const fullReviewHash = sha256Text(JSON.stringify(canonicalReviewRecord(chapter, question, answer, describedAssets)));
    fullReviewHashes[question.id] = fullReviewHash;
    if (!writeReviewLock && reviewLock.questions?.[question.id] !== fullReviewHash) {
      rejected.push({ id: question.id, errors: ["full_review_hash_mismatch"] });
      continue;
    }
    const attachments = dataRefs.map((name) => ({ name, available: Boolean(resolveAsset(chapterDir, name)) }));

    const keywords = Array.isArray(question.keywords) ? question.keywords : [];
    const topicIds = normalizeTopicIds(String(chapter.id), keywords, question.topic_ids);
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
      source: "StatMind 已审核题库",
      type: question.type || "简答题",
      difficulty: typeof question.difficulty === "number" ? question.difficulty : 1,
      estimatedMinutes: Math.max(1, Math.min(60, (typeof question.difficulty === "number" ? question.difficulty : 1) * (question.type === "综合题" ? 5 : 3))),
      keywords,
      topicIds,
      textbookChapterIds: getTextbookChapterIdsForTopics(topicIds),
      dataRefs,
      attachments,
      answer,
      answerIsImage: !answer.includes("\n") && imagePathPattern.test(answer.trim()),
      isComplete: Boolean(question.content?.trim()) && Boolean(answer.trim()) && attachments.every((item) => item.available),
      isReviewed: true,
      reviewStatus: `approved:${question.review.pack_id}:${fullReviewHash.slice(0, 12)}`,
      origin: question.origin === "variant" || question.origin === "generated" ? question.origin : "bank",
      parentQuestionId: question.parent_question_id ?? null,
      verification: question.verification ?? null,
    });
  }
  if (
    answerMap.size !== chapterQuestionIds.size ||
    [...answerMap.keys()].some((answerId) => !chapterQuestionIds.has(answerId))
  ) {
    throw new Error(`${chapter.id}: question/answer IDs do not exactly match`);
  }
}

if (manifestById.size !== totalCount) {
  throw new Error(`audit manifest/data count mismatch: manifest=${manifestById.size}, data=${totalCount}`);
}
if (rejected.length) {
  const details = rejected.slice(0, 20).map((item) => `${item.id}: ${item.errors.join(", ")}`).join("\n");
  throw new Error(`refusing to publish ${rejected.length} questions that failed review closure:\n${details}`);
}

const countByChapter = new Map();
for (const question of questions) {
  countByChapter.set(question.chapterId, (countByChapter.get(question.chapterId) || 0) + 1);
}

const body = {
  revision: sha256Text(Object.entries(fullReviewHashes).sort(([a], [b]) => a.localeCompare(b)).map(([id, hash]) => `${id}:${hash}`).join("\n")),
  totalCount: questions.length,
  chapters: (config.chapters || []).map((chapter) => ({
    id: String(chapter.id),
    title: String(chapter.title || chapter.id),
    num: Number.parseInt(String(chapter.id).replace(/\D/g, ""), 10) || 0,
    count: countByChapter.get(String(chapter.id)) || 0,
  })),
  difficulties: [...new Set(questions.map((question) => question.difficulty))].sort((a, b) => a - b),
  coverage: {
    isComplete: (config.chapters || []).every((chapter) => (countByChapter.get(String(chapter.id)) || 0) > 0),
    emptyChapterIds: (config.chapters || [])
      .map((chapter) => String(chapter.id))
      .filter((chapterId) => (countByChapter.get(chapterId) || 0) === 0),
  },
  questions,
};

const serialized = JSON.stringify(body);
fs.mkdirSync(path.dirname(outputModule), { recursive: true });
// Use a relative import: the portal's demo pages also compile this generated
// module, and their tsconfig does not provide the "@/" alias.
fs.writeFileSync(
  outputModule,
  `import type { QuestionsResponse } from "../lib/types";\n\nexport const reviewedQuestionIndex: QuestionsResponse = ${serialized};\n`
);
fs.writeFileSync(
  assetManifestFile,
  JSON.stringify({ schemaVersion: 1, assets: [...privateAssets.values()].sort((a, b) => a.key.localeCompare(b.key)) }, null, 2) + "\n",
);
if (writeReviewLock) {
  fs.writeFileSync(
    reviewLockFile,
    JSON.stringify({ schemaVersion: 1, questions: fullReviewHashes }, null, 2) + "\n",
  );
}
if (fs.existsSync(legacyPublicIndex)) fs.rmSync(legacyPublicIndex);
if (fs.existsSync(legacyPublicAssetDir)) fs.rmSync(legacyPublicAssetDir, { recursive: true });
console.log(
  `Generated ${questions.length} reviewed questions, excluded ${excluded.length} pending records, ` +
  `and indexed ${privateAssets.size} private assets`
);
const coverageGaps = (body.chapters || []).filter((chapter) => chapter.count <= 2);
if (coverageGaps.length) {
  console.warn(`Reviewed coverage gaps: ${coverageGaps.map((chapter) => `${chapter.id}=${chapter.count}`).join(", ")}`);
}
