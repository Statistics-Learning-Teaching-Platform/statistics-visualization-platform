"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import QuestionContent from "@/components/QuestionContent";
import { useSelection } from "@/lib/selection";
import type { QuestionsResponse, Question } from "@/lib/types";
import { withBasePath } from "@/lib/base-path";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";

const PAGE_SIZE = 8;
const TYPE_ORDER = ["计算题", "选择题", "综合题", "填空题", "简答题", "判断题"];

function diffLabel(d: number) {
  return "★".repeat(Math.max(1, Math.min(5, d)));
}

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

export default function Home() {
  const [data, setData] = useState<QuestionsResponse>(() => reviewedQuestionIndex);
  const [search, setSearch] = useState("");
  const [chapterSel, setChapterSel] = useState<Set<string>>(new Set());
  const [difficultySel, setDifficultySel] = useState<Set<number>>(new Set());
  const [typeSel, setTypeSel] = useState<Set<string>>(new Set());
  const [knowledgeSel, setKnowledgeSel] = useState<Set<string>>(new Set());
  const [reviewedOnly, setReviewedOnly] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [fullDataLoaded, setFullDataLoaded] = useState(false);
  const [fullDataLoading, setFullDataLoading] = useState(false);
  const [fullDataError, setFullDataError] = useState<string | null>(null);
  const fullDataLoadedRef = useRef(false);
  const fullRequest = useRef<Promise<QuestionsResponse | null> | null>(null);

  const { selected, isSelected, toggle, add, clear } = useSelection();

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
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data, fullDataError, fullDataLoaded, fullDataLoading, loadFullData]);

  const reviewedQuestions = useMemo(
    () => data?.questions.filter((question) => question.isReviewed) ?? [],
    [data]
  );

  const knowledgePoints = useMemo(() => {
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
      .slice(0, 12)
      .map(([keyword]) => keyword);
  }, [data, reviewedQuestions]);

  const availableTypes = useMemo(() => {
    const set = new Set((data?.questions ?? []).map((question) => question.type));
    return TYPE_ORDER.filter((type) => set.has(type));
  }, [data]);

  const filtered = useMemo<Question[]>(() => {
    if (!data) return [];
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.questions.filter((question) => {
      if (reviewedOnly && !question.isReviewed) return false;
      if (chapterSel.size && !chapterSel.has(question.chapterId)) return false;
      if (difficultySel.size && !difficultySel.has(question.difficulty)) return false;
      if (typeSel.size && !typeSel.has(question.type)) return false;
      if (knowledgeSel.size && !question.keywords.some((item) => knowledgeSel.has(item))) return false;
      if (terms.length) {
        const haystack = `${question.id} ${question.content} ${question.answer ?? ""} ${question.keywords.join(" ")} ${question.source}`.toLowerCase();
        if (!terms.every((term) => haystack.includes(term))) return false;
      }
      return true;
    });
  }, [data, search, chapterSel, difficultySel, typeSel, knowledgeSel, reviewedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageQuestions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const chapterCounts = useMemo(() => {
    const source = reviewedOnly ? reviewedQuestions : data?.questions ?? [];
    const counts = new Map<string, number>();
    for (const question of source) counts.set(question.chapterId, (counts.get(question.chapterId) ?? 0) + 1);
    return counts;
  }, [data, reviewedOnly, reviewedQuestions]);

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of data?.questions ?? []) {
      const key = normalizeForDuplicate(question.content);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
  }, [data]);

  const hasFilters = Boolean(
    search.trim() || chapterSel.size || difficultySel.size || typeSel.size || knowledgeSel.size
  );

  function resetFilters() {
    setSearch("");
    setChapterSel(new Set());
    setDifficultySel(new Set());
    setTypeSel(new Set());
    setKnowledgeSel(new Set());
    setPage(1);
  }

  return (
    <div className="qb-app">
      <header className="qb-header">
        <div>
          <div className="qb-brand"><span>▥</span> STATMIND</div>
          <h1>统计学组卷系统</h1>
          <p>已审核 {reviewedQuestions.length} 题 · {data.chapters.length} 章</p>
        </div>
        <nav className="qb-header__actions">
          {/* Cross-app navigation intentionally leaves the Next.js basePath. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">←&nbsp; 返回主界面</a>
          <Link className="qb-preview-button" href="/paper"><FileText /> 试卷预览</Link>
        </nav>
      </header>

      <div className="qb-layout">
        <aside className="qb-sidebar">
          <div className="qb-sidebar__heading">
            <h2>筛选题库</h2>
            {hasFilters && <button onClick={resetFilters}><X /> 清除</button>}
          </div>

          <label className="qb-search">
            <Search />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="综合搜索：关键词 / 题号 / 来源"
            />
          </label>

          <div className="qb-review-toggle">
            <button
              data-active={reviewedOnly}
              onClick={() => {
                const next = !reviewedOnly;
                setReviewedOnly(next);
                setPage(1);
                if (!next && !fullDataLoaded) void loadFullData().catch(() => undefined);
              }}
            >
              {reviewedOnly && <Check />} 只看已审核题目
            </button>
            <span>
              {fullDataLoading
                ? "已审核题目可立即使用，完整题库正在后台加载"
                : fullDataError
                  ? "完整题库暂不可用，点击筛选开关可重试"
                  : "未通过审核的题目不会进入组卷"}
            </span>
          </div>

          {data && (
            <FilterGroup title="章节">
              {data.chapters.map((chapter) => (
                <FilterChip
                  key={chapter.id}
                  active={chapterSel.has(chapter.id)}
                  onClick={() => {
                    toggleSet(setChapterSel, chapter.id);
                    setPage(1);
                  }}
                >
                  {chapter.title} <em>{chapterCounts.get(chapter.id) ?? 0}</em>
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
                  {diffLabel(difficulty)}
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
                {type}
              </FilterChip>
            ))}
          </FilterGroup>

          {knowledgePoints.length > 0 && (
            <FilterGroup title="知识点">
              {knowledgePoints.map((point) => (
                <FilterChip
                  key={point}
                  active={knowledgeSel.has(point)}
                  onClick={() => {
                    toggleSet(setKnowledgeSel, point);
                    setPage(1);
                  }}
                >
                  {point}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          <div className="qb-quality">
            <h3>题目质量概览</h3>
            <p><strong>{reviewedQuestions.length}</strong> 题已完成独立审核</p>
            <p><strong>{duplicateCount}</strong> 题与其他题目内容重复</p>
            <small>界面只把数据中具有明确审核标记的题目计为“已审核”。</small>
          </div>
        </aside>

        <main className="qb-main">
          {!data ? (
            <div className="qb-state"><Loader2 className="animate-spin" /> 正在加载题库…</div>
          ) : (
            <>
              <div className="qb-results-header">
                <p>筛选到 <strong>{filtered.length}</strong> 题</p>
                {pageQuestions.length > 0 && (
                  <button onClick={() => add(pageQuestions.map((question) => question.id))}>
                    <CheckSquare /> 选中本页全部
                  </button>
                )}
              </div>

              <div className="qb-question-list">
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
                  <div className="qb-empty">没有符合当前条件的题目，请调整筛选条件。</div>
                )}
              </div>

              {filtered.length > PAGE_SIZE && (
                <Pagination page={currentPage} total={totalPages} onChange={setPage} />
              )}
            </>
          )}
        </main>
      </div>

      {selected.length > 0 && (
        <div className="qb-selection no-print">
          <span>已选 <strong>{selected.length}</strong> 题</span>
          <button onClick={clear}><X /> 清空</button>
          <Link href="/paper"><FileText /> 立即组卷</Link>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="qb-filter-group">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className="qb-filter-chip" data-active={active} onClick={onClick}>{children}</button>;
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
      <button className="qb-checkbox" data-checked={checked} onClick={onToggle} aria-label={`选择 ${question.id}`}>
        {checked && <Check />}
      </button>
      <div className="qb-question__body">
        <div className="qb-badges">
          <span className="qb-badge qb-badge--chapter">{question.chapterTitle}</span>
          <span className="qb-badge qb-badge--difficulty">{diffLabel(question.difficulty)}</span>
          <span className="qb-badge qb-badge--type">{question.type}</span>
          <span className={`qb-badge ${question.isComplete ? "qb-badge--complete" : "qb-badge--warning"}`}>
            {question.isComplete ? "题目完整" : "材料不完整"}
          </span>
          {question.isReviewed ? (
            <span className="qb-badge qb-badge--review"><ShieldCheck /> 答案已审核</span>
          ) : (
            <span className="qb-badge qb-badge--warning">未审核</span>
          )}
          {question.keywords.slice(0, 2).map((keyword) => (
            <span key={keyword} className="qb-badge qb-badge--knowledge">{keyword}</span>
          ))}
          <code>{question.id}</code>
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

        <QuestionContent text={question.content} chapterId={question.chapterId} className="qb-question__content" />

        {question.answer != null && (
          <div className="qb-answer">
            <button onClick={onToggleAnswer}>
              {open ? <ChevronDown /> : <ChevronRight />} {open ? "隐藏答案" : "查看答案"}
            </button>
            {open && (
              <div className="qb-answer__content">
                {question.answerIsImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${withBasePath("/api/asset")}?chapter=${encodeURIComponent(question.chapterId)}&file=${encodeURIComponent(question.answer.trim())}`}
                    alt={`${question.id} 的答案`}
                  />
                ) : (
                  <QuestionContent text={question.answer} chapterId={question.chapterId} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
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
