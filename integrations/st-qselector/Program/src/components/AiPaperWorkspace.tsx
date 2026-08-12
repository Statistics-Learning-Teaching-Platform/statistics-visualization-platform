"use client";

import React, { useMemo, useRef, useState } from "react";
import { Check, FileUp, Loader2, Sparkles, WandSparkles } from "lucide-react";
import QuestionContent from "@/components/QuestionContent";
import type { Question } from "@/lib/types";
import {
  evaluatePaperQuality,
  type KnowledgePointDraft,
  type PaperBlueprint,
  type PaperQualityReport,
} from "@/lib/blueprint";
import { withBasePath } from "@/lib/base-path";

interface AiPaperWorkspaceProps {
  availableTypes: string[];
  selectedIds: string[];
  selectedQuestions: Question[];
  onAdd: (ids: string[], generated?: Question[]) => void;
  onReplace: (ids: string[], generated?: Question[]) => void;
}

interface KnowledgeResponse {
  concepts?: Array<{ id: string; label: string; confidence: number; evidence: string }>;
  mode?: "ai" | "local";
  warning?: string;
  error?: string;
}

interface HybridCandidate {
  ids: string[];
  questions: Question[];
  generatedQuestions: Question[];
  report: PaperQualityReport;
  sources: { bank: number; variant: number; generated: number };
}

function normalizedConceptKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "");
}

