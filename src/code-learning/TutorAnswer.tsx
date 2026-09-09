import { ChevronDownIcon } from "lucide-react";
import type { MutableRefObject, RefObject } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MermaidDiagram } from "./MermaidDiagram";
import { TutorMarkdown } from "./TutorMarkdown";
import { splitTutorContent } from "./mermaid";

export type EditorialTutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  /** True while the server is still sending this assistant turn. */
  streaming?: boolean;
  /** Set once the server has moved from reasoning tokens to answer tokens. */
  reasoningDone?: boolean;
};

const FOLLOW_LATEST_THRESHOLD_PX = 32;
const MAX_HIGHLIGHTED_CODE_LENGTH = 50_000;

function normalizedFenceLanguage(language: string): string {
  return /^[a-z0-9_+#.-]{1,32}$/u.test(language) ? language : "text";
}

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
          {language === "zh" ? "思考中......" : "Thinking......"}
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
  streaming = false,
  onProgress,
  onComplete,
  tone = "answer",
}: {
  content: string;
  animate: boolean;
  streaming?: boolean;
  onProgress: () => void;
  onComplete: () => void;
  tone?: "answer" | "reasoning";
}) {
  const characters = useMemo(() => Array.from(content), [content]);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // A streamed response is already being revealed by the network. Running a
  // second timer over it would lag behind the server and repeatedly restart as
  // each delta changes `content`; render all bytes received so far instead.
  const shouldAnimate = animate && !reduceMotion && !streaming;
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
    if (streaming) {
      setVisibleCharacters(characters.length);
      return;
    }
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
  }, [characters, onProgress, reportComplete, shouldAnimate, streaming]);

  const visibleContent = characters.slice(0, visibleCharacters).join("");
  const isTyping = visibleCharacters < characters.length;
  return (
    <div
      className={`ed-live-tutor-answer${tone === "reasoning" ? " ed-live-tutor-reasoning__content" : ""}`}
      data-format={tone === "reasoning" ? "plaintext" : "markdown"}
      data-typing={isTyping || undefined}
      // The surrounding transcript is a polite live log. Hide intermediate
      // character batches from its accessibility tree, then expose the full
      // response once so screen readers do not announce every 20 ms update.
      aria-hidden={isTyping || streaming || undefined}
    >
      {tone === "reasoning" ? (
        visibleContent ? <p className="ed-tutor-plaintext">{visibleContent}</p> : null
      ) : (
        splitTutorContent(visibleContent).map((part, index) => {
          const keyPart = part.kind === "text" ? part.text : part.source;
          const key = `${index}-${keyPart.slice(0, 12)}`;
          if (part.kind === "text") {
            // Keep the exact token stream (especially spaces around a delta).
            // Only use trim for the emptiness check; trimming the rendered value
            // can join words when a later network chunk starts with a letter.
            return part.text.trim() ? <TutorMarkdown key={key}>{part.text}</TutorMarkdown> : null;
          }
          if (part.kind === "mermaid" && part.complete) {
            return <MermaidDiagram key={key} source={part.source} onProgress={onProgress} />;
          }

          const language = normalizedFenceLanguage(
            part.kind === "code" ? part.language || "text" : "mermaid",
          );
          if (part.complete) {
            if (part.source.length > MAX_HIGHLIGHTED_CODE_LENGTH) {
              return (
                <pre
                  key={key}
                  data-fence-complete="true"
                  data-highlight="skipped"
                  data-language={language}
                >
                  <code className="no-highlight" data-language={language}>
                    {part.source}
                  </code>
                </pre>
              );
            }
            return (
              <div key={key} data-fence-complete="true" data-language={language}>
                <TutorMarkdown variant="code">{`\`\`\`${language}\n${part.source}\n\`\`\``}</TutorMarkdown>
              </div>
            );
          }
          return (
            <pre key={key} data-language={language}>
              <code className="no-highlight">{`\`\`\`${language}\n${part.source.slice(0, 4_000)}`}</code>
            </pre>
          );
        })
      )}
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
  const isStreaming = message.streaming === true;
  const wasStreamed = message.streaming !== undefined;
  // Once a turn has arrived over SSE, its characters have already been
  // revealed by the network. The property remains present as `false` after
  // completion, including when React batches every fast delta into one render,
  // so completion can never restart the legacy simulated typewriter.
  const shouldAnimateMessage = animate && message.streaming === undefined;
  // Plaintext is preserved byte-for-byte for both live and historical turns;
  // trim only for the empty-state check, never for the rendered value.
  const reasoning = message.reasoning ?? "";
  const hasReasoning = reasoning.trim().length > 0;
  const [reasoningComplete, setReasoningComplete] = useState(
    () => !shouldAnimateMessage || !hasReasoning || Boolean(message.reasoningDone),
  );
  const [reasoningOpen, setReasoningOpen] = useState(() =>
    isStreaming ? hasReasoning : shouldAnimateMessage && hasReasoning,
  );
  const reasoningId = `tutor-reasoning-${message.id}`;
  const effectiveReasoningComplete = wasStreamed
    ? !hasReasoning || Boolean(message.reasoningDone)
    : reasoningComplete;

  // During a live turn, the first reasoning delta opens the disclosure and the
  // first answer delta closes it.  Do not apply this to historical messages:
  // their open/closed choice belongs entirely to the reader.
  useEffect(() => {
    if (!wasStreamed) return;
    if (!hasReasoning) {
      setReasoningComplete(true);
      return;
    }
    const complete = Boolean(message.reasoningDone);
    setReasoningComplete(complete);
    if (!complete) setReasoningOpen(true);
    else setReasoningOpen(false);
  }, [hasReasoning, message.reasoningDone, wasStreamed]);

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
        <section
          className="ed-live-tutor-reasoning"
          data-complete={effectiveReasoningComplete || undefined}
        >
          <button
            type="button"
            aria-controls={reasoningId}
            aria-expanded={reasoningOpen}
            onClick={() => setReasoningOpen((open) => !open)}
          >
            <span>
              {effectiveReasoningComplete
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
              animate={shouldAnimateMessage && !isStreaming}
              streaming={isStreaming}
              tone="reasoning"
              onProgress={onProgress}
              // Network-streamed text is already complete from this
              // component's perspective.  Do not run the legacy typewriter
              // completion callback when `streaming` flips to false: it also
              // collapses the disclosure and would override a reader who
              // expanded the finished reasoning while the answer arrived.
              onComplete={wasStreamed ? () => undefined : finishReasoning}
            />
          </div>
        </section>
      ) : null}
      {effectiveReasoningComplete ? (
        <TutorAnswer
          content={message.content}
          animate={shouldAnimateMessage && !isStreaming}
          streaming={isStreaming}
          onProgress={onProgress}
          onComplete={wasStreamed ? () => undefined : finishAnswer}
        />
      ) : null}
    </>
  );
}
