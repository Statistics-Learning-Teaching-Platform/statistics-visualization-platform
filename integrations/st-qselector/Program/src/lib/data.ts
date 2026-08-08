import "server-only";
import fs from "node:fs";
import path from "node:path";
import { load as yamlLoad } from "js-yaml";
import type { AppConfig, Question } from "./types";

// 数据目录：默认取 Program 的上级 Data/Formed，可用 DATA_DIR 环境变量覆盖。
export function getDataDir(): string {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  return path.resolve(process.cwd(), "..", "Data", "Formed");
}

function getConfigPath(): string {
  return path.join(getDataDir(), "config.yaml");
}

/** 章节目录的绝对路径（供附件路由复用，含越界校验）。 */
export function getChapterDir(chapterId: string): string | null {
  const cfg = loadConfig();
  const ch = cfg.chapters.find((c) => c.id === chapterId);
  if (!ch) return null;
  const root = path.resolve(getDataDir(), cfg.dataRoot || ".");
  const dir = path.resolve(root, ch.dir);
  // 越界保护：解析后的目录必须仍在 dataRoot 内。
  if (dir !== root && !dir.startsWith(root + path.sep)) return null;
  return dir;
}

let _configCache: AppConfig | null = null;
export function loadConfig(): AppConfig {
  if (_configCache) return _configCache;
  const raw = fs.readFileSync(getConfigPath(), "utf8");
  const parsed = (yamlLoad(raw) || {}) as Partial<AppConfig>;
  const chapters = (parsed.chapters || []).map((c) => ({
    id: String(c.id),
    title: String(c.title ?? c.id),
    dir: String(c.dir ?? c.id),
  }));
  _configCache = { dataRoot: parsed.dataRoot || ".", chapters };
  return _configCache;
}

// 判断 answer 是否为“单个图片相对路径”（如 "Answers/Q1.png"）。
const IMG_PATH_RE = /^[\w./\- ]+\.(png|jpe?g|gif|webp)$/i;
function detectAnswerImage(answer: string | null): boolean {
  if (!answer) return false;
  const t = answer.trim();
  if (t.includes("\n")) return false;
  return IMG_PATH_RE.test(t);
}

// 判断某个附件文件是否真实存在（章节目录或其 Assests/ 下）。
function attachmentExists(chapterDir: string, name: string): boolean {
  for (const abs of [
    path.resolve(chapterDir, name),
    path.resolve(chapterDir, "Assests", name),
  ]) {
    if (abs !== chapterDir && !abs.startsWith(chapterDir + path.sep)) continue;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
  }
  return false;
}

interface RawQuestion {
  id: string;
  group_id?: string;
  part_count?: number;
  content?: string;
  source?: string;
  type?: string;
  difficulty?: number;
  keywords?: string[];
  data_refs?: string[];
  review_status?: string;
}

interface RawAnswer {
  id?: string;
  answer?: string | null;
  review_status?: string;
}

const QUESTION_TYPES = new Set(["选择题", "判断题", "填空题", "计算题", "简答题", "综合题"]);

const PART_MARKER_RE = /(?:^|\n)\s*(?:[a-h][.)]|\([a-h]\))\s+/gm;

function detectPartCount(content: string): number {
  const markers = content.match(PART_MARKER_RE) || [];
  return markers.length >= 2 ? markers.length : 1;
}

function inferQuestionType(rawType: string | undefined, content: string): string {
  if (rawType && QUESTION_TYPES.has(rawType)) return rawType;
  const text = content.toLowerCase();
  if (/true\s*\/\s*false|true or false|判断下列|判断题/.test(text)) return "判断题";
  if (/fill in|填空|____+/.test(text)) return "填空题";
  if (/which of the following|select (all|the)|选择正确|options?:/.test(text)) return "选择题";
  if (/calculate|compute|find the (mean|median|variance|standard deviation|probability|interval)|求|计算/.test(text)) return "计算题";
  if (/construct|draw|plot|analy[sz]e|compare the distributions|分别回答|完成下列各问/.test(text)) return "综合题";
  return "简答题";
}

