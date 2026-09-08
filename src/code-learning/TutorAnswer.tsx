import { ChevronDownIcon } from "lucide-react";
import type { MutableRefObject, RefObject } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MermaidDiagram } from "./MermaidDiagram";
import { splitTutorContent } from "./mermaid";

export type EditorialTutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
};

const FOLLOW_LATEST_THRESHOLD_PX = 32;

/**
 * Keeps a tutor transcript pinned while the reader is already at its end.
 * Once they scroll up, later message and typewriter updates leave their reading
 * position alone until they return to the bottom or explicitly reset it.
 */
export function useTutorAutoScroll(containerRef: RefObject<HTMLDivElement | null>) {
  const followsLatestRef = useRef(true);
  const frameRef = useRef<number | null>(null);

  const updateFollowState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.clientHeight - container.scrollTop;
    followsLatestRef.current = distanceFromBottom <= FOLLOW_LATEST_THRESHOLD_PX;
  }, [containerRef]);

  const scrollToBottom = useCallback(() => {
    if (!followsLatestRef.current) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      // Re-check the flag inside the frame: a user may scroll up after this
      // update was queued but before the browser gets to paint it.
      if (container && followsLatestRef.current) {
        container.scrollTop = container.scrollHeight;
      }
      frameRef.current = null;
    });
  }, [containerRef]);

  const followLatest = useCallback(() => {
    followsLatestRef.current = true;
    scrollToBottom();
  }, [scrollToBottom]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return { followLatest, scrollToBottom, updateFollowState };
}

/** Pending state for models that advertise reasoning support. */
export function TutorThinkingIndicator({ language }: { language: "zh" | "en" }) {
  const [open, setOpen] = useState(true);
  const contentId = useId();
  return (
    <section className="ed-live-tutor-reasoning" data-pending="true">
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{language === "zh" ? "AI 思考中…" : "AI is thinking…"}</span>
        <span>
          {open ? (language === "zh" ? "收起" : "Hide") : language === "zh" ? "展开" : "Show"}
          <ChevronDownIcon aria-hidden="true" />
        </span>
      </button>
      <div id={contentId} hidden={!open}>
        <p className="ed-live-tutor-thinking" role="status">
          {language === "zh"
            ? "正在等待模型返回思考过程；收到后会逐字显示。"
            : "Waiting for the model's reasoning; it will type out when received."}
        </p>
      </div>
    </section>
  );
}

/**
 * Character-by-character reveal for tutor answers. Long answers reveal
 * proportionally more per tick so the animation stays under ~3.6s regardless
 * of length; `prefers-reduced-motion` skips the animation entirely.
 */