function prepareConcepts(
  concepts: Array<{ id: string; label: string; confidence: number; evidence: string }>,
): KnowledgePointDraft[] {
  const usedIds = new Set<string>();
  const usedLabels = new Set<string>();
  const prepared: KnowledgePointDraft[] = [];

  for (const concept of concepts) {
    const label = concept.label.trim();
    const labelKey = normalizedConceptKey(label);
    if (!label || !labelKey || usedLabels.has(labelKey)) continue;

    const baseId = normalizedConceptKey(concept.id) || `concept-${labelKey}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;

    usedIds.add(id);
    usedLabels.add(labelKey);
    prepared.push({ ...concept, id, label, selected: true, weight: 1 });
  }

  return prepared;
}

function stars(value: number): string {
  return "★".repeat(value) + "☆".repeat(Math.max(0, 5 - value));
}

function QualityReport({ report, title }: { report: PaperQualityReport; title: string }) {
  return (
    <section className="qb-ai-report" aria-label={title}>
      <div className="qb-ai-report__header">
        <div>
          <span>{title}</span>
          <strong>{report.overall}<small>/100</small></strong>
        </div>
        <div className="qb-ai-stars" aria-label={`${report.stars} 星`}>{stars(report.stars)}</div>
      </div>
      <div className="qb-ai-report__dimensions">
        {report.dimensions.map((dimension) => (
          <div key={dimension.id} title={dimension.detail}>
            <span>{dimension.label}</span>
            <i><b style={{ width: `${dimension.score}%` }} /></i>
            <em>{dimension.score}</em>
          </div>
        ))}
      </div>
      <p>{report.comment}</p>
    </section>
  );
}

export default function AiPaperWorkspace({
  availableTypes,
  selectedIds,
  selectedQuestions,
  onAdd,
  onReplace,
}: AiPaperWorkspaceProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceText, setSourceText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [concepts, setConcepts] = useState<KnowledgePointDraft[]>([]);
  const [manualConcept, setManualConcept] = useState("");
  const [targetCount, setTargetCount] = useState(20);
  const [targetDifficulty, setTargetDifficulty] = useState(3);
  const [types, setTypes] = useState<string[]>([]);
  const [variantPercent, setVariantPercent] = useState(30);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<"ai" | "local" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<HybridCandidate | null>(null);

  const blueprint: PaperBlueprint = useMemo(() => ({
    targetCount,
    targetDifficulty,
    types,
    knowledgePoints: concepts,
  }), [concepts, targetCount, targetDifficulty, types]);
  const currentReport = useMemo(
    () => selectedQuestions.length ? evaluatePaperQuality(selectedQuestions, blueprint) : null,
    [blueprint, selectedQuestions],
  );

  async function analyzeMaterial() {
    if (!sourceText.trim() && !file) {
      setMessage("请上传课件，或者输入课程大纲与考试目标。");
      return;
    }
    setAnalyzing(true);
    setMessage(null);
    setCandidate(null);
    try {
      const form = new FormData();
      if (sourceText.trim()) form.set("text", sourceText.trim());
      if (file) form.set("file", file);
      const response = await fetch(withBasePath("/api/ai/knowledge"), { method: "POST", body: form });
      const result = await response.json() as KnowledgeResponse;
      if (!response.ok) throw new Error(result.error || "课件分析失败");
      const next = prepareConcepts(result.concepts ?? []);
      setConcepts(next);
      setAnalysisMode(result.mode ?? "local");
      setMessage(result.warning || `已提取 ${next.length} 个知识点，请教师确认。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "课件分析失败");
    } finally {
      setAnalyzing(false);
    }
  }

  function addManualConcept() {
    const label = manualConcept.trim();
    if (!label) return;
    setConcepts((previous) => {
      const labelKey = normalizedConceptKey(label);
      if (previous.some((point) => normalizedConceptKey(point.label) === labelKey)) return previous;
      const usedIds = new Set(previous.map((point) => point.id));
      const baseId = `manual-${labelKey}`;
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
      return [...previous, { id, label, selected: true, weight: 1, confidence: 1, evidence: "教师手动添加" }];
    });
    setManualConcept("");
    setCandidate(null);
  }

  async function generateCandidate() {
    if (!concepts.some((point) => point.selected)) {
      setMessage("请先确认至少一个需要考查的知识点。");
      return;
    }
    setGenerating(true);
    setCandidate(null);
    setMessage(null);
    try {
      const response = await fetch(withBasePath("/api/ai/paper"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint, variantPercent }),
      });
      const result = await response.json() as HybridCandidate & { error?: string };
      if (!response.ok) throw new Error(result.error || "AI 组卷失败");
      setCandidate(result);
      setMessage(`已生成 ${result.sources.bank + result.sources.variant + result.sources.generated} 个选题单元：题库 ${result.sources.bank}、母题变式 ${result.sources.variant}、全新生成 ${result.sources.generated}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 组卷失败");
    } finally {
      setGenerating(false);
    }
  }

  async function applyCandidate(mode: "replace" | "add") {
    if (!candidate) return;
    setApplying(true);
    try {
      let ids = candidate.ids;
      let transient = candidate.generatedQuestions;
      if (candidate.generatedQuestions.length) {
        const response = await fetch(withBasePath("/api/questions/import-generated"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: candidate.generatedQuestions }),
        });
        const result = await response.json() as { imported?: number; reused?: number; idMap?: Record<string, string>; persisted?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error || "AI 题目入库失败");
        const idMap = result.idMap ?? {};
        ids = candidate.ids.map((id) => idMap[id] ?? id);
        transient = candidate.generatedQuestions.filter((question) => (idMap[question.id] ?? question.id) === question.id);
        setMessage(result.persisted === false
          ? `试卷已采用；${result.imported ?? 0} 道 AI 题已保存到本浏览器题库，${result.reused ?? 0} 道与现有题重复并复用原题。`
          : `试卷已采用；${result.imported ?? 0} 道 AI 题已写入正式题库，${result.reused ?? 0} 道与现有题重复并复用原题。`);
      } else {
        setMessage("试卷已采用，本次全部使用已审核题库原题。");
      }
      if (mode === "replace") onReplace(ids, transient);
      else onAdd(ids, transient);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "应用候选试卷失败");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="qb-ai-workspace" id="ai-paper-workspace">
      <header className="qb-ai-workspace__header">
        <div>
          <span><Sparkles /> AI 辅助层 · 与传统筛选共用同一试卷篮</span>
          <h2>统一组卷蓝图</h2>
          <p>题库原题优先；数量不足时生成母题变式，缺失知识点时生成全新题。教师采用后 AI 题才进入正式题库。</p>
        </div>
      </header>

      <div className="qb-ai-steps" aria-label="智能组卷流程">
        <span data-done={Boolean(sourceText || file)}><b>1</b> 导入资料</span>
        <span data-done={concepts.length > 0}><b>2</b> 确认知识点</span>
        <span data-done={Boolean(candidate)}><b>3</b> 生成方案</span>
        <span data-done={selectedIds.length > 0}><b>4</b> 质量诊断</span>
      </div>

      <div className="qb-ai-grid">
        <div className="qb-ai-builder">
          <section className="qb-ai-section">
            <div className="qb-ai-section__title"><span>01</span><div><h3>导入课件或考试目标</h3><p>支持 PDF、PPTX、DOCX、TXT、Markdown</p></div></div>
            <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="例如：本次考试重点考查 confidence intervals、one-sample hypothesis testing 和 linear regression，侧重计算与解释……" />
            <div className="qb-ai-upload-row">
              <input ref={fileRef} hidden type="file" accept=".pdf,.pptx,.docx,.txt,.md,.markdown" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()}><FileUp /> {file ? file.name : "选择课件"}</button>
              {file && <button type="button" className="qb-ai-text-button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>移除</button>}
              <button type="button" className="qb-ai-primary" onClick={analyzeMaterial} disabled={analyzing}>
                {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles />} {analyzing ? "正在分析" : "提取知识点"}
              </button>
            </div>
            {analysisMode && <div className="qb-ai-mode"><Check /> {analysisMode === "ai" ? "AI 已连接并完成提取" : "当前使用本地规则提取，可配置服务端 API Key 启用 AI"}</div>}
          </section>

          <section className="qb-ai-section">
            <div className="qb-ai-section__title"><span>02</span><div><h3>教师确认知识点</h3><p>关闭不需要考查的概念，并调整权重</p></div></div>
            <div className="qb-ai-concepts">
              {concepts.map((point) => (
                <article key={point.id} data-selected={point.selected}>
                  <button type="button" onClick={() => { setConcepts((previous) => previous.map((item) => item.id === point.id ? { ...item, selected: !item.selected } : item)); setCandidate(null); }}>
                    <span>{point.selected && <Check />}</span><strong>{point.label}</strong>
                  </button>
                  <small>{point.evidence}</small>
                  <label>权重 <input type="range" min="0.5" max="2" step="0.25" value={point.weight} onChange={(event) => { const weight = Number(event.target.value); setConcepts((previous) => previous.map((item) => item.id === point.id ? { ...item, weight } : item)); setCandidate(null); }} /><em>{point.weight.toFixed(2)}</em></label>
                </article>
              ))}
              {concepts.length === 0 && <p className="qb-ai-placeholder">上传课件或手动添加知识点后，会在这里形成可编辑的考查清单。</p>}
            </div>
            <div className="qb-ai-manual-concept">
              <input value={manualConcept} onChange={(event) => setManualConcept(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addManualConcept(); }} placeholder="手动添加知识点，例如 confidence interval" />
              <button type="button" onClick={addManualConcept}>添加</button>
            </div>
          </section>

          <section className="qb-ai-section">
            <div className="qb-ai-section__title"><span>03</span><div><h3>设置组卷约束</h3><p>AI 建议和手动筛选最终汇入同一蓝图</p></div></div>
            <div className="qb-ai-controls">
              <label><span>题目数量</span><input type="number" min="1" max="60" value={targetCount} onChange={(event) => { setTargetCount(Number(event.target.value)); setCandidate(null); }} /></label>
              <label><span>目标难度</span><input type="range" min="1" max="5" step="1" value={targetDifficulty} onChange={(event) => { setTargetDifficulty(Number(event.target.value)); setCandidate(null); }} /><em>{"★".repeat(targetDifficulty)}</em></label>
              <label><span>母题变式/新题比例</span><input type="range" min="0" max="70" step="10" value={variantPercent} onChange={(event) => { setVariantPercent(Number(event.target.value)); setCandidate(null); }} /><em>{variantPercent}%</em></label>
            </div>
            <div className="qb-ai-type-grid">
              {availableTypes.map((type) => (
                <button key={type} type="button" data-selected={types.includes(type)} onClick={() => { setTypes((previous) => previous.includes(type) ? previous.filter((item) => item !== type) : [...previous, type]); setCandidate(null); }}>
                  {types.includes(type) && <Check />} {type}
                </button>
              ))}
            </div>
            <button type="button" className="qb-ai-generate" onClick={generateCandidate} disabled={generating}>
              {generating ? <Loader2 className="animate-spin" /> : <WandSparkles />} {generating ? "正在匹配题库并校验新题" : "根据蓝图生成候选试卷"}
            </button>

            {candidate && (
              <section className="qb-ai-candidate-preview" aria-label="候选试卷题目">
                <header>
                  <div>
                    <span>生成方案</span>
                    <h3>候选试卷题目</h3>
                  </div>
                  <strong>{candidate.questions.length}<small> 题</small></strong>
                </header>
                <p className="qb-ai-candidate-preview__hint">先逐题查看题干和答案，再决定替换或加入当前试卷。</p>
                <div className="qb-ai-candidate-list">
                  {candidate.questions.map((question, index) => (
                    <article key={question.id} className="qb-ai-candidate-question">
                      <div className="qb-ai-candidate-question__meta">
                        <b>{String(index + 1).padStart(2, "0")}</b>
                        <span data-origin={question.origin ?? "bank"}>
                          {question.origin === "variant"
                            ? "AI 母题变式"
                            : question.origin === "generated"
                              ? "AI 全新生成"
                              : "题库原题"}
                        </span>
                        <em>{question.type}</em>
                        <em>{"★".repeat(Math.max(1, Math.min(5, question.difficulty)))}</em>
                      </div>
                      <QuestionContent text={question.content} chapterId={question.chapterId} className="qb-ai-candidate-question__content" />
                      {question.answer && (
                        <details>
                          <summary>查看答案与解析</summary>
                          <QuestionContent text={question.answer} chapterId={question.chapterId} />
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>
        </div>

        <aside className="qb-ai-summary">
          <section className="qb-ai-summary-card">
            <span>当前蓝图</span>
            <strong>{targetCount}<small> 题</small></strong>
            <dl>
              <div><dt>目标知识点</dt><dd>{concepts.filter((point) => point.selected).length}</dd></div>
              <div><dt>目标难度</dt><dd>{"★".repeat(targetDifficulty)}</dd></div>
              <div><dt>目标题型</dt><dd>{types.length || "不限"}</dd></div>
              <div><dt>当前已选</dt><dd>{selectedIds.length}</dd></div>
            </dl>
          </section>
          {message && <p className="qb-ai-message">{message}</p>}
          {candidate && (
            <>
              <div className="qb-ai-source-summary">
                <span><b>{candidate.sources.bank}</b>题库原题</span>
                <span><b>{candidate.sources.variant}</b>母题变式</span>
                <span><b>{candidate.sources.generated}</b>全新生成</span>
              </div>
              <QualityReport report={candidate.report} title="候选试卷质量" />
              <div className="qb-ai-apply">
                <button type="button" disabled={applying} onClick={() => applyCandidate("replace")}>{applying ? "正在入库…" : "替换当前试卷"}</button>
                <button type="button" disabled={applying} onClick={() => applyCandidate("add")}>{applying ? "正在入库…" : "加入当前试卷"}</button>
              </div>
            </>
          )}
          {!candidate && currentReport && <QualityReport report={currentReport} title="当前试卷诊断" />}
          {!candidate && !currentReport && <div className="qb-ai-empty-report"><Sparkles /><strong>质量报告将在这里出现</strong><p>生成候选方案或选择题目后，系统会评价知识覆盖、难度、题型、答案可靠性与重复度。</p></div>}
        </aside>
      </div>
    </section>
  );
}
