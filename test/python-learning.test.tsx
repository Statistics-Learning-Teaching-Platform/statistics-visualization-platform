import { LanguageProvider } from "@stats-viz/shared/i18n";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPortalSessionCache } from "../src/auth/session";
import { AI_MODEL_CACHE_STORAGE_KEY } from "../src/code-learning/tutorModels";
import { pythonLessons } from "../src/python-learning/lessons";
import { PythonLearningWorkspace } from "../src/python-learning/PythonLearningWorkspace";
import { disposePythonRuntime, resetPythonSession } from "../src/python-learning/pyodideRuntime";

vi.mock("../src/python-learning/pyodideRuntime", () => ({
  runPythonCode: vi.fn(async () => ({
    console: ["80.8"],
    plotUrl: null,
    environment: [
      { name: "average_score", type: "float", preview: "80.8" },
      { name: "scores", type: "list", preview: "[72, 81, 76, 90, 85]" },
    ],
  })),
  checkPythonCode: vi.fn(async () => true),
  resetPythonSession: vi.fn(async () => undefined),
  disposePythonRuntime: vi.fn(),
}));

function renderWorkspace() {
  return render(
    <LanguageProvider>
      <PythonLearningWorkspace />
    </LanguageProvider>,
  );
}

function courseNavigation() {
  return screen.getByRole("navigation", { name: "Python 练习" });
}

async function openTutorDrawer() {
  await userEvent.click(screen.getByRole("button", { name: /AI Python 助教/ }));
}

