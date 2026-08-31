import { LanguageProvider } from "@stats-viz/shared/i18n";
import { WalsApp } from "@stats-viz/shared/wals/WalsApp";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConfidenceIntervalApp from "../apps/confidence-interval/src/App";
import { confidenceIntervalXDomain } from "../apps/confidence-interval/src/useConfidenceIntervals";
import { moduleConfig as mesConfidenceConfig } from "../apps/mes-confidence-interval/src/module-config";
import { moduleConfig as distributionsConfig } from "../apps/mes-distributions/src/module-config";
import RegressionApp from "../apps/regression/src/App";
import { moduleConfig as cltConfig } from "../apps/simulation-clt/src/module-config";
import { moduleConfig as introConfig } from "../apps/simulation-introduction/src/module-config";
import { moduleConfig as randomVariableConfig } from "../apps/simulation-random-variable/src/module-config";
import { moduleConfig as resamplingConfig } from "../apps/simulation-resampling/src/module-config";
import TypeErrorApp from "../apps/type-error/src/App";
import { Sidebar } from "../src/shell/Sidebar";

// A fresh jsdom environment defaults to zh (getLanguage() falls back to zh when
// localStorage is unset), so assertions match the keyed zh copy — deterministic
// and independent of localStorage plumbing.
function withLanguage(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("WalsApp rendering", () => {
  it("renders the module title, model output, and Run button, and survives a Run click", {
    timeout: 20000,
  }, async () => {
    withLanguage(<WalsApp moduleConfig={introConfig} />);
    expect(await screen.findByRole("heading", { name: "模拟导论", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("模型输出")).toBeInTheDocument();
    const run = screen.getByRole("button", { name: "运行" });
    await userEvent.click(run);
    // Still mounted after re-running the simulation.
    expect(screen.getByRole("heading", { name: "模拟导论", level: 1 })).toBeInTheDocument();
  });

  it("renders bounded numeric parameters as labelled sliders with a visible value", () => {
    withLanguage(<WalsApp moduleConfig={introConfig} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("data-control-id", "points");
    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("renders the CLT accumulate quick-action buttons (config-driven, Phase 3)", () => {
    withLanguage(<WalsApp moduleConfig={cltConfig} />);
    // Redrawing starts a fresh, explicitly sized 500-sample baseline.
    expect(screen.getByRole("button", { name: "重新抽样 500 次" })).toBeInTheDocument();
    // quickActions declared on the example render as their own buttons.
    expect(screen.getByRole("button", { name: "抽取 1 个样本" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "抽取 20 个样本" })).toBeInTheDocument();
    for (const n of [1, 5, 30, 100]) {
      expect(screen.getByRole("button", { name: `比较 n = ${n}` })).toBeInTheDocument();
    }
  });

  it("renders the random-variable bumpControl quick-action buttons (config-driven, Phase 3)", () => {
    withLanguage(<WalsApp moduleConfig={randomVariableConfig} />);
    expect(screen.getByRole("button", { name: "+1 个样本" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+20 个样本" })).toBeInTheDocument();
    // Not an accumulating example, so the run button stays "运行".
    expect(screen.getByRole("button", { name: "运行" })).toBeInTheDocument();
  });

  it("appends one random-variable draw without replacing the previous deterministic prefix", async () => {
    withLanguage(<WalsApp moduleConfig={randomVariableConfig} />);
    const size = screen.getByRole("slider", { name: "样本量" });
    expect(size).toHaveValue("1000");
    await userEvent.click(screen.getByRole("button", { name: "+1 个样本" }));
    await waitFor(() => expect(size).toHaveValue("1001"));
  });

  it("switches distribution parameter bounds, steps, and defaults together", async () => {
    withLanguage(<WalsApp moduleConfig={distributionsConfig} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "分布" }), "binom");
    const probability = document.querySelector<HTMLInputElement>('[data-control-id="a"]');
    const trials = document.querySelector<HTMLInputElement>('[data-control-id="b"]');
    expect(probability).toHaveAttribute("min", "0.01");
    expect(probability).toHaveAttribute("max", "0.99");
    expect(probability).toHaveAttribute("step", "0.01");
    expect(probability).toHaveValue("0.5");
    expect(trials).toHaveAttribute("min", "1");
    expect(trials).toHaveAttribute("max", "50");
    expect(trials).toHaveAttribute("step", "1");
    expect(trials).toHaveValue("10");
  });

  it("requires at least two observations when sigma is estimated", async () => {
    withLanguage(<WalsApp moduleConfig={mesConfidenceConfig} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "σ 假设" }), "false");
    const sampleSize = screen.getByRole("slider", { name: "样本量" });
    expect(sampleSize).toHaveAttribute("min", "2");
    expect(sampleSize).toHaveValue("2");
  });

  it("applies a numeric confidence-level select value to the simulation", async () => {
    withLanguage(<WalsApp moduleConfig={mesConfidenceConfig} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "置信水平" }), "0.8");
    // This experiment is stochastic: applied controls update after a Run.
    await userEvent.click(screen.getByRole("button", { name: "运行" }));
    await waitFor(() => {
      const metric = screen.getByText("置信水平", { selector: ".metric-label" }).closest("article");
      expect(metric).not.toBeNull();
      expect(within(metric as HTMLElement).getByText("80.0%")).toBeInTheDocument();
    });
  });

  it("limits pasted bootstrap data at the input as well as in the engine", () => {
    withLanguage(<WalsApp moduleConfig={resamplingConfig} />);
    expect(screen.getByRole("textbox", { name: "数据值" })).toHaveAttribute("maxlength", "4096");
  });
});

describe("confidence interval scale domain", () => {
  it("pads a negative lower endpoint away from zero", () => {
    expect(
      confidenceIntervalXDomain([{ mean: -7, lower: -10, upper: -4, contains: false }]),
    ).toEqual([-10.6, 15]);
  });
});

describe("Sidebar navigation", () => {
  it("renders one button per app and marks the active one", () => {
    withLanguage(<Sidebar activeId="regression" onNavigate={() => {}} />);
    const nav = screen.getByRole("navigation", { name: "选择可视化模块" });
    const buttons = within(nav).getAllByRole("button");
    expect(buttons).toHaveLength(13);
    const active = within(nav).getByRole("button", { name: /回归分析/ });
    expect(active).toHaveAttribute("aria-pressed", "true");
  });
});

describe("core visualizer apps mount", () => {
  // Regression fetches its datasets at runtime; in jsdom those fetches fail
  // (no server) and are caught by the app, logging expected errors. Silence
  // them so the run output stays focused on real failures.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the Regression app", () => {
    withLanguage(<RegressionApp />);
    expect(screen.getByRole("heading", { name: "回归分析", level: 1 })).toBeInTheDocument();
  });

  it("renders the Confidence Interval app", () => {
    withLanguage(<ConfidenceIntervalApp />);
    expect(screen.getByRole("heading", { name: "置信区间", level: 1 })).toBeInTheDocument();
  });

  it("renders the Type I / II Error app", () => {
    withLanguage(<TypeErrorApp />);
    expect(screen.getByRole("heading", { name: "一类/二类错误", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("p 值")).toBeInTheDocument();
    expect(screen.getByText("检验决策")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "左尾" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "右尾" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "双边" })).toBeInTheDocument();
    expect(screen.getByText(/在 H₀ 成立时，得到当前或更极端统计量的概率/)).toBeInTheDocument();
  });
});
