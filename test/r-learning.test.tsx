import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { RLearningWorkspace } from "../src/r-learning/RLearningWorkspace";

vi.mock("../src/r-learning/webrRuntime", () => ({
  runRCode: vi.fn(async () => ({
    console: ["[1] 80.8"],
    image: null,
    environment: ["average_score", "scores"],
  })),
  checkRCode: vi.fn(async () => true),
  resetRSession: vi.fn(async () => undefined),
}));

function renderWorkspace() {
  return render(
    <LanguageProvider>
      <RLearningWorkspace />
    </LanguageProvider>,
  );
}

describe("R Coding Studio", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the six-lesson curriculum and the starter editor", () => {
    renderWorkspace();
    expect(screen.getByText("R 语言编程工作室")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "课程" });
    expect(within(navigation).getAllByRole("button")).toHaveLength(6);
    expect(
      (screen.getByRole("textbox", { name: "R 代码编辑器" }) as HTMLTextAreaElement).value,
    ).toContain("average_score <-");
  });

  it("reveals a hint and records a passed automatic check", async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole("button", { name: "? 提示 +" }));
    expect(screen.getByText(/接受一个数值向量/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "✓ 检查答案" }));
    expect(await screen.findByText(/正确保存了它的均值 80.8/)).toBeInTheDocument();
    expect(screen.getByLabelText("学习进度: 17%")).toBeInTheDocument();
  });

  it("sends the current lesson context to the AI R tutor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      answer: "The assignment is incomplete because the right-hand side is missing.",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    renderWorkspace();

    const input = screen.getByRole("textbox", { name: /问报错原因/ });
    await userEvent.type(input, "为什么这段代码报错？");
    await userEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText(/right-hand side is missing/)).toBeInTheDocument();
    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.question).toBe("为什么这段代码报错？");
    expect(request.topicId).toBe("descriptive-statistics");
    expect(request.lessonId).toBe("vectors-and-mean");
    expect(request.learningObjective).toContain("创建对象");
    expect(request.currentCode).toContain("average_score <-");
    expect(request.consoleOutput).toEqual([]);
    expect(request.lesson.title).toBe("保存一组成绩并计算均值");
    expect(request.code).toContain("average_score <-");
    fetchMock.mockRestore();
  });

  it("selects a valid lesson from the course query and keeps the return route", () => {
    window.history.replaceState({}, "", "/r-learning?topicId=central-limit-theorem&lessonId=sampling-simulation&returnTo=%2Flearn%2Fsampling%2Fcentral-limit-theorem");
    renderWorkspace();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/抽样分布/);
    expect(screen.getByRole("link", { name: /返回主界面/ })).toHaveAttribute("href", "/learn/sampling/central-limit-theorem");
  });
});
