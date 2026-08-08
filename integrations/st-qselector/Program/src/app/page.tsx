"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, FileText, Loader2, ChevronDown, ChevronRight, CheckSquare, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import QuestionContent from "@/components/QuestionContent";
import { useSelection } from "@/lib/selection";
import type { QuestionsResponse, Question } from "@/lib/types";
import { withBasePath } from "@/lib/base-path";

function diffLabel(d: number) {
  return ["", "★", "★★", "★★★", "★★★★", "★★★★★"][d] || `难度${d}`;
}

export default function Home() {
  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [chapterSel, setChapterSel] = useState<Set<string>>(new Set());
  const [diffSel, setDiffSel] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { selected, isSelected, toggle, add, clear } = useSelection();

  useEffect(() => {
    fetch(withBasePath("/api/questions"))
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "加载失败");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo<Question[]>(() => {
    if (!data) return [];
    const terms = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.questions.filter((q) => {
      if (chapterSel.size && !chapterSel.has(q.chapterId)) return false;
      if (diffSel.size && !diffSel.has(q.difficulty)) return false;
      if (terms.length) {
        const hay = `${q.id} ${q.content} ${q.keywords.join(" ")} ${q.source}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [data, keyword, chapterSel, diffSel]);

  function toggleChapter(id: string) {
    setChapterSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleDiff(d: number) {
    setDiffSel((prev) => {
      const n = new Set(prev);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });
  }
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function resetFilters() {
    setKeyword("");
    setChapterSel(new Set());
    setDiffSel(new Set());
  }

  const hasFilter = keyword.trim() || chapterSel.size || diffSel.size;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-2 text-lg font-semibold text-red-600">加载失败</h2>
            <p className="text-sm text-slate-600">{error}</p>
            <p className="mt-3 text-xs text-slate-400">
              请确认 <code>Data/Formed/config.yaml</code> 存在且各章节目录含 questions.json。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶部标题 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Cross-app navigation intentionally leaves the Next.js basePath. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
              ← 返回主界面
            </a>
            <div>
              <h1 className="text-lg font-bold">统计学组卷系统</h1>
              <p className="text-xs text-slate-500">
                {data ? `共 ${data.questions.length} 题 · ${data.chapters.length} 章` : "加载中…"}
              </p>
            </div>
          </div>
          <Link href="/paper">
            <Button variant="outline" size="sm">
              <FileText /> 试卷预览
            </Button>
          </Link>
        </div>
      </header>

      {/* 筛选区 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="综合搜索：关键词 / 题号 / 来源（空格分隔多个词，需全部匹配）"
              className="pl-9"
            />
          </div>

          {data && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-slate-500">章节</span>
              {data.chapters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleChapter(c.id)}
                  className={
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors " +
                    (chapterSel.has(c.id)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")
                  }
                >
                  {c.title}
                  <span className="ml-1 opacity-70">{c.count}</span>
                </button>
              ))}
            </div>
          )}

          {data && data.difficulties.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-slate-500">难度</span>
              {data.difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDiff(d)}
                  className={
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors " +
                    (diffSel.has(d)
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")
                  }
                >
                  {diffLabel(d)}
                </button>
              ))}
              {hasFilter && (
                <Button variant="ghost" size="sm" className="ml-auto" onClick={resetFilters}>
                  <X /> 清除筛选
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 结果列表 */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-28">
        {!data ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 size-5 animate-spin" /> 正在加载题库…
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                筛选到 <span className="font-semibold text-slate-900">{filtered.length}</span> 题
              </p>
              {filtered.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => add(filtered.map((q) => q.id))}
                >
                  <CheckSquare /> 选中当前全部
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {filtered.map((q) => {
                const open = expanded.has(q.id);
                const checked = isSelected(q.id);
                return (
                  <Card key={q.id} className={checked ? "ring-2 ring-blue-500/60" : ""}>
                    <CardContent className="flex gap-3 p-4">
                      <div className="pt-0.5">
                        <Checkbox checked={checked} onCheckedChange={() => toggle(q.id)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="default">{q.chapterTitle}</Badge>
                          <Badge variant="amber">{diffLabel(q.difficulty)}</Badge>
                          <span className="font-mono text-xs text-slate-400">{q.id}</span>
                          {q.answer == null && <Badge variant="secondary">无答案</Badge>}
                          {q.attachments.map((att) =>
                            att.available ? (
                              <a
                                key={att.name}
                                href={`/api/asset?chapter=${encodeURIComponent(
                                  q.chapterId
                                )}&file=${encodeURIComponent(att.name)}&download=1`}
                                download
                                title={`下载附件：${att.name}`}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <Download className="size-3" /> {att.name}
                              </a>
                            ) : (
                              <Badge key={att.name} variant="outline" title="附件文件缺失">
                                📎 {att.name}（缺失）
                              </Badge>
                            )
                          )}
                        </div>
                        <QuestionContent text={q.content} chapterId={q.chapterId} />

                        {q.answer != null && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleExpand(q.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
                            >
                              {open ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                              {open ? "隐藏答案" : "查看答案"}
                            </button>
                            {open && (
                              <div className="mt-1.5 rounded-md border border-green-200 bg-green-50/60 p-3">
                                {q.answerIsImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`/api/asset?chapter=${encodeURIComponent(
                                      q.chapterId
                                    )}&file=${encodeURIComponent(q.answer.trim())}`}
                                    alt="答案"
                                    className="max-w-full rounded border border-slate-200"
                                  />
                                ) : (
                                  <QuestionContent text={q.answer} chapterId={q.chapterId} />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  没有匹配的题目，试试调整筛选条件。
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 底部选题托盘 */}
      {selected.length > 0 && (
        <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm">
              已选 <span className="text-lg font-bold text-blue-600">{selected.length}</span> 题
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clear}>
                <X /> 清空
              </Button>
              <Link href="/paper">
                <Button>
                  <FileText /> 立即组卷
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
