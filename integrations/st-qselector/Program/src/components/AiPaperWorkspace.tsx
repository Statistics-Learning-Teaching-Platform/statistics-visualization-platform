"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileUp, Loader2, RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import QuestionContent from "@/components/QuestionContent";
import type { Question } from "@/lib/types";
import {
  evaluatePaperQuality,
  createPaperBlueprint,
  type KnowledgePointDraft,
  type PaperBlueprint,
  type PaperQualityReport,
} from "@/lib/blueprint";
import { authenticatedFetch } from "@/lib/auth/client";

interface AiPaperWorkspaceProps {
  availableTypes: string[];
  selectedIds: string[];
  selectedQuestions: Question[];
  onAdd: (ids: string[], generated?: Question[]) => void;
  onReplace: (ids: string[], generated?: Question[]) => void;
}

interface AiModelOption {
  key: string;
  displayName: string;
  quantization: string;
  params: string;
  loaded: boolean;
  legacy?: boolean;
  selectable?: boolean;
}

const AI_MODEL_STORAGE_KEY = "stat_tutor_model";

function isLegacyAiModel(model: AiModelOption) {
  return model.legacy === true || /^lfm/i.test(model.key);
}

function isSelectableAiModel(model: AiModelOption) {
  return model.selectable !== false && !isLegacyAiModel(model);
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
  warning?: string;
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
  const [estimatedMinutes, setEstimatedMinutes] = useState(90);
  const [types, setTypes] = useState<string[]>([]);
  const [variantPercent, setVariantPercent] = useState(30);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<"ai" | "local" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<HybridCandidate | null>(null);
  const [acceptedCandidateIds, setAcceptedCandidateIds] = useState<Set<string>>(new Set());
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
  const [aiModelsStatus, setAiModelsStatus] = useState<"idle" | "loading" | "error">("idle");
  // Read browser storage after hydration. Client components can still be
  // rendered on the server, where `window` is unavailable.
  const [aiModel, setAiModel] = useState("");
  const aiModelsAbortRef = useRef<AbortController | null>(null);

  // Fetches the currently online models. All state updates happen inside
  // promise callbacks so callers (including effects) never trigger a
  // synchronous setState.
  function scanAiModels(): Promise<void> {
    aiModelsAbortRef.current?.abort();
    const controller = new AbortController();
    aiModelsAbortRef.current = controller;
    return authenticatedFetch("/api/ai/models", { method: "GET", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { models?: AiModelOption[]; error?: string };
        if (!response.ok || !Array.isArray(result.models)) throw new Error(result.error || "在线模型获取失败");
        const models = result.models;
        setAiModels(models);
        setAiModel((current) =>
          current && models.some((model) => model.key === current && isSelectableAiModel(model)) ? current : "",
        );
        setAiModelsStatus("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAiModelsStatus("error");
      });
  }

  function refreshAiModels() {
    setAiModelsStatus("loading");
    void scanAiModels();
  }

  function changeAiModel(key: string) {
    const selected = aiModels.find((model) => model.key === key);
    if (selected && !isSelectableAiModel(selected)) return;
    setAiModel(key);
    window.localStorage.setItem(AI_MODEL_STORAGE_KEY, key);
  }

  // Scan the online models when the workspace mounts; the selection is
  // restored from localStorage and dropped again if it goes offline.
  useEffect(() => {
    const storedModel = window.localStorage.getItem(AI_MODEL_STORAGE_KEY) ?? "";
    let active = true;
    // Defer the state update to the external-read callback so hydration does
    // not perform a synchronous effect update.
    Promise.resolve().then(() => {
      if (active) setAiModel(storedModel);
    });
    void scanAiModels();
    return () => {
      active = false;
      aiModelsAbortRef.current?.abort();
    };
  }, []);

  const blueprint: PaperBlueprint = useMemo(() => createPaperBlueprint({
    learningObjectives: concepts.filter((point) => point.selected).map((point) => point.label),
    topicWeights: Object.fromEntries(concepts.filter((point) => point.selected).map((point) => [point.id, point.weight])),
    questionTypeCounts: Object.fromEntries(types.map((type) => [type, Math.max(1, Math.floor(targetCount / Math.max(types.length, 1)))])),
    difficultyDistribution: { [targetDifficulty]: targetCount },
    totalQuestions: targetCount,
    estimatedMinutes,
    targetDifficulty,
    types,
    knowledgePoints: concepts,
  }), [concepts, estimatedMinutes, targetCount, targetDifficulty, types]);
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
      if (aiModel) form.set("model", aiModel);
      const response = await authenticatedFetch("/api/ai/knowledge", { method: "POST", body: form });
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
      const response = await authenticatedFetch("/api/ai/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint, variantPercent, model: aiModel || undefined }),
      });
      const result = await response.json() as HybridCandidate & { error?: string };
      if (!response.ok) throw new Error(result.error || "AI 组卷失败");
      setCandidate(result);
      setAcceptedCandidateIds(new Set(result.questions.filter((question) => (question.origin ?? "bank") === "bank").map((question) => question.id)));
      const summary = `已生成 ${result.sources.bank + result.sources.variant + result.sources.generated} 个选题单元：题库 ${result.sources.bank}、母题变式 ${result.sources.variant}、全新生成 ${result.sources.generated}。`;
      setMessage(result.warning ? `${result.warning} ${summary}` : summary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 组卷失败");
    } finally {
      setGenerating(false);
    }
  }

  async function applyCandidate(mode: "replace" | "add") {
    if (!candidate) return;
    const acceptedQuestions = candidate.questions.filter((question) => acceptedCandidateIds.has(question.id));
    if (!acceptedQuestions.length) {
      setMessage("请至少确认一道候选题后再采用试卷。");
      return;
    }
    setApplying(true);
    try {
      let ids = acceptedQuestions.map((question) => question.id);
      const acceptedGenerated = candidate.generatedQuestions.filter((question) => acceptedCandidateIds.has(question.id));
      let transient = acceptedGenerated;
      if (acceptedGenerated.length) {
        const response = await authenticatedFetch("/api/questions/import-generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: acceptedGenerated.map((question) => question.id) }),
        });
        const result = await response.json() as { imported?: number; reused?: number; idMap?: Record<string, string>; questions?: Question[]; persisted?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error || "AI 题目入库失败");
        const idMap = result.idMap ?? {};
        ids = ids.map((id) => idMap[id] ?? id);
        transient = Array.isArray(result.questions) ? result.questions : [];
        setMessage(`试卷已采用；${result.imported ?? 0} 道 AI 题已写入当前账号的待审核区，${result.reused ?? 0} 道与正式题库重复并复用原题。`);
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
          <p>题库原题优先；数量不足时生成母题变式，缺失知识点时生成全新题。AI 二次校验不等同于独立人工审核，采用后只进入当前账号的待审核区。</p>
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
              <label><span>题目数量</span><input type="number" min="1" max="60" value={targetCount} onChange={(event) => { setTargetCount(Math.max(1, Math.min(60, Number(event.target.value) || 1))); setCandidate(null); }} /></label>
              <label><span>目标难度</span><input type="range" min="1" max="5" step="1" value={targetDifficulty} onChange={(event) => { setTargetDifficulty(Number(event.target.value)); setCandidate(null); }} /><em>{"★".repeat(targetDifficulty)}</em></label>
              <label><span>预计完成时间</span><input type="number" min="10" max="300" value={estimatedMinutes} onChange={(event) => { setEstimatedMinutes(Number(event.target.value)); setCandidate(null); }} /><em>分钟</em></label>
              <label><span>母题变式/新题比例</span><input type="range" min="0" max="70" step="10" value={variantPercent} onChange={(event) => { setVariantPercent(Number(event.target.value)); setCandidate(null); }} /><em>{variantPercent}%</em></label>
            </div>
            <div className="qb-ai-model-picker">
              <label htmlFor="qb-ai-model">AI 模型</label>
              <div className="qb-ai-model-picker__controls">
                <select id="qb-ai-model" value={aiModel} onChange={(event) => changeAiModel(event.target.value)} disabled={aiModelsStatus === "loading"}>
                  <option value="">默认模型（服务器配置）</option>
                  {aiModels.map((model) => (
                    <option key={model.key} value={model.key} disabled={!isSelectableAiModel(model)}>
                      {model.displayName}{model.quantization ? ` · ${model.quantization}` : ""}{model.loaded ? " · 已加载" : ""}
                      {!isSelectableAiModel(model) ? " · 已停用" : ""}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={refreshAiModels} disabled={aiModelsStatus === "loading"} aria-label="重新扫描在线模型" title="重新扫描在线模型">
                  {aiModelsStatus === "loading" ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                </button>
              </div>
              {aiModelsStatus === "error" ? <p className="qb-ai-model-picker__hint">在线模型获取失败，点击右侧按钮重试。</p> : null}
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
                      <label className="qb-ai-candidate-question__accept">
                        <input
                          type="checkbox"
                          checked={acceptedCandidateIds.has(question.id)}
                          onChange={() => setAcceptedCandidateIds((current) => {
                            const next = new Set(current);
                            if (next.has(question.id)) next.delete(question.id); else next.add(question.id);
                            return next;
                          })}
                        />
                        {question.origin === "bank" ? "采用已审核原题" : "教师确认采用此候选题"}
                      </label>
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
              <div><dt>预计时间</dt><dd>{estimatedMinutes} 分钟</dd></div>
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
