import { useEffect, useMemo, useRef, useState } from "react";
import { setLanguage, useLanguage } from "@stats-viz/shared/i18n";
import { pythonLessonUnits, pythonLessons } from "./lessons";
import { checkPythonCode, resetPythonSession, runPythonCode } from "./pyodideRuntime";
import { createMessageId, resolveCodeLearningContext } from "../code-learning/context";
import { loadLearningProgress, saveCodeLessonProgress } from "../course/progressStore";
import { LessonSidebar } from "../code-learning/LessonSidebar";
import "../r-learning/styles.css";
import "./styles.css";

type OutputTab = "console" | "plot" | "environment" | "review";
type EngineStatus = "idle" | "loading" | "ready" | "running" | "error";
type ReviewState = { kind: "idle" | "success" | "failure"; message: string };
type TutorMessage = { id: string; role: "user" | "assistant"; content: string };
type TutorStatus = "idle" | "asking" | "error";
type PythonObject = { name: string; type: string; preview: string };

const uiCopy = {
  zh: {
    brand: "Python 语言编程工作室",
    subtitle: "在浏览器中真实编写、运行与理解 Python",
    back: "返回主界面",
    progress: "学习进度",
    lessons: "课程",
    objective: "学习目标",
    task: "你的任务",
    editor: "Python 代码编辑器",
    run: "运行代码",
    check: "检查答案",
    reset: "重置代码",
    session: "清空 Python 会话",
    hint: "提示",
    solution: "参考解法",
    hide: "收起",
    console: "控制台",
    plot: "图形",
    environment: "环境",
    review: "检查结果",
    noOutput: "运行代码后，输出会显示在这里。",
    noPlot: "当前代码还没有生成图形。",
    noObjects: "运行代码后，这里会列出当前 Python 对象。",
    notChecked: "点击“检查答案”，系统会运行代码并验证创建的对象和计算结果。",
    loading: "正在加载浏览器 Python 环境，第一次需要一点时间…",
    ready: "Python 环境已就绪",
    running: "正在运行…",
    idle: "点击运行时加载 Python",
    failed: "代码已运行，但还没有满足本课全部要求。可以查看提示后再试一次。",
    runtimeError: "Python 运行失败。请根据控制台中的错误信息修改代码。",
    cleared: "Python 会话已清空。",
    next: "下一课",
    complete: "已完成",
    lines: "行",
    tutor: "AI Python 助教",
    tutorIntro: "我会结合当前题目、你的代码和最近一次运行结果回答。",
    tutorPlaceholder: "问报错原因、语法用法或下一步怎么改…",
    tutorSend: "发送",
    tutorThinking: "正在分析当前代码…",
    tutorError: "AI 助教暂时无法连接，请稍后再试。",
    contextAttached: "已附带：题目 · 当前代码 · 运行结果",
    explainError: "解释这个报错",
    nextStep: "给我下一步提示",
    explainConcept: "讲清本课概念",
    runtime: "运行结果",
  },
  en: {
    brand: "Python Coding Studio",
    subtitle: "Write, run, and understand real Python in your browser",
    back: "Back to home",
    progress: "Learning progress",
    lessons: "Lessons",
    objective: "Learning objective",
    task: "Your task",
    editor: "Python code editor",
    run: "Run code",
    check: "Check answer",
    reset: "Reset code",
    session: "Clear Python session",
    hint: "Hint",
    solution: "Reference solution",
    hide: "Hide",
    console: "Console",
    plot: "Plot",
    environment: "Environment",
    review: "Check result",
    noOutput: "Run your code and its output will appear here.",
    noPlot: "The current code has not produced a plot yet.",
    noObjects: "Run code to see the objects in the current Python environment.",
    notChecked: "Select Check answer to run the code and verify its objects and results.",
    loading: "Loading Python in your browser. The first run takes a moment…",
    ready: "Python is ready",
    running: "Running…",
    idle: "Python loads on first run",
    failed: "The code ran, but it does not meet every requirement yet. Open the hint and try again.",
    runtimeError: "Python could not run the code. Use the Console message to correct it.",
    cleared: "The Python session has been cleared.",
    next: "Next lesson",
    complete: "Complete",
    lines: "lines",
    tutor: "AI Python Tutor",
    tutorIntro: "I answer with the current task, your code, and the latest run attached.",
    tutorPlaceholder: "Ask about an error, syntax, or your next step…",
    tutorSend: "Send",
    tutorThinking: "Analyzing your current code…",
    tutorError: "The AI tutor is temporarily unavailable. Please try again.",
    contextAttached: "Attached: task · current code · run result",
    explainError: "Explain this error",
    nextStep: "Give me the next hint",
    explainConcept: "Explain this concept",
    runtime: "Run output",
  },
} as const;

function CodeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m18 15-9 9 9 9M30 15l9 9-9 9M27 9l-6 30" />
    </svg>
  );
}

function RunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 5 11 7-11 7z" />
    </svg>
  );
}

function ImagePlot({ url }: { url: string }) {
  return <img src={url} className="r-output-plot" alt="Python plot output" />;
}

function TutorAnswer({ content }: { content: string }) {
  const parts = content.split(/```(?:python|py)?\s*([\s\S]*?)```/gi);
  return (
    <div className="r-ai-tutor__answer">
      {parts.map((part, index) => index % 2 === 1
        ? <pre key={index}><code>{part.trim()}</code></pre>
        : part.trim() ? <p key={index}>{part.replace(/\*\*/g, "").trim()}</p> : null)}
    </div>
  );
}

export function PythonLearningWorkspace() {
  const language = useLanguage();
  const t = uiCopy[language];
  const [learningContext] = useState(() => resolveCodeLearningContext(window.location.search, pythonLessons));
  const [activeId, setActiveId] = useState(learningContext.lessonId);
  const [codes, setCodes] = useState<Record<string, string>>(() =>
    Object.fromEntries(pythonLessons.map((lesson) => [lesson.id, lesson.starterCode])),
  );
  const [completed, setCompleted] = useState<string[]>(() => {
    const validIds = new Set(pythonLessons.map(({ id }) => id));
    return loadLearningProgress().completedPythonLessons.filter((id) => validIds.has(id));
  });
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("idle");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [plot, setPlot] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<PythonObject[]>([]);
  const [outputTab, setOutputTab] = useState<OutputTab>("console");
  const [review, setReview] = useState<ReviewState>({ kind: "idle", message: "" });
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorStatus, setTutorStatus] = useState<TutorStatus>("idle");
  const lessonWorkspaceRef = useRef<HTMLElement>(null);
  const outputSidebarRef = useRef<HTMLElement>(null);
  const tutorMessagesRef = useRef<HTMLDivElement>(null);

  const activeLesson = useMemo(
    () => pythonLessons.find((lesson) => lesson.id === activeId) ?? pythonLessons[0],
    [activeId],
  );
  const code = codes[activeLesson.id] ?? activeLesson.starterCode;
  const isBusy = engineStatus === "loading" || engineStatus === "running";
  const progress = Math.round((completed.length / pythonLessons.length) * 100);

  useEffect(() => {
    saveCodeLessonProgress("python", completed, completed.includes(activeLesson.id) ? activeLesson.topicId : undefined, window.location.pathname + window.location.search);
  }, [activeLesson.topicId, completed]);

  useEffect(() => {
    const messages = tutorMessagesRef.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [tutorMessages, tutorStatus]);

  function selectLesson(id: string) {
    setActiveId(id);
    setShowHint(false);
    setShowSolution(false);
    setReview({ kind: "idle", message: "" });
    setConsoleLines([]);
    setPlot(null);
    setEnvironment([]);
    setOutputTab("console");
    setTutorPrompt("");
    setTutorMessages([]);
    setTutorStatus("idle");
    lessonWorkspaceRef.current?.scrollTo({ top: 0 });
    outputSidebarRef.current?.scrollTo({ top: 0 });
  }

  async function execute(shouldCheck: boolean) {
    setEngineStatus(engineStatus === "idle" ? "loading" : "running");
    setReview({ kind: "idle", message: "" });
    setConsoleLines([]);
    if (!shouldCheck) setOutputTab("console");

    try {
      const result = await runPythonCode(code);
      setEngineStatus("ready");
      setConsoleLines(result.console.length ? result.console : ["Code completed without printed output."]);
      setPlot(result.plotUrl);
      setEnvironment(result.environment);

      if (result.plotUrl && !shouldCheck) setOutputTab("plot");
      if (shouldCheck) {
        const passed = await checkPythonCode(activeLesson.checkCode);
        if (passed) {
          setCompleted((current) => current.includes(activeLesson.id) ? current : [...current, activeLesson.id]);
          setReview({ kind: "success", message: activeLesson.success[language] });
        } else {
          setReview({ kind: "failure", message: t.failed });
        }
        setOutputTab("review");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setEngineStatus("error");
      setConsoleLines([message]);
      setReview({ kind: "failure", message: t.runtimeError });
      setOutputTab("console");
    }
  }

  async function clearSession() {
    setEngineStatus(engineStatus === "idle" ? "loading" : "running");
    try {
      await resetPythonSession();
      setEngineStatus("ready");
      setConsoleLines([t.cleared]);
      setPlot(null);
      setEnvironment([]);
      setReview({ kind: "idle", message: "" });
      setOutputTab("console");
    } catch (error) {
      setEngineStatus("error");
      setConsoleLines([error instanceof Error ? error.message : String(error)]);
    }
  }

  async function askTutor(suggestedQuestion?: string) {
    const question = (suggestedQuestion ?? tutorPrompt).trim();
    if (!question || tutorStatus === "asking") return;

    const userMessage: TutorMessage = { id: createMessageId(), role: "user", content: question };
    const history = tutorMessages.map(({ role, content }) => ({ role, content }));
    setTutorMessages((current) => [...current, userMessage]);
    setTutorPrompt("");
    setTutorStatus("asking");

    try {
      const response = await fetch("/st-qselector/api/ai/python-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: activeLesson.topicId,
          lessonId: activeLesson.id,
          learningObjective: activeLesson.objective[language],
          currentParameters: learningContext.currentParameters,
          currentCode: code,
          consoleOutput: consoleLines,
          chartSummary: plot ? "The latest run produced a Python plot." : "No plot has been produced.",
          language,
          question,
          lesson: {
            title: activeLesson.title[language],
            objective: activeLesson.objective[language],
            task: activeLesson.task[language],
            concepts: activeLesson.concepts,
          },
          code,
          console: consoleLines,
          review: review.message,
          history,
        }),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error || "AI request failed");
      setTutorMessages((current) => [
        ...current,
        { id: createMessageId(), role: "assistant", content: payload.answer as string },
      ]);
      setTutorStatus("idle");
    } catch {
      setTutorMessages((current) => [
        ...current,
        { id: createMessageId(), role: "assistant", content: t.tutorError },
      ]);
      setTutorStatus("error");
    }
  }

  const engineLabel = engineStatus === "loading"
    ? t.loading
    : engineStatus === "running"
      ? t.running
      : engineStatus === "ready"
        ? t.ready
        : engineStatus === "error"
          ? t.runtimeError
          : t.idle;

  return (
    <main className="r-learning-shell python-learning-shell">
      <header className="r-learning-header">
        <div className="r-learning-brand">
          <span className="r-learning-brand__mark"><CodeIcon /></span>
          <span>
            <small>STATMIND · PYTHON LAB</small>
            <strong>{t.brand}</strong>
            <em>{t.subtitle}</em>
          </span>
        </div>

        <div className="r-learning-progress" aria-label={`${t.progress}: ${progress}%`}>
          <span><b>{completed.length}</b> / {pythonLessons.length} {t.complete}</span>
          <i><b style={{ width: `${progress}%` }} /></i>
        </div>

        <nav className="r-learning-utility">
          <a href={learningContext.returnTo}>← {t.back}</a>
          <div className="r-language-tabs" role="group" aria-label="Language">
            <button type="button" data-active={language === "zh"} onClick={() => setLanguage("zh")}>中文</button>
            <button type="button" data-active={language === "en"} onClick={() => setLanguage("en")}>English</button>
          </div>
        </nav>
      </header>

      <div className="r-learning-layout">
        <LessonSidebar label={t.lessons} lessons={pythonLessons} units={pythonLessonUnits} activeLessonId={activeLesson.id} completedLessonIds={completed} onSelect={selectLesson} />

        <section ref={lessonWorkspaceRef} className="r-lesson-workspace">
          <article className="r-lesson-brief">
            <div className="r-lesson-brief__heading">
              <div>
                <p>{activeLesson.eyebrow[language]}</p>
                <h1>{activeLesson.title[language]}</h1>
              </div>
              <div className="r-concept-tags">
                {activeLesson.concepts.map((concept) => <span key={concept}>{concept}</span>)}
              </div>
            </div>

            <div className="r-lesson-brief__grid">
              <section>
                <small>{t.objective}</small>
                <p>{activeLesson.objective[language]}</p>
              </section>
              <section>
                <small>{t.task}</small>
                <p>{activeLesson.task[language]}</p>
              </section>
            </div>
            <p className="r-lesson-explanation">{activeLesson.explanation[language]}</p>
          </article>

          <section className="r-editor-card">
            <header className="r-editor-toolbar">
              <div>
                <span className="r-editor-dots" aria-hidden="true"><i /><i /><i /></span>
                <strong>{t.editor}</strong>
                <small>{code.split("\n").length} {t.lines}</small>
              </div>
              <span className="r-engine-status" data-status={engineStatus}>
                <i /> {engineLabel}
              </span>
            </header>

            <div className="r-code-editor">
              <div className="r-code-lines" aria-hidden="true">
                {code.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}
              </div>
              <textarea
                value={code}
                onChange={(event) => setCodes((current) => ({ ...current, [activeLesson.id]: event.target.value }))}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void execute(false);
                  }
                }}
                spellCheck={false}
                aria-label={t.editor}
              />
            </div>

            <footer className="r-editor-actions">
              <div className="r-editor-actions__primary">
                <button type="button" className="r-button r-button--run" disabled={isBusy} onClick={() => void execute(false)}>
                  <RunIcon /> {t.run}
                </button>
                <button type="button" className="r-button r-button--check" disabled={isBusy} onClick={() => void execute(true)}>
                  ✓ {t.check}
                </button>
              </div>
              <div className="r-editor-actions__secondary">
                <button type="button" disabled={isBusy} onClick={() => setCodes((current) => ({ ...current, [activeLesson.id]: activeLesson.starterCode }))}>{t.reset}</button>
                <button type="button" disabled={isBusy} onClick={() => void clearSession()}>{t.session}</button>
              </div>
            </footer>
          </section>

          <div className="r-assistance-grid">
            <section className="r-assistance-card">
              <button type="button" onClick={() => setShowHint((value) => !value)}>
                <span>?</span><strong>{t.hint}</strong><b>{showHint ? "−" : "+"}</b>
              </button>
              {showHint && <p>{activeLesson.hint[language]}</p>}
            </section>
            <section className="r-assistance-card">
              <button type="button" onClick={() => setShowSolution((value) => !value)}>
                <span>Py</span><strong>{t.solution}</strong><b>{showSolution ? "−" : "+"}</b>
              </button>
              {showSolution && <pre>{activeLesson.solution}</pre>}
            </section>
          </div>
        </section>

        <aside ref={outputSidebarRef} className="r-output-sidebar">
          <section className="r-ai-tutor" aria-label={t.tutor}>
            <header>
              <span>AI</span>
              <div><strong>{t.tutor}</strong><small>{t.contextAttached}</small></div>
              <i data-status={tutorStatus} />
            </header>

            <div ref={tutorMessagesRef} className="r-ai-tutor__messages" aria-live="polite">
              {!tutorMessages.length ? (
                <div className="r-ai-tutor__intro">
                  <strong>{activeLesson.title[language]}</strong>
                  <p>{t.tutorIntro}</p>
                  <div>
                    {consoleLines.length > 0 && engineStatus === "error" ? (
                      <button type="button" onClick={() => void askTutor(t.explainError)}>{t.explainError}</button>
                    ) : null}
                    <button type="button" onClick={() => void askTutor(t.nextStep)}>{t.nextStep}</button>
                    <button type="button" onClick={() => void askTutor(t.explainConcept)}>{t.explainConcept}</button>
                  </div>
                </div>
              ) : tutorMessages.map((message) => (
                <article key={message.id} data-role={message.role}>
                  <small>{message.role === "user" ? (language === "zh" ? "你" : "You") : "AI"}</small>
                  {message.role === "assistant" ? <TutorAnswer content={message.content} /> : <p>{message.content}</p>}
                </article>
              ))}
              {tutorStatus === "asking" ? <div className="r-ai-tutor__thinking"><i /><span>{t.tutorThinking}</span></div> : null}
            </div>

            <form
              className="r-ai-tutor__composer"
              onSubmit={(event) => {
                event.preventDefault();
                void askTutor();
              }}
            >
              <textarea
                value={tutorPrompt}
                onChange={(event) => setTutorPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void askTutor();
                  }
                }}
                rows={2}
                placeholder={t.tutorPlaceholder}
                aria-label={t.tutorPlaceholder}
              />
              <button type="submit" disabled={!tutorPrompt.trim() || tutorStatus === "asking"} aria-label={t.tutorSend}>↑</button>
            </form>
          </section>

          <div className="r-output-heading"><strong>{t.runtime}</strong><small>Pyodide · local</small></div>
          <div className="r-output-tabs" role="tablist" aria-label="Python output">
            {(["console", "plot", "environment", "review"] as OutputTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={outputTab === tab}
                data-active={outputTab === tab}
                onClick={() => setOutputTab(tab)}
              >
                {t[tab]}
                {tab === "plot" && plot ? <i /> : null}
                {tab === "review" && review.kind !== "idle" ? <i data-kind={review.kind} /> : null}
              </button>
            ))}
          </div>

          <section className="r-output-panel" role="tabpanel">
            {outputTab === "console" && (
              consoleLines.length ? (
                <pre className="r-console"><span>&gt; </span>{consoleLines.join("\n")}</pre>
              ) : <div className="r-empty-output"><CodeIcon /><p>{t.noOutput}</p><small>Cmd / Ctrl + Enter</small></div>
            )}
            {outputTab === "plot" && (
              plot ? <ImagePlot url={plot} /> : <div className="r-empty-output"><span className="r-empty-output__plot">⌁</span><p>{t.noPlot}</p></div>
            )}
            {outputTab === "environment" && (
              environment.length ? (
                <ul className="r-environment-list">
                  {environment.map((object) => (
                    <li key={object.name}>
                      <span>Py</span>
                      <code>{object.name}</code>
                      <small>{object.type} · {object.preview}</small>
                    </li>
                  ))}
                </ul>
              ) : <div className="r-empty-output"><span className="r-empty-output__plot">{`{ }`}</span><p>{t.noObjects}</p></div>
            )}
            {outputTab === "review" && (
              review.kind === "idle" ? (
                <div className="r-empty-output"><span className="r-empty-output__plot">✓</span><p>{t.notChecked}</p></div>
              ) : (
                <div className="r-review-result" data-kind={review.kind}>
                  <span>{review.kind === "success" ? "✓" : "!"}</span>
                  <strong>{review.kind === "success" ? t.complete : t.check}</strong>
                  <p>{review.message}</p>
                  {review.kind === "success" && activeLesson.order < pythonLessons.length ? (
                    <button type="button" onClick={() => selectLesson(pythonLessons[activeLesson.order].id)}>{t.next} →</button>
                  ) : null}
                </div>
              )
            )}
          </section>

        </aside>
      </div>
    </main>
  );
}

export default PythonLearningWorkspace;
