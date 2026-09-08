export type MermaidDiagramKind = "xychart" | "pie";

export interface QuestionVisualization {
  kind: "mermaid";
  title: string;
  alt: string;
  source: string;
}

export interface ValidatedMermaidSource {
  kind: MermaidDiagramKind;
  source: string;
}

interface DerivedSeries {
  labels: string[];
  values: number[];
  axisLabel: string;
  isPercentage: boolean;
}

const MAX_SOURCE_LENGTH = 4_000;
const MAX_LINES = 80;
const MAX_LABEL_LENGTH = 120;
const MAX_CATEGORIES = 24;
const MAX_PLOTS = 2;
const NUMBER_PATTERN = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const NUMBER = new RegExp(`^${NUMBER_PATTERN}$`);
const TITLE = /^title\s+"([^"\\\\]{1,120})"$/i;
const XY_AXIS = new RegExp(`^y-axis(?:\\s+"([^"\\\\]{1,120})")?\\s+(${NUMBER_PATTERN})\\s+-->\\s+(${NUMBER_PATTERN})$`, "i");
const XY_PLOT = /^(bar|line)(?:\s+"([^"\\]{1,80})")?\s+(\[[^\n]+\])$/i;
const PIE_SLICE = new RegExp(`^"([^"\\\\]{1,120})"\\s*:\\s*(${NUMBER_PATTERN})$`);

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1_000_000_000;
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
  if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > MAX_CATEGORIES || !parsed.every(finiteNumber)) {
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
    !Array.isArray(parsed)
    || parsed.length < 2
    || parsed.length > MAX_CATEGORIES
    || !parsed.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 40 && !/["<>\\\0\u0001-\u001f\u007f]/.test(item))
  ) {
    return null;
  }
  const normalized = parsed.map((item) => item.trim().toLocaleLowerCase("en-US"));
  return new Set(normalized).size === parsed.length ? parsed : null;
}

