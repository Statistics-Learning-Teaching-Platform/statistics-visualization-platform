import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { PythonLearningWorkspace } from "../src/python-learning/PythonLearningWorkspace";
import { pythonLessons } from "../src/python-learning/lessons";
import { disposePythonRuntime } from "../src/python-learning/pyodideRuntime";

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

describe("Python Coding Studio", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/python-learning");
  });

  it("renders the expanded thirty-one-lesson curriculum and Python starter editor", () => {
    renderWorkspace();
    expect(screen.getByText("Python 语言编程工作室")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "课程" });
    expect(within(navigation).getAllByRole("button")).toHaveLength(31);
    expect(
      (screen.getByRole("textbox", { name: "Python 代码编辑器" }) as HTMLTextAreaElement).value,
    ).toContain("mean_score =");
  });

  it("ignores progress entries that do not belong to the current curriculum", () => {
    localStorage.setItem("statmind-python-learning-progress-v1", JSON.stringify(["removed-lesson"]));
    renderWorkspace();
    expect(screen.getByLabelText("学习进度: 0%")).toBeInTheDocument();
  });

  it("checks trusted expected values through the isolated user namespace", () => {
    expect(pythonLessons.every((lesson) => lesson.checkCode.includes("user.get"))).toBe(true);
    expect(pythonLessons[4].checkCode).toContain('getattr(user.get("result"), "statistic"');
    expect(pythonLessons[5].checkCode).toContain('getattr(user.get("model"), "slope"');
    expect(pythonLessons[7].checkCode).toContain("'wait' in user");
    expect(pythonLessons[7].checkCode).not.toContain("globals()");
    expect(pythonLessons[14].checkCode).toContain('isinstance(user.get("python_version"), type(""))');
    expect(pythonLessons[29].checkCode).toContain('getattr(user.get("posthoc"), \'summary\', None)');
  });

  it("disposes the Python worker when the workspace unmounts", () => {
    const view = renderWorkspace();
    view.unmount();
    expect(disposePythonRuntime).toHaveBeenCalledTimes(1);
  });

  it("cancels and resets the worker when switching lessons", async () => {
    renderWorkspace();
    const navigation = screen.getByRole("navigation", { name: "课程" });

    await userEvent.click(within(navigation).getAllByRole("button")[1]);

    expect(disposePythonRuntime).toHaveBeenCalledTimes(1);
    expect(screen.getByText("点击运行时加载 Python")).toHaveAttribute("data-status", "idle");
  });

  it("reveals a hint and records a passed automatic check", async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole("button", { name: "? 提示 +" }));
    expect(screen.getByText(/sum\(scores\)/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "✓ 检查答案" }));
    expect(await screen.findByText(/列表与样本均值均正确/)).toBeInTheDocument();
    expect(screen.getByLabelText("学习进度: 3%")).toBeInTheDocument();
  });

  it("sends the current lesson context to the AI Python tutor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      answer: "The assignment needs an expression on its right-hand side.",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    renderWorkspace();

    const input = screen.getByRole("textbox", { name: /问报错原因/ });
    await userEvent.type(input, "为什么这段代码报错？");
    await userEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText(/right-hand side/)).toBeInTheDocument();
    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.question).toBe("为什么这段代码报错？");
    expect(request.lesson.title).toBe("用列表计算样本均值");
    expect(request.code).toContain("mean_score =");
    fetchMock.mockRestore();
  });

  it("aborts and ignores a tutor response after switching lessons", async () => {
    let resolveFetch!: (response: Response) => void;
    let requestSignal: AbortSignal | null = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementationOnce((_input, init) => {
      requestSignal = init?.signal as AbortSignal;
      return new Promise<Response>((resolve) => { resolveFetch = resolve; });
    });
    renderWorkspace();

    await userEvent.type(screen.getByRole("textbox", { name: /问报错原因/ }), "旧课程问题");
    await userEvent.click(screen.getByRole("button", { name: "发送" }));
    const navigation = screen.getByRole("navigation", { name: "课程" });
    await userEvent.click(within(navigation).getAllByRole("button")[1]);
    expect(requestSignal).not.toBeNull();
    expect((requestSignal as unknown as AbortSignal).aborted).toBe(true);

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({ answer: "不应显示的旧课程回答" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
      await Promise.resolve();
    });
    expect(screen.queryByText("不应显示的旧课程回答")).not.toBeInTheDocument();
    expect(within(navigation).getByText("标准化一组观测值")).toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it("selects a valid lesson from the course query and keeps the return route", () => {
    window.history.replaceState({}, "", "/python-learning?topicId=central-limit-theorem&lessonId=sampling-simulation&returnTo=%2Flearn%2Fsampling%2Fcentral-limit-theorem");
    renderWorkspace();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/抽样分布/);
    expect(screen.getByRole("link", { name: /返回主界面/ })).toHaveAttribute("href", "/learn/sampling/central-limit-theorem");
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
        const result = request.kind === "run"
          ? { console: ["recovered"], plotUrl: null, environment: [] }
          : true;
        queueMicrotask(() => this.messageListener?.({
          data: { id: request.id, ok: true, result },
        }));
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
