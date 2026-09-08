import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  HeadingLevel,
  ImageRun,
  Math as DocxMath,
  MathRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";
import type { Question } from "@/lib/types";
import { resolveQuestionVisualizations } from "@/lib/question-visualizations";
import { getOwnedAiDrafts } from "@/lib/ai-drafts";
import { getPrivateAssetContent, getPrivateAssetMetadata } from "@/lib/private-assets";
import { consumeRateLimit, requestPrincipal, withConcurrencyLease } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";
import {
  assertExportOutputBudget,
  assertExportSourceBudget,
  createExportBudget,
  ExportBudgetError,
  reserveExportImage,
  reserveExportTableCells,
  type ExportBudget,
} from "@/lib/export-budget";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_W = 450;
const IMG_TOKEN = /\[IMG:([^|\]]+)(?:\|([^\]]+))?\]/g;

function readU16(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, false);
}
function readU32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function pngSize(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 24 || readU32(bytes, 0) !== 0x89504e47) return null;
  return { w: readU32(bytes, 16), h: readU32(bytes, 20) };
}

function jpegSize(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: readU16(bytes, offset + 5), w: readU16(bytes, offset + 7) };
    }
    const length = readU16(bytes, offset + 2);
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

function safeAssetPath(value: string): string | null {
  const path = value.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = path.split("/");
  if (!path || segments.some((part) => !part || part === "." || part === ".." || part.includes("\0"))) return null;
  return segments.join("/");
}

async function fetchAsset(chapterId: string, file: string, budget: ExportBudget, signal: AbortSignal) {
  const safe = safeAssetPath(file);
  if (!safe || !/^Ch(?:0[1-9]|1[0-3])$/.test(chapterId)) return null;
  const candidates = safe.startsWith("Assests/") ? [safe] : [safe, `Assests/${safe}`];
  signal.throwIfAborted();
  const metadata = await getPrivateAssetMetadata(candidates.map((candidate) => `${chapterId}/${candidate}`));
  if (!metadata) return null;
  reserveExportImage(budget, metadata.contentLength);
  signal.throwIfAborted();
  const content = await getPrivateAssetContent(metadata);
  signal.throwIfAborted();
  if (!content) throw new AuthError(409, "附件在导出期间发生变化，请重试");
  return content;
}

async function imageParagraph(
  chapterId: string,
  file: string,
  budget: ExportBudget,
  signal: AbortSignal,
): Promise<Paragraph | null> {
  const extension = file.split(".").at(-1)?.toLowerCase();
  if (extension !== "png" && extension !== "jpg" && extension !== "jpeg") return null;
  const data = await fetchAsset(chapterId, file, budget, signal);
  if (!data) return null;
  const size = extension === "png" ? pngSize(data) : jpegSize(data);
  let width = 400;
  let height = 300;
  if (size && size.w > 0 && size.h > 0) {
    const scale = Math.min(1, MAX_W / size.w);
    width = Math.round(size.w * scale);
    height = Math.round(size.h * scale);
  }
  return new Paragraph({
    children: [new ImageRun({ type: extension === "png" ? "png" : "jpg", data, transformation: { width, height } })],
  });
}

function cleanLine(value: string): string {
  return value
    .replace(/\[FORMULA:[^\]]*\]/g, "【公式】")
    .replace(/`<!--.*?-->`\{=html\}/g, "")
    .replace(/~~/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1")
    .replace(/\s+$/g, "");
}

function inlineChildren(value: string): ParagraphChild[] {
  const clean = cleanLine(value);
  const children: ParagraphChild[] = [];
  const tokenPattern = /(\*\*[^*\n]+\*\*|\$[^$\n]+\$)/g;
  let offset = 0;
  for (const match of clean.matchAll(tokenPattern)) {
    if ((match.index ?? 0) > offset) children.push(new TextRun(clean.slice(offset, match.index)));
    if (match[0].startsWith("**")) {
      children.push(new TextRun({ text: match[0].slice(2, -2), bold: true }));
    } else {
      children.push(new DocxMath({ children: [new MathRun(match[0].slice(1, -1))] }));
    }
    offset = (match.index ?? 0) + match[0].length;
  }
  if (offset < clean.length) children.push(new TextRun(clean.slice(offset)));
  return children;
}

function markdownCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replaceAll("\\|", "|"));
}

function isTableSeparator(line: string): boolean {
  const cells = markdownCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function markdownTable(lines: string[], budget: ExportBudget): Table {
  const dataLines = lines.filter((_, index) => index !== 1);
  const rows = dataLines.map(markdownCells);
  reserveExportTableCells(budget, rows.reduce((count, cells) => count + cells.length, 0));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      children: cells.map((cell) => new TableCell({
        children: [new Paragraph({ children: inlineChildren(cell) })],
        shading: rowIndex === 0 ? { fill: "E2E8F0" } : undefined,
      })),
    })),
  });
}

