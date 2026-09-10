"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- global navigation intentionally leaves this app's basePath */

import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Menu,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import AiPaperWorkspace from "@/components/AiPaperWorkspace";
import QuestionContent from "@/components/QuestionContent";
import { useSelection } from "@/lib/selection";
import type { QuestionsResponse, Question } from "@/lib/types";
import { withBasePath } from "@/lib/base-path";
import { topicLabels } from "@/lib/topic-mapping";
import {
  isTextbookChapterId,
  textbookChapters,
  type TextbookChapterId,
} from "@/lib/textbook-chapters";

const PAGE_SIZE = 20;
const TYPE_ORDER = ["计算题", "选择题", "综合题", "填空题", "简答题", "判断题"];
const GLOBAL_NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/catalog", label: "教材" },
  { href: "/teaching-platform", label: "模拟实验" },
  { href: "/st-qselector", label: "组卷", current: true },
  { href: "/r-learning?returnTo=%2F", label: "R 学习" },
  { href: "/python-learning?returnTo=%2F", label: "Python 学习" },
];

function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
  setter((previous) => {
    const next = new Set(previous);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

function normalizeForDuplicate(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[\p{P}\p{S}]/gu, "");
}

function shortQuestionTitle(value: string) {
  const plain = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$?[\s\S]*?\$\$?/g, "数学表达式")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 72 ? `${plain.slice(0, 72)}…` : plain;
}

function textbookChapterLabel(question: Question) {
  const chapter = question.textbookChapterIds
    .map((id) => textbookChapters.find((item) => item.id === id))
    .find(Boolean);
  if (!chapter) return `${String(question.chapterNum).padStart(2, "0")} ${question.chapterTitle}`;
  return `${String(chapter.number).padStart(2, "0")} ${chapter.title}`;
}

