import { useLanguage } from "@stats-viz/shared/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Session awareness powers the tutor sign-in gate; the runtime itself stays
// fully local so the studio works offline once the WebR assets are cached.
import { portalLoginUrl, usePortalSession } from "../auth/session";
import { authenticatedFetch } from "../authenticatedFetch";
import { buildTutorHistory, createMessageId, resolveCodeLearningContext } from "../code-learning/context";
import { EditorialLearningWorkspace } from "../code-learning/EditorialLearningWorkspace";
import { prepareCodeTutorRequest } from "../code-learning/tutorPayload";
import { loadLearningProgress, saveCodeLessonProgress } from "../course/progressStore";
import { rLessons } from "./lessons";
import { checkRCode, disposeWebRRuntime, resetRSession, runRCode } from "./webrRuntime";

type EngineStatus = "idle" | "loading" | "ready" | "running" | "error";
type ReviewState = { kind: "idle" | "success" | "failure"; message: string };
type TutorMessage = { id: string; role: "user" | "assistant"; content: string; reasoning?: string };
type TutorStatus = "idle" | "asking" | "error";

const uiCopy = {
  zh: {
    brand: "R 语言编程工作室",
    subtitle: "在浏览器中真实编写、运行与理解 R",
    back: "返回主界面",
    progress: "学习进度",
    lessons: "课程",
    objective: "学习目标",
    task: "你的任务",
    editor: "R 代码编辑器",
    run: "运行代码",
    check: "检查答案",
    reset: "重置代码",
    session: "清空 R 会话",
    hint: "提示",
    solution: "参考解法",
    hide: "收起",
    console: "控制台",
    plot: "图形",
    environment: "环境",
    review: "检查结果",
    noOutput: "运行代码后，输出会显示在这里。",
    noPlot: "当前代码还没有生成图形。",
    noObjects: "运行代码后，这里会列出当前 R 对象。",
    notChecked: "点击“检查答案”，系统会运行代码并验证创建的对象和计算结果。",
    loading: "正在加载浏览器 R 环境，第一次需要一点时间…",
    ready: "R 环境已就绪",
    running: "正在运行…",
    idle: "点击运行时加载 R",
    failed: "代码已运行，但还没有满足本课全部要求。可以查看提示后再试一次。",
    runtimeError: "R 运行失败。请根据控制台中的错误信息修改代码。",
    cleared: "R 会话已清空。",
    next: "下一课",
    complete: "已完成",
    lines: "行",
    tutor: "AI R 助教",
    tutorIntro: "我会结合当前题目、你的代码和最近一次运行结果回答。",
    tutorPlaceholder: "问报错原因、语法用法或下一步怎么改…",
    tutorSend: "发送",
    tutorThinking: "AI 思考中…",
    tutorError: "AI 助教暂时无法连接，请稍后再试。",
    tutorLoginTitle: "AI 助教需要登录",
    tutorLoginBody: "AI 助教按账号提供并有用量限制。登录后即可结合当前题目、代码与运行结果提问。",
    tutorLoginAction: "前往登录",
    contextAttached: "已附带：题目 · 当前代码 · 运行结果",
    runtime: "运行结果",
  },
  en: {
    brand: "R Coding Studio",
    subtitle: "Write, run, and understand real R in your browser",
    back: "Back to home",
    progress: "Learning progress",
    lessons: "Lessons",
    objective: "Learning objective",
    task: "Your task",
    editor: "R code editor",
    run: "Run code",
    check: "Check answer",
    reset: "Reset code",
    session: "Clear R session",
    hint: "Hint",
    solution: "Reference solution",
    hide: "Hide",
    console: "Console",
    plot: "Plot",
    environment: "Environment",
    review: "Check result",
    noOutput: "Run your code and its output will appear here.",
    noPlot: "The current code has not produced a plot yet.",
    noObjects: "Run code to see the objects in the current R environment.",
    notChecked: "Select Check answer to run the code and verify its objects and results.",
    loading: "Loading R in your browser. The first run takes a moment…",
    ready: "R is ready",
    running: "Running…",
    idle: "R loads on first run",
    failed:
      "The code ran, but it does not meet every requirement yet. Open the hint and try again.",
    runtimeError: "R could not run the code. Use the Console message to correct it.",
    cleared: "The R session has been cleared.",
    next: "Next lesson",
    complete: "Complete",
    lines: "lines",
    tutor: "AI R Tutor",
    tutorIntro: "I answer with the current task, your code, and the latest run attached.",
    tutorPlaceholder: "Ask about an error, syntax, or your next step…",
    tutorSend: "Send",
    tutorThinking: "AI is thinking…",
    tutorError: "The AI tutor is temporarily unavailable. Please try again.",
    tutorLoginTitle: "Sign in to use the AI tutor",
    tutorLoginBody:
      "The AI tutor is account-scoped and rate limited. Sign in to ask about the current task, your code, and the latest run.",
    tutorLoginAction: "Go to sign-in",
    contextAttached: "Attached: task · current code · run result",
    runtime: "Run output",
  },
} as const;

