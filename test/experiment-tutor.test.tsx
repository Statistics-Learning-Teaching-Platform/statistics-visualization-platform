import {
  clearExperimentSnapshot,
  type ExperimentTelemetrySnapshot,
  publishExperimentSnapshot,
} from "@stats-viz/shared/ai/experimentTelemetry";
import { LanguageProvider, setLanguage } from "@stats-viz/shared/i18n";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPortalSessionCache } from "../src/auth/session";
import { buildTutorHistory } from "../src/code-learning/context";
import { AI_MODEL_CACHE_STORAGE_KEY } from "../src/code-learning/tutorModels";
import { ExperimentTutor } from "../src/shell/ExperimentTutor";

const ACTIVE_MODEL = {
  key: "qwen-loaded",
  displayName: "Qwen Loaded",
  quantization: "Q4_K_M",
  params: "7B",
  loaded: true,
  supportsReasoning: true,
};

const INACTIVE_MODEL = {
  key: "retired-unloaded",
  displayName: "Retired Unloaded",
  quantization: "FP16",
  params: "3B",
  loaded: false,
  supportsReasoning: false,
};

const BASE_SNAPSHOT: ExperimentTelemetrySnapshot = {
  appId: "regression",
  updatedAt: 100,
  experiment: {
    title: "线性回归实验",
    description: "观察两个变量之间的线性关系。",
    researchQuestion: "学习时间能否预测考试成绩？",
    category: "回归",
    exampleTitle: "学习时间与成绩",
    exampleDescription: "使用一组课堂样本。",
    teachingPoints: ["斜率", "拟合优度"],
  },
  parameters: [
    { id: "dataset-id", label: "数据集", value: "study-score" },
    { id: "show-residuals", label: "显示残差", value: true },
  ],
  outputs: {
    headline: "斜率为正",
    narrative: "学习时间增加时，成绩整体上升。",
    metrics: [
      { label: "R²", value: "0.81", detail: "81% 的变异得到解释" },
      { label: "斜率", value: "4.20" },
    ],
    tables: [
      {
        title: "观测数据（original=3, sent=3, truncated=0）",
        columns: ["学习时间", "成绩"],
        rows: [
          [1, 62],
          [2, 67],
          [3, 75],
        ],
      },
    ],
    chartTitle: "散点图与回归线",
    chartSummary: "3 个点；回归线 y = 57.3 + 5.9x。",
    rawSampleSummary: "original=3, sent=3, truncated=0",
    sampleMeansSummary: "样本均值=68.0",
    changeSummary: "当前参数与初始值相比未改变。",
  },
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authenticatedResponse(): Response {
  return jsonResponse({ user: { username: "template", role: "student" } });
}

function modelsResponse(): Response {
  return jsonResponse({ models: [ACTIVE_MODEL, INACTIVE_MODEL] });
}

function tutorStreamResponse(answer: string, reasoning?: string): Response {
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

function renderTutor(activeId = BASE_SNAPSHOT.appId) {
  return render(
    <LanguageProvider>
      <ExperimentTutor activeId={activeId} />
    </LanguageProvider>,
  );
}

function callsFor(fetchMock: ReturnType<typeof vi.spyOn>, path: string) {
  return fetchMock.mock.calls.filter(
    (call: [RequestInfo | URL, RequestInit?]) => String(call[0]) === path,
  );
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function openScanAndSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "实验助手" }));
  const select = await screen.findByRole("combobox", { name: "AI 模型" });
  await user.click(screen.getByRole("button", { name: "扫描在线模型" }));
  await screen.findByRole("option", { name: /Qwen Loaded/ });
  await user.selectOptions(select, ACTIVE_MODEL.key);
  return select;
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  resetPortalSessionCache();
  setLanguage("zh");
  window.history.replaceState(null, "", "/experiments#/regression");
  document.cookie = "stat_csrf=csrf-test; Path=/";
  publishExperimentSnapshot(BASE_SNAPSHOT);
});

afterEach(() => {
  for (const appId of ["regression", "confidence-interval"]) {
    clearExperimentSnapshot(appId);
  }
  document.cookie = "stat_csrf=; Max-Age=0; Path=/";
});

