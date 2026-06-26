import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { WalsApp } from "@stats-viz/shared/wals/WalsApp";
import { Sidebar } from "../src/shell/Sidebar";
import { moduleConfig as introConfig } from "../apps/simulation-introduction/src/module-config";
import { moduleConfig as cltConfig } from "../apps/simulation-clt/src/module-config";
import { moduleConfig as randomVariableConfig } from "../apps/simulation-random-variable/src/module-config";
import RegressionApp from "../apps/regression/src/App";
import ConfidenceIntervalApp from "../apps/confidence-interval/src/App";
import TypeErrorApp from "../apps/type-error/src/App";

// A fresh jsdom environment defaults to zh (getLanguage() falls back to zh when
// localStorage is unset), so assertions match the keyed zh copy — deterministic
// and independent of localStorage plumbing.
function withLanguage(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("WalsApp rendering", () => {
  it("renders the module title, model output, and Run button, and survives a Run click", async () => {
    withLanguage(<WalsApp moduleConfig={introConfig} />);
    expect(screen.getByRole("heading", { name: "模拟导论", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("模型输出")).toBeInTheDocument();
    const run = screen.getByRole("button", { name: "运行" });
    await userEvent.click(run);
    // Still mounted after re-running the simulation.
    expect(screen.getByRole("heading", { name: "模拟导论", level: 1 })).toBeInTheDocument();
  });

  it("renders the CLT accumulate quick-action buttons (config-driven, Phase 3)", () => {
    withLanguage(<WalsApp moduleConfig={cltConfig} />);
    // accumulateSampleMeans -> run button is labelled "重新绘制", not "运行".
    expect(screen.getByRole("button", { name: "重新绘制" })).toBeInTheDocument();
    // quickActions declared on the example render as their own buttons.
    expect(screen.getByRole("button", { name: "抽取 1 个样本" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "抽取 20 个样本" })).toBeInTheDocument();
  });

  it("renders the random-variable bumpControl quick-action buttons (config-driven, Phase 3)", () => {
    withLanguage(<WalsApp moduleConfig={randomVariableConfig} />);
    expect(screen.getByRole("button", { name: "+1 个样本" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+20 个样本" })).toBeInTheDocument();
    // Not an accumulating example, so the run button stays "运行".
    expect(screen.getByRole("button", { name: "运行" })).toBeInTheDocument();
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
  });
});
