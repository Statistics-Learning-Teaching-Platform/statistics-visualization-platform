import { useLanguage } from "@stats-viz/shared/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { portalLoginUrl, usePortalSession } from "../auth/session";
import { authenticatedFetch } from "../authenticatedFetch";
import { createMessageId, resolveCodeLearningContext } from "../code-learning/context";
import { EditorialLearningWorkspace } from "../code-learning/EditorialLearningWorkspace";
import { loadLearningProgress, saveCodeLessonProgress } from "../course/progressStore";
import { pythonLessons } from "./lessons";
import {
  checkPythonCode,
  disposePythonRuntime,
  resetPythonSession,
  runPythonCode,
} from "./pyodideRuntime";

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
    tutorLoginTitle: "AI 助教需要登录",
    tutorLoginBody: "AI 助教按账号提供并有用量限制。登录后即可结合当前题目、代码与运行结果提问。",
    tutorLoginAction: "前往登录",
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
    failed:
      "The code ran, but it does not meet every requirement yet. Open the hint and try again.",
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
    tutorLoginTitle: "Sign in to use the AI tutor",
    tutorLoginBody:
      "The AI tutor is account-scoped and rate limited. Sign in to ask about the current task, your code, and the latest run.",
    tutorLoginAction: "Go to sign-in",
    contextAttached: "Attached: task · current code · run result",
    explainError: "Explain this error",
    nextStep: "Give me the next hint",
    explainConcept: "Explain this concept",
    runtime: "Run output",
  },
} as const;

function ImagePlot({ url }: { url: string }) {
  return <img src={url} className="r-output-plot" alt="Python plot output" />;
}

