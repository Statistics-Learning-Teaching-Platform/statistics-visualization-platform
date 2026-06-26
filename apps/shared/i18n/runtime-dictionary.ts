import type { Language } from "./index";

type TranslationDictionary = Record<string, string>;

export interface TemplateCopy {
  modelOutput: string;
  parameters: string;
  conceptKeyIdea: string;
  formula: string;
  howToReadThis: string;
  dataTable: string;
  run: string;
  addOneSample: string;
  addTwentySamples: string;
  formulaHelper: string;
}


import enZhDictionary from "./en-zh-dictionary.json";

const enToZh: TranslationDictionary = enZhDictionary;

function hasMixedCase(value: string): boolean {
  // True only when the string contains both upper- and lower-case letters,
  // i.e. it is neither ALL CAPS nor all lower-case.
  return value !== value.toUpperCase() && value !== value.toLowerCase();
}

const zhToEn: TranslationDictionary = Object.entries(enToZh).reduce<TranslationDictionary>(
  (translations, [english, chinese]) => {
    const existing = translations[chinese];
    // Several English phrases can share one Chinese value
    // (e.g. "Sample Size", "SAMPLE SIZE", "sample size" -> "样本量").
    // Prefer a mixed-case variant so reverse translation preserves the
    // canonical UI casing; otherwise keep the first key seen. Using length
    // as the tiebreaker is wrong because "Concept + key idea" and
    // "CONCEPT + KEY IDEA" have the same length.
    if (!existing || (!hasMixedCase(existing) && hasMixedCase(english))) {
      translations[chinese] = english;
    }
    return translations;
  },
  {}
);

// Data-driven dynamic templates: each entry pairs a regex with a translator
// that produces the localized string. Add a new dynamic pattern by appending
// one row here instead of growing an if/return chain. Templates that embed
// other translatable text (predictor:, Population distribution:) recurse via
// localizeText so nested copy is also localized.
interface DynamicTemplate {
  pattern: RegExp;
  translate: (match: RegExpMatchArray, language: Language) => string;
}

const DYNAMIC_TEMPLATES: DynamicTemplate[] = [
  { pattern: /^target ([-\d.]+)$/, translate: (m) => `目标值 ${m[1]}` },
  { pattern: /^theory ([-\d.]+)$/, translate: (m) => `理论值 ${m[1]}` },
  { pattern: /^(\d+) total draws$/, translate: (m) => `共 ${m[1]} 次抽样` },
  { pattern: /^(\d+) candidates$/, translate: (m) => `${m[1]} 个候选点` },
  { pattern: /^(\d+) trials each$/, translate: (m) => `每次 ${m[1]} 个试验` },
  { pattern: /^variance ([-\d.]+)$/, translate: (m) => `方差 ${m[1]}` },
  { pattern: /^se ([-\d.]+)$/, translate: (m) => `标准误 ${m[1]}` },
  { pattern: /^(\d+) pairs$/, translate: (m) => `${m[1]} 对样本` },
  { pattern: /^(\d+) repeated samples$/, translate: (m) => `${m[1]} 次重复抽样` },
  { pattern: /^(\d+) observed values$/, translate: (m) => `${m[1]} 个观测值` },
  { pattern: /^(\d+) burn-in draws$/, translate: (m) => `${m[1]} 次预热抽样` },
  { pattern: /^(\d+) cities$/, translate: (m) => `${m[1]} 个城市` },
  { pattern: /^predictor: (.+)$/, translate: (m, lang) => `预测变量：${localizeText(m[1] ?? "", lang)}` },
  { pattern: /^Population distribution: (.+)$/, translate: (m, lang) => `总体分布：${localizeText(m[1] ?? "", lang)}` },
  { pattern: /^Sample (\d+)$/, translate: (m) => `样本 ${m[1]}` },
];

function localizeDynamicText(value: string, language: Language): string {
  if (language === "en") return value;
  for (const template of DYNAMIC_TEMPLATES) {
    const match = value.match(template.pattern);
    if (match) return template.translate(match, language);
  }
  return value;
}

// Title-case a string so ALL-CAPS or all-lower inputs can fall back to the
// mixed-case dictionary key (e.g. "CONCEPT + KEY IDEA" -> "Concept + Key Idea").
// This lets the dictionary hold one canonical casing per phrase instead of
// duplicating every entry for upper/lower/title variants.
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function localizeText(value: string, language: Language): string {
  const dictionary = language === "zh" ? enToZh : zhToEn;
  const exact = dictionary[value];
  if (exact) return exact;
  // Fall back to the title-cased key so callers that pass ALL CAPS or all
  // lowercase still match the canonical mixed-case entry.
  if (!hasMixedCase(value)) {
    const titled = dictionary[titleCase(value)];
    if (titled) return titled;
  }
  const dynamic = localizeDynamicText(value, language);
  if (dynamic !== value) return dynamic;
  // No translation found. In dev, surface mixed-case English strings that slip
  // through under zh instead of silently rendering them untranslated (numeric
  // tokens and all-lower/all-upper values stay quiet via hasMixedCase).
  if (language === "zh" && import.meta.env?.DEV && hasMixedCase(value)) {
    console.warn(`[i18n] untranslated string under zh: ${JSON.stringify(value)}`);
  }
  return value;
}

