import "server-only";

import path from "node:path";
import mammoth from "mammoth";
import JSZip from "jszip";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_LENGTH = 80_000;
const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 12 * 1024 * 1024;
const MAX_SLIDES = 300;
const MAX_SLIDE_XML_BYTES = 1024 * 1024;
const MAX_PDF_PAGES = 300;
const PARSE_TIMEOUT_MS = 35_000;

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
  const zip = await inspectOfficeArchive(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] ?? 0) - Number(b.match(/slide(\d+)/i)?.[1] ?? 0));
  if (slideNames.length > MAX_SLIDES) {
    throw new CoursewareInputError(`PPTX 不能超过 ${MAX_SLIDES} 张幻灯片`, 413);
  }
  const slides: string[] = [];
  for (const name of slideNames) {
    const size = archiveEntrySize(zip.files[name]);
    if (size > MAX_SLIDE_XML_BYTES) throw new CoursewareInputError("PPTX 单页内容异常过大", 413);
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
    const info = await withParseTimeout(parser.getInfo({ parsePageInfo: false }));
    if (info.total > MAX_PDF_PAGES) {
      throw new CoursewareInputError(`PDF 不能超过 ${MAX_PDF_PAGES} 页`, 413);
    }
    const result = await withParseTimeout(parser.getText({ first: 1, last: info.total }));
    return result.text;
  } finally {
    await parser.destroy();
  }
}

type ZipEntryWithSize = JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };

function archiveEntrySize(entry: JSZip.JSZipObject): number {
  return Number((entry as ZipEntryWithSize)._data?.uncompressedSize ?? 0);
}

async function inspectOfficeArchive(buffer: Buffer): Promise<JSZip> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer, { createFolders: false });
  } catch {
    throw new CoursewareInputError("Office 文件结构损坏或不是有效的 ZIP 文档");
  }
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new CoursewareInputError("Office 文件包含过多内部条目", 413);
  }
  let total = 0;
  for (const entry of entries) {
    const size = archiveEntrySize(entry);
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_ARCHIVE_ENTRY_BYTES) {
      throw new CoursewareInputError("Office 文件包含异常大的内部条目", 413);
    }
    total += size;
    if (total > MAX_UNCOMPRESSED_BYTES) {
      throw new CoursewareInputError("Office 文件解压后内容不能超过 64 MB", 413);
    }
  }
  return zip;
}

async function withParseTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new CoursewareInputError("课件解析超时，请缩小文件后重试", 413)), PARSE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
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
    await inspectOfficeArchive(buffer);
    text = (await withParseTimeout(mammoth.extractRawText({ buffer }))).value;
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