function tutorStreamResponse(answer: string, reasoning?: string) {
  const records = [
    ...(reasoning
      ? [`event: reasoning.delta\ndata: ${JSON.stringify({ delta: reasoning })}\n\n`]
      : []),
    `event: message.delta\ndata: ${JSON.stringify({ delta: answer })}\n\n`,
    "event: done\ndata: {}\n\n",
  ];
  return new Response(records.join(""), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function controlledTutorStream() {
  const encoder = new TextEncoder();
  let streamController!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
  return {
    response,
    emit(type: "reasoning.delta" | "message.delta" | "done", data: object) {
      streamController.enqueue(
        encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`),
      );
    },
    close() {
      streamController.close();
    },
  };
}

describe("Python Coding Studio", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    resetPortalSessionCache();
    window.history.replaceState({}, "", "/python-learning");
  });

  it("renders the expanded forty-three-lesson curriculum and Python starter editor", () => {
    renderWorkspace();
    expect(screen.getByText("Python 练习")).toBeInTheDocument();
    const navigation = courseNavigation();
    expect(within(navigation).getAllByRole("button")).toHaveLength(43);
    expect(screen.getByRole("textbox", { name: "Python 代码编辑器" }).textContent).toContain(
      "mean_score =",
    );
  });

  it("ignores progress entries that do not belong to the current curriculum", () => {
    localStorage.setItem(
      "statmind-python-learning-progress-v1",
      JSON.stringify(["removed-lesson"]),
    );
    renderWorkspace();
    expect(screen.getByLabelText("学习进度: 0%")).toBeInTheDocument();
  });

  it("checks trusted expected values through the isolated user namespace", () => {
    expect(pythonLessons.every((lesson) => lesson.checkCode.includes("user.get"))).toBe(true);
    expect(pythonLessons[4].checkCode).toContain('getattr(user.get("result"), "statistic"');
    expect(pythonLessons[5].checkCode).toContain('getattr(user.get("model"), "slope"');
    expect(pythonLessons[7].checkCode).toContain("'wait' in user");
    expect(pythonLessons[7].checkCode).not.toContain("globals()");
    expect(pythonLessons[14].checkCode).toContain(
      'isinstance(user.get("python_version"), type(""))',
    );
    expect(pythonLessons[29].checkCode).toContain(
      "getattr(user.get(\"posthoc\"), 'summary', None)",
    );
  });

  it("disposes the Python worker when the workspace unmounts", () => {
    const view = renderWorkspace();
    view.unmount();
    expect(disposePythonRuntime).toHaveBeenCalledTimes(1);
  });

  it("cancels and resets the worker when switching lessons", async () => {
    renderWorkspace();
    const navigation = courseNavigation();

    await userEvent.click(within(navigation).getAllByRole("button")[1]);

    expect(disposePythonRuntime).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/点击运行时加载 Python/)).toBeInTheDocument();
    expect(document.querySelector(".ed-code-cell")).toHaveAttribute("data-engine-status", "idle");
  });

  it("ignores a late clear-session completion after switching lessons", async () => {
    let finishReset!: () => void;
    vi.mocked(resetPythonSession).mockImplementationOnce(
      () => new Promise<void>((resolve) => { finishReset = resolve; }),
    );
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: "清空 Python 会话" }));
    const navigation = courseNavigation();
    await userEvent.click(within(navigation).getAllByRole("button")[1]);
    expect(document.querySelector(".ed-code-cell")).toHaveAttribute("data-engine-status", "idle");

    await act(async () => {
      finishReset();
      await Promise.resolve();
    });
    expect(screen.queryByText("Python 会话已清空。")).not.toBeInTheDocument();
    expect(document.querySelector(".ed-code-cell")).toHaveAttribute("data-engine-status", "idle");
  });

  it("drops a late run from the previous lesson", async () => {
    const runtime = await import("../src/python-learning/pyodideRuntime");
    let finishRun!: (result: Awaited<ReturnType<typeof runtime.runPythonCode>>) => void;
    vi.mocked(runtime.runPythonCode).mockImplementationOnce(
      () => new Promise((resolve) => { finishRun = resolve; }),
    );
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: "运行代码" }));
    const navigation = courseNavigation();
    await userEvent.click(within(navigation).getAllByRole("button")[1]);
    await act(async () => {
      finishRun({
        console: ["绝不能写回的旧运行结果"],
        plotUrl: null,
        environment: [{ name: "stale", type: "int", preview: "1" }],
      });
      await Promise.resolve();
    });

    expect(screen.queryByText("绝不能写回的旧运行结果")).not.toBeInTheDocument();
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
    expect(await screen.findByText(/列表与样本均值均正确/)).toBeInTheDocument();
    expect(screen.getByLabelText("学习进度: 2%")).toBeInTheDocument();
  });

  it("sends the current lesson context to the AI Python tutor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/api/auth/me")) {
        return new Response(JSON.stringify({ user: { username: "student01", role: "student" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(input).includes("/api/ai/models")) {
        return new Response(
          JSON.stringify({
            models: [
              {
                key: "loaded-model",
                displayName: "Loaded model",
                quantization: "Q8",
                params: "9B",
                loaded: true,
              },
              {
                key: "inactive-model",
                displayName: "Inactive model",
                quantization: "Q4",
                params: "8B",
                loaded: false,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return tutorStreamResponse("The assignment needs an expression on its right-hand side.");
    });
    renderWorkspace();

    // The tutor lives in an on-demand drawer behind its launcher.
    await openTutorDrawer();
    const scanButton = await screen.findByRole("button", { name: "扫描在线模型" });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/ai/models"))).toBe(
      false,
    );
    const sendButton = screen.getByRole("button", { name: "发送" });
    expect(sendButton).toBeDisabled();

    await userEvent.click(scanButton);
    const modelSelect = await screen.findByLabelText("AI 模型");
    const inactiveOption = within(modelSelect).getByRole("option", {
      name: /Inactive model · Q4 · 未启用/,
    });
    expect(inactiveOption).toBeDisabled();
    await userEvent.selectOptions(modelSelect, "inactive-model");
    expect(modelSelect).toHaveValue("");
    expect(sendButton).toBeDisabled();

    await userEvent.selectOptions(modelSelect, "loaded-model");
    const input = screen.getByRole("textbox", { name: /问报错原因/ });
    await userEvent.type(input, "为什么这段代码报错？");
    expect(sendButton).toBeEnabled();
    await userEvent.click(sendButton);

    // The assistant answer is revealed by the real SSE token stream.
    const conversation = screen.getByRole("log", { name: "AI 助教对话" });
    expect(
      await within(conversation).findByText(/right-hand side/, {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    const tutorCall = fetchMock.mock.calls.find(([, init]) => Boolean(init?.body));
    expect(tutorCall?.[0]).toContain("/st-qselector/api/ai/python-tutor");
    const request = JSON.parse(String(tutorCall?.[1]?.body));
    expect(request.question).toBe("为什么这段代码报错？");
    expect(request.model).toBe("loaded-model");
    expect(request.lesson.title).toBe("用列表计算样本均值");
    expect(request.code).toContain("mean_score =");
    const staleModelError = "所选模型当前未启用或已被移除，请重新扫描并选择";
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: staleModelError }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    }));
    await userEvent.type(input, "再解释一次");
    await userEvent.click(sendButton);
    expect(await within(conversation).findByText(staleModelError, {}, { timeout: 5_000 })).toBeInTheDocument();
    await waitFor(() => expect(modelSelect).toHaveValue(""));
    expect(within(modelSelect).queryByRole("option", { name: /Loaded model/ })).not.toBeInTheDocument();
    expect(scanButton).toBeEnabled();
    expect(localStorage.getItem(AI_MODEL_CACHE_STORAGE_KEY)).toBeNull();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/ai/models"))).toHaveLength(1);
    fetchMock.mockRestore();
  }, 15_000);

  it("gates the AI tutor behind sign-in while anonymous", async () => {
    window.history.replaceState({}, "", "/python-learning?topic=mean#editor");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: "请先登录" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );
    renderWorkspace();

    await openTutorDrawer();
    expect(await screen.findByText("AI 助教需要登录")).toBeInTheDocument();
    const loginLink = screen.getByRole("link", { name: "前往登录" });
    expect(loginLink).toHaveAttribute(
      "href",
      "/st-qselector/login?next=%2Fpython-learning%3Ftopic%3Dmean%23editor",
    );
    expect(screen.queryByRole("textbox", { name: /问报错原因/ })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.every(([url]) => !String(url).includes("/api/ai/python-tutor")),
    ).toBe(true);
    fetchMock.mockRestore();
  });

  it("aborts and ignores a tutor response after switching lessons", async () => {
    let resolveFetch!: (response: Response) => void;
    let requestSignal: AbortSignal | null = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).includes("/api/auth/me")) {
        return new Response(JSON.stringify({ user: { username: "student01", role: "student" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(input).includes("/api/ai/models")) {
        return new Response(
          JSON.stringify({
            models: [
              {
                key: "loaded-model",
                displayName: "Loaded model",
                quantization: "Q8",
                params: "9B",
                loaded: true,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      requestSignal = init?.signal as AbortSignal;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });
    renderWorkspace();

    await openTutorDrawer();
    await userEvent.click(screen.getByRole("button", { name: "扫描在线模型" }));
    await userEvent.selectOptions(await screen.findByLabelText("AI 模型"), "loaded-model");
    await userEvent.type(screen.getByRole("textbox", { name: /问报错原因/ }), "旧课程问题");
    await userEvent.click(screen.getByRole("button", { name: "发送" }));
    const navigation = courseNavigation();
    await userEvent.click(within(navigation).getAllByRole("button")[1]);
    expect(requestSignal).not.toBeNull();
    expect((requestSignal as unknown as AbortSignal).aborted).toBe(true);

    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ answer: "不应显示的旧课程回答" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      await Promise.resolve();
    });
    expect(screen.queryByText("不应显示的旧课程回答")).not.toBeInTheDocument();
    expect(within(navigation).getByText("标准化一组观测值")).toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it("ends and preserves a partial reasoning stream when the tutor drawer closes", async () => {
    let requestSignal: AbortSignal | null = null;
    const stream = controlledTutorStream();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).includes("/api/auth/me")) {
        return new Response(JSON.stringify({ user: { username: "student01", role: "student" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(input).includes("/api/ai/models")) {
        return new Response(
          JSON.stringify({
            models: [{ key: "loaded-model", displayName: "Loaded model", loaded: true }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      requestSignal = init?.signal as AbortSignal;
      return stream.response;
    });
    renderWorkspace();

    await openTutorDrawer();
    await userEvent.click(screen.getByRole("button", { name: "扫描在线模型" }));
    await userEvent.selectOptions(await screen.findByLabelText("AI 模型"), "loaded-model");
    await userEvent.type(screen.getByRole("textbox", { name: /问报错原因/ }), "关闭前的问题");
    await userEvent.click(screen.getByRole("button", { name: "发送" }));

    const partialReasoning = "先检查当前代码和运行结果，再继续定位问题。";
    await act(async () => {
      stream.emit("reasoning.delta", { delta: partialReasoning });
      await Promise.resolve();
    });
    expect(await screen.findByText(partialReasoning)).toBeVisible();

    const dialog = screen.getByRole("dialog", { name: /AI Python 助教/ });
    await userEvent.click(within(dialog).getByRole("button", { name: "关闭 AI 助教" }));
    expect((requestSignal as unknown as AbortSignal).aborted).toBe(true);

    await act(async () => {
      stream.close();
      await Promise.resolve();
    });

    await openTutorDrawer();
    expect(await screen.findByRole("button", { name: "扫描在线模型" })).toBeEnabled();
    const conversation = screen.getByRole("log", { name: "AI 助教对话" });
    expect(conversation.querySelectorAll('article[data-role="assistant"]')).toHaveLength(1);
    const disclosure = within(conversation).getByRole("button", {
      name: /AI 思考过程.*展开/,
    });
    expect(within(conversation).queryByText("思考中......")).not.toBeInTheDocument();
    await userEvent.click(disclosure);
    expect(within(conversation).getByText(partialReasoning)).toBeVisible();
    fetchMock.mockRestore();
  });

  it("settles a still-current tutor request when the transport throws AbortError", async () => {
    let requestSignal: AbortSignal | null = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).includes("/api/auth/me")) {
        return new Response(JSON.stringify({ user: { username: "student01", role: "student" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(input).includes("/api/ai/models")) {
        return new Response(
          JSON.stringify({
            models: [{ key: "loaded-model", displayName: "Loaded model", loaded: true }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      requestSignal = init?.signal ?? null;
      throw new DOMException("The connection ended unexpectedly", "AbortError");
    });
    renderWorkspace();

    await openTutorDrawer();
    await userEvent.click(screen.getByRole("button", { name: "扫描在线模型" }));
    await userEvent.selectOptions(await screen.findByLabelText("AI 模型"), "loaded-model");
    await userEvent.type(screen.getByRole("textbox", { name: /问报错原因/ }), "连接异常测试");
    await userEvent.click(screen.getByRole("button", { name: "发送" }));

    const conversation = screen.getByRole("log", { name: "AI 助教对话" });
    expect(
      await within(conversation).findByText("AI 助教暂时无法连接，请稍后再试。"),
    ).toBeInTheDocument();
    expect((requestSignal as unknown as AbortSignal).aborted).toBe(false);
    expect(conversation.querySelectorAll('article[data-role="assistant"]')).toHaveLength(1);
    expect(within(conversation).queryByText("AI 正在回答…")).not.toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it("selects a valid lesson from the course query and keeps the return route", () => {
    window.history.replaceState(
      {},
      "",
      "/python-learning?topicId=central-limit-theorem&lessonId=sampling-simulation&returnTo=%2Flearn%2Fsampling%2Fcentral-limit-theorem",
    );
    renderWorkspace();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/抽样分布/);
    expect(screen.getByRole("link", { name: /返回主界面/ })).toHaveAttribute(
      "href",
      "/learn/sampling/central-limit-theorem",
    );
  });
});

describe("Pyodide worker lifecycle", () => {
  it("terminates a timed-out worker and recovers with a fresh worker", async () => {
    vi.useFakeTimers();
    const workers: FakeWorker[] = [];

    class FakeWorker {
      readonly number = workers.length + 1;
      readonly terminate = vi.fn();
      private messageListener?: (event: { data: unknown }) => void;

      constructor() {
        workers.push(this);
      }

      addEventListener(type: string, listener: (event: never) => void) {
        if (type === "message") {
          this.messageListener = listener as (event: { data: unknown }) => void;
        }
      }

      postMessage(request: { id: number; kind: string }) {
        if (request.kind === "run" && this.number === 1) return;
        const result =
          request.kind === "run"
            ? { console: ["recovered"], plotUrl: null, environment: [] }
            : true;
        queueMicrotask(() =>
          this.messageListener?.({
            data: { id: request.id, ok: true, result },
          }),
        );
      }
    }

    vi.stubGlobal("Worker", FakeWorker);
    vi.resetModules();
    const runtime = await vi.importActual<typeof import("../src/python-learning/pyodideRuntime")>(
      "../src/python-learning/pyodideRuntime",
    );
    const firstRun = runtime.runPythonCode("while True:\n    pass");
    const timedOut = expect(firstRun).rejects.toThrow("Python 运行超过时间限制");
    await vi.advanceTimersByTimeAsync(20_000);
    await timedOut;
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);

    await expect(runtime.runPythonCode("print('ok')")).resolves.toEqual({
      console: ["recovered"],
      plotUrl: null,
      environment: [],
    });
    expect(workers).toHaveLength(2);
    await runtime.resetPythonSession();
    expect(workers[1].terminate).toHaveBeenCalledTimes(1);
    await expect(runtime.runPythonCode("print('fresh')")).resolves.toEqual({
      console: ["recovered"],
      plotUrl: null,
      environment: [],
    });
    expect(workers).toHaveLength(3);
    runtime.disposePythonRuntime();
    expect(workers[2].terminate).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