export function TutorAnswer({
  content,
  animate,
  onProgress,
  onComplete,
  tone = "answer",
}: {
  content: string;
  animate: boolean;
  onProgress: () => void;
  onComplete: () => void;
  tone?: "answer" | "reasoning";
}) {
  const characters = useMemo(() => Array.from(content), [content]);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const shouldAnimate = animate && !reduceMotion;
  const completionReportedRef = useRef(false);
  const [visibleCharacters, setVisibleCharacters] = useState(() =>
    shouldAnimate ? 0 : characters.length,
  );

  const reportComplete = useCallback(() => {
    if (completionReportedRef.current) return;
    completionReportedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!shouldAnimate) {
      // Once this instance has completed its reveal, a parent render merely
      // changing `animate` to false must not generate another scroll event.
      // This happens when the learner types after expanding an old trace.
      if (completionReportedRef.current) return;
      const frame = requestAnimationFrame(() => {
        setVisibleCharacters(characters.length);
        onProgress();
        reportComplete();
      });
      return () => cancelAnimationFrame(frame);
    }

    let visible = 0;
    const charactersPerTick = Math.max(1, Math.ceil(characters.length / 180));
    const timer = window.setInterval(() => {
      visible = Math.min(characters.length, visible + charactersPerTick);
      setVisibleCharacters(visible);
      onProgress();
      if (visible >= characters.length) {
        window.clearInterval(timer);
        reportComplete();
      }
    }, 20);
    return () => window.clearInterval(timer);
  }, [characters, onProgress, reportComplete, shouldAnimate]);

  const visibleContent = characters.slice(0, visibleCharacters).join("");
  const parts = splitTutorContent(visibleContent);
  const isTyping = visibleCharacters < characters.length;
  return (
    <div
      className={`ed-live-tutor-answer${tone === "reasoning" ? " ed-live-tutor-reasoning__content" : ""}`}
      data-typing={isTyping || undefined}
      // The surrounding transcript is a polite live log. Hide intermediate
      // character batches from its accessibility tree, then expose the full
      // response once so screen readers do not announce every 20 ms update.
      aria-hidden={isTyping || undefined}
    >
      {parts.map((part, index) => {
        const keyPart = part.kind === "text" ? part.text : part.source;
        const key = `${index}-${keyPart.slice(0, 12)}`;
        if (part.kind === "text") {
          const text = part.text.replace(/\*\*/g, "").trim();
          return text ? <p key={key}>{text}</p> : null;
        }
        if (part.kind === "mermaid" && part.complete) {
          return <MermaidDiagram key={key} source={part.source} onProgress={onProgress} />;
        }
        const language = part.kind === "code" ? part.language || "text" : "mermaid";
        const source = part.complete
          ? part.source.trim()
          : `\`\`\`${language}\n${part.source.slice(0, 4_000)}`;
        return (
          <pre key={key} data-fence-complete={part.complete || undefined} data-language={language}>
            <code>{source}</code>
          </pre>
        );
      })}
    </div>
  );
}

/**
 * An assistant turn: the collapsible reasoning section types out first
 * ("AI 思考中…" while typing), then the final answer starts revealing.
 */
export function TutorAssistantMessage({
  message,
  language,
  animate,
  typedMessageIdsRef,
  onProgress,
}: {
  message: EditorialTutorMessage;
  language: "zh" | "en";
  animate: boolean;
  typedMessageIdsRef: MutableRefObject<Set<string>>;
  onProgress: () => void;
}) {
  const reasoning = message.reasoning?.trim() ?? "";
  const hasReasoning = reasoning.length > 0;
  const [reasoningComplete, setReasoningComplete] = useState(() => !animate || !hasReasoning);
  const [reasoningOpen, setReasoningOpen] = useState(() => animate && hasReasoning);
  const reasoningId = `tutor-reasoning-${message.id}`;

  const finishReasoning = useCallback(() => {
    setReasoningComplete(true);
    setReasoningOpen(false);
    onProgress();
  }, [onProgress]);
  const finishAnswer = useCallback(() => {
    typedMessageIdsRef.current.add(message.id);
    onProgress();
  }, [message.id, onProgress, typedMessageIdsRef]);

  return (
    <>
      {hasReasoning ? (
        <section className="ed-live-tutor-reasoning" data-complete={reasoningComplete || undefined}>
          <button
            type="button"
            aria-controls={reasoningId}
            aria-expanded={reasoningOpen}
            onClick={() => setReasoningOpen((open) => !open)}
          >
            <span>
              {reasoningComplete
                ? language === "zh"
                  ? "AI 思考过程"
                  : "AI reasoning"
                : language === "zh"
                  ? "AI 思考中…"
                  : "AI is thinking…"}
            </span>
            <span>
              {reasoningOpen
                ? language === "zh"
                  ? "收起"
                  : "Hide"
                : language === "zh"
                  ? "展开"
                  : "Show"}
              <ChevronDownIcon aria-hidden="true" />
            </span>
          </button>
          <div id={reasoningId} hidden={!reasoningOpen}>
            <TutorAnswer
              content={reasoning}
              animate={animate}
              tone="reasoning"
              onProgress={onProgress}
              onComplete={finishReasoning}
            />
          </div>
        </section>
      ) : null}
      {reasoningComplete ? (
        <TutorAnswer
          content={message.content}
          animate={animate}
          onProgress={onProgress}
          onComplete={finishAnswer}
        />
      ) : null}
    </>
  );
}
