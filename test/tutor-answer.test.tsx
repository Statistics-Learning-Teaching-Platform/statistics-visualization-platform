import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type EditorialTutorMessage,
  TutorAnswer,
  TutorAssistantMessage,
  useTutorAutoScroll,
} from "../src/code-learning/TutorAnswer";
import { splitTutorContent, validateMermaidSource } from "../src/code-learning/mermaid";

describe("TutorAnswer", () => {
  it("follows typewriter progress only while the reader remains near the bottom", async () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      const { followLatest, scrollToBottom, updateFollowState } = useTutorAutoScroll(ref);
      return (
        <>
          <div ref={ref} data-testid="transcript" onScroll={updateFollowState} />
          <button type="button" onClick={scrollToBottom}>progress</button>
          <button type="button" onClick={followLatest}>follow</button>
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
        animate={false}
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
    expect(validateMermaidSource((first.find((part) => part.kind === "mermaid") as { source: string }).source)).not.toBeNull();
  });

  it("keeps unsafe or excessive Mermaid output as escaped code", () => {
    const dangerous = [
      "```mermaid",
      "%%{init: {\"securityLevel\": \"loose\"}}%%",
      "pie",
      '"A" : 1',
      '"B" : 1',
      "```",
    ].join("\n");
    const parts = splitTutorContent(dangerous);
    expect(parts[0]).toMatchObject({ kind: "mermaid", complete: true });
    expect(validateMermaidSource((parts[0] as { source: string }).source)).toBeNull();

    const chart = [
      "```mermaid\nxychart-beta\ntitle \"S\"\nx-axis \"x\" [\"1\", \"2\"]\ny-axis 0 --> 10\nbar [1, 2]\n```",
    ].join("\n");
    const many = splitTutorContent(`${chart}\n${chart}\n${chart}`);
    expect(many.filter((part) => part.kind === "mermaid")).toHaveLength(1);
    expect(many.filter((part) => part.kind === "code")).toHaveLength(2);
  });

  it("requires unique non-empty names for every series in a multi-series XY chart", () => {
    const chart = (plots: string) => [
      "xychart-beta",
      'title "Scores"',
      'x-axis "Week" ["1", "2"]',
      "y-axis 0 --> 10",
      plots,
    ].join("\n");

    expect(validateMermaidSource(chart('bar "Class A" [1, 2]\nline "Class B" [3, 4]'))).not.toBeNull();
    expect(validateMermaidSource(chart("bar [1, 2]\nline [3, 4]"))).toBeNull();
    expect(validateMermaidSource(chart('bar "Class A" [1, 2]\nline "class a" [3, 4]'))).toBeNull();
    expect(validateMermaidSource(chart('bar "   " [1, 2]\nline "Class B" [3, 4]'))).toBeNull();
  });
});
