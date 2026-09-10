import {
  clearExperimentSnapshot,
  getExperimentSnapshot,
} from "@stats-viz/shared/ai/experimentTelemetry";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ConfidenceIntervalApp from "../apps/confidence-interval/src/App";
import RegressionApp from "../apps/regression/src/App";
import TypeErrorApp from "../apps/type-error/src/App";
import { WalsApp } from "../apps/shared/wals/WalsApp";
import { moduleConfig as mesConfidenceConfig } from "../apps/mes-confidence-interval/src/module-config";

function renderExperiment(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

afterEach(() => {
  for (const appId of [
    "confidence-interval",
    "regression",
    "type-error",
    "mes-confidence-interval",
  ]) {
    clearExperimentSnapshot(appId);
  }
});

describe("bespoke experiment telemetry", () => {
  it("keeps stochastic parameters aligned with the last applied run", async () => {
    renderExperiment(<WalsApp moduleConfig={mesConfidenceConfig} />);
    await waitFor(() => expect(getExperimentSnapshot("mes-confidence-interval")).toBeDefined());

    const sampleSize = screen.getByRole("slider", { name: "样本量" });
    fireEvent.change(sampleSize, { target: { value: "25" } });

    const appliedSampleSize = () =>
      getExperimentSnapshot("mes-confidence-interval")?.parameters.find(
        (parameter) => parameter.id === "sampleSize",
      )?.value;
    const outputSampleSize = () =>
      getExperimentSnapshot("mes-confidence-interval")?.outputs.metrics?.find(
        (metric) => metric.label === "样本量",
      )?.value;

    expect(appliedSampleSize()).toBe(5);
    expect(outputSampleSize()).toBe("5");

    await userEvent.click(screen.getByRole("button", { name: "运行" }));
    await waitFor(() => expect(appliedSampleSize()).toBe(25));
    expect(outputSampleSize()).toBe("25");
  });
  it("publishes current confidence-interval parameters and a bounded, explicit interval preview", async () => {
    const view = renderExperiment(<ConfidenceIntervalApp />);

    await waitFor(() => expect(getExperimentSnapshot("confidence-interval")).toBeDefined());
    const initial = getExperimentSnapshot("confidence-interval");
    expect(initial?.parameters.map((parameter) => parameter.id)).toEqual([
      "sample-size",
      "population-mean",
      "population-sd",
      "confidence-level",
      "sigma-known",
    ]);
    expect(initial?.outputs.tables?.[0].title).toContain("original=0, sent=0, truncated=0");

    const generateTwenty = screen.getByRole("button", { name: "生成 20 个样本" });
    await userEvent.click(generateTwenty);
    await userEvent.click(generateTwenty);
    await userEvent.click(generateTwenty);
    await userEvent.click(generateTwenty);

    await waitFor(() => {
      const snapshot = getExperimentSnapshot("confidence-interval");
      expect(snapshot?.outputs.tables?.[0].title).toContain("original=80, sent=60, truncated=20");
      expect(snapshot?.outputs.tables?.[0].rows).toHaveLength(60);
      expect(snapshot?.outputs.rawSampleSummary).toContain("original=80, sent=60, truncated=20");
      expect(snapshot?.outputs.chartSummary).toContain(
        "visibly renders only the most recent 5 interval rows; hidden chart rows=75",
      );
    });

    view.unmount();
    expect(getExperimentSnapshot("confidence-interval")).toBeUndefined();
  });

  it("publishes the selected regression dataset with source rows capped at 80", async () => {
    renderExperiment(<RegressionApp />);
    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "选择数据集" }),
      "chapter-8-height-sleep-hours",
    );

    await waitFor(() => {
      const snapshot = getExperimentSnapshot("regression");
      expect(snapshot?.parameters.find((parameter) => parameter.id === "dataset-id")?.value).toBe(
        "chapter-8-height-sleep-hours",
      );
      expect(snapshot?.outputs.tables?.[0].title).toContain("original=100, sent=80, truncated=20");
      expect(snapshot?.outputs.tables?.[0].rows).toHaveLength(80);
      expect(snapshot?.outputs.rawSampleSummary).toContain("original=100, sent=80, truncated=20");
      expect(snapshot?.outputs.metrics?.map((metric) => metric.label)).toEqual(
        expect.arrayContaining(["OLS SSE", "R²", "r"]),
      );
    });
  });

  it("publishes all hypothesis-test inputs and bounded representative curve coordinates", async () => {
    renderExperiment(<TypeErrorApp />);

    await waitFor(() => {
      const snapshot = getExperimentSnapshot("type-error");
      expect(snapshot?.parameters).toHaveLength(7);
      expect(snapshot?.outputs.tables?.[0].rows).toHaveLength(25);
      expect(snapshot?.outputs.tables?.[0].title).toMatch(
        /original paired points=\d+ .*sent=25, truncated=\d+/,
      );
      expect(snapshot?.outputs.rawSampleSummary).toMatch(/original=\d+, sent=25, truncated=\d+/);
      expect(snapshot?.outputs.metrics?.map((metric) => metric.label)).toEqual(
        expect.arrayContaining(["α", "β", "检验功效", "p 值", "检验决策"]),
      );
    });

    await userEvent.click(screen.getByRole("button", { name: "左尾" }));
    await waitFor(() => {
      const snapshot = getExperimentSnapshot("type-error");
      expect(snapshot?.parameters.find((parameter) => parameter.id === "test-type")?.value).toBe(
        "左尾检验",
      );
      expect(snapshot?.outputs.narrative).toContain("Hₐ: μ < 0");
    });
  });
});
