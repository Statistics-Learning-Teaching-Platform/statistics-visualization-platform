/**
 * 统一 i18n 模块 —— 全平台唯一的翻译入口。
 *
 * 静态 UI 文案（平台 Shell、各 app 的 chrome）使用 keyed API:
 *   import { t, useT, LanguageProvider } from "@stats-viz/shared/i18n";
 *
 * 本文件只持有翻译「机制」：语言类型、LanguageProvider、t()/useT()、
 * 以及 lookup 辅助函数。两类「数据」拆了出去：
 *   - 静态 keyed 文案表（platformCopy/walsCopy/各 core app 的 *Copy、
 *     allTranslations、visualizerLabels）→ ./copy.ts
 *   - 数据驱动内容的运行时翻译引擎（localizeText 等及其 enToZh 字典）
 *     → ./runtime-dictionary.ts（原 legacy.ts，此处改名以反映其作用）
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// ── 数据驱动内容翻译引擎（./runtime-dictionary.ts）─────────────────
export {
  localizeText,
  localizeModuleConfig,
  localizeSimulationResult,
  localizeTableRows,
  hasUnexpectedLatin,
  type TemplateCopy,
} from "./runtime-dictionary";

// ── Keyed 文案数据表（./copy.ts）──────────────────────────────────
// 重新导出各 core app 直接消费的 copy 表，保持 barrel 导出不变。
export {
  confidenceIntervalCopy,
  walsCopy,
  typeErrorCopy,
  regressionCopy,
} from "./copy";
import {
  allTranslations,
  platformCopy,
  visualizerLabels,
} from "./copy";

// ── 语言类型 ──────────────────────────────────────────────────────
export type Language = "zh" | "en";
export const LANGUAGE_STORAGE_KEY = "statistics-platform-language";

// ── 语言管理（无 postMessage，直接 localStorage + pub/sub）─────────
type LanguageListener = (lang: Language) => void;
const listeners = new Set<LanguageListener>();

export function normalizeLanguage(value: unknown): Language {
  return value === "en" ? "en" : "zh";
}

export function getLanguage(): Language {
  try {
    return normalizeLanguage(
      typeof localStorage !== "undefined"
        ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
        : "zh",
    );
  } catch {
    return "zh";
  }
}

export function setLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // localStorage 可能在嵌入环境中不可用
  }
  listeners.forEach((fn) => fn(lang));
}

export function subscribeLanguage(fn: LanguageListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── t() 函数：按 key 路径取翻译 ───────────────────────────────────
type Params = Record<string, string | number>;

function resolvePath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in params ? String(params[key]) : `{${key}}`,
  );
}

/**
 * 按 dotted key 路径取翻译，例如:
 *   t("platform.brandTitle")
 *   t("platform.groups.Core Visualizers")
 *   t("confidenceInterval.samples", { count: 5 })
 */
export function t(key: string, params?: Params): string {
  const lang = getLanguage();
  const value = resolvePath(allTranslations, `${lang}.${key}`);
  if (typeof value === "string") {
    return interpolate(value, params);
  }
  // 回退到英文
  const fallback = resolvePath(allTranslations, `en.${key}`);
  if (typeof fallback === "string") {
    return interpolate(fallback, params);
  }
  return key;
}

// ── React 集成 ────────────────────────────────────────────────────
const LanguageContext = createContext<Language>(getLanguage());

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(getLanguage());

  useEffect(() => {
    return subscribeLanguage(setLang);
  }, []);

  return (
    <LanguageContext.Provider value={lang}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): Language {
  return useContext(LanguageContext);
}

/** React hook: 返回当前语言的 t 函数，语言切换时自动重渲染 */
export function useT() {
  const lang = useLanguage();
  return useCallback(
    (key: string, params?: Params) => {
      const value = resolvePath(allTranslations, `${lang}.${key}`);
      if (typeof value === "string") {
        return interpolate(value, params);
      }
      const fallback = resolvePath(allTranslations, `en.${key}`);
      if (typeof fallback === "string") {
        return interpolate(fallback, params);
      }
      return key;
    },
    [lang],
  );
}

// ── 辅助：获取 visualizer 标签 ────────────────────────────────────
export function getVisualizerLabel(id: string, lang?: Language): [string, string] {
  const language = lang ?? getLanguage();
  return visualizerLabels[id]?.[language] ?? [id, id];
}

export function getPlatformCopy(lang?: Language) {
  const language = lang ?? getLanguage();
  return platformCopy[language];
}
