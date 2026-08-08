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
  content?: string;
  source?: string;
  type?: string;
  difficulty?: number;
  keywords?: string[];
  data_refs?: string[];
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
    const answerMap = new Map<string, string>();
    if (fs.existsSync(aFile)) {
      try {
        const aData = JSON.parse(fs.readFileSync(aFile, "utf8"));
        for (const a of aData.answers || []) {
          if (a && a.id) answerMap.set(a.id, a.answer ?? null);
        }
      } catch {
        // 忽略损坏的答案文件，题目仍可加载
      }
    }

    try {
      const qData = JSON.parse(fs.readFileSync(qFile, "utf8"));
      for (const q of (qData.questions || []) as RawQuestion[]) {
        if (!q || !q.id) continue;
        const answer = answerMap.has(q.id) ? answerMap.get(q.id)! : null;
        const dataRefs = Array.isArray(q.data_refs) ? q.data_refs : [];
        all.push({
          id: q.id,
          chapterId: ch.id,
          chapterTitle: ch.title,
          chapterNum,
          content: q.content ?? "",
          source: q.source ?? "",
          type: q.type ?? "unknown",
          difficulty: typeof q.difficulty === "number" ? q.difficulty : 1,
          keywords: Array.isArray(q.keywords) ? q.keywords : [],
          dataRefs,
          attachments: dataRefs.map((name) => ({
            name,
            available: attachmentExists(dir, name),
          })),
          answer,
          answerIsImage: detectAnswerImage(answer),
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