export default function Home({ searchParams }: { searchParams: Promise<{ topicId?: string | string[]; textbookChapterId?: string | string[] }> }) {
  const routeParams = use(searchParams);
  const requestedTopic = typeof routeParams.topicId === "string" && routeParams.topicId in topicLabels
    ? routeParams.topicId
    : undefined;
  const requestedTextbookChapter = isTextbookChapterId(routeParams.textbookChapterId)
    ? routeParams.textbookChapterId
    : undefined;
  // The full question bank is loaded through the authenticated API instead of
  // a bundled public index; the initial state stays empty until it arrives.
  const [data, setData] = useState<QuestionsResponse>(() => ({ questions: [], chapters: [], difficulties: [] }));
  const [search, setSearch] = useState("");
  const [chapterSel, setChapterSel] = useState<Set<string>>(new Set());
  const [textbookChapterSel, setTextbookChapterSel] = useState<Set<TextbookChapterId>>(
    () => requestedTextbookChapter ? new Set([requestedTextbookChapter]) : new Set(),
  );
  const [difficultySel, setDifficultySel] = useState<Set<number>>(new Set());
  const [typeSel, setTypeSel] = useState<Set<string>>(new Set());
  const [knowledgeSel, setKnowledgeSel] = useState<Set<string>>(new Set());
  const [topicSel, setTopicSel] = useState<Set<string>>(() => requestedTopic ? new Set([requestedTopic]) : new Set());
  const [reviewedOnly, setReviewedOnly] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [fullDataLoaded, setFullDataLoaded] = useState(false);
  const [fullDataLoading, setFullDataLoading] = useState(false);
  const [fullDataError, setFullDataError] = useState<string | null>(null);
  const [aiWorkspaceOpen, setAiWorkspaceOpen] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const fullDataLoadedRef = useRef(false);
  const fullRequest = useRef<Promise<QuestionsResponse | null> | null>(null);
  const questionListRef = useRef<HTMLDivElement>(null);
  const pendingPageScrollRef = useRef(false);

  const { selected, generatedQuestions, isSelected, toggle, add, replace, clear, remove } = useSelection();

  useEffect(() => {
    if (!basketOpen && !mobileFilterOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBasketOpen(false);
        setMobileFilterOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [basketOpen, mobileFilterOpen]);

  const openAiWorkspace = useCallback(() => {
    setAiWorkspaceOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("ai-paper-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const loadFullData = useCallback(() => {
    if (fullDataLoadedRef.current) return Promise.resolve(null);
    if (fullRequest.current) return fullRequest.current;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setFullDataLoading(true);
    setFullDataError(null);

    const request = fetch(withBasePath("/api/questions"), {
      signal: controller.signal,
      cache: "default",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || "完整题库加载失败");
        return (await response.json()) as QuestionsResponse;
      })
      .then((result) => {
        setData(result);
        fullDataLoadedRef.current = true;
        setFullDataLoaded(true);
        return result;
      })
      .catch((reason: Error) => {
        const message = reason.name === "AbortError" ? "完整题库请求超时" : reason.message;
        setFullDataError(message);
        throw reason;
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setFullDataLoading(false);
        fullRequest.current = null;
      });

    fullRequest.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (fullDataLoaded || fullDataLoading || fullDataError) return;
    const timer = window.setTimeout(() => {
      void loadFullData().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data, fullDataError, fullDataLoaded, fullDataLoading, loadFullData]);

  const reviewedQuestions = useMemo(
    () => data?.questions.filter((question) => question.isReviewed) ?? [],
    [data]
  );

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of data?.questions ?? []) {
      const key = normalizeForDuplicate(question.content);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
  }, [data]);
  const selectedQuestionObjects = useMemo(() => {
    const byId = new Map([...data.questions, ...generatedQuestions].map((question) => [question.id, question]));
    return selected.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question));
  }, [data.questions, generatedQuestions, selected]);

  const availableTypes = useMemo(() => {
    const set = new Set((data?.questions ?? []).map((question) => question.type));
    return TYPE_ORDER.filter((type) => set.has(type));
  }, [data]);

  const topicOptions = useMemo(
    () => Object.entries(topicLabels)
      .filter(([topicId]) => (data?.questions ?? []).some((question) => question.topicIds.includes(topicId)))
      .map(([id, label]) => ({ id, label, count: (data?.questions ?? []).filter((question) => question.topicIds.includes(id)).length })),
    [data],
  );

  const keywordOptions = useMemo(() => {
    const source = reviewedQuestions.length ? reviewedQuestions : data?.questions ?? [];
    const counts = new Map<string, number>();
    for (const question of source) {
      for (const keyword of question.keywords) {
        const clean = keyword.trim();
        if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .map(([label, count]) => ({ id: label, label, count }));
  }, [data, reviewedQuestions]);

  const visibleTopicOptions = useMemo(() => {
    const term = topicSearch.trim().toLowerCase();
    const merged = [
      ...topicOptions.map((item) => ({ ...item, kind: "topic" as const })),
      ...keywordOptions.map((item) => ({ ...item, kind: "keyword" as const })),
    ];
    const filteredOptions = term
      ? merged.filter((item) => item.label.toLowerCase().includes(term))
      : merged;
    return filteredOptions.slice(0, term || showAllTopics ? 24 : 8);
  }, [keywordOptions, showAllTopics, topicOptions, topicSearch]);

  const filtered = useMemo<Question[]>(() => {
    if (!data) return [];
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.questions.filter((question) => {
      if (reviewedOnly && !question.isReviewed) return false;
      if (textbookChapterSel.size && !question.textbookChapterIds.some((item) => textbookChapterSel.has(item))) return false;
      if (chapterSel.size && !chapterSel.has(question.chapterId)) return false;
      if (difficultySel.size && !difficultySel.has(question.difficulty)) return false;
      if (typeSel.size && !typeSel.has(question.type)) return false;
      if (knowledgeSel.size && !question.keywords.some((item) => knowledgeSel.has(item))) return false;
      if (topicSel.size && !question.topicIds.some((item) => topicSel.has(item))) return false;
      if (terms.length) {
        const haystack = `${question.id} ${question.content} ${question.answer ?? ""} ${question.keywords.join(" ")} ${question.source}`.toLowerCase();
        if (!terms.every((term) => haystack.includes(term))) return false;
      }
      return true;
    });
  }, [data, search, textbookChapterSel, chapterSel, difficultySel, typeSel, knowledgeSel, topicSel, reviewedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageQuestions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = useCallback((nextPage: number) => {
    if (nextPage === currentPage) return;
    pendingPageScrollRef.current = true;
    setPage(nextPage);
  }, [currentPage]);

  useEffect(() => {
    if (!pendingPageScrollRef.current) return;
    pendingPageScrollRef.current = false;

    const frame = window.requestAnimationFrame(() => {
      const firstQuestion = questionListRef.current?.querySelector<HTMLElement>(".qb-question");
      if (!firstQuestion) return;

      const header = document.querySelector<HTMLElement>(".qb-global-header");
      const stickyHeaderHeight = header && window.getComputedStyle(header).position === "sticky"
        ? header.getBoundingClientRect().height
        : 0;
      const targetTop = window.scrollY + firstQuestion.getBoundingClientRect().top - stickyHeaderHeight - 16;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: reduceMotion ? "auto" : "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPage]);

  const chapterCounts = useMemo(() => {
    const source = reviewedOnly ? reviewedQuestions : data?.questions ?? [];
    const counts = new Map<string, number>();
    for (const question of source) counts.set(question.chapterId, (counts.get(question.chapterId) ?? 0) + 1);
    return counts;
  }, [data, reviewedOnly, reviewedQuestions]);

  const textbookChapterCounts = useMemo(() => {
    const source = reviewedOnly ? reviewedQuestions : data?.questions ?? [];
    const counts = new Map<TextbookChapterId, number>();
    for (const question of source) {
      for (const chapterId of question.textbookChapterIds) {
        counts.set(chapterId, (counts.get(chapterId) ?? 0) + 1);
      }
    }
    return counts;
  }, [data, reviewedOnly, reviewedQuestions]);

  const hasFilters = Boolean(
    reviewedOnly || search.trim() || textbookChapterSel.size || chapterSel.size || difficultySel.size || typeSel.size || knowledgeSel.size || topicSel.size
  );
  const hasExtraFilters = Boolean(
    search.trim() || textbookChapterSel.size || chapterSel.size || difficultySel.size || typeSel.size || knowledgeSel.size || topicSel.size
  );

  function resetFilters() {
    setSearch("");
    setTextbookChapterSel(new Set());
    setChapterSel(new Set());
    setDifficultySel(new Set());
    setTypeSel(new Set());
    setKnowledgeSel(new Set());
    setTopicSel(new Set());
    setReviewedOnly(true);
    setTopicSearch("");
    setShowAllTopics(false);
    setSourceExpanded(false);
    setPage(1);
  }

  return (
    <div className="qb-app">
      <header className="qb-global-header">
        <a className="qb-global-brand" href="/" aria-label="StatMind 首页">
          <span className="qb-global-brand__seal" aria-hidden="true">S</span>
          <span className="qb-global-brand__copy">
            <strong>StatMind</strong>
            <small>统计思维教学平台</small>
          </span>
        </a>

        <nav className="qb-global-nav" aria-label="主要学习空间">
          {GLOBAL_NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} aria-current={item.current ? "page" : undefined}>
              {item.label}
            </a>
          ))}
          <Link className="qb-preview-button" href="/account">账号管理</Link>
        </nav>

        <div className="qb-global-actions">
          <button className="qb-basket-trigger" type="button" onClick={() => setBasketOpen(true)}>
            <ShoppingCart aria-hidden="true" />
            <span>试卷篮</span>
            <b aria-live="polite">{selected.length}</b>
          </button>
          <Link className="qb-preview-button" href="/paper"><FileText aria-hidden="true" /> 预览试卷</Link>
          <span className="qb-global-language" aria-label="当前语言"><strong>中</strong><span aria-hidden="true">/</span><span>EN</span></span>
        </div>
      </header>

      <div className={`qb-layout${aiWorkspaceOpen ? " qb-layout--ai" : ""}`}>
        {!aiWorkspaceOpen && <aside className="qb-sidebar" data-mobile-open={mobileFilterOpen}>
          <div className="qb-sidebar__heading">
            <div><h2>筛选题库</h2><p>按章节、题型、难度、知识点和来源筛选题目。</p></div>
            <div className="qb-sidebar__heading-actions"><span className="qb-filter-count">{filtered.length} 题</span><button type="button" className="qb-sidebar__close" onClick={() => setMobileFilterOpen(false)} aria-label="关闭筛选"><X aria-hidden="true" /></button></div>
          </div>

          <div className="qb-sidebar__scroll">
            <label className="qb-search">
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="搜索关键词、题号或来源"
                aria-label="搜索关键词、题号或来源"
              />
              {search && <button type="button" aria-label="清除搜索" onClick={() => { setSearch(""); setPage(1); }}><X aria-hidden="true" /></button>}
            </label>

            <section className="qb-active-filters" aria-labelledby="active-filter-title">
              <div className="qb-filter-section-head">
                <h3 id="active-filter-title">当前范围</h3>
                {hasFilters && <button type="button" onClick={resetFilters}><RotateCcw aria-hidden="true" /> 重置</button>}
              </div>
              {!hasExtraFilters ? <p className="qb-filter-empty">{reviewedOnly ? "全部已审核题目" : "全部题目"}</p> : (
                <div className="qb-active-filter-list">
                  {reviewedOnly && <button type="button" className="qb-active-filter" onClick={() => setReviewedOnly(false)}>已审核 <X aria-hidden="true" /></button>}
                  {search && <button type="button" className="qb-active-filter" onClick={() => { setSearch(""); setPage(1); }}>搜索：{search} <X aria-hidden="true" /></button>}
                  {[...textbookChapterSel].map((id) => {
                    const chapter = textbookChapters.find((item) => item.id === id);
                    return chapter ? <button type="button" className="qb-active-filter" key={id} onClick={() => { toggleSet(setTextbookChapterSel, id); setPage(1); }}>{String(chapter.number).padStart(2, "0")} {chapter.title} <X aria-hidden="true" /></button> : null;
                  })}
                  {[...chapterSel].map((id) => {
                    const chapter = data?.chapters.find((item) => item.id === id);
                    return chapter ? <button type="button" className="qb-active-filter" key={id} onClick={() => { toggleSet(setChapterSel, id); setPage(1); }}>{chapter.title} <X aria-hidden="true" /></button> : null;
                  })}
                  {[...typeSel].map((type) => <button type="button" className="qb-active-filter" key={type} onClick={() => { toggleSet(setTypeSel, type); setPage(1); }}>{type} <X aria-hidden="true" /></button>)}
                  {[...difficultySel].map((difficulty) => <button type="button" className="qb-active-filter" key={difficulty} onClick={() => { toggleSet(setDifficultySel, difficulty); setPage(1); }}>难度 {difficulty} <X aria-hidden="true" /></button>)}
                  {[...topicSel].map((id) => <button type="button" className="qb-active-filter" key={id} onClick={() => { toggleSet(setTopicSel, id); setPage(1); }}>{topicLabels[id] ?? id} <X aria-hidden="true" /></button>)}
                  {[...knowledgeSel].map((point) => <button type="button" className="qb-active-filter" key={point} onClick={() => { toggleSet(setKnowledgeSel, point); setPage(1); }}>{point} <X aria-hidden="true" /></button>)}
                </div>
                )}
            </section>

            {data && (
              <FilterGroup title="教材章节" className="qb-filter-group--chapters">
                {textbookChapters.map((chapter) => (
                  <FilterChip
                    key={chapter.id}
                    active={textbookChapterSel.has(chapter.id)}
                    disabled={(textbookChapterCounts.get(chapter.id) ?? 0) === 0}
                    onClick={() => {
                      toggleSet(setTextbookChapterSel, chapter.id);
                      setPage(1);
                    }}
                  >
                    <span className="qb-option-check" aria-hidden="true">{textbookChapterSel.has(chapter.id) && <Check />}</span>
                    <span className="qb-option-label"><b>{String(chapter.number).padStart(2, "0")}</b> {chapter.title}</span>
                    <em>{textbookChapterCounts.get(chapter.id) ?? 0}</em>
                  </FilterChip>
                ))}
              </FilterGroup>
            )}

            {data && (
              <FilterGroup title="难度">
                {data.difficulties.map((difficulty) => (
                  <FilterChip
                    key={difficulty}
                    active={difficultySel.has(difficulty)}
                    onClick={() => {
                      toggleSet(setDifficultySel, difficulty);
                      setPage(1);
                    }}
                  >
                    <span className="qb-option-check" aria-hidden="true">{difficultySel.has(difficulty) && <Check />}</span>
                    <span className="qb-option-label">难度 {difficulty}</span>
                    <em>{(data.questions.filter((question) => question.difficulty === difficulty && (!reviewedOnly || question.isReviewed))).length}</em>
                  </FilterChip>
                ))}
              </FilterGroup>
            )}

            <FilterGroup title="题型">
              {availableTypes.map((type) => (
                <FilterChip
                  key={type}
                  active={typeSel.has(type)}
                  onClick={() => {
                    toggleSet(setTypeSel, type);
                    setPage(1);
                  }}
                >
                  <span className="qb-option-check" aria-hidden="true">{typeSel.has(type) && <Check />}</span>
                  <span className="qb-option-label">{type}</span>
                  <em>{data.questions.filter((question) => question.type === type && (!reviewedOnly || question.isReviewed)).length}</em>
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup title="知识点">
              <label className="qb-topic-search"><Search aria-hidden="true" /><input value={topicSearch} onChange={(event) => { setTopicSearch(event.target.value); setShowAllTopics(false); }} placeholder="搜索知识点" aria-label="搜索知识点" /></label>
              <div className="qb-topic-options">
                {visibleTopicOptions.map((item) => (
                  <FilterChip
                    key={`${item.kind}-${item.id}`}
                    active={item.kind === "topic" ? topicSel.has(item.id) : knowledgeSel.has(item.id)}
                    onClick={() => {
                      if (item.kind === "topic") toggleSet(setTopicSel, item.id);
                      else toggleSet(setKnowledgeSel, item.id);
                      setPage(1);
                    }}
                  >
                    <span className="qb-option-check" aria-hidden="true">{(item.kind === "topic" ? topicSel.has(item.id) : knowledgeSel.has(item.id)) && <Check />}</span>
                    <span className="qb-option-label">{item.label}</span>
                    <em>{item.count}</em>
                  </FilterChip>
                ))}
              </div>
              {!topicSearch && !showAllTopics && (topicOptions.length + keywordOptions.length > visibleTopicOptions.length) && <button type="button" className="qb-see-more" onClick={() => setShowAllTopics(true)}>查看全部知识点 <ChevronDown aria-hidden="true" /></button>}
            </FilterGroup>

            {data && (
              <FilterGroup title={`题库来源章节 · ${data.chapters.length}`}>
                <button type="button" className="qb-source-toggle" onClick={() => setSourceExpanded((value) => !value)} aria-expanded={sourceExpanded}>
                  {sourceExpanded ? "收起来源章节" : "展开来源章节"}<ChevronDown aria-hidden="true" className={sourceExpanded ? "is-open" : ""} />
                </button>
                {sourceExpanded && <div className="qb-source-options">
                  {data.chapters.map((chapter) => (
                    <FilterChip key={chapter.id} active={chapterSel.has(chapter.id)} onClick={() => { toggleSet(setChapterSel, chapter.id); setPage(1); }}>
                      <span className="qb-option-check" aria-hidden="true">{chapterSel.has(chapter.id) && <Check />}</span><span className="qb-option-label">{chapter.title}</span><em>{chapterCounts.get(chapter.id) ?? 0}</em>
                    </FilterChip>
                  ))}
                </div>}
              </FilterGroup>
            )}

            <FilterGroup title="审核状态">
              <label className="qb-review-check">
                <input type="checkbox" checked={reviewedOnly} onChange={(event) => {
                  const next = event.target.checked;
                  setReviewedOnly(next);
                  setPage(1);
                  if (!next && !fullDataLoaded) void loadFullData().catch(() => undefined);
                }} />
                <span>仅显示已审核题目</span>
              </label>
              <p className="qb-review-note">正式试卷仅使用已审核且答案完整的题目。</p>
              {fullDataLoading && <p className="qb-review-note">正在载入其余题目…</p>}
              {fullDataError && <p className="qb-review-note qb-review-note--error">{fullDataError}</p>}
            </FilterGroup>

            <div className="qb-quality">
              <h3>题目质量概览</h3>
              <p><strong>{reviewedQuestions.length}</strong> 题已完成独立审核</p>
              <p><strong>{duplicateCount}</strong> 题与其他题目内容重复</p>
              {data?.coverage && !data.coverage.isComplete && (
                <p><strong>{data.coverage.emptyChapterIds.join("、")}</strong> 尚无通过审核的正式题目</p>
              )}
              <small>界面只把数据中具有明确审核标记的题目计为“已审核”。</small>
            </div>
          </div>

          <div className="qb-sidebar__footer">
            <span>已应用 {[
              search.trim(), ...textbookChapterSel, ...chapterSel, ...difficultySel, ...typeSel, ...knowledgeSel, ...topicSel,
            ].filter(Boolean).length + (reviewedOnly ? 1 : 0)} 个筛选条件</span>
            <button type="button" onClick={resetFilters} disabled={!hasFilters}><RotateCcw aria-hidden="true" /> 清空筛选</button>
          </div>
        </aside>}

        <main className="qb-main">
          {!data ? (
            <div className="qb-state"><Loader2 className="animate-spin" /> 正在加载题库…</div>
          ) : (
            <>
              <section className="qb-workspace-intro" aria-labelledby="qb-workspace-title">
                <div className="qb-workspace-intro__copy">
                  <p>STATMIND · QUESTION BANK</p>
                  <h1 id="qb-workspace-title">统计学组卷系统</h1>
                  <p className="qb-workspace-intro__description">从已审核题库中筛选、组合并生成试卷。</p>
                </div>

                <div className="qb-workspace-summary" role="list" aria-label="题库概览">
                  <div className="qb-workspace-stat" role="listitem">
                    <strong>{data.totalCount ?? data.questions.length}</strong>
                    <span>题库总量</span>
                  </div>
                  <div className="qb-workspace-stat" role="listitem">
                    <strong>{reviewedQuestions.length}</strong>
                    <span>已审核</span>
                  </div>
                  <div className="qb-workspace-stat" role="listitem">
                    <strong>{data.chapters.length}</strong>
                    <span>教材章节</span>
                  </div>
                </div>
              </section>

              <div className="qb-modebar">
                <div className="qb-mode-switch" role="tablist" aria-label="组卷方式">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!aiWorkspaceOpen}
                    data-active={!aiWorkspaceOpen}
                    onClick={() => setAiWorkspaceOpen(false)}
                  >
                    <CheckSquare /> 手动选题
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={aiWorkspaceOpen}
                    data-active={aiWorkspaceOpen}
                    onClick={openAiWorkspace}
                  >
                    <Sparkles /> AI 智能组卷
                  </button>
                </div>
                <p>{aiWorkspaceOpen ? "从课件提取知识点，优先匹配题库，不足部分再生成并校验。" : "通过章节、题型、难度与知识点精确选择题目。"}</p>
              </div>

              {aiWorkspaceOpen ? (
                <AiPaperWorkspace
                  availableTypes={availableTypes}
                  selectedIds={selected}
                  selectedQuestions={selectedQuestionObjects}
                  onAdd={add}
                  onReplace={replace}
                />
              ) : (
                <>
                  <div className="qb-mobile-status">
                    <span>筛选结果 <strong>{filtered.length}</strong></span>
                    <span>已选 <strong>{selected.length}</strong></span>
                    <button type="button" onClick={() => setMobileFilterOpen(true)}><Menu aria-hidden="true" /> 筛选</button>
                    <button type="button" onClick={() => setBasketOpen(true)}><ShoppingCart aria-hidden="true" /> 试卷篮</button>
                  </div>

                  <div className="qb-selection-toolbar">
                    <div><span className="qb-toolbar-eyebrow">候选题目</span><strong>{filtered.length} 道符合当前条件</strong></div>
                    <div className="qb-selection-toolbar__actions">
                      {pageQuestions.length > 0 && <button type="button" onClick={() => add(pageQuestions.map((question) => question.id))}><CheckSquare aria-hidden="true" /> 选择本页</button>}
                      <span>已选 <strong>{selected.length}</strong> 题</span>
                      <button type="button" onClick={clear} disabled={!selected.length}>清空已选</button>
                      <button type="button" className="qb-toolbar-basket" onClick={() => setBasketOpen(true)}><ShoppingCart aria-hidden="true" /> 试卷篮 <b>{selected.length}</b></button>
                    </div>
                  </div>

                  <div className="qb-question-list" ref={questionListRef}>
                    {fullDataLoading && !fullDataLoaded ? <QuestionSkeletonList /> : <>
                      {pageQuestions.map((question) => (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          checked={isSelected(question.id)}
                          open={expanded.has(question.id)}
                          onToggle={() => toggle(question.id)}
                          onToggleAnswer={() => toggleSet(setExpanded, question.id)}
                        />
                      ))}
                      {filtered.length === 0 && (
                        <div className="qb-empty"><strong>没有找到符合当前条件的题目</strong><span>尝试放宽章节、题型或知识点范围。</span><button type="button" onClick={resetFilters}>清空筛选</button></div>
                      )}
                    </>}
                  </div>

                  {filtered.length > PAGE_SIZE && (
                    <Pagination page={currentPage} total={totalPages} onChange={handlePageChange} />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {mobileFilterOpen && <button type="button" className="qb-drawer-backdrop qb-filter-backdrop no-print" aria-label="关闭筛选" onClick={() => setMobileFilterOpen(false)} />}
      <PaperBasketDrawer open={basketOpen} questions={selectedQuestionObjects} onClose={() => setBasketOpen(false)} onRemove={remove} onClear={clear} />
    </div>
  );
}

function FilterGroup({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`qb-filter-group ${className}`.trim()}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function FilterChip({ active, onClick, children, disabled = false }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" className="qb-filter-chip" data-active={active} onClick={onClick} disabled={disabled} aria-pressed={active}>{children}</button>;
}

function QuestionCard({
  question,
  checked,
  open,
  onToggle,
  onToggleAnswer,
}: {
  question: Question;
  checked: boolean;
  open: boolean;
  onToggle: () => void;
  onToggleAnswer: () => void;
}) {
  return (
    <article className="qb-question" data-selected={checked}>
      <button type="button" className="qb-checkbox" data-checked={checked} onClick={onToggle} aria-label={`${checked ? "取消选择" : "选择"} ${question.id}`} aria-pressed={checked}>
        {checked && <Check />}
      </button>
      <div className="qb-question__body">
        <div className="qb-question__meta">
          <span className="qb-badge qb-badge--chapter">{textbookChapterLabel(question)}</span>
          <span className="qb-meta-separator" aria-hidden="true">·</span>
          <span className="qb-badge qb-badge--type">{question.type}{question.partCount > 1 ? ` · ${question.partCount} 个小问` : ""}</span>
          <span className="qb-meta-separator" aria-hidden="true">·</span>
          <span className="qb-badge qb-badge--difficulty">难度 {question.difficulty}</span>
          {question.origin === "variant" && (
            <span className="qb-badge qb-badge--ai-variant">AI 母题变式</span>
          )}
          {question.origin === "generated" && (
            <span className="qb-badge qb-badge--ai-generated">AI 全新生成</span>
          )}
          {question.keywords.slice(0, 1).map((keyword) => (
            <span key={keyword} className="qb-badge qb-badge--knowledge">{keyword}</span>
          ))}
          <code className="qb-question__id">{question.id}</code>
          {question.attachments.map((attachment) =>
            attachment.available ? (
              <a
                key={attachment.name}
                className="qb-attachment"
                href={`${withBasePath("/api/asset")}?chapter=${encodeURIComponent(question.chapterId)}&file=${encodeURIComponent(attachment.name)}&download=1`}
                download
              >
                <Download /> {attachment.name}
              </a>
            ) : (
              <span key={attachment.name} className="qb-badge qb-badge--warning">附件缺失：{attachment.name}</span>
            )
          )}
        </div>

        <QuestionContent text={question.content} chapterId={question.chapterId} className="qb-question__content" visualizations={question.visualizations} />

        <div className="qb-question__footer">
          <div className="qb-question__links">
            {question.answer != null && <button type="button" className="qb-answer-trigger" onClick={onToggleAnswer} aria-expanded={open}>{open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />} {open ? "收起答案" : "查看答案"}</button>}
            {question.attachments.length > 0 && <span className="qb-question__source"><FileText aria-hidden="true" /> 含附件</span>}
          </div>
          <button type="button" className={`qb-add-question${checked ? " is-added" : ""}`} onClick={onToggle} aria-pressed={checked}>{checked ? <><Check aria-hidden="true" /> 已加入试卷</> : <><ShoppingCart aria-hidden="true" /> 加入试卷</>}</button>
        </div>

        {question.answer != null && open && (
          <div className="qb-answer__content">
            <strong>答案</strong>
            {question.answerIsImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${withBasePath("/api/asset")}?chapter=${encodeURIComponent(question.chapterId)}&file=${encodeURIComponent(question.answer.trim())}`}
                alt={`${question.id} 的答案`}
              />
            ) : (
              <QuestionContent text={question.answer} chapterId={question.chapterId} visualizations={[]} />
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function PaperBasketDrawer({
  open,
  questions,
  onClose,
  onRemove,
  onClear,
}: {
  open: boolean;
  questions: Question[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const typeCounts = questions.reduce<Record<string, number>>((counts, question) => ({ ...counts, [question.type]: (counts[question.type] ?? 0) + 1 }), {});
  const difficultyCounts = questions.reduce<Record<string, number>>((counts, question) => ({ ...counts, [String(question.difficulty)]: (counts[String(question.difficulty)] ?? 0) + 1 }), {});
  const chapterCount = new Set(questions.flatMap((question) => question.textbookChapterIds)).size;
  const maxTypeCount = Math.max(1, ...Object.values(typeCounts));
  if (!open) return null;
  return (
    <>
      <button type="button" className="qb-drawer-backdrop no-print" aria-label="关闭试卷篮" onClick={onClose} />
      <aside className="qb-basket-drawer no-print" aria-label="试卷篮" aria-modal="true" role="dialog">
        <header className="qb-basket-drawer__header">
          <div><span className="qb-eyebrow">PAPER BASKET</span><h2>试卷篮</h2><p>已选 {questions.length} 道题 · 已自动保存</p></div>
          <div className="qb-basket-drawer__header-actions"><button type="button" onClick={onClear} disabled={!questions.length}>清空</button><button type="button" onClick={onClose} aria-label="关闭试卷篮"><X aria-hidden="true" /></button></div>
        </header>
        <div className="qb-basket-drawer__body">
          <section className="qb-paper-structure" aria-labelledby="paper-structure-title">
            <h3 id="paper-structure-title">试卷结构</h3>
            <div className="qb-paper-structure__metrics"><div><strong>{questions.length}</strong><span>题目数</span></div><div><strong>{chapterCount}</strong><span>章节覆盖</span></div><div><strong>{Object.keys(typeCounts).length}</strong><span>题型</span></div></div>
            <div className="qb-distribution"><span>题型分布</span>{Object.entries(typeCounts).map(([type, count]) => <div key={type}><label>{type}</label><i><b style={{ width: `${(count / maxTypeCount) * 100}%` }} /></i><em>{count}</em></div>)}</div>
            {Object.keys(difficultyCounts).length > 0 && <div className="qb-distribution"><span>难度分布</span>{Object.entries(difficultyCounts).sort(([a], [b]) => Number(a) - Number(b)).map(([difficulty, count]) => <div key={difficulty}><label>难度 {difficulty}</label><i><b style={{ width: `${(count / questions.length) * 100}%` }} /></i><em>{count}</em></div>)}</div>}
          </section>
          <section className="qb-selected-list" aria-labelledby="selected-list-title">
            <div className="qb-selected-list__heading"><h3 id="selected-list-title">已选题目</h3><span>按加入顺序</span></div>
            {questions.length === 0 ? <p className="qb-basket-empty">从题库加入题目后，试卷结构会显示在这里。</p> : <ol>{questions.map((question, index) => <li key={question.id}><span className="qb-selected-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{textbookChapterLabel(question)} · {question.type}</strong><p>{shortQuestionTitle(question.content)}</p></div><button type="button" onClick={() => onRemove(question.id)} aria-label={`移除第 ${index + 1} 题`}><X aria-hidden="true" /></button></li>)}</ol>}
          </section>
        </div>
        <footer className="qb-basket-drawer__footer"><button type="button" onClick={onClose}>继续选题</button><Link href="/paper" onClick={onClose} className="qb-basket-primary" aria-disabled={!questions.length}>预览完整试卷 <ChevronRight aria-hidden="true" /></Link></footer>
      </aside>
    </>
  );
}

function QuestionSkeletonList() {
  return <>{[1, 2, 3].map((item) => <div className="qb-question qb-question--skeleton" key={item} aria-hidden="true"><span className="qb-skeleton-checkbox" /><div><div className="qb-skeleton-meta"><i /><i /><i /></div><div className="qb-skeleton-line qb-skeleton-line--long" /><div className="qb-skeleton-line" /><div className="qb-skeleton-line qb-skeleton-line--short" /></div></div>)}</>;
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Array.from({ length: total }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === total || Math.abs(item - page) <= 2
  );
  return (
    <nav className="qb-pagination" aria-label="题库分页">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft /></button>
      {pages.map((item, index) => (
        <React.Fragment key={item}>
          {index > 0 && item - pages[index - 1] > 1 && <span>…</span>}
          <button data-active={item === page} onClick={() => onChange(item)}>{item}</button>
        </React.Fragment>
      ))}
      <button disabled={page === total} onClick={() => onChange(page + 1)}><ChevronRight /></button>
    </nav>
  );
}