function CanvasPlot({ image }: { image: ImageBitmap | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
  }, [image]);

  if (!image) return null;
  return <canvas ref={canvasRef} className="r-output-plot" aria-label="R plot output" />;
}

export function RLearningWorkspace() {
  const language = useLanguage();
  const t = uiCopy[language];
  const session = usePortalSession();
  const [learningContext] = useState(() =>
    resolveCodeLearningContext(window.location.search, rLessons),
  );
  const [activeId, setActiveId] = useState(learningContext.lessonId);
  const [codes, setCodes] = useState<Record<string, string>>(() =>
    Object.fromEntries(rLessons.map((lesson) => [lesson.id, lesson.starterCode])),
  );
  const [completed, setCompleted] = useState<string[]>(() => {
    const validIds = new Set(rLessons.map(({ id }) => id));
    return loadLearningProgress().completedRLessons.filter((id) => validIds.has(id));
  });
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("idle");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [plot, setPlot] = useState<ImageBitmap | null>(null);
  const [environment, setEnvironment] = useState<string[]>([]);
  const [review, setReview] = useState<ReviewState>({
    kind: "idle",
    message: "",
  });
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorStatus, setTutorStatus] = useState<TutorStatus>("idle");
  const [tutorModelResetKey, setTutorModelResetKey] = useState(0);
  const tutorMessagesRef = useRef<HTMLDivElement>(null);
  // Guard refs: mounted flag, per-view epoch for execution, and abortable
  // tutor requests so lesson switches or unmount cannot leak late results
  // or leave a busy flag stuck.
  const plotRef = useRef<ImageBitmap | null>(null);
  const mountedRef = useRef(true);
  const viewEpochRef = useRef(0);
  const executionBusyRef = useRef(false);
  const tutorBusyRef = useRef(false);
  const tutorEpochRef = useRef(0);
  const tutorAbortRef = useRef<AbortController | null>(null);

  const activeLesson = useMemo(
    () => rLessons.find((lesson) => lesson.id === activeId) ?? rLessons[0],
    [activeId],
  );
  const code = codes[activeLesson.id] ?? activeLesson.starterCode;
  const isBusy = engineStatus === "loading" || engineStatus === "running";
  const progress = Math.round((completed.length / rLessons.length) * 100);

  useEffect(() => {
    saveCodeLessonProgress(
      "r",
      completed,
      completed.includes(activeLesson.id) ? activeLesson.topicId : undefined,
      window.location.pathname + window.location.search,
    );
  }, [activeLesson.id, activeLesson.topicId, completed]);

  // Release the WebR runtime, the pending tutor request, and any retained
  // plot bitmap when the workspace unmounts.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      viewEpochRef.current += 1;
      tutorEpochRef.current += 1;
      tutorAbortRef.current?.abort();
      plotRef.current?.close();
      plotRef.current = null;
      disposeWebRRuntime();
    };
  }, []);

  function replacePlot(next: ImageBitmap | null) {
    plotRef.current?.close();
    plotRef.current = next;
    setPlot(next);
  }

  function selectLesson(id: string) {
    if (id === activeLesson.id) return;
    viewEpochRef.current += 1;
    executionBusyRef.current = false;
    disposeWebRRuntime();
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
    replacePlot(null);
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
      const result = await runRCode(sourceCode);
      // WebR may finish after navigation/unmount; release an orphaned bitmap
      // immediately instead of handing it to state that no longer has an owner.
      if (!isCurrentView()) {
        result.image?.close();
        return;
      }
      setEngineStatus("ready");
      setConsoleLines(
        result.console.length ? result.console : ["Code completed without printed output."],
      );
      replacePlot(result.image);
      setEnvironment(result.environment);

      if (shouldCheck) {
        const passed = await checkRCode(lesson.checkCode);
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
    const viewEpoch = viewEpochRef.current;
    const isCurrentView = () => mountedRef.current && viewEpochRef.current === viewEpoch;
    setEngineStatus(engineStatus === "idle" ? "loading" : "running");
    try {
      await resetRSession();
      if (!isCurrentView()) return;
      setEngineStatus("ready");
      setConsoleLines([t.cleared]);
      replacePlot(null);
      setEnvironment([]);
      setReview({ kind: "idle", message: "" });
    } catch (error) {
      if (!isCurrentView()) return;
      setEngineStatus("error");
      setConsoleLines([error instanceof Error ? error.message : String(error)]);
    }
  }

  async function askTutor(suggestedQuestion?: string, model?: string) {
    const requestedQuestion = (suggestedQuestion ?? tutorPrompt).trim();
    if (!requestedQuestion || !model || tutorBusyRef.current) return;

    const lesson = activeLesson;
    const sourceCode = code;
    const requestLanguage = language;
    const history = buildTutorHistory(tutorMessages);
    const request = prepareCodeTutorRequest({
      language: requestLanguage,
      model,
      question: requestedQuestion,
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
    });
    const question = request.question;
    tutorBusyRef.current = true;
    const tutorEpoch = ++tutorEpochRef.current;
    const controller = new AbortController();
    tutorAbortRef.current?.abort();
    tutorAbortRef.current = controller;
    const viewEpoch = viewEpochRef.current;
    const isCurrentRequest = () =>
      mountedRef.current &&
      tutorEpochRef.current === tutorEpoch &&
      viewEpochRef.current === viewEpoch &&
      tutorAbortRef.current === controller &&
      !controller.signal.aborted;
    const userMessage: TutorMessage = {
      id: createMessageId(),
      role: "user",
      content: question,
    };
    setTutorMessages((current) => [...current, userMessage]);
    setTutorPrompt("");
    setTutorStatus("asking");
    let failureMessage: string = t.tutorError;

    try {
      const response = await authenticatedFetch("/st-qselector/api/ai/r-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: request.body,
      });
      const payload = (await response.json()) as {
        answer?: string;
        reasoning?: string;
        error?: string;
      };
      if (!isCurrentRequest()) return;
      if (!response.ok || !payload.answer) {
        if (response.status === 409) setTutorModelResetKey((current) => current + 1);
        failureMessage =
          response.status === 401
            ? `${t.tutorLoginTitle}（${portalLoginUrl(
                `${window.location.pathname}${window.location.search}${window.location.hash}`,
              )}）`
            : (payload.error || t.tutorError);
        throw new Error(failureMessage);
      }
      setTutorMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: payload.answer as string,
          reasoning: payload.reasoning,
        },
      ]);
      setTutorStatus("idle");
    } catch (error) {
      // Aborts are expected when switching lessons or unmounting.
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!isCurrentRequest()) return;
      setTutorMessages((current) => [
        ...current,
        { id: createMessageId(), role: "assistant", content: failureMessage },
      ]);
      setTutorStatus("error");
    } finally {
      if (tutorEpochRef.current === tutorEpoch) tutorBusyRef.current = false;
    }
  }

  const closeTutor = useCallback(() => {
    tutorEpochRef.current += 1;
    tutorAbortRef.current?.abort();
    tutorAbortRef.current = null;
    tutorBusyRef.current = false;
    setTutorStatus("idle");
  }, []);

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
      kind="r"
      language={language}
      copy={t}
      lessons={rLessons}
      activeLesson={activeLesson}
      completedLessonIds={completed}
      progress={progress}
      runtimeName="WebR · local"
      returnTo={learningContext.returnTo}
      code={code}
      engineStatus={engineStatus}
      engineLabel={engineLabel}
      isBusy={isBusy}
      consoleLines={consoleLines}
      plotNode={plot ? <CanvasPlot image={plot} /> : null}
      environmentItems={environment.map((name) => ({ name }))}
      review={review}
      showHint={showHint}
      showSolution={showSolution}
      tutorPrompt={tutorPrompt}
      tutorMessages={tutorMessages}
      tutorStatus={tutorStatus}
      tutorModelResetKey={tutorModelResetKey}
      tutorMessagesRef={tutorMessagesRef}
      tutorGate={
        session.status === "loading" ? (
          <strong>正在确认登录状态…</strong>
        ) : session.status === "anonymous" ? (
          <>
            <strong>{t.tutorLoginTitle}</strong>
            <p>{t.tutorLoginBody}</p>
            <a
              className="ed-tutor-login-link"
              href={portalLoginUrl(
                `${window.location.pathname}${window.location.search}${window.location.hash}`,
              )}
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
      onClearSession={clearSession}
      onToggleHint={() => setShowHint((open) => !open)}
      onToggleSolution={() => setShowSolution((open) => !open)}
      onTutorPromptChange={setTutorPrompt}
      onAskTutor={askTutor}
      onCloseTutor={closeTutor}
    />
  );
}

export default RLearningWorkspace;
