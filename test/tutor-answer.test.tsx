import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { splitTutorContent, validateMermaidSource } from "../src/code-learning/mermaid";
import {
  type EditorialTutorMessage,
  TutorAnswer,
  TutorAssistantMessage,
  TutorThinkingIndicator,
  useTutorAutoScroll,
} from "../src/code-learning/TutorAnswer";

describe("TutorAnswer", () => {
  it("uses the concise pending reasoning copy", () => {
    render(<TutorThinkingIndicator language="zh" />);
    expect(screen.getByText("思考中......")).toBeInTheDocument();
    expect(screen.queryByText(/正在等待模型返回思考过程/)).not.toBeInTheDocument();
  });

  it("follows typewriter progress only while the reader remains near the bottom", async () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      const { followLatest, scrollToBottom, updateFollowState } = useTutorAutoScroll(ref);
      return (
        <>
          <div ref={ref} data-testid="transcript" onScroll={updateFollowState} />
          <button type="button" onClick={scrollToBottom}>
            progress
          </button>
          <button type="button" onClick={followLatest}>
            follow
          </button>
        </>
      );
    }
    render(<Harness />);
    const transcript = screen.getByTestId("transcript");
    Object.defineProperties(transcript, {
      scrollHeight: { configurable: true, value: 1_000 },
      clientHeight: { configurable: true, value: 200 },
    });

    transcript.scrollTop = 300;
    fireEvent.scroll(transcript);
    fireEvent.click(screen.getByRole("button", { name: "progress" }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(transcript.scrollTop).toBe(300);

    transcript.scrollTop = 800;
    fireEvent.scroll(transcript);
    fireEvent.click(screen.getByRole("button", { name: "progress" }));
    await waitFor(() => expect(transcript.scrollTop).toBe(1_000));

    // A scroll can be queued while following and then become stale before the
    // animation frame runs. The frame must respect the reader's newer choice.
    transcript.scrollTop = 800;
    fireEvent.scroll(transcript);
    fireEvent.click(screen.getByRole("button", { name: "progress" }));
    transcript.scrollTop = 250;
    fireEvent.scroll(transcript);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(transcript.scrollTop).toBe(250);

    transcript.scrollTop = 120;
    fireEvent.scroll(transcript);
    fireEvent.click(screen.getByRole("button", { name: "follow" }));
    await waitFor(() => expect(transcript.scrollTop).toBe(1_000));
  });

  it("reveals a new answer and completes its typing state", async () => {
    const onComplete = vi.fn();
    render(
      <TutorAnswer
        content="The assignment needs an expression on its right-hand side."
        animate
        onProgress={() => undefined}
        onComplete={onComplete}
      />,
    );

    expect(await screen.findByText(/right-hand side/, {}, { timeout: 5_000 })).toBeInTheDocument();
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it("renders inline code alongside standard Markdown emphasis", async () => {
    const view = render(
      <TutorAnswer
        content="Use `x**2 + y**2`, and **then** compare the result."
        animate={false}
        onProgress={() => undefined}
        onComplete={() => undefined}
      />,
    );

    expect(screen.getByText("x**2 + y**2")).toHaveProperty("tagName", "CODE");
    expect(view.container.querySelector("strong")).toHaveTextContent("then");
  });

  it("renders reasoning as literal plaintext without Markdown, HTML, or Mermaid parsing", () => {
    const reasoning = [
      "  **literal emphasis** and `literal code`",
      '<img src="https://tracker.invalid/pixel" onerror="alert(1)">',
      "```mermaid",
      "pie showData",
      '  "A" : 1',
      '  "B" : 2',
      "```  ",
    ].join("\n");
    const view = render(
      <TutorAnswer
        content={reasoning}
        animate={false}
        tone="reasoning"
        onProgress={() => undefined}
        onComplete={() => undefined}
      />,
    );

    const output = view.container.querySelector('[data-format="plaintext"]');
    expect(output).toHaveTextContent(reasoning, { normalizeWhitespace: false });
    expect(output?.querySelector("strong, code, img, .ed-tutor-mermaid")).toBeNull();
    expect(output?.querySelector(".ed-tutor-plaintext")).toBeInTheDocument();
  });

  it("renders GFM, math, safe links, and language-aware highlighted code", () => {
    const answer = [
      "## Model result",
      "",
      "- **Estimate:** $\\hat\\beta = 1.25$",
      "- Use `summary(fit)`.",
      "",
      "| Term | Value |",
      "| --- | ---: |",
      "| x | 1.25 |",
      "",
      "[Documentation](https://example.com/docs)",
      "",
      "```r",
      "fit <- lm(y ~ x, data = sample)",
      "summary(fit)",
      "```",
      "",
      "```python",
      "for value in sample:",
      "    print(value)",
      "```",
    ].join("\n");
    const view = render(
      <TutorAnswer
        content={answer}
        animate={false}
        onProgress={() => undefined}
        onComplete={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Model result" })).toBeInTheDocument();
    expect(view.container.querySelector("table")).toBeInTheDocument();
    expect(view.container.querySelector(".katex")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "rel",
      "nofollow noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "target",
      "_blank",
    );

    const rCode = view.container.querySelector('code[data-language="r"]');
    const pythonCode = view.container.querySelector('code[data-language="python"]');
    expect(rCode).toHaveClass("hljs", "language-r");
    expect(rCode?.querySelector('[class^="hljs-"]')).toBeInTheDocument();
    expect(pythonCode).toHaveClass("hljs", "language-python");
    expect(pythonCode?.querySelector(".hljs-keyword")).toHaveTextContent("for");
  });

  it("drops raw HTML, blocks unsafe URLs, and never fetches Markdown images", () => {
    const view = render(
      <TutorAnswer
        content={[
          "Safe text.",
          '<script data-testid="unsafe-script">alert(1)</script>',
          '<img data-testid="unsafe-image" src="https://tracker.invalid/raw">',
          "![tracking pixel](https://tracker.invalid/markdown)",
          "[unsafe link](javascript:alert(1))",
        ].join("\n\n")}
        animate={false}
        onProgress={() => undefined}
        onComplete={() => undefined}
      />,
    );

    expect(view.container.querySelector("script, img")).toBeNull();
    expect(screen.getByText("[Image: tracking pixel]")).toBeInTheDocument();
    expect(screen.getByText("unsafe link").closest("a")).not.toHaveAttribute("href");
  });

  it("types reasoning first and exposes its disclosure", async () => {
    const message: EditorialTutorMessage = {
      id: "assistant-1",
      role: "assistant",
      reasoning: "Check the current parameters before interpreting the result.",
      content: "The interval covers the reference value.",
    };
    const typedMessageIdsRef = { current: new Set<string>() };

    const onProgress = vi.fn();
    const view = render(
      <TutorAssistantMessage
        message={message}
        language="en"
        animate
        typedMessageIdsRef={typedMessageIdsRef}
        onProgress={onProgress}
      />,
    );

    expect(screen.getByRole("button", { name: /AI is thinking/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      await screen.findByText(/covers the reference value/, {}, { timeout: 8_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI reasoning/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await waitFor(() => expect(typedMessageIdsRef.current.has(message.id)).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: /AI reasoning/i }));
    expect(screen.getByRole("button", { name: /AI reasoning/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // A composer update makes `animate` false on the next parent render. The
    // completed reasoning callback must not run again and collapse the trace.
    onProgress.mockClear();
    view.rerender(
      <TutorAssistantMessage
        message={message}
        language="en"
        animate
        typedMessageIdsRef={typedMessageIdsRef}
        onProgress={onProgress}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /AI reasoning/i })).toHaveAttribute(
        "aria-expanded",
        "true",
      ),
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("does not force the conversation to the bottom when a completed trace is toggled", async () => {
    const onProgress = vi.fn();
    render(
      <TutorAssistantMessage
        message={{
          id: "historical-assistant",
          role: "assistant",
          reasoning: "An older, already completed line of reasoning.",
          content: "An older answer.",
        }}
        language="en"
        animate={false}
        typedMessageIdsRef={{ current: new Set<string>() }}
        onProgress={onProgress}
      />,
    );

    await waitFor(() => expect(onProgress).toHaveBeenCalled());
    onProgress.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /AI reasoning/i }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("renders network deltas in place without starting a second typewriter", async () => {
    const typedMessageIdsRef = { current: new Set<string>() };
    const view = render(
      <TutorAssistantMessage
        message={{
          id: "streaming-assistant",
          role: "assistant",
          content: "",
          reasoning: "先检查",
          streaming: true,
          reasoningDone: false,
        }}
        language="zh"
        animate
        typedMessageIdsRef={typedMessageIdsRef}
        onProgress={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /AI 思考中/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("先检查")).toBeInTheDocument();

    view.rerender(
      <TutorAssistantMessage
        message={{
          id: "streaming-assistant",
          role: "assistant",
          content: "当前趋势为正。",
          reasoning: "先检查参数，再解释结果。",
          streaming: true,
          reasoningDone: true,
        }}
        language="zh"
        animate
        typedMessageIdsRef={typedMessageIdsRef}
        onProgress={() => undefined}
      />,
    );
    expect(screen.getByText("当前趋势为正。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI 思考过程.*展开/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: /AI 思考过程.*展开/ }));
    expect(screen.getByRole("button", { name: /AI 思考过程.*收起/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    view.rerender(
      <TutorAssistantMessage
        message={{
          id: "streaming-assistant",
          role: "assistant",
          content: "当前趋势为正。",
          reasoning: "先检查参数，再解释结果。",
          streaming: false,
          reasoningDone: true,
        }}
        language="zh"
        animate
        typedMessageIdsRef={typedMessageIdsRef}
        onProgress={() => undefined}
      />,
    );
    await waitFor(() => expect(screen.getByText("当前趋势为正。")).toBeVisible());
    expect(screen.getByRole("button", { name: /AI 思考过程.*收起/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("当前趋势为正。").closest(".ed-live-tutor-answer")).not.toHaveAttribute(
      "data-typing",
    );
  });

  it("finishes a streamed reasoning turn when answer and done are batched", async () => {
    const typedMessageIdsRef = { current: new Set<string>() };
    const view = render(
      <TutorAssistantMessage
        message={{
          id: "fast-streaming-assistant",
          role: "assistant",
          content: "",
          reasoning: "先检查参数。",
          streaming: true,
          reasoningDone: false,
        }}
        language="zh"
        animate
        typedMessageIdsRef={typedMessageIdsRef}
        onProgress={() => undefined}
      />,
    );

    // Some transports deliver message.delta and done in one decoded chunk,
    // allowing React to batch the two parent updates into this single render.
    view.rerender(
      <TutorAssistantMessage
        message={{
          id: "fast-streaming-assistant",
          role: "assistant",
          content: "当前趋势为正。",
          reasoning: "先检查参数。",
          streaming: false,
          reasoningDone: true,
        }}
        language="zh"
        animate
        typedMessageIdsRef={typedMessageIdsRef}
        onProgress={() => undefined}
      />,
    );

    expect(screen.getByText("当前趋势为正。")).toBeVisible();
    expect(screen.getByRole("button", { name: /AI 思考过程/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("当前趋势为正。").closest(".ed-live-tutor-answer")).not.toHaveAttribute(
      "data-typing",
    );
  });

  it("keeps an unfinished streamed Mermaid fence as code until it closes", () => {
    const chartPrefix = [
      "趋势如下：",
      "```mermaid",
      "xychart-beta",
      'x-axis "Week" ["1", "2"]',
      "y-axis 0 --> 10",
      "line [4, 8]",
    ].join("\n");
    const view = render(
      <TutorAnswer
        content={chartPrefix}
        animate
        streaming
        onProgress={() => undefined}
        onComplete={() => undefined}
      />,
    );

    expect(view.container.querySelector(".ed-tutor-mermaid")).not.toBeInTheDocument();
    expect(view.container.querySelector('pre[data-language="mermaid"]')).not.toHaveAttribute(
      "data-fence-complete",
    );

    view.rerender(
      <TutorAnswer
        content={`${chartPrefix}\n\`\`\``}
        animate
        streaming
        onProgress={() => undefined}
        onComplete={() => undefined}
      />,
    );
    expect(view.container.querySelector(".ed-tutor-mermaid")).toBeInTheDocument();
  });

  it("parses complete Mermaid fences repeatedly without leaking RegExp state", () => {
    const response = [
      "趋势如下：",
      "```mermaid",
      "xychart-beta",
      'title "Scores"',
      'x-axis "Week" ["1", "2"]',
      "y-axis 0 --> 10",
      "line [4, 8]",
      "```",
      "请继续观察。",
    ].join("\n");
    const first = splitTutorContent(response);
    const second = splitTutorContent(response);
    expect(first).toEqual(second);
    expect(first.some((part) => part.kind === "mermaid" && part.complete)).toBe(true);
    expect(
      validateMermaidSource(
        (first.find((part) => part.kind === "mermaid") as { source: string }).source,
      ),
    ).not.toBeNull();
  });

  it("keeps unsafe or excessive Mermaid output as escaped code", () => {
    const dangerous = [
      "```mermaid",
      '%%{init: {"securityLevel": "loose"}}%%',
      "pie",
      '"A" : 1',
      '"B" : 1',
      "```",
    ].join("\n");
    const parts = splitTutorContent(dangerous);
    expect(parts[0]).toMatchObject({ kind: "mermaid", complete: true });
    expect(validateMermaidSource((parts[0] as { source: string }).source)).toBeNull();

    const chart = [
      '```mermaid\nxychart-beta\ntitle "S"\nx-axis "x" ["1", "2"]\ny-axis 0 --> 10\nbar [1, 2]\n```',
    ].join("\n");
    const many = splitTutorContent(`${chart}\n${chart}\n${chart}`);
    expect(many.filter((part) => part.kind === "mermaid")).toHaveLength(1);
    expect(many.filter((part) => part.kind === "code")).toHaveLength(2);
  });

  it("requires unique non-empty names for every series in a multi-series XY chart", () => {
    const chart = (plots: string) =>
      ["xychart-beta", 'title "Scores"', 'x-axis "Week" ["1", "2"]', "y-axis 0 --> 10", plots].join(
        "\n",
      );

    expect(
      validateMermaidSource(chart('bar "Class A" [1, 2]\nline "Class B" [3, 4]')),
    ).not.toBeNull();
    expect(validateMermaidSource(chart("bar [1, 2]\nline [3, 4]"))).toBeNull();
    expect(validateMermaidSource(chart('bar "Class A" [1, 2]\nline "class a" [3, 4]'))).toBeNull();
    expect(validateMermaidSource(chart('bar "   " [1, 2]\nline "Class B" [3, 4]'))).toBeNull();
  });
});
