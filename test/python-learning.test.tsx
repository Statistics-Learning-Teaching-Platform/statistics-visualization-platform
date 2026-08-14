import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { PythonLearningWorkspace } from "../src/python-learning/PythonLearningWorkspace";

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
    expect(request.topicId).toBe("descriptive-statistics");
    expect(request.lessonId).toBe("lists-and-mean");
    expect(request.learningObjective).toContain("列表");
    expect(request.currentCode).toContain("mean_score =");
    expect(request.consoleOutput).toEqual([]);
    expect(request.lesson.title).toBe("用列表计算样本均值");
    expect(request.code).toContain("mean_score =");
    fetchMock.mockRestore();
  });

  it("selects a valid lesson from the course query and keeps the return route", () => {
    window.history.replaceState({}, "", "/python-learning?topicId=central-limit-theorem&lessonId=sampling-simulation&returnTo=%2Flearn%2Fsampling%2Fcentral-limit-theorem");
    renderWorkspace();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/抽样分布/);
    expect(screen.getByRole("link", { name: /返回主界面/ })).toHaveAttribute("href", "/learn/sampling/central-limit-theorem");
  });
});