function invalidGlobalSyntax(source: string): boolean {
  return (
    source.length > MAX_SOURCE_LENGTH
    || /[\0\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source)
    || /[<>]/.test(source.replaceAll("-->", ""))
    || source.includes(";")
    || /%%|---|```|&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(source)
    || /\b(?:click|href|link|callback|javascript|vbscript|classdef|style|subgraph|end|flowchart|graph|sequencediagram|statediagram|gantt|mindmap|gitgraph|journey|timeline|quadrantchart|sankey|xychart)\b/i.test(source.replace(/^xychart-beta\b/i, ""))
    || /(?:https?|ftp|file):|\/\//i.test(source)
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
    if (!plot) return null;
    const values = parseNumberList(plot[3]);
    if (!values || plots.length >= MAX_PLOTS) return null;
    plots.push({ name: plot[2]?.trim(), values });
  }

  // Without names, two series with the same categories are semantically
  // interchangeable. Requiring unique names lets the content-consistency
  // check bind (for example) "men" and "women" to the correct values.
  if (plots.length > 1) {
    const names = plots.map((plot) => plot.name?.toLocaleLowerCase("en-US"));
    if (names.some((name) => !name) || new Set(names).size !== names.length) return null;
  }

  if (
    !categories
    || !yRange
    || plots.length === 0
    || plots.some((plot) => plot.values.length !== categories?.length)
    || plots.some((plot) => plot.values.some((value) => value < yRange[0] || value > yRange[1]))
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
 * Accept only a small, auditable Mermaid subset suitable for statistical
 * questions. Flowcharts and other Mermaid grammars deliberately remain
 * unavailable because they expose links, HTML labels, directives, styling,
 * or interactions that a generated question never needs.
 */
export function validateMermaidSource(value: unknown): ValidatedMermaidSource | null {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!normalized || invalidGlobalSyntax(normalized)) return null;
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean).map((line) =>
    line.replace(/^(xychart-beta|pie(?:\s+showData)?|title|x-axis|y-axis|bar|line)\b/i, (keyword) =>
      /^pie\s/i.test(keyword) ? "pie showData" : keyword.toLowerCase()),
  );
  if (lines.length < 3 || lines.length > MAX_LINES || lines.some((line) => line.length > 500)) return null;
  if (/^xychart-beta$/i.test(lines[0])) return validateXyChart(lines);
  if (/^pie(?:\s+showData)?$/i.test(lines[0])) return validatePie(lines);
  return null;
}

function plainLabel(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const label = value.trim();
  if (!label || label.length > maximum || /[\0\u0001-\u001f\u007f<>]/.test(label)) return null;
  return label;
}

/** Strictly validates the full AI/database visualization contract. */
export function validateQuestionVisualizations(value: unknown): QuestionVisualization[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 2) return null;
  const visualizations: QuestionVisualization[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const candidate = item as Record<string, unknown>;
    if (candidate.kind !== "mermaid") return null;
    if (Object.keys(candidate).some((key) => !["kind", "title", "alt", "source"].includes(key))) return null;
    const title = plainLabel(candidate.title, 120);
    const alt = plainLabel(candidate.alt, 240);
    const source = validateMermaidSource(candidate.source);
    if (!title || !alt || !source) return null;
    visualizations.push({ kind: "mermaid", title, alt, source: source.source });
  }
  return visualizations;
}

function splitMarkdownTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  const body = trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed.slice(1);
  return body.split("|").map((cell) => cell.trim());
}

function isMarkdownSeparator(cells: string[]): boolean {
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function plainDerivedLabel(value: string): string | null {
  const label = value
    .replace(/[`$]/g, "")
    .replace(/\\(?:%|mathrm|text)\{?([^{}]*)\}?/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!label || label.length > 40 || /["'\\<>\[\]{}]/.test(label)) return null;
  return label;
}

function numericCell(value: string): number | null {
  const normalized = value
    .replace(/[`$,%\\{}]/g, "")
    .replace(/,/g, "")
    .trim();
  if (!new RegExp(`^${NUMBER_PATTERN}%?$`).test(normalized)) return null;
  const number = Number(normalized);
  return finiteNumber(number) ? number : null;
}

function readMarkdownTables(text: string): string[][][] {
  const lines = text.replaceAll("\r", "").split("\n");
  const tables: string[][][] = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = splitMarkdownTableRow(lines[index]);
    const separator = splitMarkdownTableRow(lines[index + 1]);
    if (!header || !separator || header.length !== separator.length || !isMarkdownSeparator(separator)) continue;
    const rows: string[][] = [header];
    index += 1;
    while (index + 1 < lines.length) {
      const row = splitMarkdownTableRow(lines[index + 1]);
      if (!row || row.length !== header.length) break;
      rows.push(row);
      index += 1;
    }
    if (rows.length >= 2) tables.push(rows);
  }
  return tables;
}

function tableSeries(table: string[][]): DerivedSeries | null {
  const [header, ...rows] = table;
  if (!header || rows.length === 0) return null;

  // Horizontal textbook tables (category names in the header, one numeric row).
  for (const row of rows.length === 1 ? rows : []) {
    if (row.length !== header.length || header.length < 3) continue;
    const labels = header.slice(1).map(plainDerivedLabel);
    const values = row.slice(1).map(numericCell);
    if (labels.every(Boolean) && values.every((value): value is number => value !== null)) {
      return {
        labels: labels as string[],
        values,
        axisLabel: plainDerivedLabel(row[0]) ?? "数值",
        isPercentage: /%|percent|share|比例|百分比/i.test(`${header[0]} ${row[0]}`),
      };
    }
  }

  // Multiple numeric series are ambiguous without a reviewed chart contract.
  // Do not silently choose one year/group while dropping another.
  const candidateColumns = header
    .map((cell, index) => ({ index, score: /frequency|count|number|share|percent|percentage|value|频数|数量|比例|百分比/i.test(cell) ? 1 : 0 }))
    .filter(({ index }) => index > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const series: DerivedSeries[] = [];
  for (const { index: valueIndex } of candidateColumns) {
    const parsedRows: Array<{ label: string; value: number }> = [];
    let valid = true;
    for (const row of rows) {
      const label = plainDerivedLabel(row[0] ?? "");
      if (label?.toLocaleLowerCase("en-US") === "total") continue;
      const value = numericCell(row[valueIndex] ?? "");
      if (!label || value === null) {
        valid = false;
        break;
      }
      parsedRows.push({ label, value });
    }
    if (!valid) continue;
    if (parsedRows.length < 2) continue;
    const labels = parsedRows.map((row) => row.label);
    const values = parsedRows.map((row) => row.value);
    series.push({
      labels,
      values,
      axisLabel: plainDerivedLabel(header[valueIndex] ?? "数值") ?? "数值",
      isPercentage: /%|percent|share|比例|百分比/i.test(`${header[valueIndex]} ${header[0]}`),
    });
  }
  return series.length === 1 ? series[0] : null;
}

function percentageSeries(text: string): DerivedSeries | null {
  const labels: string[] = [];
  const values: number[] = [];
  const pattern = /([^;.!?\n]{1,100}?)\s*\(?\s*\$?([0-9]+(?:\.[0-9]+)?)\s*\\?%\$?\s*\)?/g;
  for (const match of text.matchAll(pattern)) {
    const rawLabel = match[1]
      .replace(/^.*(?:results?\s+(?:were|are)|as follows)\s*:\s*/i, "")
      .replace(/^[,;:\s]+|[,;:\s]+$/g, "")
      .trim();
    const label = plainDerivedLabel(rawLabel.replace(/^(?:and|or)\s+/i, ""));
    const value = numericCell(match[2]);
    if (!label || value === null || value < 0 || value > 100) return null;
    if (labels.some((existing) => existing.toLocaleLowerCase("en-US") === label.toLocaleLowerCase("en-US"))) return null;
    labels.push(label);
    values.push(value);
    if (labels.length > MAX_CATEGORIES) break;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (labels.length < 2 || Math.abs(total - 100) > 1.5) return null;
  return { labels, values, axisLabel: "百分比", isPercentage: true };
}

function categoricalCodeSeries(text: string): DerivedSeries | null {
  const blockMatch = [...text.matchAll(/```(?:text|plaintext)?\s*\n([\s\S]*?)```/gi)].find((match) => {
      const tokens = match[1].trim().split(/\s+/).filter(Boolean);
      return tokens.length >= 4 && tokens.length <= 240 && tokens.every((token) => /^[A-Za-z][A-Za-z0-9_-]{0,8}$/.test(token));
    });
  if (!blockMatch) return null;
  const block = blockMatch[1];
  const intro = text.slice(0, blockMatch.index ?? 0);
  const tokens = block.trim().split(/\s+/);
  const labels = [...new Set(tokens)].map((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = intro.match(new RegExp(`\\b${escaped}(?:\\s+means?)?\\s+([A-Za-z][^,.;\\n]{1,40})`, "i"));
    return plainDerivedLabel(match?.[1]?.trim() ?? token) ?? token;
  });
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  if (counts.size < 2 || counts.size > MAX_CATEGORIES) return null;
  return {
    labels,
    values: [...counts.values()],
    axisLabel: "频数",
    isPercentage: false,
  };
}

function formatChartNumber(value: number): string {
  // Never round the source observations; unsupported exponent notation is
  // rejected by the final Mermaid validator instead of changing the data.
  return String(value);
}

function formatAxisNumber(value: number): string {
  // Axis padding is computed rather than source data. Remove binary floating
  // point noise (for example 22.7 * 1.1) without changing plotted values.
  return String(Number(value.toPrecision(12)));
}

function derivedTitle(text: string, fallback: string): string {
  const firstLine = text.split("\n").map((line) => line.replace(/^\s*[>#*-]\s*/, "").trim()).find(Boolean);
  const label = firstLine ? plainDerivedLabel(firstLine.replace(/\.$/, "")) : null;
  return label ? `${label.slice(0, 82)} · ${fallback}` : fallback;
}

function buildDerivedBar(source: DerivedSeries, title: string, minimum = 0): QuestionVisualization | null {
  const maximum = Math.max(...source.values);
  const upper = Math.max(minimum + 1, source.isPercentage ? 100 : maximum * 1.1, maximum + 1);
  const candidate = {
    kind: "mermaid" as const,
    title,
    alt: `根据题干数据生成的柱状图；类别数 ${source.labels.length}，数值范围 ${formatChartNumber(Math.min(...source.values))} 至 ${formatChartNumber(maximum)}。`,
    source: [
      "xychart-beta",
      `title "${title}"`,
      `x-axis "类别" [${source.labels.map((label) => JSON.stringify(label)).join(", ")}]`,
      `y-axis "${source.axisLabel}" ${formatAxisNumber(minimum)} --> ${formatAxisNumber(upper)}`,
      `bar [${source.values.map(formatChartNumber).join(", ")}]`,
    ].join("\n"),
  };
  return validateQuestionVisualizations([candidate])?.[0] ?? null;
}

function buildDerivedPie(source: DerivedSeries, title: string): QuestionVisualization | null {
  const candidate = {
    kind: "mermaid" as const,
    title,
    alt: `根据题干数据生成的饼图；共 ${source.labels.length} 个类别。`,
    source: [
      "pie showData",
      `title "${title}"`,
      ...source.labels.map((label, index) => `${JSON.stringify(label)} : ${formatChartNumber(source.values[index])}`),
    ].join("\n"),
  };
  return validateQuestionVisualizations([candidate])?.[0] ?? null;
}

/**
 * Builds presentation-only previews for legacy reviewed questions. It never
 * edits the reviewed record or its hashes: only an unambiguous categorical
 * bar/pie request with data fully present in the stem is eligible. Statistical
 * grammars that Mermaid cannot faithfully represent remain plain text/images.
 */
export function deriveQuestionVisualizations(text: string): QuestionVisualization[] {
  if (typeof text !== "string" || /\[IMG:|!\[[^\]]*\]\(/i.test(text)) return [];
  const hasSupportedIntent = /(?:bar|pie)\s+(?:chart|graph)|percentage\s+bar|柱状图|条形图|饼图/i.test(text);
  if (!hasSupportedIntent || /histogram|dotplot|dot\s+plot|stem-and-leaf|box[- ]plot|scatterplot|scatter\s+plot|直方图|箱线图|散点图|茎叶图/i.test(text)) return [];
  const tables = readMarkdownTables(text);
  const source = tables.length > 0
    ? (tables.length === 1 ? tableSeries(tables[0]) : null)
    : percentageSeries(text) ?? categoricalCodeSeries(text);
  if (!source || source.labels.length < 2 || source.labels.length !== source.values.length) return [];

  const result: QuestionVisualization[] = [];
  const titleBase = derivedTitle(text, "题干数据预览");
  const wantsPie = /pie\s+(?:chart|graph)|饼图/i.test(text);
  const wantsBar = /bar\s+(?:chart|graph)|percentage\s+bar|柱状图|条形图/i.test(text);
  const truncatedBaseline = /starts?\s+at\s+13(?:\.0)?|从\s*13(?:\.0)?\s*开始/i.test(text);
  if (wantsBar) {
    const bar = buildDerivedBar(source, truncatedBaseline ? `${titleBase} · 纵轴从 0` : `${titleBase} · 柱状图`, 0);
    if (bar) result.push(bar);
    if (truncatedBaseline && result.length < 2) {
      const truncated = buildDerivedBar(source, `${titleBase} · 纵轴从 13`, 13);
      if (truncated) result.push(truncated);
    }
  }
  if (wantsPie && result.length < 2) {
    const pie = buildDerivedPie(source, `${titleBase} · 饼图`);
    if (pie) result.push(pie);
  }
  return result.slice(0, 2);
}

/** Keep browser previews and document exports on the same display contract. */
export function resolveQuestionVisualizations(
  text: string,
  visualizations?: readonly QuestionVisualization[],
): QuestionVisualization[] {
  // Explicit [] (including AI drafts) disables inference; malformed supplied
  // charts must not fall back to a different, inferred chart either.
  return visualizations === undefined
    ? deriveQuestionVisualizations(text)
    : validateQuestionVisualizations(visualizations) ?? [];
}

const COMPATIBLE_CHART = /\b(?:bar (?:chart|graph)|pie chart|line (?:chart|graph))s?\b/i;
const UNSUPPORTED_STATISTICAL_CHART = /\b(?:scatter ?plot|histogram|box(?:-and-whisker)? ?plot|dot ?plot|stem-and-leaf (?:display|plot))s?\b/i;
const CHART_DEPENDENCY = /\b(?:shown|below|following|given|displayed|figure|according to|interpret|compare|examine)\b/i;
const CHART_CONSTRUCTION = /\b(?:construct|draw|create|make|sketch|produce)\b/i;
const GENERIC_CHART_DEPENDENCY = /\b(?:(?:according to|from|using|use|interpret|examine|refer(?:ring)? to)\s+(?:the\s+)?(?:(?:following|given|displayed)\s+)?(?:chart|graph|figure|diagram|plot)|(?:chart|graph|figure|diagram|plot)\s+(?:(?:shown|displayed|given)\s+)?(?:below|above|following)|(?:shown|displayed|given)\s+in\s+(?:the\s+)?(?:chart|graph|figure|diagram|plot))\b/i;

function normalizedSearchText(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

interface ChartData {
  labels: string[];
  series: Array<{
    name?: string;
    values: number[];
  }>;
}

function chartData(source: string): ChartData | null {
  const lines = source.split("\n");
  if (/^xychart-beta$/i.test(lines[0])) {
    const axis = lines.find((line) => /^x-axis\b/i.test(line));
    const match = axis?.match(/(\[[^\n]+\])$/);
    if (!match) return null;
    const labels = parseCategoryList(match[1]);
    if (!labels) return null;
    const series = lines
      .filter((line) => /^(?:bar|line)\b/i.test(line))
      .map((line) => {
        const plot = line.match(XY_PLOT);
        const values = plot ? parseNumberList(plot[3]) : null;
        return values ? { name: plot?.[2]?.trim(), values } : null;
      });
    if (series.some((item) => !item)) return null;
    return { labels, series: series as ChartData["series"] };
  }
  if (/^pie(?:\s+showData)?$/i.test(lines[0])) {
    const slices = lines.slice(1).map((line) => line.match(PIE_SLICE)).filter((match) => Boolean(match));
    return {
      labels: slices.map((match) => match?.[1] ?? ""),
      series: [{ values: slices.map((match) => Number(match?.[2])) }],
    };
  }
  return null;
}

function sameLabels(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every(
    (label, index) => normalizedSearchText(label) === normalizedSearchText(right[index] ?? ""),
  );
}

function sameValues(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameName(left: string | undefined, right: string | undefined): boolean {
  return Boolean(
    left
    && right
    && normalizedSearchText(left) === normalizedSearchText(right),
  );
}

function numericValues(value: string): number[] {
  return value
    .replace(/(?<=\d),(?=\d{3}\b)/g, "")
    .match(new RegExp(NUMBER_PATTERN, "g"))
    ?.map(Number)
    .filter(finiteNumber) ?? [];
}

function labelOccurrences(text: string, labels: readonly string[]) {
  const normalized = normalizedSearchText(text);
  const occurrences: Array<{ labelIndex: number; index: number; end: number }> = [];
  const word = /[\p{L}\p{N}_]/u;
  labels.forEach((rawLabel, labelIndex) => {
    const label = normalizedSearchText(rawLabel);
    let cursor = 0;
    while (label && cursor < normalized.length) {
      const index = normalized.indexOf(label, cursor);
      if (index < 0) break;
      const before = normalized[index - 1] ?? "";
      const after = normalized[index + label.length] ?? "";
      const startOkay = !word.test(label[0] ?? "") || !word.test(before);
      const endOkay = !word.test(label.at(-1) ?? "") || !word.test(after);
      if (startOkay && endOkay) occurrences.push({ labelIndex, index, end: index + label.length });
      cursor = index + Math.max(1, label.length);
    }
  });
  return { normalized, occurrences: occurrences.sort((left, right) => left.index - right.index) };
}

function prosePairsMatch(text: string, data: ChartData): boolean {
  const { normalized, occurrences } = labelOccurrences(text, data.labels);
  return data.labels.every((_, labelIndex) => {
    return occurrences
      .filter((occurrence) => occurrence.labelIndex === labelIndex)
      .some((occurrence) => {
        const nextOther = occurrences.find(
          (candidate) =>
            candidate.index >= occurrence.end && candidate.labelIndex !== occurrence.labelIndex,
        );
        const segment = normalized.slice(
          occurrence.end,
          Math.min(nextOther?.index ?? normalized.length, occurrence.end + 240),
        );
        if (data.series.length === 1) {
          return numericValues(segment).some((candidate) => candidate === data.series[0].values[labelIndex]);
        }

        // Bind every value to its named series inside this category segment;
        // merely finding the same unordered values would accept swapped
        // series while still looking superficially consistent.
        const seriesOccurrences = data.series.map((series, seriesIndex) => {
          if (!series.name) return null;
          const result = labelOccurrences(segment, [series.name]).occurrences[0];
          return result ? { seriesIndex, index: result.index, end: result.end } : null;
        });
        if (seriesOccurrences.some((item) => !item)) return false;
        const ordered = (seriesOccurrences as Array<{ seriesIndex: number; index: number; end: number }>)
          .sort((left, right) => left.index - right.index);
        return ordered.every((item, index) => {
          const next = ordered[index + 1];
          const valueSegment = segment.slice(item.end, next?.index ?? segment.length);
          const expected = data.series[item.seriesIndex].values[labelIndex];
          return numericValues(valueSegment).some((candidate) => candidate === expected);
        });
      });
  });
}

function tableMatchesChart(table: string[][], data: ChartData): boolean {
  const [header, ...allRows] = table;
  if (!header || allRows.length === 0 || header.length < 2) return false;
  const rows = allRows.filter((row) => normalizedSearchText(row[0] ?? "") !== "total");

  // Categories down the first column, named data series across the header.
  const verticalLabels = rows.map((row) => plainDerivedLabel(row[0] ?? ""));
  if (verticalLabels.every((label): label is string => Boolean(label)) && sameLabels(verticalLabels, data.labels)) {
    const tableSeries = header.slice(1).map((rawName, offset) => {
      const name = plainDerivedLabel(rawName);
      const values = rows.map((row) => numericCell(row[offset + 1] ?? ""));
      return name && values.every((value): value is number => value !== null)
        ? { name, values }
        : null;
    });
    if (tableSeries.every((series) => series !== null) && tableSeries.length === data.series.length) {
      return data.series.every((series, index) => {
        const tabular = tableSeries[index];
        return Boolean(
          tabular
          && (data.series.length === 1 || sameName(series.name, tabular.name))
          && sameValues(series.values, tabular.values),
        );
      });
    }
  }

  // Categories across the header, named data series down the first column.
  const horizontalLabels = header.slice(1).map(plainDerivedLabel);
  if (horizontalLabels.every((label): label is string => Boolean(label)) && sameLabels(horizontalLabels, data.labels)) {
    const tableSeries = rows.map((row) => {
      const name = plainDerivedLabel(row[0] ?? "");
      const values = row.slice(1).map(numericCell);
      return name && values.every((value): value is number => value !== null)
        ? { name, values }
        : null;
    });
    if (tableSeries.every((series) => series !== null) && tableSeries.length === data.series.length) {
      return data.series.every((series, index) => {
        const tabular = tableSeries[index];
        return Boolean(
          tabular
          && (data.series.length === 1 || sameName(series.name, tabular.name))
          && sameValues(series.values, tabular.values),
        );
      });
    }
  }
  return false;
}

function stemPairsMatch(content: string, data: ChartData): boolean {
  const tableMatch = readMarkdownTables(content).some((table) => tableMatchesChart(table, data));
  return tableMatch || prosePairsMatch(content, data);
}

/** Replace model-authored alt text with a deterministic description of the validated source. */
export function canonicalVisualizationAlt(visualization: QuestionVisualization): string | null {
  const data = chartData(visualization.source);
  if (!data) return null;
  const pairs = data.labels.map((label, index) =>
    `${label}：${data.series.map((series) => (
      `${series.name ? `${series.name} ` : ""}${formatChartNumber(series.values[index])}`
    )).join(" / ")}`,
  );
  const detailed = `${visualization.title}；${pairs.join("；")}`;
  if (detailed.length <= 240) return detailed;
  return `${visualization.title.slice(0, 120)}；图表包含 ${data.labels.length} 个类别和 ${data.series.length} 个数据系列，详细数值见题干与图表。`;
}

/**
 * Enforces the part of chart/question consistency that can be checked without
 * pretending to be a statistical reviewer: supplied charts must use labels
 * and plotted values that are also present in the self-contained stem.
 */
export function visualizationsMatchQuestionContent(
  content: string,
  visualizations: readonly QuestionVisualization[],
): boolean {
  const hasCompatibleChart = COMPATIBLE_CHART.test(content);
  const hasUnsupportedChart = UNSUPPORTED_STATISTICAL_CHART.test(content);
  const dependsOnChart = CHART_DEPENDENCY.test(content);
  const asksToConstructChart = CHART_CONSTRUCTION.test(content);
  if (GENERIC_CHART_DEPENDENCY.test(content) && visualizations.length === 0) return false;
  if (hasCompatibleChart && asksToConstructChart) return false;
  if (hasCompatibleChart && dependsOnChart && visualizations.length === 0) return false;
  if (hasUnsupportedChart && (dependsOnChart || asksToConstructChart)) return false;

  const searchable = normalizedSearchText(content);
  for (const visualization of visualizations) {
    const data = chartData(visualization.source);
    if (!data || data.labels.some((label) => !searchable.includes(normalizedSearchText(label)))) return false;
    // Labels and values must occur as the same table/prose pairs. Merely
    // finding each token somewhere in the stem would accept swapped bars.
    if (!stemPairsMatch(content, data)) return false;
  }
  return true;
}
