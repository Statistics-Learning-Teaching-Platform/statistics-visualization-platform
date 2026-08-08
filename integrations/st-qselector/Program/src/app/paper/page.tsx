"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileDown, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuestionContent from "@/components/QuestionContent";
import { useSelection } from "@/lib/selection";
import type { QuestionsResponse, Question } from "@/lib/types";

export default function PaperPage() {
  const { selected, remove, clear, ready } = useSelection();
  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withAnswer, setWithAnswer] = useState(false);
  const [title, setTitle] = useState("统计学试卷");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/questions")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "加载失败");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // 按选择顺序取题
  const questions = useMemo<Question[]>(() => {
    if (!data) return [];
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    return selected.map((id) => byId.get(id)).filter(Boolean) as Question[];
  }, [data, selected]);

  async function downloadDocx() {
    setDownloading(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, withAnswer, title }),
      });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}${withAnswer ? "-含答案" : ""}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message || "导出失败");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* 工具栏（打印时隐藏） */}
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft /> 返回选题
            </Button>
          </Link>
          <div className="ml-1 flex items-center gap-2">
            <span className="text-xs text-slate-500">试卷标题</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 w-48"
            />
          </div>
          <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={withAnswer}
              onChange={(e) => setWithAnswer(e.target.checked)}
              className="size-4 accent-blue-600"
            />
            显示答案
          </label>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!questions.length}>
              <Printer /> 下载 PDF
            </Button>
            <Button size="sm" onClick={downloadDocx} disabled={!questions.length || downloading}>
              {downloading ? <Loader2 className="animate-spin" /> : <FileDown />} 下载 DOCX
            </Button>
          </div>
        </div>
        {questions.length > 0 && (
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pb-2 text-xs text-slate-500">
            <span>
              “下载 PDF” 将打开浏览器打印对话框，目标选择“另存为 PDF”即可，公式与图片保真。
            </span>
            <button onClick={clear} className="inline-flex items-center gap-1 hover:text-red-600">
              <Trash2 className="size-3.5" /> 清空全部
            </button>
          </div>
        )}
      </div>

      {/* 试卷正文 */}
      <div className="print-area mx-auto my-6 max-w-4xl rounded-lg border border-slate-200 bg-white px-10 py-8 shadow-sm">
        {error ? (
          <p className="py-10 text-center text-red-600">{error}</p>
        ) : !ready || !data ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 size-5 animate-spin" /> 加载中…
          </div>
        ) : questions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            尚未选择题目。
            <Link href="/" className="ml-1 text-blue-600 hover:underline">
              去选题
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 border-b border-slate-300 pb-4 text-center">
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">
                共 {questions.length} 题{withAnswer ? "（含答案）" : ""}
              </p>
            </div>

            <ol className="space-y-6">
              {questions.map((q, i) => (
                <li key={q.id} className="page-break">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs text-slate-400 no-print">
                        {q.chapterTitle} · {q.id}
                        <button
                          onClick={() => remove(q.id)}
                          className="ml-2 inline-flex items-center gap-0.5 text-red-500 hover:underline"
                        >
                          <X className="size-3" /> 移除
                        </button>
                      </div>
                      <QuestionContent text={q.content} chapterId={q.chapterId} />

                      {withAnswer && (
                        <div className="mt-2 rounded border border-green-200 bg-green-50/50 p-3">
                          <div className="mb-1 text-sm font-semibold text-green-700">答案</div>
                          {q.answer == null ? (
                            <p className="text-sm italic text-slate-400">（暂无答案）</p>
                          ) : q.answerIsImage ? (
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
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
