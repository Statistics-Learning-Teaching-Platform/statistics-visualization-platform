import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
} from "docx";
import { getChapterDir, getQuestionsByIds } from "@/lib/data";
import type { Question } from "@/lib/types";

// ---- 图片尺寸解析（仅 PNG / JPEG，用于按比例缩放，避免拉伸）----
function pngSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function jpegSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off < buf.length) {
    if (buf[off] !== 0xff) {
      off++;
      continue;
    }
    const marker = buf[off + 1];
    // SOF0..SOF15 (排除 DHT/JPG/DAC 等非帧标记)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
    }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  return null;
}

const MAX_W = 450; // docx 中图片最大宽度（px）

function resolveAsset(chapterId: string, file: string): string | null {
  const dir = getChapterDir(chapterId);
  if (!dir) return null;
  for (const abs of [path.resolve(dir, file), path.resolve(dir, "Assests", file)]) {
    if (abs !== dir && !abs.startsWith(dir + path.sep)) continue;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  }
  return null;
}

function imageParagraph(chapterId: string, file: string): Paragraph | null {
  const ext = path.extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) return null; // emf/wmf 无法嵌入
  const abs = resolveAsset(chapterId, file);
  if (!abs) return null;
  try {
    const data = fs.readFileSync(abs);
    const size = ext === ".png" ? pngSize(data) : jpegSize(data);
    let w = 400,
      h = 300;
    if (size && size.w > 0) {
      const scale = Math.min(1, MAX_W / size.w);
      w = Math.round(size.w * scale);
      h = Math.round(size.h * scale);
    }
    return new Paragraph({
      children: [
        new ImageRun({
          type: ext === ".png" ? "png" : "jpg",
          data,
          transformation: { width: w, height: h },
        }),
      ],
    });
  } catch {
    return null;
  }
}

// 去除常见 markdown 标记，转为纯文本行。
function cleanLine(s: string): string {
  return s
    .replace(/\[FORMULA:[^\]]*\]/g, "【公式】")
    .replace(/`<!--.*?-->`\{=html\}/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/~~/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1")
    .replace(/\s+$/g, "");
}

// 支持 [IMG:file] 与 [IMG:file|替代文字]；导出时图片文件名只取竖线前部分。
const IMG_TOKEN = /\[IMG:([^|\]]+)(?:\|([^\]]+))?\]/g;

// 把一段文本（含 [IMG:x] 占位符）转成 docx 段落数组。
function textToParagraphs(chapterId: string, text: string): Paragraph[] {
  const out: Paragraph[] = [];
  const lines = text.split(/\n/);
  for (const rawLine of lines) {
    IMG_TOKEN.lastIndex = 0;
    if (IMG_TOKEN.test(rawLine)) {
      IMG_TOKEN.lastIndex = 0;
      let m: RegExpExecArray | null;
      let last = 0;
      while ((m = IMG_TOKEN.exec(rawLine)) !== null) {
        const before = cleanLine(rawLine.slice(last, m.index));
        if (before.trim()) out.push(new Paragraph({ children: [new TextRun(before)] }));
        const imgPara = imageParagraph(chapterId, m[1].trim());
        out.push(imgPara ?? new Paragraph({ children: [new TextRun(`[图片: ${m[1].trim()}]`)] }));
        last = m.index + m[0].length;
      }
      const after = cleanLine(rawLine.slice(last));
      if (after.trim()) out.push(new Paragraph({ children: [new TextRun(after)] }));
    } else {
      const c = cleanLine(rawLine);
      out.push(new Paragraph({ children: c ? [new TextRun(c)] : [] }));
    }
  }
  return out;
}

function questionBlocks(q: Question, index: number, withAnswer: boolean): Paragraph[] {
  const blocks: Paragraph[] = [];
  blocks.push(
    new Paragraph({
      spacing: { before: 240, after: 80 },
      children: [
        new TextRun({ text: `${index}. `, bold: true }),
        new TextRun({ text: `[${q.chapterTitle}] `, bold: true, color: "2563EB" }),
        new TextRun({ text: `(难度 ${q.difficulty})`, color: "888888", size: 18 }),
      ],
    })
  );
  blocks.push(...textToParagraphs(q.chapterId, q.content));

  if (withAnswer) {
    blocks.push(
      new Paragraph({
        spacing: { before: 120, after: 40 },
        children: [new TextRun({ text: "答案：", bold: true, color: "16A34A" })],
      })
    );
    if (q.answer == null) {
      blocks.push(new Paragraph({ children: [new TextRun({ text: "（暂无答案）", italics: true, color: "888888" })] }));
    } else if (q.answerIsImage) {
      const p = imageParagraph(q.chapterId, q.answer.trim());
      blocks.push(p ?? new Paragraph({ children: [new TextRun(`[答案图片: ${q.answer.trim()}]`)] }));
    } else {
      blocks.push(...textToParagraphs(q.chapterId, q.answer));
    }
  }
  return blocks;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const withAnswer: boolean = !!body?.withAnswer;
    const title: string = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "组卷试卷";

    if (ids.length === 0) {
      return NextResponse.json({ error: "未选择题目" }, { status: 400 });
    }
    const questions = getQuestionsByIds(ids);

    const children: Paragraph[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }),
      new Paragraph({
        children: [
          new TextRun({ text: `共 ${questions.length} 题${withAnswer ? "（含答案）" : ""}`, color: "666666" }),
        ],
      }),
    ];
    questions.forEach((q, i) => children.push(...questionBlocks(q, i + 1, withAnswer)));

    const doc = new Document({
      sections: [{ children }],
    });
    const buffer = await Packer.toBuffer(doc);

    const fname = encodeURIComponent(`${title}${withAnswer ? "-含答案" : ""}.docx`);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${fname}`,
      },
    });
  } catch (err) {
    console.error("DOCX 导出失败:", err);
    return NextResponse.json({ error: "DOCX 导出失败" }, { status: 500 });
  }
}
