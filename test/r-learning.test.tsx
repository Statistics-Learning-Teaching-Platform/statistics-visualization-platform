import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { RLearningWorkspace } from "../src/r-learning/RLearningWorkspace";
import { rLessons } from "../src/r-learning/lessons";
import { disposeWebRRuntime, runRCode } from "../src/r-learning/webrRuntime";
import { resetPortalSessionCache } from "../src/auth/session";

vi.mock("../src/r-learning/webrRuntime", () => ({
  runRCode: vi.fn(async () => ({
    console: ["[1] 80.8"],
    image: null,
    environment: ["average_score", "scores"],
  })),
  checkRCode: vi.fn(async () => true),
  resetRSession: vi.fn(async () => undefined),
  disposeWebRRuntime: vi.fn(),
}));

function renderWorkspace() {
  return render(
    <LanguageProvider>
      <RLearningWorkspace />
    </LanguageProvider>,
  );
}

function courseNavigation() {
  return screen.getByRole("navigation", { name: "R 练习" });
}

describe("R Coding Studio", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    resetPortalSessionCache();
    window.history.replaceState({}, "", "/r-learning");
  });

  it("renders the expanded thirty-nine-lesson curriculum and the starter editor", () => {
    renderWorkspace();
    expect(screen.getByText("R 练习")).toBeInTheDocument();
    const navigation = courseNavigation();
    expect(within(navigation).getAllByRole("button")).toHaveLength(39);
    expect(
      (screen.getByRole("textbox", { name: "R 代码编辑器" }) as HTMLTextAreaElement).value,
    ).toContain("average_score <-");
  });

  it("ignores progress entries that do not belong to the current curriculum", () => {
    localStorage.setItem("statmind-r-learning-progress-v1", JSON.stringify(["removed-lesson"]));
    renderWorkspace();
    expect(screen.getByLabelText("学习进度: 0%")).toBeInTheDocument();
  });

  it("uses captured graphics and trusted global lookups in lesson checks", () => {
    expect(rLessons[2].checkCode).toContain(".statmind_had_plot");
    expect(rLessons.every((lesson) => lesson.checkCode.includes("envir = user"))).toBe(true);
  });

  it("disposes the WebR runtime when the workspace unmounts", () => {
    const view = renderWorkspace();
    view.unmount();
    expect(disposeWebRRuntime).toHaveBeenCalledTimes(1);
  });

  it("cancels and resets the runtime when switching lessons", async () => {
    renderWorkspace();
    const navigation = courseNavigation();

    await userEvent.click(within(navigation).getAllByRole("button")[1]);

    expect(disposeWebRRuntime).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/点击运行时加载 R/)).toBeInTheDocument();
    expect(document.querySelector(".ed-code-cell")).toHaveAttribute("data-engine-status", "idle");
  });

  it("reveals staged hints and records a passed automatic check", async () => {
    renderWorkspace();
    // Stage-based hint disclosure replaces the single-shot hint button.
    await userEvent.click(screen.getByRole("button", { name: /卡住了？给我一个提示/ }));
    expect(screen.getByText(/先确认要保存的是一个计算结果/)).toBeInTheDocument();

    // The check action appears once a run has produced output.
    await userEvent.click(screen.getByRole("button", { name: "运行代码" }));
    await userEvent.click(await screen.findByRole("button", { name: "检查答案" }));
    expect(await screen.findByText(/正确保存了它的均值 80.8/)).toBeInTheDocument();
    expect(screen.getByLabelText("学习进度: 3%")).toBeInTheDocument();
  });

  it("releases the previous ImageBitmap when its plot is cleared", async () => {
    const close = vi.fn();
    const image = { width: 2, height: 2, close } as unknown as ImageBitmap;
    vi.mocked(runRCode).mockResolvedValueOnce({ console: [], image, environment: [] });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: "运行代码" }));
    expect(await screen.findByLabelText("R plot output")).toBeInTheDocument();
    const navigation = courseNavigation();
    await userEvent.click(within(navigation).getAllByRole("button")[1]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("sends the current lesson context to the AI R tutor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/api/auth/me")) {
        return new Response(JSON.stringify({ user: { username: "student01", role: "student" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        answer: "The assignment is incomplete because the right-hand side is missing.",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderWorkspace();

    // The tutor lives in an on-demand drawer behind its launcher.
    await userEvent.click(screen.getByRole("button", { name: /AI R 助教/ }));
    const input = screen.getByRole("textbox", { name: /问报错原因/ });
    await userEvent.type(input, "为什么这段代码报错？");
    await userEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText(/right-hand side is missing/)).toBeInTheDocument();
    const tutorCall = fetchMock.mock.calls.find(([, init]) => Boolean(init?.body));
    expect(tutorCall?.[0]).toContain("/st-qselector/api/ai/r-tutor");
    const request = JSON.parse(String(tutorCall?.[1]?.body));
    expect(request.question).toBe("为什么这段代码报错？");
    expect(request.lesson.title).toBe("保存一组成绩并计算均值");
    expect(request.code).toContain("average_score <-");
    fetchMock.mockRestore();
  });

  it("gates the AI tutor behind sign-in while anonymous", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ error: "请先登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }));
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /AI R 助教/ }));
    expect(await screen.findByText("AI 助教需要登录")).toBeInTheDocument();
    const loginLink = screen.getByRole("link", { name: "前往登录" });
    expect(loginLink.getAttribute("href")).toContain("/st-qselector/login?next=");
    expect(screen.queryByRole("textbox", { name: /问报错原因/ })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("/api/ai/r-tutor"))).toBe(true);
    fetchMock.mockRestore();
  });

  it("does not start duplicate executions from repeated keyboard shortcuts", async () => {
    let resolveRun!: (result: { console: string[]; image: null; environment: string[] }) => void;
    vi.mocked(runRCode).mockImplementationOnce(() => new Promise((resolve) => { resolveRun = resolve; }));
    renderWorkspace();
    const editor = screen.getByRole("textbox", { name: "R 代码编辑器" });

    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    expect(runRCode).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRun({ console: ["done"], image: null, environment: [] });
      await Promise.resolve();
    });
    expect(await screen.findByText("done")).toBeInTheDocument();
  });

  it("selects a valid lesson from the course query and keeps the return route", () => {
    window.history.replaceState({}, "", "/r-learning?topicId=central-limit-theorem&lessonId=sampling-simulation&returnTo=%2Flearn%2Fsampling%2Fcentral-limit-theorem");
    renderWorkspace();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/抽样分布/);
    expect(screen.getByRole("link", { name: /返回主界面/ })).toHaveAttribute("href", "/learn/sampling/central-limit-theorem");
  });
});

