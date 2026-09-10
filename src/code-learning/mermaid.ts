/**
 * The tutor is allowed to render only a deliberately tiny Mermaid language.
 *
 * Mermaid supports a very large grammar (including links, HTML labels and
 * arbitrary directives).  A model response is untrusted input, so accepting
 * the whole grammar would turn a harmless answer into an HTML/SVG injection
 * surface and would also make statistical charts look more authoritative
 * than the data warrants.  Keep this parser dependency free and auditable;
 * the client renderer performs a second SVG sanitisation pass after Mermaid.
 */

export type MermaidDiagramKind = "xychart" | "pie";

export interface ValidatedMermaidSource {
  kind: MermaidDiagramKind;
  source: string;
}

const MAX_SOURCE_LENGTH = 4_000;
const MAX_LINES = 80;
const MAX_LINE_LENGTH = 500;
const MAX_LABEL_LENGTH = 120;
const MAX_CATEGORIES = 24;
const MAX_PLOTS = 2;
const MAX_ABSOLUTE_NUMBER = 1_000_000_000;
// Tutor prompts permit at most one chart per answer. Keep the streaming fence
// splitter equally strict so extra model output stays escaped as code.
const MAX_TUTOR_DIAGRAMS = 1;
const NUMBER_PATTERN = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const NUMBER = new RegExp(`^${NUMBER_PATTERN}$`);
const TITLE = /^title\s+"([^"\\\\]{1,120})"$/i;
const XY_AXIS = new RegExp(
  `^y-axis(?:\\s+"([^"\\\\]{1,120})")?\\s+(${NUMBER_PATTERN})\\s+-->\\s+(${NUMBER_PATTERN})$`,
  "i",
);
const XY_PLOT = /^(bar|line)(?:\s+"([^"\\\\]{1,80})")?\s+(\[[^\n]+\])$/i;
const PIE_SLICE = new RegExp(`^"([^"\\\\]{1,120})"\\s*:\\s*(${NUMBER_PATTERN})$`);

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_ABSOLUTE_NUMBER;
}

function parseNumberList(raw: string): number[] | null {
  // JSON accepts exponents, but Mermaid's XY grammar does not.
  if (!raw.slice(1, -1).split(",").every((value) => NUMBER.test(value.trim()))) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length < 2 ||
    parsed.length > MAX_CATEGORIES ||
    !parsed.every(finiteNumber)
  ) {
    return null;
  }
  return parsed;
}

function parseCategoryList(raw: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length < 2 ||
    parsed.length > MAX_CATEGORIES ||
    !parsed.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.length <= 40 &&
        !/["<>\\\0\u0001-\u001f\u007f]/.test(item),
    )
  ) {
    return null;
  }
  const normalized = parsed.map((item) => item.trim().toLocaleLowerCase("en-US"));
  return new Set(normalized).size === parsed.length ? parsed : null;
}