describe("ExperimentTutor", () => {
  it("keeps recent conversation within character and byte limits without changing displayed messages", () => {
    const messages = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 ? ("assistant" as const) : ("user" as const),
      content: `${index}: ${"统计🧪".repeat(1_000)}`,
    }));
    const original = structuredClone(messages);
    const history = buildTutorHistory(messages);
    expect(history.length).toBeLessThanOrEqual(6);
    expect(history.at(-1)?.content).toMatch(/^9: /);
    expect(history.every((message) => message.content.length <= 2_000)).toBe(true);
    expect(
      new TextEncoder().encode(history.map((message) => message.content).join("")).length,
    ).toBeLessThanOrEqual(8_000);
    expect(history.every((message) => !/[\uD800-\uDBFF]$/.test(message.content))).toBe(true);
    expect(messages).toEqual(original);
  });

  it("accepts follow-up questions after a valid long question and answer", async () => {
    const longQuestion = "请解释".repeat(700);
    const longAnswer = "结合当前实验结果。".repeat(300);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") {
        return Promise.resolve(tutorStreamResponse(longAnswer));
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();
    await openScanAndSelect(user);
    const question = screen.getByRole("textbox", { name: "询问当前实验" });
    fireEvent.change(question, { target: { value: longQuestion } });
    await user.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "发送" })).toBeDisabled());
    fireEvent.change(question, { target: { value: "再解释一下" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "发送" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() =>
      expect(callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")).toHaveLength(2),
    );
    const [, init] = callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")[1];
    const body = JSON.parse(String(init?.body));
    expect(body.history.map((message: { role: string }) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(
      body.history.every((message: { content: string }) => message.content.length <= 2_000),
    ).toBe(true);
    expect(body.question).toBe("再解释一下");
    expect(screen.getByText(longQuestion)).toBeInTheDocument();
  });

  it("does not scan on open and lists every live result while blocking inactive models", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") {
        return Promise.resolve(tutorStreamResponse("不应发送"));
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();

    await user.click(screen.getByRole("button", { name: "实验助手" }));
    const select = await screen.findByRole("combobox", { name: "AI 模型" });

    expect(callsFor(fetchMock, "/st-qselector/api/ai/models")).toHaveLength(0);
    expect(screen.getByText("请点击右侧按钮扫描在线模型。")).toBeInTheDocument();

    const question = screen.getByRole("textbox", { name: "询问当前实验" });
    await user.type(question, "未选择模型时不应发送");
    await user.keyboard("{Enter}");
    expect(callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "扫描在线模型" }));
    const activeOption = await screen.findByRole("option", { name: /Qwen Loaded.*Q4_K_M/ });
    const inactiveOption = screen.getByRole("option", {
      name: /Retired Unloaded.*FP16.*未启用/,
    });
    expect(activeOption).toBeEnabled();
    expect(inactiveOption).toBeDisabled();
    expect(select).toHaveValue("");

    // The controlled picker rejects a forged change to an inactive result as
    // well as exposing it as a disabled, grey native option.
    fireEvent.change(select, { target: { value: INACTIVE_MODEL.key } });
    expect(select).toHaveValue("");
    fireEvent.keyDown(question, { key: "Enter" });
    expect(callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")).toHaveLength(0);
  });

  it("sends the latest complete experiment context only after an active model is selected", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") {
        return Promise.resolve(tutorStreamResponse("已结合当前快照回答。"));
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();
    await openScanAndSelect(user);

    const latestSnapshot: ExperimentTelemetrySnapshot = {
      ...BASE_SNAPSHOT,
      updatedAt: 200,
      parameters: [
        ...BASE_SNAPSHOT.parameters,
        { id: "confidence", label: "置信水平", value: 0.95 },
      ],
      outputs: {
        ...BASE_SNAPSHOT.outputs,
        headline: "最新斜率为 5.9",
        changeSummary: "置信水平刚调整为 95%。",
      },
    };
    act(() => publishExperimentSnapshot(latestSnapshot));

    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "如何解释结果？");
    await user.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() =>
      expect(callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")).toHaveLength(1),
    );
    const [, init] = callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      language: "zh",
      model: ACTIVE_MODEL.key,
      question: "如何解释结果？",
      experiment: {
        appId: latestSnapshot.appId,
        ...latestSnapshot.experiment,
      },
      parameters: latestSnapshot.parameters,
      outputs: latestSnapshot.outputs,
      history: [],
    });
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    expect(new Headers(init?.headers).get("X-CSRF-Token")).toBe("csrf-test");
    expect(await screen.findByText("已结合当前快照回答。")).toBeInTheDocument();
  });

  it("types reasoning first, collapses it on completion, and then types the answer", async () => {
    const reasoning = "先逐项检查当前参数、观测数据、图表趋势和拟合指标，再形成统计解释。";
    const answer = "当前散点趋势与正斜率一致。";
    const stream = controlledTutorStream();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") {
        return Promise.resolve(stream.response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();
    await openScanAndSelect(user);

    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "请解释拟合结果");
    await user.click(screen.getByRole("button", { name: "发送" }));

    await act(async () => {
      stream.emit("reasoning.delta", { delta: reasoning });
      await Promise.resolve();
    });

    const thinkingDisclosure = await screen.findByRole("button", { name: /AI 思考中/ });
    expect(thinkingDisclosure).toHaveAttribute("aria-expanded", "true");
    const streamingReasoning = thinkingDisclosure
      .closest("section")
      ?.querySelector(".ed-live-tutor-answer");
    expect(streamingReasoning).toHaveTextContent(reasoning);
    expect(streamingReasoning).toHaveAttribute("aria-hidden", "true");
    expect(streamingReasoning).not.toHaveAttribute("data-typing");
    expect(screen.queryByText(answer)).not.toBeInTheDocument();

    await act(async () => {
      stream.emit("message.delta", { delta: answer });
      stream.emit("done", {});
      stream.close();
      await Promise.resolve();
    });

    expect(await screen.findByText(answer, {}, { timeout: 4_000 })).toBeInTheDocument();
    const finishedDisclosure = screen.getByRole("button", { name: /AI 思考过程.*展开/ });
    expect(finishedDisclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(reasoning)).not.toBeVisible();

    await user.click(finishedDisclosure);
    expect(finishedDisclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(reasoning)).toBeVisible();
    expect(screen.getByText(answer).closest(".ed-live-tutor-answer")).not.toHaveAttribute(
      "data-typing",
    );
  });

  it("locks the selected model in flight and clears a stale scan after a 409", async () => {
    const answer = deferred<Response>();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") return answer.promise;
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();
    const select = await openScanAndSelect(user);
    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "模型还在线吗？");
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(select).toBeDisabled();

    await act(async () => {
      answer.resolve(jsonResponse({ error: "所选模型当前未启用或已被移除，请重新扫描并选择" }, 409));
      await answer.promise;
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("重新扫描并选择");
    await waitFor(() => expect(select).toHaveValue(""));
    expect(screen.queryByRole("option", { name: /Qwen Loaded/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "扫描在线模型" })).toBeEnabled();
    expect(localStorage.getItem(AI_MODEL_CACHE_STORAGE_KEY)).toBeNull();
  });

  it("cancels an answer when the same lab publishes changed parameters or outputs", async () => {
    const answer = deferred<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") return answer.promise;
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();
    await openScanAndSelect(user);
    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "解释当前结果");
    await user.click(screen.getByRole("button", { name: "发送" }));
    const signal = callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")[0][1]?.signal;
    expect(signal?.aborted).toBe(false);

    act(() => publishExperimentSnapshot({
      ...BASE_SNAPSHOT,
      updatedAt: BASE_SNAPSHOT.updatedAt + 1,
      parameters: [{ id: "sampleSize", label: "样本量", value: 50 }],
      outputs: { ...BASE_SNAPSHOT.outputs, headline: "更新后的结果" },
    }));

    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(await screen.findByRole("alert")).toHaveTextContent("实验参数或结果已更新");
    const conversation = screen.getByRole("log", { name: "实验助手对话" });
    expect(conversation.querySelectorAll('article[data-role="assistant"]')).toHaveLength(0);
    expect(within(conversation).queryByText("思考中......")).not.toBeInTheDocument();
    await act(async () => {
      answer.resolve(tutorStreamResponse("绝不能作为新快照答案显示"));
      await answer.promise;
    });
    expect(screen.queryByText("绝不能作为新快照答案显示")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "AI 模型" })).toHaveValue(ACTIVE_MODEL.key);
  });

  it("keeps a partial reasoning trace but ends it when the experiment snapshot changes", async () => {
    const stream = controlledTutorStream();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") {
        return Promise.resolve(stream.response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();
    await openScanAndSelect(user);
    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "解释当前结果");
    await user.click(screen.getByRole("button", { name: "发送" }));
    const signal = callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")[0][1]?.signal;
    const partialReasoning = "先核对当前参数与图表，再继续解释。";

    await act(async () => {
      stream.emit("reasoning.delta", { delta: partialReasoning });
      await Promise.resolve();
    });
    expect(await screen.findByText(partialReasoning)).toBeVisible();

    act(() =>
      publishExperimentSnapshot({
        ...BASE_SNAPSHOT,
        updatedAt: BASE_SNAPSHOT.updatedAt + 1,
        outputs: { ...BASE_SNAPSHOT.outputs, headline: "更新后的结果" },
      }),
    );

    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(await screen.findByRole("alert")).toHaveTextContent("实验参数或结果已更新");
    const conversation = screen.getByRole("log", { name: "实验助手对话" });
    expect(conversation.querySelectorAll('article[data-role="assistant"]')).toHaveLength(1);
    const disclosure = within(conversation).getByRole("button", {
      name: /AI 思考过程.*展开/,
    });
    expect(within(conversation).queryByText("思考中......")).not.toBeInTheDocument();
    await user.click(disclosure);
    expect(within(conversation).getByText(partialReasoning)).toBeVisible();

    await act(async () => {
      stream.close();
      await Promise.resolve();
    });
  });

  it("settles a still-current tutor request when the transport throws AbortError", async () => {
    let requestSignal: AbortSignal | null = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") {
        requestSignal = init?.signal ?? null;
        return Promise.reject(
          new DOMException("The connection ended unexpectedly", "AbortError"),
        );
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();
    await openScanAndSelect(user);
    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "连接异常测试");
    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "实验助手暂时无法回答，请稍后重试。",
    );
    const conversation = screen.getByRole("log", { name: "实验助手对话" });
    expect((requestSignal as unknown as AbortSignal).aborted).toBe(false);
    expect(conversation.querySelectorAll('article[data-role="assistant"]')).toHaveLength(1);
    expect(within(conversation).queryByText("思考中......")).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "可以重新发送");
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
    fetchMock.mockRestore();
  });

  it("aborts and ignores stale answers when the active lab changes or the drawer closes", async () => {
    const firstAnswer = deferred<Response>();
    const secondAnswer = deferred<Response>();
    let answerRequestCount = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") return Promise.resolve(authenticatedResponse());
      if (url === "/st-qselector/api/ai/models") return Promise.resolve(modelsResponse());
      if (url === "/st-qselector/api/ai/experiment-tutor") {
        answerRequestCount += 1;
        return answerRequestCount === 1 ? firstAnswer.promise : secondAnswer.promise;
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    const view = renderTutor();
    await openScanAndSelect(user);
    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "旧实验问题");
    await user.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(answerRequestCount).toBe(1));
    const firstInit = callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")[0][1];
    const firstSignal = firstInit?.signal;
    expect(firstSignal?.aborted).toBe(false);

    const nextSnapshot: ExperimentTelemetrySnapshot = {
      ...BASE_SNAPSHOT,
      appId: "confidence-interval",
      updatedAt: 300,
      experiment: { title: "置信区间实验" },
    };
    act(() => publishExperimentSnapshot(nextSnapshot));
    view.rerender(
      <LanguageProvider>
        <ExperimentTutor activeId="confidence-interval" />
      </LanguageProvider>,
    );

    await waitFor(() => expect(firstSignal?.aborted).toBe(true));
    expect(screen.queryByRole("dialog", { name: "模拟实验助手" })).not.toBeInTheDocument();
    await act(async () => {
      firstAnswer.resolve(tutorStreamResponse("绝不能出现的旧实验回答"));
      await firstAnswer.promise;
    });
    expect(screen.queryByText("绝不能出现的旧实验回答")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "实验助手" }));
    expect(await screen.findByRole("combobox", { name: "AI 模型" })).toHaveValue(
      ACTIVE_MODEL.key,
    );
    expect(callsFor(fetchMock, "/st-qselector/api/ai/models")).toHaveLength(1);
    expect(screen.getByText("置信区间实验", { selector: "strong" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "询问当前实验" }), "关闭前的问题");
    await user.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(answerRequestCount).toBe(2));
    const secondInit = callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")[1][1];
    const secondSignal = secondInit?.signal;
    expect(secondSignal?.aborted).toBe(false);

    const dialog = screen.getByRole("dialog", { name: "模拟实验助手" });
    await user.click(within(dialog).getByRole("button", { name: "关闭实验助手" }));
    expect(secondSignal?.aborted).toBe(true);
    await act(async () => {
      secondAnswer.resolve(tutorStreamResponse("绝不能出现的关闭后回答"));
      await secondAnswer.promise;
    });

    await user.click(screen.getByRole("button", { name: "实验助手" }));
    expect(await screen.findByRole("dialog", { name: "模拟实验助手" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "AI 模型" })).toHaveValue(ACTIVE_MODEL.key);
    expect(callsFor(fetchMock, "/st-qselector/api/ai/models")).toHaveLength(1);
    expect(screen.queryByText("绝不能出现的旧实验回答")).not.toBeInTheDocument();
    expect(screen.queryByText("绝不能出现的关闭后回答")).not.toBeInTheDocument();
  });

  it("gates anonymous visitors behind login and preserves the complete return URL", async () => {
    window.history.replaceState(null, "", "/experiments?from=course#/regression");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/st-qselector/api/auth/me") {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      return Promise.reject(new Error(`Anonymous tutor made an unexpected fetch: ${url}`));
    });
    const user = userEvent.setup();
    renderTutor();

    await user.click(screen.getByRole("button", { name: "实验助手" }));
    const login = await screen.findByRole("link", { name: "前往登录" });

    expect(login).toHaveAttribute(
      "href",
      "/st-qselector/login?next=%2Fexperiments%3Ffrom%3Dcourse%23%2Fregression",
    );
    expect(screen.getByText("实验助手需要登录")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "AI 模型" })).not.toBeInTheDocument();
    expect(callsFor(fetchMock, "/st-qselector/api/ai/models")).toHaveLength(0);
    expect(callsFor(fetchMock, "/st-qselector/api/ai/experiment-tutor")).toHaveLength(0);
  });
});