// NOTE: a blanket `localizeDeep` (walk every field and translate every string)
// was removed — it was unused, and its semantics are wrong for the structured
// configs below. `localizeModuleConfig`/`localizeChartSpec`/`localizeSimulationResult`
// intentionally localize ONLY human-readable fields (title/label/narrative/...),
// leaving identifier fields (id, repoName, sourcePath, key) untouched. Keep the
// selective field-by-field shape; do not reintroduce a recursive blanket walker.

function localizeOptionalText<T>(value: T, language: Language): T {
  return (typeof value === "string" ? localizeText(value, language) : value) as T;
}

export function localizeModuleConfig<T extends Record<string, any>>(config: T, language: Language): T {
  return {
    ...config,
    title: localizeOptionalText(config.title, language),
    subtitle: localizeOptionalText(config.subtitle, language),
    category: localizeOptionalText(config.category, language),
    examples: config.examples?.map((example: Record<string, any>) => ({
      ...example,
      title: localizeOptionalText(example.title, language),
      description: localizeOptionalText(example.description, language),
      teachingPoints: example.teachingPoints?.map((point: string) => localizeOptionalText(point, language)),
      controls: example.controls?.map((control: Record<string, any>) => ({
        ...control,
        label: localizeOptionalText(control.label, language),
        options: control.options?.map((option: Record<string, any>) => ({
          ...option,
          label: localizeOptionalText(option.label, language)
        }))
      }))
    }))
  };
}

function localizeChartSpec<T extends Record<string, any>>(chart: T, language: Language): T {
  return {
    ...chart,
    title: localizeOptionalText(chart.title, language),
    xLabel: localizeOptionalText(chart.xLabel, language),
    yLabel: localizeOptionalText(chart.yLabel, language),
    populationTitle: localizeOptionalText(chart.populationTitle, language),
    samplingTitle: localizeOptionalText(chart.samplingTitle, language),
    bars: chart.bars?.map((bar: Record<string, any>) => ({
      ...bar,
      label: localizeOptionalText(bar.label, language)
    })),
    populationBars: chart.populationBars?.map((bar: Record<string, any>) => ({
      ...bar,
      label: localizeOptionalText(bar.label, language)
    })),
    sampleMeanBars: chart.sampleMeanBars?.map((bar: Record<string, any>) => ({
      ...bar,
      label: localizeOptionalText(bar.label, language)
    })),
    points: chart.points?.map((point: Record<string, any>) => ({
      ...point,
      label: localizeOptionalText(point.label, language)
    })),
    intervals: chart.intervals?.map((interval: Record<string, any>) => ({
      ...interval,
      label: localizeOptionalText(interval.label, language)
    })),
    series: chart.series?.map((series: Record<string, any>) => ({
      ...series,
      label: localizeOptionalText(series.label, language)
    })),
    line: chart.line ? {
      ...chart.line,
      label: localizeOptionalText(chart.line.label, language)
    } : chart.line
  };
}

export function localizeSimulationResult<T extends Record<string, any>>(result: T, language: Language): T {
  return {
    ...result,
    headline: localizeOptionalText(result.headline, language),
    narrative: localizeOptionalText(result.narrative, language),
    metrics: result.metrics?.map((metric: Record<string, any>) => ({
      ...metric,
      label: localizeOptionalText(metric.label, language),
      value: localizeOptionalText(metric.value, language),
      detail: localizeOptionalText(metric.detail, language)
    })),
    chart: result.chart ? localizeChartSpec(result.chart, language) : result.chart,
    table: result.table ? {
      ...result.table,
      columns: result.table.columns?.map((column: string) => localizeOptionalText(column, language)),
      rows: localizeTableRows(result.table.rows, language)
    } : result.table
  };
}

export function localizeTableRows<T extends Array<Array<string | number>>>(
  rows: T,
  language: Language
): T {
  return rows.map((row) =>
    row.map((cell) => (typeof cell === "string" ? localizeText(cell, language) : cell))
  ) as T;
}

export function hasUnexpectedLatin(text: string, allowedWords = new Set<string>()): boolean {
  const matches = text.match(/\b[A-Za-z]{3,}\b/g) ?? [];
  return matches.some((word) => !allowedWords.has(word));
}

