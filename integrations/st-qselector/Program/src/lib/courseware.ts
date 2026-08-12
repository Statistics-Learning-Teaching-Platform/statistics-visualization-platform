import "server-only";

import path from "node:path";
import mammoth from "mammoth";
import JSZip from "jszip";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_LENGTH = 80_000;

export class CoursewareInputError extends Error {
  status: 400 | 413;

  constructor(message: string, status: 400 | 413 = 400) {
    super(message);
    this.name = "CoursewareInputError";
    this.status = status;
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function extractPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] ?? 0) - Number(b.match(/slide(\d+)/i)?.[1] ?? 0));
  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async("text");
    if (!xml) continue;
    const text = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((match) => decodeXml(match[1]).trim())
      .filter(Boolean)
      .join("\n");
    if (text) slides.push(text);
  }
  return slides.join("\n\n");
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Keep pdf.js (and its optional native canvas dependency) out of the module
  // initialization path so plain text, DOCX and PPTX analysis works in a
  // serverless function without DOMMatrix/canvas globals.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function extractCoursewareText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new CoursewareInputError("课件不能超过 15MB", 413);
  const extension = path.extname(file.name).toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  if ([".txt", ".md", ".markdown", ".csv"].includes(extension)) {
    text = buffer.toString("utf8");
  } else if (extension === ".docx") {
    text = (await mammoth.extractRawText({ buffer })).value;
  } else if (extension === ".pptx") {
    text = await extractPptx(buffer);
  } else if (extension === ".pdf") {
    text = await extractPdf(buffer);
  } else {
    throw new CoursewareInputError("暂时支持 PDF、PPTX、DOCX、TXT 和 Markdown 文件");
  }

  const clean = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (!clean) throw new CoursewareInputError("没有从课件中提取到可分析的文字");
  const substantive = clean
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\bpage\s+\d+(?:\s+of\s+\d+)?\b/gi, "");
  const readableCharacters = substantive.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (readableCharacters < 24) {
    const hint = extension === ".pdf"
      ? "这份 PDF 可能是扫描图片，无法提取足够的可检索文字。请上传可检索 PDF，或直接粘贴课程目标。"
      : "课件中没有足够的可分析文字，请补充课程目标或更换文件。";
    throw new CoursewareInputError(hint);
  }
  return clean.slice(0, MAX_TEXT_LENGTH);
}
