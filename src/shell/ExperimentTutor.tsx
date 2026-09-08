import {
  type ExperimentTelemetrySnapshot,
  useExperimentSnapshot,
} from "@stats-viz/shared/ai/experimentTelemetry";
import { getVisualizerLabel, useLanguage } from "@stats-viz/shared/i18n";
import { LoaderCircleIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { portalLoginUrl, usePortalSession } from "../auth/session";
import { authenticatedFetch } from "../authenticatedFetch";
import { buildTutorHistory, createMessageId } from "../code-learning/context";
import {
  type EditorialTutorMessage,
  TutorAssistantMessage,
  TutorThinkingIndicator,
  useTutorAutoScroll,
} from "../code-learning/TutorAnswer";
import { isSelectableTutorModel, useTutorModels } from "../code-learning/tutorModels";
import "../code-learning/editorial-learning-workspace.css";

interface ExperimentTutorProps {
  activeId: string;
}

type TutorStatus = "idle" | "asking" | "error";

function currentReturnTo(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
}

function experimentRequestSnapshot(snapshot: ExperimentTelemetrySnapshot) {
  return {
    experiment: {
      appId: snapshot.appId,
      ...snapshot.experiment,
    },
    parameters: snapshot.parameters,
    outputs: snapshot.outputs,
  };
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function ExperimentTutor({ activeId }: ExperimentTutorProps) {
  const language = useLanguage();
  const session = usePortalSession();
  const snapshot = useExperimentSnapshot(activeId);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<EditorialTutorMessage[]>([]);
  const [status, setStatus] = useState<TutorStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const {
    models,
    status: modelsStatus,
    selected,
    hasScanned,
    select,
    reset: resetModels,
    rescan,
  } = useTutorModels();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const typedMessageIdsRef = useRef(new Set<string>());
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestEpochRef = useRef(0);
  const requestBusyRef = useRef(false);
  const {
    followLatest,
    scrollToBottom,
    updateFollowState,
  } = useTutorAutoScroll(messagesRef);

  const selectedModel = useMemo(
    () => models.find((model) => model.key === selected && isSelectableTutorModel(model)),
    [models, selected],
  );
  const [, fallbackTitle] = getVisualizerLabel(activeId, language);
  const title = snapshot?.experiment.title ?? fallbackTitle;
  const isChinese = language === "zh";
  const snapshotFingerprint = useMemo(
    () => snapshot ? JSON.stringify(experimentRequestSnapshot(snapshot)) : "",
    [snapshot],
  );
  const snapshotFingerprintRef = useRef(snapshotFingerprint);
  snapshotFingerprintRef.current = snapshotFingerprint;

  const resetConversation = useCallback(() => {
    requestEpochRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    requestBusyRef.current = false;
    typedMessageIdsRef.current.clear();
    setPrompt("");
    setMessages([]);
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const closeDrawer = useCallback(
    (restoreFocus = true) => {
      resetConversation();
      resetModels();
      setOpen(false);
      if (restoreFocus) requestAnimationFrame(() => launcherRef.current?.focus());
    },
    [resetConversation, resetModels],
  );

  useEffect(() => {
    closeDrawer(false);
  }, [activeId, closeDrawer]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeDrawer, open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, status]);

  useEffect(() => {
    if (!requestBusyRef.current) return;
    // Answers are evidence-bound to the exact experiment snapshot captured
    // when the learner asked. If parameters or outputs change meanwhile,
    // cancel the old turn instead of presenting it as an explanation of the
    // new state. Identical republished snapshots have the same fingerprint.
    requestEpochRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    requestBusyRef.current = false;
    setStatus("error");
    setErrorMessage(
      isChinese
        ? "实验参数或结果已更新，旧问题已取消；请基于当前结果重新提问。"
        : "The lab parameters or results changed, so the old question was cancelled. Ask again for the current result.",
    );
  }, [isChinese, snapshotFingerprint]);

  useEffect(
    () => () => {
      requestEpochRef.current += 1;
      requestAbortRef.current?.abort();
    },
    [],
  );

  async function askTutor() {
    const question = prompt.trim();
    const requestSnapshot = snapshot;
    if (
      !question ||
      !requestSnapshot ||
      !selectedModel ||
      requestBusyRef.current ||
      session.status !== "authenticated"
    ) {
      return;
    }

    requestBusyRef.current = true;
    const requestEpoch = ++requestEpochRef.current;
    const requestAppId = activeId;
    const requestSnapshotFingerprint = snapshotFingerprint;
    const controller = new AbortController();
    requestAbortRef.current?.abort();
    requestAbortRef.current = controller;
    const isCurrentRequest = () =>
      requestEpochRef.current === requestEpoch &&
      requestAbortRef.current === controller &&
      requestAppId === activeId &&
      snapshotFingerprintRef.current === requestSnapshotFingerprint &&
      !controller.signal.aborted;
    const history = buildTutorHistory(messages);
    const userMessage: EditorialTutorMessage = {
      id: createMessageId(),
      role: "user",
      content: question,
    };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setErrorMessage("");
    setStatus("asking");

    try {
      const context = experimentRequestSnapshot(requestSnapshot);
      const response = await authenticatedFetch("/st-qselector/api/ai/experiment-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          language,
          model: selectedModel.key,
          question,
          ...context,
          history,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        answer?: string;
        reasoning?: string;
        error?: string;
      };
      if (!isCurrentRequest()) return;
      if (!response.ok || !payload.answer?.trim()) {
        // A 409 means the model changed between the live scan and inference.
        // Discard the entire snapshot; only another manual scan may authorize
        // a new selection, and the UI never guesses a replacement model.
        if (response.status === 409) resetModels();
        throw new Error(
          payload.error ??
            (response.status === 401
              ? isChinese
                ? "登录状态已失效，请重新登录。"
                : "Your session expired. Please sign in again."
              : isChinese
                ? "实验助手暂时无法回答，请稍后重试。"
                : "The lab tutor could not answer. Please try again."),
        );
      }
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: payload.answer as string,
          reasoning: payload.reasoning,
        },
      ]);
      setStatus("idle");
    } catch (error) {
      if (isAbortError(error) || !isCurrentRequest()) {
        return;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isChinese
            ? "实验助手暂时无法回答，请稍后重试。"
            : "The lab tutor could not answer. Please try again.",
      );
      setStatus("error");
    } finally {
      if (requestEpochRef.current === requestEpoch) {
        requestBusyRef.current = false;
        requestAbortRef.current = null;
      }
    }
  }

  const modelHint = (() => {
    if (modelsStatus === "loading") {
      return isChinese ? "正在实时扫描上游模型…" : "Scanning upstream models live…";
    }
    if (modelsStatus === "error") {
      return isChinese ? "在线模型获取失败，请点击按钮重试。" : "Model scan failed. Try again.";
    }
    if (!hasScanned) {
      return isChinese
        ? "点击右侧按钮手动扫描；列表不会预存或自动刷新。"
        : "Scan manually with the button; the list is never preloaded or cached.";
    }
    if (!models.length) {
      return isChinese ? "本次扫描未发现在线语言模型。" : "No language models were found.";
    }
    if (!models.some(isSelectableTutorModel)) {
      return isChinese
        ? "本次扫描到的模型均未启用，因此不能发送问题。"
        : "All scanned models are inactive, so no question can be sent.";
    }
    return isChinese
      ? "请选择一个已启用模型；未启用模型仅供查看。"
      : "Choose an active model; inactive models are shown for reference only.";
  })();

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="ed-ai-launcher ed-experiment-ai-launcher"
        aria-expanded={open}
        aria-controls="experiment-ai-drawer"
        onClick={() => {
          resetConversation();
          resetModels();
          followLatest();
          setOpen(true);
        }}
      >
        <span aria-hidden="true">AI</span>
        {isChinese ? "实验助手" : "Lab tutor"}
      </button>

      {open ? (
        <button
          type="button"
          tabIndex={-1}
          className="ed-ai-drawer-backdrop"
          aria-label={isChinese ? "关闭实验助手" : "Close lab tutor"}
          onClick={() => closeDrawer()}
        />
      ) : null}

      {open ? (
        <aside
          id="experiment-ai-drawer"
          className="ed-ai-drawer ed-experiment-ai-drawer"
          role="dialog"
          aria-modal="false"
          aria-labelledby="experiment-ai-title"
        >
          <header className="ed-ai-drawer__header">
            <div>
              <span aria-hidden="true">AI</span>
              <div>
                <p className="ed-kicker">STATISTICAL LAB</p>
                <h2 id="experiment-ai-title">{isChinese ? "模拟实验助手" : "Simulation tutor"}</h2>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label={isChinese ? "关闭实验助手" : "Close lab tutor"}
              onClick={() => closeDrawer()}
            >
              <XIcon aria-hidden="true" />
            </button>
          </header>

          <p className="ed-ai-drawer__intro">
            {isChinese
              ? `结合“${title}”当前参数、数据、图表和指标回答。`
              : `Answers use the current parameters, data, chart, and metrics from “${title}”.`}
          </p>

          {session.status === "loading" ? (
            <div className="ed-tutor-note" role="status">
              <strong>{isChinese ? "正在确认登录状态…" : "Checking your session…"}</strong>
            </div>
          ) : session.status === "anonymous" ? (
            <div className="ed-tutor-note">
              <strong>{isChinese ? "实验助手需要登录" : "Sign in to use the lab tutor"}</strong>
              <p>
                {isChinese
                  ? "登录后可将当前实验上下文发送给助手；实验本身仍可匿名使用。"
                  : "Sign in to share the current lab context with the tutor; the lab itself remains public."}
              </p>
              <a className="ed-tutor-login-link" href={portalLoginUrl(currentReturnTo())}>
                {isChinese ? "前往登录" : "Sign in"}
              </a>
            </div>
          ) : (
            <>
              <div className="ed-ai-model-picker">
                <label htmlFor="experiment-tutor-model">{isChinese ? "AI 模型" : "AI model"}</label>
                <div className="ed-ai-model-picker__controls">
                  <select
                    id="experiment-tutor-model"
                    value={selected}
                    disabled={modelsStatus === "loading" || status === "asking" || !models.length}
                    onChange={(event) => select(event.target.value)}
                  >
                    <option value="" disabled>
                      {isChinese ? "请先扫描并选择已启用模型" : "Scan and choose an active model"}
                    </option>
                    {models.map((model) => (
                      <option
                        key={model.key}
                        value={model.key}
                        disabled={!isSelectableTutorModel(model)}
                      >
                        {model.displayName}
                        {model.quantization ? ` · ${model.quantization}` : ""}
                        {!model.loaded ? (isChinese ? " · 未启用" : " · inactive") : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={modelsStatus === "loading" || status === "asking"}
                    aria-label={isChinese ? "扫描在线模型" : "Scan online models"}
                    title={isChinese ? "扫描在线模型" : "Scan online models"}
                    onClick={() => void rescan()}
                  >
                    {modelsStatus === "loading" ? (
                      <LoaderCircleIcon className="ed-spin" aria-hidden="true" />
                    ) : (
                      <RotateCcwIcon aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="ed-ai-model-picker__hint">{modelHint}</p>
              </div>

              <div
                ref={messagesRef}
                className="ed-live-ai-messages"
                role="log"
                aria-label={isChinese ? "实验助手对话" : "Lab tutor conversation"}
                aria-live="polite"
                onScroll={updateFollowState}
              >
                {!messages.length && status !== "asking" ? (
                  <div className="ed-tutor-note">
                    <strong>{title}</strong>
                    <p>
                      {snapshot
                        ? isChinese
                          ? "已读取当前实验快照。选择模型后，可询问参数变化、图表含义或结果解释。"
                          : "The current snapshot is ready. Choose a model to ask about parameters, charts, or results."
                        : isChinese
                          ? "正在等待当前实验发布参数和结果，请稍候。"
                          : "Waiting for the lab to publish its parameters and results."}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <article key={message.id} data-role={message.role}>
                      <small>{message.role === "user" ? (isChinese ? "你" : "You") : "AI"}</small>
                      {message.role === "assistant" ? (
                        <TutorAssistantMessage
                          message={message}
                          language={language}
                          animate={!typedMessageIdsRef.current.has(message.id)}
                          typedMessageIdsRef={typedMessageIdsRef}
                          onProgress={scrollToBottom}
                        />
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </article>
                  ))
                )}
                {status === "asking" ? (
                  selectedModel?.supportsReasoning ? (
                    <TutorThinkingIndicator language={language} />
                  ) : (
                    <p className="ed-live-tutor-thinking" role="status">
                      {isChinese ? "AI 正在回答…" : "AI is answering…"}
                    </p>
                  )
                ) : null}
                {errorMessage ? (
                  <p className="ed-experiment-tutor-error" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </div>

              <form
                className="ed-live-tutor-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void askTutor();
                }}
              >
                <textarea
                  rows={2}
                  maxLength={3_000}
                  value={prompt}
                  aria-label={isChinese ? "询问当前实验" : "Ask about the current lab"}
                  placeholder={
                    selectedModel
                      ? isChinese
                        ? "询问参数、图表、数据或统计结论…"
                        : "Ask about parameters, charts, data, or conclusions…"
                      : isChinese
                        ? "请先扫描并选择已启用模型"
                        : "Scan and choose an active model first"
                  }
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void askTutor();
                    }
                  }}
                />
                <button
                  type="submit"
                  aria-label={isChinese ? "发送" : "Send"}
                  disabled={!prompt.trim() || !selectedModel || !snapshot || status === "asking"}
                >
                  ↑
                </button>
              </form>
              <p className="ed-ai-drawer__context">
                {isChinese
                  ? "将附带：当前实验 · 全部参数 · 有界数据摘要 · 图表 · 指标"
                  : "Attached: current lab · all parameters · bounded data summary · chart · metrics"}
              </p>
            </>
          )}
        </aside>
      ) : null}
    </>
  );
}