describe("WebR runtime lifecycle", () => {
  it("limits output and releases captured R objects and unused images", async () => {
    const unusedClose = vi.fn();
    const selectedClose = vi.fn();
    const destroy = vi.fn(async () => undefined);
    const close = vi.fn();
    const interrupt = vi.fn();
    const constructorOptions: unknown[] = [];
    const capturedResult = {};

    vi.doMock("webr", () => ({
      WebR: class MockWebR {
        globalShelter = {
          captureR: vi.fn(async () => ({
            result: capturedResult,
            output: [{ data: "x".repeat(70_000) }],
            images: [
              { width: 1, height: 1, close: unusedClose },
              { width: 2, height: 2, close: selectedClose },
            ],
          })),
          destroy,
        };
        evalRRaw = vi.fn(async () => ["answer"]);
        init = vi.fn(async () => undefined);
        close = close;
        interrupt = interrupt;

        constructor(options: unknown) {
          constructorOptions.push(options);
        }
      },
    }));
    vi.resetModules();
    const runtime = await vi.importActual<typeof import("../src/r-learning/webrRuntime")>(
      "../src/r-learning/webrRuntime",
    );

    const result = await runtime.runRCode("answer <- 42");
    expect(result.console[0]).toHaveLength(64 * 1024);
    expect(result.console.at(-1)).toContain("输出已截断");
    expect(unusedClose).toHaveBeenCalledTimes(1);
    expect(selectedClose).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledWith(capturedResult);
    expect(constructorOptions).toEqual([
      expect.objectContaining({ baseUrl: expect.stringContaining("/runtime/webr/0.6.0/") }),
    ]);

    result.image?.close();
    runtime.disposeWebRRuntime();
    expect(selectedClose).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    vi.doUnmock("webr");
  });

  it("closes a timed-out runtime and creates a fresh one for the next run", async () => {
    vi.useFakeTimers();
    const instances: Array<{ close: ReturnType<typeof vi.fn>; interrupt: ReturnType<typeof vi.fn> }> = [];
    let instanceNumber = 0;
    let firstCaptureStarted = false;
    vi.doMock("webr", () => ({
      WebR: class MockWebR {
        number = ++instanceNumber;
        close = vi.fn();
        interrupt = vi.fn();
        globalShelter = {
          captureR: vi.fn(() => {
            if (this.number === 1) {
              firstCaptureStarted = true;
              return new Promise(() => undefined);
            }
            return Promise.resolve({ result: {}, output: [], images: [] });
          }),
          destroy: vi.fn(async () => undefined),
        };
        evalRRaw = vi.fn(async () => []);
        init = vi.fn(async () => undefined);

        constructor() {
          instances.push(this);
        }
      },
    }));
    vi.resetModules();
    const runtime = await vi.importActual<typeof import("../src/r-learning/webrRuntime")>(
      "../src/r-learning/webrRuntime",
    );
    const firstRun = runtime.runRCode("while (TRUE) {} ");
    const timedOut = expect(firstRun).rejects.toThrow("R 运行超过时间限制");
    for (let tick = 0; tick < 10 && !firstCaptureStarted; tick += 1) {
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(firstCaptureStarted).toBe(true);
    await vi.advanceTimersByTimeAsync(20_000);
    await timedOut;
    expect(instances[0].interrupt).toHaveBeenCalled();
    expect(instances[0].close).toHaveBeenCalled();

    await expect(runtime.runRCode("answer <- 42")).resolves.toEqual({
      console: [],
      image: null,
      environment: [],
    });
    expect(instances).toHaveLength(2);
    await runtime.resetRSession();
    expect(instances[1].close).toHaveBeenCalled();
    await expect(runtime.runRCode("answer <- 43")).resolves.toEqual({
      console: [],
      image: null,
      environment: [],
    });
    expect(instances).toHaveLength(3);
    runtime.disposeWebRRuntime();
    vi.useRealTimers();
    vi.doUnmock("webr");
  });
});