function questionIsComplete(content: string, attachments: { available: boolean }[]): boolean {
  const text = content.trim();
  if (!text || attachments.some((item) => !item.available)) return false;
  if (/无法预览|\[图片[^\]]*\]|!\[[^\]]*\]\(\/api\/asset/i.test(text)) return false;
  const referencesMissingContext =
    /exercise\s+\d+\s+above|the (?:following|above) (?:figure|table|graph)|figure\s+\d+(?:\.\d+)?\s+(?:above|below|gives)|下图|上表|下表/i.test(text);
  const hasEmbeddedContext = /\[IMG:|\|\s*[-:]+\s*\||```text/i.test(text) || attachments.length > 0;
  return !referencesMissingContext || hasEmbeddedContext;
}

let _questionsCache: Question[] | null = null;

export function loadAllQuestions(): Question[] {
  if (_questionsCache) return _questionsCache;
  const cfg = loadConfig();
  const root = path.resolve(getDataDir(), cfg.dataRoot || ".");
  const all: Question[] = [];

  for (const ch of cfg.chapters) {
    const dir = path.join(root, ch.dir);
    const qFile = path.join(dir, "questions.json");
    const aFile = path.join(dir, "answers.json");
    if (!fs.existsSync(qFile)) continue;

    const chapterNum = parseInt(ch.id.replace(/\D/g, ""), 10) || 0;

    // 答案先建索引
    const answerMap = new Map<string, { answer: string | null; reviewStatus: string | null }>();
    if (fs.existsSync(aFile)) {
      try {
        const aData = JSON.parse(fs.readFileSync(aFile, "utf8"));
        for (const a of (aData.answers || []) as RawAnswer[]) {
          if (a && a.id) {
            answerMap.set(a.id, {
              answer: a.answer ?? null,
              reviewStatus: a.review_status ? String(a.review_status) : null,
            });
          }
        }
      } catch {
        // 忽略损坏的答案文件，题目仍可加载
      }
    }

    try {
      const qData = JSON.parse(fs.readFileSync(qFile, "utf8"));
      for (const q of (qData.questions || []) as RawQuestion[]) {
        if (!q || !q.id) continue;
        const answerRecord = answerMap.get(q.id);
        const answer = answerRecord?.answer ?? null;
        const dataRefs = Array.isArray(q.data_refs) ? q.data_refs : [];
        const attachments = dataRefs.map((name) => ({
          name,
          available: attachmentExists(dir, name),
        }));
        const reviewStatus = q.review_status
          ? String(q.review_status)
          : answerRecord?.reviewStatus ?? null;
        const content = q.content ?? "";
        const groupId = q.group_id?.trim() || q.id;
        const partCount =
          typeof q.part_count === "number" && q.part_count > 0
            ? Math.floor(q.part_count)
            : detectPartCount(content);
        all.push({
          id: q.id,
          groupId,
          partCount,
          selectionUnit: "atomic",
          chapterId: ch.id,
          chapterTitle: ch.title,
          chapterNum,
          content,
          source: q.source ?? "",
          type: inferQuestionType(q.type, content),
          difficulty: typeof q.difficulty === "number" ? q.difficulty : 1,
          keywords: Array.isArray(q.keywords) ? q.keywords : [],
          dataRefs,
          attachments,
          answer,
          answerIsImage: detectAnswerImage(answer),
          isComplete: questionIsComplete(content, attachments),
          isReviewed: Boolean(reviewStatus && /审核|审校|reviewed/i.test(reviewStatus)),
          reviewStatus,
        });
      }
    } catch {
      // 跳过损坏的题目文件
    }
  }

  _questionsCache = all;
  return all;
}

export function getQuestionsByIds(ids: string[]): Question[] {
  const set = new Set(ids);
  const byId = new Map(loadAllQuestions().map((q) => [q.id, q]));
  // 保持传入 ids 的顺序
  return ids.filter((id) => set.has(id) && byId.has(id)).map((id) => byId.get(id)!);
}