async function textToParagraphs(
  chapterId: string,
  text: string,
  budget: ExportBudget,
  signal: AbortSignal,
): Promise<Array<Paragraph | Table>> {
  const output: Array<Paragraph | Table> = [];
  const lines = text.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    signal.throwIfAborted();
    const rawLine = lines[lineIndex];
    if (rawLine.includes("|") && lineIndex + 1 < lines.length && isTableSeparator(lines[lineIndex + 1])) {
      const tableLines = [rawLine, lines[lineIndex + 1]];
      lineIndex += 2;
      while (lineIndex < lines.length && lines[lineIndex].includes("|")) {
        tableLines.push(lines[lineIndex]);
        lineIndex += 1;
      }
      lineIndex -= 1;
      output.push(markdownTable(tableLines, budget));
      continue;
    }
    const displayMath = rawLine.trim().match(/^\$\$([\s\S]+)\$\$$/);
    if (displayMath) {
      output.push(new Paragraph({ children: [new DocxMath({ children: [new MathRun(displayMath[1].trim())] })] }));
      continue;
    }
    const matches = [...rawLine.matchAll(IMG_TOKEN)];
    if (!matches.length) {
      output.push(new Paragraph({ children: inlineChildren(rawLine) }));
      continue;
    }
    let offset = 0;
    for (const match of matches) {
      const before = cleanLine(rawLine.slice(offset, match.index));
      if (before.trim()) output.push(new Paragraph({ children: inlineChildren(before) }));
      const file = match[1].trim();
      output.push(
        (await imageParagraph(chapterId, file, budget, signal))
          ?? new Paragraph({ children: [new TextRun(`[图片: ${file}]`)] }),
      );
      offset = (match.index ?? 0) + match[0].length;
    }
    const after = cleanLine(rawLine.slice(offset));
    if (after.trim()) output.push(new Paragraph({ children: inlineChildren(after) }));
  }
  return output;
}

async function questionBlocks(
  question: Question,
  index: number,
  withAnswer: boolean,
  budget: ExportBudget,
  signal: AbortSignal,
) {
  const blocks: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { before: 240, after: 80 },
      children: [
        new TextRun({ text: `${index}. `, bold: true }),
        new TextRun({ text: `[${question.chapterTitle}] `, bold: true, color: "2563EB" }),
        new TextRun({ text: `(难度 ${question.difficulty})`, color: "888888", size: 18 }),
      ],
    }),
    ...(await textToParagraphs(question.chapterId, question.content, budget, signal)),
  ];
  // Mermaid renders in the browser and therefore survives browser print/PDF.
  // DOCX generation runs without a browser/Chromium; retain both the human
  // description and validated source so the chart is never silently dropped.
  for (const visualization of question.visualizations ?? []) {
    blocks.push(
      new Paragraph({
        spacing: { before: 100, after: 30 },
        children: [new TextRun({ text: `图表：${visualization.title}`, bold: true, color: "334155" })],
      }),
      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: visualization.alt, italics: true, color: "475569" })],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: `Mermaid 源码（网页/PDF 中显示为图表）：\n${visualization.source}`, font: "Courier New", size: 18 })],
      }),
    );
  }
  if (!withAnswer) return blocks;
  blocks.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: "答案：", bold: true, color: "16A34A" })] }));
  if (question.answer == null) {
    blocks.push(new Paragraph({ children: [new TextRun({ text: "（暂无答案）", italics: true, color: "888888" })] }));
  } else if (question.answerIsImage) {
    blocks.push(
      (await imageParagraph(question.chapterId, question.answer.trim(), budget, signal))
        ?? new Paragraph({ children: [new TextRun(`[答案图片: ${question.answer.trim()}]`)] }),
    );
  } else {
    blocks.push(...(await textToParagraphs(question.chapterId, question.answer, budget, signal)));
  }
  return blocks;
}

export async function POST(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSession(request, ["teacher", "superadmin"]);
    await verifyCsrf(request, session);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "export-docx",
      limit: 20,
      windowSeconds: 60 * 60,
    });
    const body = await readLimitedJson(request, 2 * 1024 * 1024) as Record<string, unknown>;
    const ids = Array.isArray(body.ids)
      ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.length <= 100))].slice(0, 100)
      : [];
    if (!ids.length) throw new AuthError(400, "未选择题目");
    const withAnswer = body.withAnswer === true;
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : "组卷试卷";

    const stored = reviewedQuestionIndex.questions.filter((question) => ids.includes(question.id));
    const generatedIds = ids.filter((id) => id.startsWith("ai_"));
    const generated = await getOwnedAiDrafts(session.user.id, { ids: generatedIds, adoptedOnly: true });
    const byId = new Map([...stored, ...generated.map((draft) => draft.question)].map((question) => [question.id, question]));
    const questions = ids.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question))
      .map((question) => ({
        ...question,
        visualizations: resolveQuestionVisualizations(question.content, question.visualizations),
      }));
    if (!questions.length) throw new AuthError(400, "没有可导出的有效题目");
    if (questions.length !== ids.length) throw new AuthError(400, "试卷包含不存在或不属于当前账号的题目");
    assertExportSourceBudget(title.length + questions.reduce((total, question) =>
      total
      + question.content.length
      + (withAnswer ? question.answer?.length ?? 0 : 0)
      + (question.visualizations ?? []).reduce((visualTotal, visualization) => (
        visualTotal + visualization.title.length + visualization.alt.length + visualization.source.length
      ), 0), 0));

    return await withConcurrencyLease({
      route: "export-docx",
      limit: 2,
      ttlSeconds: 110,
      requestSignal: request.signal,
      work: async (signal) => {
        const budget = createExportBudget();
        const children: Array<Paragraph | Table> = [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }),
          new Paragraph({ children: [new TextRun({ text: `共 ${questions.length} 题${withAnswer ? "（含答案）" : ""}`, color: "666666" })] }),
        ];
        for (let index = 0; index < questions.length; index += 1) {
          signal.throwIfAborted();
          children.push(...(await questionBlocks(questions[index], index + 1, withAnswer, budget, signal)));
        }

        signal.throwIfAborted();
        const buffer = await Packer.toBuffer(new Document({ sections: [{ children }] }));
        signal.throwIfAborted();
        assertExportOutputBudget(buffer.byteLength);
        const fileName = encodeURIComponent(`${title}${withAnswer ? "-含答案" : ""}.docx`);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
            "Cache-Control": "no-store",
          },
        });
      },
    });
  } catch (error) {
    if (error instanceof ExportBudgetError) return authErrorResponse(new AuthError(413, error.message));
    return authErrorResponse(error);
  }
}