export function PythonLearningWorkspace() {
  const language = useLanguage();
  const t = uiCopy[language];
  const session = usePortalSession();
  const [learningContext] = useState(() =>
    resolveCodeLearningContext(window.location.search, pythonLessons),
  );
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
  const [review, setReview] = useState<ReviewState>({
    kind: "idle",
    message: "",
  });
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorStatus, setTutorStatus] = useState<TutorStatus>("idle");
  const tutorMessagesRef = useRef<HTMLDivElement>(null);
  // Guard refs: mounted flag, per-view epoch for execution, and abortable
  // tutor requests so lesson switches or unmount cannot leak late results
  // or leave a busy flag stuck.
  const mountedRef = useRef(true);
  const viewEpochRef = useRef(0);
  const executionBusyRef = useRef(false);
  const tutorBusyRef = useRef(false);
  const tutorEpochRef = useRef(0);
  const tutorAbortRef = useRef<AbortController | null>(null);

  const activeLesson = useMemo(
    () => pythonLessons.find((lesson) => lesson.id === activeId) ?? pythonLessons[0],
    [activeId],
  );
  const code = codes[activeLesson.id] ?? activeLesson.starterCode;
  const isBusy = engineStatus === "loading" || engineStatus === "running";
  const progress = Math.round((completed.length / pythonLessons.length) * 100);

  useEffect(() => {
    saveCodeLessonProgress(
      "python",
      completed,
      completed.includes(activeLesson.id) ? activeLesson.topicId : undefined,
      window.location.pathname + window.location.search,
    );
  }, [activeLesson.id, activeLesson.topicId, completed]);

  // Release the Pyodide runtime and abort the pending tutor request when
  // the workspace unmounts.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      viewEpochRef.current += 1;
      tutorEpochRef.current += 1;
      tutorAbortRef.current?.abort();
      disposePythonRuntime();
    };
  }, []);

  useEffect(() => {
    const messages = tutorMessagesRef.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [tutorMessages, tutorStatus]);

  function selectLesson(id: string) {
    if (id === activeLesson.id) return;
    viewEpochRef.current += 1;
    executionBusyRef.current = false;
    disposePythonRuntime();
    tutorEpochRef.current += 1;
    tutorAbortRef.current?.abort();
    tutorAbortRef.current = null;
    tutorBusyRef.current = false;
    setActiveId(id);
    setEngineStatus("idle");
    setShowHint(false);
    setShowSolution(false);
    setReview({ kind: "idle", message: "" });
    setConsoleLines([]);
    setPlot(null);
    setEnvironment([]);
    setTutorPrompt("");
    setTutorMessages([]);
    setTutorStatus("idle");
  }

  async function execute(shouldCheck: boolean) {
    if (executionBusyRef.current) return;
    executionBusyRef.current = true;
    const viewEpoch = viewEpochRef.current;
    const lesson = activeLesson;
    const sourceCode = code;
    const lessonLanguage = language;
    const isCurrentView = () => mountedRef.current && viewEpochRef.current === viewEpoch;
    setEngineStatus(engineStatus === "idle" ? "loading" : "running");
    setReview({ kind: "idle", message: "" });
    setConsoleLines([]);

    try {
      const result = await runPythonCode(sourceCode);
      if (!isCurrentView()) return;
      setEngineStatus("ready");
      setConsoleLines(
        result.console.length ? result.console : ["Code completed without printed output."],
      );
      setPlot(result.plotUrl);
      setEnvironment(result.environment);

      if (shouldCheck) {
        const passed = await checkPythonCode(lesson.checkCode);
        if (!isCurrentView()) return;
        if (passed) {
          setCompleted((current) =>
            current.includes(lesson.id) ? current : [...current, lesson.id],
          );
          setReview({
            kind: "success",
            message: lesson.success[lessonLanguage],
          });
        } else {
          setReview({ kind: "failure", message: t.failed });
        }
      }
    } catch (error) {
      if (!isCurrentView()) return;
      const message = error instanceof Error ? error.message : String(error);
      setEngineStatus("error");
      setConsoleLines([message]);
      setReview({ kind: "failure", message: t.runtimeError });
    } finally {
      if (viewEpochRef.current === viewEpoch) executionBusyRef.current = false;
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
    } catch (error) {
      setEngineStatus("error");
      setConsoleLines([error instanceof Error ? error.message : String(error)]);
    }
  }

  async function askTutor(suggestedQuestion?: string) {
    const question = (suggestedQuestion ?? tutorPrompt).trim();
    if (!question || tutorBusyRef.current) return;

    tutorBusyRef.current = true;
    const tutorEpoch = ++tutorEpochRef.current;
    const controller = new AbortController();
    tutorAbortRef.current?.abort();
    tutorAbortRef.current = controller;
    const viewEpoch = viewEpochRef.current;
    const lesson = activeLesson;
    const sourceCode = code;
    const requestLanguage = language;
    const isCurrentRequest = () =>
      mountedRef.current &&
      tutorEpochRef.current === tutorEpoch &&
      viewEpochRef.current === viewEpoch;
    const userMessage: TutorMessage = {
      id: createMessageId(),
      role: "user",
      content: question,
    };
    const history = tutorMessages.map(({ role, content }) => ({
      role,
      content,
    }));
    setTutorMessages((current) => [...current, userMessage]);
    setTutorPrompt("");
    setTutorStatus("asking");

    try {
      const response = await authenticatedFetch("/st-qselector/api/ai/python-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topicId: lesson.topicId,
          lessonId: lesson.id,
          learningObjective: lesson.objective[requestLanguage],
          currentParameters: learningContext.currentParameters,
          currentCode: sourceCode,
          consoleOutput: consoleLines,
          chartSummary: plot
            ? "The latest run produced a Python plot."
            : "No plot has been produced.",
          language: requestLanguage,
          question,
          lesson: {
            title: lesson.title[requestLanguage],
            objective: lesson.objective[requestLanguage],
            task: lesson.task[requestLanguage],
            concepts: lesson.concepts,
          },
          code: sourceCode,
          console: consoleLines,
          review: review.message,
          history,
        }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
      };
      if (!response.ok || !payload.answer)
        throw new Error(
          response.status === 401
            ? `${t.tutorLoginTitle}（${portalLoginUrl(
                `${window.location.pathname}${window.location.search}`,
              )}）`
            : (payload.error ?? "AI request failed"),
        );
      if (!isCurrentRequest()) return;
      setTutorMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: payload.answer as string,
        },
      ]);
      setTutorStatus("idle");
    } catch (error) {
      // Aborts are expected when switching lessons or unmounting.
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!isCurrentRequest()) return;
      setTutorMessages((current) => [
        ...current,
        { id: createMessageId(), role: "assistant", content: t.tutorError },
      ]);
      setTutorStatus("error");
    } finally {
      if (tutorEpochRef.current === tutorEpoch) tutorBusyRef.current = false;
    }
  }

  const engineLabel =
    engineStatus === "loading"
      ? t.loading
      : engineStatus === "running"
        ? t.running
        : engineStatus === "ready"
          ? t.ready
          : engineStatus === "error"
            ? t.runtimeError
            : t.idle;

  return (
    <EditorialLearningWorkspace
      kind="python"
      language={language}
      copy={t}
      lessons={pythonLessons}
      activeLesson={activeLesson}
      completedLessonIds={completed}
      progress={progress}
      runtimeName="Pyodide · local"
      returnTo={learningContext.returnTo}
      code={code}
      engineStatus={engineStatus}
      engineLabel={engineLabel}
      isBusy={isBusy}
      consoleLines={consoleLines}
      plotNode={plot ? <ImagePlot url={plot} /> : null}
      environmentItems={environment.map((item) => ({
        name: item.name,
        detail: `${item.type} · ${item.preview}`,
      }))}
      review={review}
      showHint={showHint}
      showSolution={showSolution}
      tutorPrompt={tutorPrompt}
      tutorMessages={tutorMessages}
      tutorStatus={tutorStatus}
      tutorMessagesRef={tutorMessagesRef}
      tutorGate={
        session.status === "anonymous" ? (
          <>
            <strong>{t.tutorLoginTitle}</strong>
            <p>{t.tutorLoginBody}</p>
            <a
              className="ed-tutor-login-link"
              href={portalLoginUrl(`${window.location.pathname}${window.location.search}`)}
            >
              {t.tutorLoginAction}
            </a>
          </>
        ) : undefined
      }
      onSelectLesson={selectLesson}
      onCodeChange={(nextCode) =>
        setCodes((current) => ({ ...current, [activeLesson.id]: nextCode }))
      }
      onRun={() => void execute(false)}
      onCheck={() => void execute(true)}
      onResetCode={() =>
        setCodes((current) => ({
          ...current,
          [activeLesson.id]: activeLesson.starterCode,
        }))
      }
      onClearSession={() => void clearSession()}
      onToggleHint={() => setShowHint((value) => !value)}
      onToggleSolution={() => setShowSolution((value) => !value)}
      onTutorPromptChange={setTutorPrompt}
      onAskTutor={(question) => void askTutor(question)}
    />
  );
}

export default PythonLearningWorkspace;