function invalidGlobalSyntax(source: string): boolean {
  // Do not let Mermaid's parser see control characters, HTML/entity syntax,
  // comments/directives, URL-like values, or interaction/style keywords.
  return (
    source.length > MAX_SOURCE_LENGTH ||
    /[\0\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source) ||
    /[<>]/.test(source.replaceAll("-->", "")) ||
    source.includes(";") ||
    /%%|---|```|&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(source) ||
    /\b(?:click|href|link|callback|javascript|vbscript|classdef|style|subgraph|end|flowchart|graph|sequencediagram|statediagram|gantt|mindmap|gitgraph|journey|timeline|quadrantchart|sankey|xychart)\b/i.test(
      source.replace(/^xychart-beta\b/i, ""),
    ) ||
    /(?:https?|ftp|file):|\/\//i.test(source)
  );
}

function validateXyChart(lines: string[]): ValidatedMermaidSource | null {
  let categories: string[] | null = null;
  let yRange: [number, number] | null = null;
  let titleCount = 0;
  const plots: Array<{ name?: string; values: number[] }> = [];

  for (const line of lines.slice(1)) {
    const title = line.match(TITLE);
    if (title) {
      titleCount += 1;
      if (titleCount > 1 || title[1].length > MAX_LABEL_LENGTH) return null;
      continue;
    }

    if (/^x-axis\b/i.test(line)) {
      if (categories) return null;
      const match = line.match(/^x-axis(?:\s+"([^"\\]{1,120})")?\s+(\[[^\n]+\])$/i);
      if (!match) return null;
      categories = parseCategoryList(match[2]);
      if (!categories) return null;
      continue;
    }

    if (/^y-axis\b/i.test(line)) {
      if (yRange) return null;
      const match = line.match(XY_AXIS);
      if (!match || !NUMBER.test(match[2]) || !NUMBER.test(match[3])) return null;
      const minimum = Number(match[2]);
      const maximum = Number(match[3]);
      if (!finiteNumber(minimum) || !finiteNumber(maximum) || minimum >= maximum) return null;
      yRange = [minimum, maximum];
      continue;
    }

    const plot = line.match(XY_PLOT);
    if (!plot || plots.length >= MAX_PLOTS) return null;
    const values = parseNumberList(plot[3]);
    if (!values) return null;
    plots.push({ name: plot[2]?.trim(), values });
  }

  // Multiple series cannot be tied back to the prose or table reliably unless
  // every series has its own unambiguous name. Match the question-bank gate:
  // names are required, non-empty after trimming, and unique ignoring case.
  if (plots.length > 1) {
    const names = plots.map((plot) => plot.name?.toLocaleLowerCase("en-US"));
    if (names.some((name) => !name) || new Set(names).size !== names.length) return null;
  }

  if (
    !categories ||
    !yRange ||
    plots.length === 0 ||
    plots.some((plot) => plot.values.length !== categories?.length) ||
    plots.some((plot) => plot.values.some((value) => value < yRange[0] || value > yRange[1]))
  ) {
    return null;
  }
  return { kind: "xychart", source: lines.join("\n") };
}

function validatePie(lines: string[]): ValidatedMermaidSource | null {
  let titleCount = 0;
  let total = 0;
  const labels = new Set<string>();

  for (const line of lines.slice(1)) {
    const title = line.match(TITLE);
    if (title) {
      titleCount += 1;
      if (titleCount > 1 || title[1].length > MAX_LABEL_LENGTH) return null;
      continue;
    }
    const slice = line.match(PIE_SLICE);
    if (!slice || labels.size >= MAX_CATEGORIES) return null;
    const label = slice[1].trim().toLocaleLowerCase("en-US");
    const value = Number(slice[2]);
    if (!label || labels.has(label) || !finiteNumber(value) || value < 0) return null;
    labels.add(label);
    total += value;
  }

  if (labels.size < 2 || !Number.isFinite(total) || total <= 0) return null;
  return { kind: "pie", source: lines.join("\n") };
}

/**
 * Validate a complete Mermaid source against the safe statistical subset.
 * The returned source is normalized and safe to pass to the client renderer;
 * a null result must always be rendered as escaped text instead.
 */
export function validateMermaidSource(value: unknown): ValidatedMermaidSource | null {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!normalized || invalidGlobalSyntax(normalized)) return null;
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean).map((line) =>
    line.replace(/^(xychart-beta|pie(?:\s+showData)?|title|x-axis|y-axis|bar|line)\b/i, (keyword) =>
      /^pie\s/i.test(keyword) ? "pie showData" : keyword.toLowerCase()),
  );
  if (
    lines.length < 3 ||
    lines.length > MAX_LINES ||
    lines.some((line) => line.length === 0 || line.length > MAX_LINE_LENGTH)
  ) {
    return null;
  }
  if (/^xychart-beta$/i.test(lines[0])) return validateXyChart(lines);
  if (/^pie(?:\s+showData)?$/i.test(lines[0])) return validatePie(lines);
  return null;
}

export type TutorContentPart =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string; source: string; complete: boolean }
  | { kind: "mermaid"; source: string; complete: boolean };

/**
 * Split tutor Markdown-like output without interpreting arbitrary Markdown.
 * In particular, an unterminated fence is kept as source text and marked
 * incomplete so a streaming answer can never invoke Mermaid halfway through
 * a diagram.
 */
export function splitTutorContent(content: string): TutorContentPart[] {
  if (!content) return [];
  // A fresh expression is intentional: this function runs on every typing
  // tick, and a shared global RegExp would leak lastIndex between renders.
  const openFence = /(^|\n)[ \t]{0,3}```([^\r\n`]*)\r?\n?/g;
  const parts: TutorContentPart[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let mermaidCount = 0;

  while ((match = openFence.exec(content))) {
    const openingStart = match.index + (match[1] ? 1 : 0);
    if (openingStart < cursor) continue;
    const before = content.slice(cursor, openingStart);
    if (before) parts.push({ kind: "text", text: before });

    const language = match[2].trim().split(/\s+/, 1)[0]?.toLocaleLowerCase("en-US") ?? "";
    const sourceStart = openFence.lastIndex;
    const closePattern = /\n[ \t]{0,3}```[ \t]*(?=\n|$)/g;
    closePattern.lastIndex = sourceStart;
    const close = closePattern.exec(content);
    if (!close) {
      const source = content.slice(sourceStart);
      parts.push(
        language === "mermaid"
          ? { kind: "mermaid", source, complete: false }
          : { kind: "code", language, source, complete: false },
      );
      cursor = content.length;
      openFence.lastIndex = content.length;
      break;
    }

    const source = content.slice(sourceStart, close.index);
    if (language === "mermaid" && mermaidCount < MAX_TUTOR_DIAGRAMS) {
      parts.push({ kind: "mermaid", source, complete: true });
      mermaidCount += 1;
    } else {
      parts.push({ kind: "code", language, source, complete: true });
    }
    cursor = close.index + close[0].length;
    openFence.lastIndex = cursor;
  }

  if (cursor < content.length) parts.push({ kind: "text", text: content.slice(cursor) });
  return parts.length ? parts : [{ kind: "text", text: content }];
}
