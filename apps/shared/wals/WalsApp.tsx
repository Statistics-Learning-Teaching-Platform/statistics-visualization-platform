import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  localizeModuleConfig,
  localizeSimulationResult,
  useLanguage,
  walsCopy,
} from "@stats-viz/shared/i18n";
import { generateSampleMeans, runExample } from "./engine";
import { Chart } from "./charts";
import {
  ChartFrame,
  ControlGroup,
  ExperimentMetricStrip,
  ExperimentChangeSummary,
  RunControls,
  StatisticsTable,
  FormulaCard,
  ParameterPanel,
  VisualizationFrame,
  VisualizationHeader,
  localizedExperimentMetadata,
} from "../visualization";
import type {
  ControlConfig,
  ControlValue,
  ExampleConfig,
  ModuleConfig,
  State,
} from "./types";

function createDefaultControls(example: ExampleConfig): Record<string, ControlValue> {
  return Object.fromEntries(example.controls.map((c) => [c.id, c.defaultValue]));
}

function getExample(exampleId: string, config: ModuleConfig): ExampleConfig {
  return config.examples.find((e) => e.id === exampleId) ?? config.examples[0];
}

export function createState(
  moduleConfig: ModuleConfig,
  exampleId: string | undefined,
  controls: Record<string, ControlValue> | undefined,
  seed: number,
  language: ReturnType<typeof useLanguage>,
  sampleMeans?: number[],
): State {
  const config = localizeModuleConfig(moduleConfig, language);
  const activeExample = getExample(exampleId ?? moduleConfig.examples[0].id, config);
  const mergedControls = normalizeControls(activeExample, {
    ...createDefaultControls(activeExample),
    ...(controls ?? {}),
  });
  return {
    language,
    copy: walsCopy[language],
    config,
    activeExample,
    controls: mergedControls,
    seed,
    sampleMeans,
    result: localizeSimulationResult(
      runExample(activeExample, mergedControls, seed, moduleConfig.data, sampleMeans),
      language,
    ),
  };
}

function valueFor(control: ControlConfig, controls: Record<string, ControlValue>): ControlValue {
  return controls[control.id] ?? control.defaultValue;
}

export function resolveControlConfig(
  control: ControlConfig,
  controls: Record<string, ControlValue>,
): ControlConfig {
  const dependency = control.rangeByValue;
  if (!dependency) return control;
  const range = dependency.ranges[String(controls[dependency.controlId] ?? "")];
  return range ? { ...control, ...range } : control;
}

function snapToRange(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(10));
}

export function normalizeControls(
  example: ExampleConfig,
  controls: Record<string, ControlValue>,
  changedId?: string,
): Record<string, ControlValue> {
  const next = { ...controls };
  for (const control of example.controls) {
    const effective = resolveControlConfig(control, next);
    if (effective.type !== "number" || effective.min === undefined || effective.max === undefined) continue;
    const numeric = Number(next[control.id] ?? effective.defaultValue);
    if (!Number.isFinite(numeric)) {
      next[control.id] = effective.defaultValue;
      continue;
    }
    next[control.id] = snapToRange(numeric, effective.min, effective.max, effective.step ?? 1);
  }

  if (typeof next.lower === "number" && typeof next.upper === "number" && next.lower > next.upper) {
    if (changedId === "lower") next.upper = next.lower;
    else next.lower = next.upper;
  }

  if (next.dist === "unif" && typeof next.a === "number" && typeof next.b === "number" && next.a >= next.b) {
    const aControl = example.controls.find((control) => control.id === "a");
    const bControl = example.controls.find((control) => control.id === "b");
    if (aControl && bControl) {
      const aRange = resolveControlConfig(aControl, next);
      const bRange = resolveControlConfig(bControl, next);
      const step = Math.max(aRange.step ?? 0.1, bRange.step ?? 0.1);
      if (changedId === "b") next.a = Math.max(aRange.min ?? -10, next.b - step);
      else next.b = Math.min(bRange.max ?? 10, next.a + step);
    }
  }
  return next;
}

function renderControl(
  control: ControlConfig,
  controls: Record<string, ControlValue>,
  onChange: (id: string, value: ControlValue) => void,
  language: "zh" | "en",
  compact = false,
  displayLabel?: string,
): ReactNode {
  const effectiveControl = resolveControlConfig(control, controls);
  const value = valueFor(effectiveControl, controls);
  const dependentValue = control.labelByValue ? String(controls[control.labelByValue.controlId] ?? "") : "";
  const visibleLabel = control.labelByValue?.labels[dependentValue] ?? control.label;
  const renderedLabel = displayLabel ?? visibleLabel;
  const description = control.description ?? (
    effectiveControl.type === "number" && effectiveControl.min !== undefined && effectiveControl.max !== undefined
      ? language === "zh"
        ? `在 ${effectiveControl.min}–${effectiveControl.max} 范围内调整此参数。`
        : `Adjust this parameter between ${effectiveControl.min} and ${effectiveControl.max}.`
      : effectiveControl.type === "select"
        ? language === "zh" ? "选择当前实验的模式或数据设置。" : "Choose the current experiment mode or data setting."
        : language === "zh" ? "输入当前实验使用的数据。" : "Enter the data used by this experiment."
  );

  if (effectiveControl.type === "select") {
    return (
      <label className="control-field" key={control.id}>
        <span className="control-label">{renderedLabel}</span>
        <select
          className="control-input"
          data-control-id={control.id}
          aria-label={visibleLabel}
          value={String(value)}
          onChange={(e) => onChange(control.id, e.target.value)}
        >
          {(effectiveControl.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {!compact && <span className="control-description">{description}</span>}
      </label>
    );
  }

  if (effectiveControl.type === "number" && effectiveControl.min !== undefined && effectiveControl.max !== undefined) {
    return (
      <label className="control-field control-field--range" key={control.id}>
        <span className="control-label-row">
          <span className="control-label">{renderedLabel}</span>
          <input
            className="control-number-input"
            aria-label={`${visibleLabel} numeric value`}
            type="number"
            value={String(value)}
            min={effectiveControl.min}
            max={effectiveControl.max}
            step={effectiveControl.step}
            onChange={(e) => onChange(control.id, Number(e.target.value))}
          />
        </span>
        <input
          id={`control-${control.id}`}
          className="control-range"
          data-control-id={control.id}
          aria-label={visibleLabel}
          type="range"
          value={String(value)}
          min={effectiveControl.min}
          max={effectiveControl.max}
          step={effectiveControl.step}
          onChange={(e) => onChange(control.id, Number(e.target.value))}
        />
        {!compact && <span className="control-description">{description}</span>}
        <span className="control-range-bounds" aria-hidden="true">
          <span>{effectiveControl.min}</span>
          <span>{effectiveControl.max}</span>
        </span>
      </label>
    );
  }

  return (
    <label className="control-field" key={control.id}>
      <span className="control-label">{renderedLabel}</span>
      <input
        className="control-input"
        data-control-id={control.id}
        aria-label={visibleLabel}
        type={effectiveControl.type}
        value={String(value)}
        min={effectiveControl.min}
        max={effectiveControl.max}
        step={effectiveControl.step}
        onChange={(e) =>
          onChange(control.id, effectiveControl.type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
      {!compact && <span className="control-description">{description}</span>}
    </label>
  );
}

// Formula panels keyed by example kind (not module id substring), so the
// dispatch stays in sync with the engine runner registry in engine.ts.
const formulaRenderers: Record<string, (state: State) => ReactNode> = {
  "central-limit-theorem": () => (
    <div className="math-expression">
      <span>X̄</span>
      <span className="math-symbol">≈</span>
      <span>N</span>
      <span>
        (μ,{" "}
        <span className="math-frac">
          <span className="math-num">σ</span>
          <span className="math-den">
            √<span>n</span>
          </span>
        </span>
        )
      </span>
    </div>
  ),
  "anova": () => (
    <div className="math-expression">
      <span>F =</span>
      <span className="math-frac">
        <span className="math-num">
          MS<sub>between</sub>
        </span>
        <span className="math-den">
          MS<sub>within</sub>
        </span>
      </span>
    </div>
  ),
  "linear-regression": () => (
    <div className="math-expression">
      <span>SSE =</span>
      <span className="math-symbol">Σ</span>
      <span>
        (y<sub>i</sub> − ŷ<sub>i</sub>)
      </span>
      <sup>2</sup>
    </div>
  ),
  "confidence-interval": (state) => (
    <div className="math-expression">
      <span>{walsCopy[state.language].estimate}</span>
      <span className="math-symbol">±</span>
      <span>{walsCopy[state.language].criticalValue}</span>
      <span className="math-symbol">×</span>
      <span>SE</span>
    </div>
  ),
  "distribution": (state) => state.controls.dist === "norm" ? (
    <div className="math-expression">
      <span>N(μ, σ²)</span>
      <span className="math-symbol">{state.language === "zh" ? "对比" : "vs"}</span>
      <span>N(0, 1)</span>
    </div>
  ) : (
    <div className="math-expression">
      <span>P(a ≤ X ≤ b) =</span>
      <span className="math-symbol">∫</span>
      <span>
        <sub>a</sub>
        <sup>b</sup>
      </span>
      <span>f(x) dx</span>
    </div>
  ),
  "mcmc-mixture": () => (
    <div className="math-expression">
      <span>p(θ | y)</span>
      <span className="math-symbol">∝</span>
      <span>p(y | θ) p(θ)</span>
    </div>
  ),
  "gibbs-bivariate": () => (
    <div className="math-expression">
      <span>x₁</span>
      <span className="math-symbol">∼</span>
      <span>p(x₁ | x₂)</span>
      <span className="math-symbol">→</span>
      <span>x₂ ∼ p(x₂ | x₁)</span>
    </div>
  ),
  "permutation-mean-difference": (state) => (
    <div className="math-expression">
      <span>H₀:</span>
      <span>{state.language === "zh" ? "组标签可交换" : "group labels are exchangeable"}</span>
    </div>
  ),
  "pi-circle": () => (
    <div className="math-expression"><span>π ≈ 4 ×</span><span>inside / N</span></div>
  ),
  buffon: () => (
    <div className="math-expression"><span>π ≈</span><span className="math-frac"><span className="math-num">2 L N</span><span className="math-den">T · C</span></span></div>
  ),
  "random-normal": () => (
    <div className="math-expression"><span>X̄ = (1 / n)</span><span className="math-symbol">Σ</span><span>Xᵢ</span></div>
  ),
  "random-exponential": () => (
    <div className="math-expression"><span>X = −ln(1 − U) / λ</span></div>
  ),
  "gamma-rejection": (state) => (
    <div className="math-expression"><span>{state.language === "zh" ? "接受 x ∼ g(x)，概率为 f(x) / M g(x)" : "accept x ∼ g(x) with probability f(x) / M g(x)"}</span></div>
  ),
  "bootstrap-max": (state) => (
    <div className="math-expression"><span>θ̂* = T(X₁*, …, Xₙ*)</span><span className="math-symbol">,</span><span>{state.language === "zh" ? "Xᵢ* ∼ 经验数据" : "Xᵢ* ∼ empirical data"}</span></div>
  ),
  "mean-bootstrap": () => (
    <div className="math-expression"><span>SE_boot = sd(θ̂*)</span></div>
  ),
  "mc-integral-exp": () => (
    <div className="math-expression"><span>∫ f(x)dx ≈ (1 / N)</span><span className="math-symbol">Σ</span><span>f(Xᵢ)</span></div>
  ),
  "mc-transform": () => (
    <div className="math-expression"><span>E[f(X)] = (1 / N)</span><span className="math-symbol">Σ</span><span>f(Xᵢ)</span></div>
  ),
  "normal-cdf": () => (
    <div className="math-expression"><span>Φ(x) = P(Z ≤ x) ≈ (1 / N)</span><span className="math-symbol">Σ</span><span>1(Zᵢ ≤ x)</span></div>
  ),
  "antithetic-exp": () => (
    <div className="math-expression"><span>Ȳ = (f(U) + f(1 − U)) / 2</span></div>
  ),
  "antithetic-gamma": () => (
    <div className="math-expression"><span>Ȳ = (f(U) + f(1 − U)) / 2</span></div>
  ),
  "control-exp": () => (
    <div className="math-expression"><span>Y_cv = Y + c(C − E[C])</span></div>
  ),
  "control-ratio": () => (
    <div className="math-expression"><span>c* = −Cov(Y, C) / Var(C)</span></div>
  ),
  "importance-power": () => (
    <div className="math-expression"><span>E_f[h(X)] = E_g[h(X) f(X) / g(X)]</span></div>
  ),
  "conditional-circle": () => (
    <div className="math-expression"><span>E[Y] = E[E(Y | X)]</span></div>
  ),
  politician: (state) => (
    <div className="math-expression"><span>{state.language === "zh" ? "P(接受) = min(1, N提议 / N当前)" : "P(accept) = min(1, Nproposal / Ncurrent)"}</span></div>
  ),
};

function renderFormula(state: State): ReactNode {
  const renderer = formulaRenderers[state.activeExample.kind];
  if (renderer) {
    return renderer(state);
  }
  return <span>{state.language === "zh" ? "请结合图表中的当前统计量阅读本实验。" : "Read the current statistic alongside the chart."}</span>;
}

// Cap accumulated CLT sample means so repeated "draw" clicks cannot grow the
// histogram data without bound.
const MAX_SAMPLE_MEANS = 1000;

export interface WalsAppProps {
  moduleConfig: ModuleConfig;
}

export function WalsApp({ moduleConfig }: WalsAppProps) {
  const language = useLanguage();
  const metadata = localizedExperimentMetadata(moduleConfig.id, language);
  const isProbability = moduleConfig.id === "mes-distributions";
  const [exampleId, setExampleId] = useState<string | undefined>(undefined);
  const [controls, setControls] = useState<Record<string, ControlValue> | undefined>(undefined);
  const [appliedControls, setAppliedControls] = useState<Record<string, ControlValue> | undefined>(() =>
    metadata?.interaction === "stochastic" && moduleConfig.examples[0]
      ? createDefaultControls(moduleConfig.examples[0])
      : undefined,
  );
  const [changeSummary, setChangeSummary] = useState<{
    parameterId: string;
    parameter: string;
    previousValue: ControlValue;
    currentValue: ControlValue;
    previousMetric?: string;
  } | null>(null);
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [sampleMeans, setSampleMeans] = useState<number[] | undefined>(() =>
    moduleConfig.examples[0]?.accumulateSampleMeans ? [] : undefined,
  );

  // Defer the expensive simulation so slider drags stay responsive.
  // `controls`/`seed` update urgently (slider thumb tracks the cursor); the
  // `runExample` work runs in a lower-priority deferred render that React
  // coalesces, dropping stale intermediate runs instead of freezing the UI.
  const deferredControls = useDeferredValue(controls);
  const deferredSeed = useDeferredValue(seed);
  const stochastic = metadata?.interaction === "stochastic";
  const resultControls = stochastic ? (appliedControls ?? controls) : controls;

  const state = useMemo(
    () => createState(moduleConfig, exampleId, stochastic ? resultControls : deferredControls, deferredSeed, language, sampleMeans),
    [moduleConfig, exampleId, stochastic, resultControls, deferredControls, deferredSeed, language, sampleMeans],
  );
  const isAnova = state.activeExample.kind === "anova";

  // Behavior the generic framework does not model is declared on the active
  // example itself (accumulateSampleMeans / quickActions), not detected by
  // matching a module id or example kind.
  const accumulate = state.activeExample.accumulateSampleMeans ?? false;
  const quickActions = state.activeExample.quickActions ?? [];

  const handleSelectExample = useCallback((id: string) => {
    const nextExample = moduleConfig.examples.find((example) => example.id === id);
    setExampleId(id);
    setControls(undefined);
    setAppliedControls(metadata?.interaction === "stochastic" && nextExample ? createDefaultControls(nextExample) : undefined);
    setChangeSummary(null);
    setSeed((s) => s + 1);
    setSampleMeans(nextExample?.accumulateSampleMeans ? [] : undefined);
  }, [moduleConfig.examples, metadata]);

  const handleUpdateControl = useCallback((id: string, value: ControlValue) => {
    const probabilitySummaryControl = ["dist", "a", "b", "lower", "upper"].includes(id);
    if (!stochastic && (!isProbability || probabilitySummaryControl)) {
      const previous = (controls ?? createDefaultControls(state.activeExample))[id];
      if (previous !== value) {
        const label = state.activeExample.controls.find((control) => control.id === id)?.label ?? id;
        setChangeSummary({ parameterId: id, parameter: label, previousValue: previous, currentValue: value, previousMetric: state.result.metrics[0]?.value });
      }
    }
    setControls((prev) => {
      const next = { ...createDefaultControls(state.activeExample), ...prev, [id]: value };
      for (const control of state.activeExample.controls) {
        if (control.rangeByValue?.controlId !== id) continue;
        const range = control.rangeByValue.ranges[String(value)];
        if (range) next[control.id] = range.defaultValue;
      }
      return normalizeControls(state.activeExample, next, id);
    });
    if (accumulate) {
      setSampleMeans([]);
    }
    if (!stochastic) setSeed((s) => s + 1);
  }, [state.activeExample, state.result.metrics, controls, accumulate, stochastic, isProbability]);

  const handleRun = useCallback(() => {
    if (stochastic) {
      setAppliedControls(controls ?? createDefaultControls(state.activeExample));
    }
    if (accumulate) {
      setSampleMeans([]);
      setSeed(Date.now());
    } else {
      setSeed(Date.now());
    }
  }, [accumulate, controls, state.activeExample, stochastic]);

  // "bumpControl" quick actions increment a numeric control (e.g. the
  // random-variable module's sample size) by a fixed delta.
  const handleBumpControl = useCallback((controlId: string, delta: number) => {
    const current = controls ?? createDefaultControls(state.activeExample);
    const next = normalizeControls(
      state.activeExample,
      { ...current, [controlId]: Number(current[controlId] ?? 0) + delta },
      controlId,
    );
    setControls(next);
    // A sample-size quick action is an explicit stochastic action. Reusing
    // the current seed lets the engine extend the same deterministic prefix
    // when n grows, instead of silently replacing earlier draws.
    if (stochastic && controlId === "sampleSize" && !accumulate) setAppliedControls(next);
  }, [state.activeExample, controls, stochastic, accumulate]);

  const handleDrawSamples = useCallback((count: number) => {
    const current = controls ?? createDefaultControls(state.activeExample);
    const nextSeed = Date.now();
    const previous = sampleMeans ?? [];
    const combined = [...previous, ...generateSampleMeans(current, count, nextSeed)];
    setSampleMeans(combined.length > MAX_SAMPLE_MEANS ? combined.slice(combined.length - MAX_SAMPLE_MEANS) : combined);
    if (stochastic) setAppliedControls(current);
    setSeed(nextSeed);
  }, [controls, state.activeExample, sampleMeans, stochastic]);

  const groupedControls = useMemo(() => {
    const currentControls = controls ?? createDefaultControls(state.activeExample);
    const visible = state.activeExample.controls.filter(
      (control) => !control.hideWhen?.values.includes(String(currentControls[control.hideWhen.controlId] ?? "")),
    );
    if (isProbability) {
      return {
        mode: visible.filter((control) => control.id === "dist"),
        core: visible.filter((control) => !["dist", "mode", "showReference"].includes(control.id)),
        display: visible.filter((control) => control.id === "mode" || control.id === "showReference"),
      };
    }
    return {
      mode: visible.filter((control) => control.group === "mode" || control.id === "mode" || control.type === "select" && visible.indexOf(control) === 0),
      core: visible.filter((control) => control.group === "core" || (control.group === undefined && !(control.id === "mode" || control.type === "select" && visible.indexOf(control) === 0))),
      display: visible.filter((control) => control.group === "display"),
    };
  }, [controls, state.activeExample, isProbability]);

  const outputMetrics = isProbability ? state.result.metrics.slice(0, 4) : state.result.metrics;
  const currentPrimaryMetric = state.result.metrics[0]?.value;
  const metricChanged = Boolean(
    changeSummary?.previousMetric &&
      currentPrimaryMetric &&
      changeSummary.previousMetric !== currentPrimaryMetric,
  );
  const changeSummaryNode = changeSummary && !stochastic ? (
    <ExperimentChangeSummary
      eyebrow={isProbability ? (language === "zh" ? "参数变化" : "Parameter change") : undefined}
      parameter={changeSummary.parameter}
      previousValue={isProbability ? formatProbabilityChangeValue(changeSummary.parameterId, changeSummary.previousValue) : String(changeSummary.previousValue)}
      currentValue={isProbability ? formatProbabilityChangeValue(changeSummary.parameterId, changeSummary.currentValue) : String(changeSummary.currentValue)}
      metric={metricChanged ? state.result.metrics[0]?.label : undefined}
      previousMetric={changeSummary.previousMetric}
      currentMetric={currentPrimaryMetric}
      interpretation={isProbability
        ? probabilityChangeInterpretation(changeSummary, language, String(state.controls.dist ?? "norm"))
        : language === "zh"
          ? "参数变化已即时反馈到当前指标与图形。"
          : "The parameter change is reflected immediately in the current metric and chart."}
    />
  ) : null;

  const currentControlValues = controls ?? createDefaultControls(state.activeExample);
  const anovaControl = (id: string) => groupedControls.core.find((control) => control.id === id);

  const parameterPanelNode = isAnova ? (
    <ParameterPanel eyebrow={language === "zh" ? "数据生成设置" : "Data generation settings"} className="anova-parameter-rail">
      <header className="anova-settings-header">
        <h2>{language === "zh" ? "数据生成设置" : "Data generation settings"}</h2>
        <p>{language === "zh" ? "调整各组参数后运行模拟，生成新的随机数据。" : "Adjust each group, then run the simulation to generate new random data."}</p>
      </header>

      {groupedControls.mode.length > 0 && (
        <ControlGroup className="anova-dataset-group" title={language === "zh" ? "数据集" : "Dataset"}>
          <div className="control-grid">
            {groupedControls.mode.map((control) => renderControl(control, currentControlValues, handleUpdateControl, language))}
          </div>
        </ControlGroup>
      )}

      <ControlGroup
        className="anova-core-group"
        title={language === "zh" ? "组参数" : "Group parameters"}
        description={language === "zh" ? "分别设置每组的样本量与均值" : "Set the sample size and mean for each group"}
      >
        <div className="anova-group-grid">
          {[1, 2, 3].map((groupIndex) => {
            const sizeControl = anovaControl(`n${groupIndex}`);
            const meanControl = anovaControl(`mu${groupIndex}`);
            return (
              <section className="anova-group-card" key={groupIndex} aria-labelledby={`anova-group-${groupIndex}`}>
                <header className="anova-group-card__header">
                  <span className="anova-group-card__badge" aria-hidden="true">{String(groupIndex).padStart(2, "0")}</span>
                  <h4 id={`anova-group-${groupIndex}`}>{language === "zh" ? `第 ${groupIndex} 组` : `Group ${groupIndex}`}</h4>
                </header>
                <div className="anova-group-card__controls">
                  {sizeControl && renderControl(sizeControl, currentControlValues, handleUpdateControl, language, true, language === "zh" ? "样本量" : "Sample size")}
                  {meanControl && renderControl(meanControl, currentControlValues, handleUpdateControl, language, true, language === "zh" ? "均值" : "Mean")}
                </div>
              </section>
            );
          })}
        </div>
      </ControlGroup>

      {anovaControl("sigma") && (
        <ControlGroup className="anova-common-group" title={language === "zh" ? "公共参数" : "Shared parameter"}>
          <div className="anova-common-layout">
            <div className="anova-common-control">
              {renderControl(anovaControl("sigma")!, currentControlValues, handleUpdateControl, language, true)}
            </div>
            <aside className="anova-parameter-note" aria-label={language === "zh" ? "参数提示" : "Parameter tip"}>
              <strong>{language === "zh" ? "参数提示" : "Parameter tip"}</strong>
              <p>{language === "zh" ? "标准差越大，各组数据点越分散；均值决定数据中心的位置。" : "A larger standard deviation spreads the observations; the mean sets each group’s center."}</p>
            </aside>
          </div>
        </ControlGroup>
      )}

      <RunControls className="anova-actions">
        <span className="run-controls__hint">{language === "zh" ? "修改参数后需重新运行，才会生成新的随机结果。" : "Run again after changing parameters to generate new random results."}</span>
        <div className="anova-actions__buttons">
          <button
            type="button"
            className="anova-reset-button"
            onClick={() => {
              setSampleMeans([]);
              setSeed(Date.now());
            }}
          >
            {language === "zh" ? "重置参数" : "Reset parameters"}
          </button>
          <button type="button" className="run-button" onClick={handleRun}>
            {language === "zh" ? "运行模拟" : "Run simulation"}
          </button>
        </div>
      </RunControls>
    </ParameterPanel>
  ) : (
    <ParameterPanel eyebrow={state.copy.parameters} className={isProbability ? "probability-parameter-panel" : ""}>
      {!isProbability && !isAnova && (
        <div className="example-tabs">
          {state.config.examples.map((example) => (
            <button
              key={example.id}
              type="button"
              className="example-tab"
              data-example-id={example.id}
              data-active={String(example.id === state.activeExample.id)}
              onClick={() => handleSelectExample(example.id)}
            >
              {example.title}
            </button>
          ))}
        </div>
      )}
      {groupedControls.mode.length > 0 && (
        <ControlGroup className={isProbability ? "probability-mode-group" : isAnova ? "anova-dataset-group" : ""} title={isProbability ? "" : isAnova ? (language === "zh" ? "数据集" : "Dataset") : language === "zh" ? "实验模式" : "Experiment mode"}>
          <div className="control-grid">{groupedControls.mode.map((control) => renderControl(control, controls ?? createDefaultControls(state.activeExample), handleUpdateControl, language, isProbability))}</div>
        </ControlGroup>
      )}
      {isProbability && groupedControls.display.length > 0 && (
        <ControlGroup className="probability-display-group" title={language === "zh" ? "显示" : "Display"}>
          <div className="control-grid">{groupedControls.display.map((control) => renderControl(control, controls ?? createDefaultControls(state.activeExample), handleUpdateControl, language, true))}</div>
        </ControlGroup>
      )}
      {groupedControls.core.length > 0 && (
        <ControlGroup className={isProbability ? "probability-core-group" : isAnova ? "anova-core-group" : ""} title={isProbability ? "" : isAnova ? (language === "zh" ? "组参数" : "Group parameters") : language === "zh" ? "核心参数" : "Core parameters"}>
          <div className="control-grid">{groupedControls.core.map((control) => renderControl(control, controls ?? createDefaultControls(state.activeExample), handleUpdateControl, language, isProbability))}</div>
        </ControlGroup>
      )}
      {!isProbability && groupedControls.display.length > 0 && (
        <ControlGroup className={isProbability ? "probability-display-group" : ""} title={isProbability ? (language === "zh" ? "显示" : "Display") : language === "zh" ? "显示选项" : "Display options"}>
          <div className="control-grid">{groupedControls.display.map((control) => renderControl(control, controls ?? createDefaultControls(state.activeExample), handleUpdateControl, language, isProbability))}</div>
        </ControlGroup>
      )}
      {stochastic && (
        <RunControls>
          <button type="button" className="run-button" onClick={handleRun}>
            {accumulate ? walsCopy[language].redraw : state.copy.run}
          </button>
          <span className="run-controls__hint">{language === "zh" ? "参数改变后，点击运行才会生成新的随机结果。" : "Change parameters, then run to generate new random results."}</span>
        </RunControls>
      )}
      {isProbability && (
        <button
          type="button"
          className="probability-reset-button"
          onClick={() => handleSelectExample(state.activeExample.id)}
        >
          {language === "zh" ? "恢复默认" : "Reset defaults"}
        </button>
      )}
      {quickActions.length > 0 && (
        <div className="sample-quick-actions">
          {quickActions
            .filter((action) => !action.showWhen || action.showWhen.values.includes(String(state.controls[action.showWhen.controlId] ?? "")))
            .map((action) => (
            <button
              key={`${action.type}-${action.amount}`}
              type="button"
              className="sample-quick-button"
              onClick={() => {
                if (action.type === "drawSampleMeans") {
                  handleDrawSamples(action.amount);
                } else if (action.type === "resetAndDrawSampleMeans") {
                  const current = controls ?? createDefaultControls(state.activeExample);
                  const nextSeed = Date.now();
                  setSampleMeans(generateSampleMeans(current, action.amount, nextSeed));
                  setAppliedControls(current);
                  setSeed(nextSeed);
                } else if (action.type === "reset") {
                  setSampleMeans([]);
                  setSeed(Date.now());
                } else if (action.type === "setControl") {
                  handleUpdateControl(action.control ?? "sampleSize", action.amount);
                } else if (action.type === "runWithControl") {
                  const controlId = action.control ?? "sampleSize";
                  const current = controls ?? createDefaultControls(state.activeExample);
                  const next = normalizeControls(state.activeExample, { ...current, [controlId]: action.amount }, controlId);
                  setControls(next);
                  setAppliedControls(next);
                  setSeed(Date.now());
                } else {
                  handleBumpControl(action.control ?? "sampleSize", action.amount);
                }
              }}
            >
              {walsCopy[language][action.copyKey]}
            </button>
            ))}
        </div>
      )}
    </ParameterPanel>
  );

  const anovaStatisticsNode = (
    <div className="anova-statistics-stack">
      {(state.result.tables ?? (state.result.table ? [state.result.table] : [])).map((table, index) => (
        <section
          className={`teaching-panel table-panel anova-table-panel anova-table-panel--${index === 0 ? "summary" : "test"}`}
          key={table.title ?? index}
        >
          <p className="eyebrow">{index === 0 ? (language === "zh" ? "汇总" : "Summary") : (language === "zh" ? "检验结果" : "Test result")}</p>
          <h2>{table.title ?? state.copy.dataTable}</h2>
          <StatisticsTable
            columns={index === 1 ? [...table.columns, "Pr(>F)"] : table.columns}
            rows={table.rows.map((row, rowIndex) => [
              ...row.map((cell) => String(cell)),
              ...(index === 1 ? [rowIndex === 0 ? (state.result.metrics[1]?.value ?? "") : ""] : []),
            ])}
          />
        </section>
      ))}
    </div>
  );

  return (
    <VisualizationFrame
      moduleId={moduleConfig.id}
      busy={controls !== deferredControls || seed !== deferredSeed}
      content={
        <>
          <VisualizationHeader
            eyebrow={state.config.category}
            title={state.config.title}
            description={isProbability
              ? (language === "zh"
                ? "观察分布参数如何改变位置、离散程度与区间概率。"
                : "Observe how distribution parameters change location, spread, and interval probability.")
              : state.activeExample.description}
            experimentNumber={metadata?.number}
            category={metadata?.localizedCategory ?? state.config.category}
            researchQuestion={isProbability ? undefined : metadata?.localizedQuestion}
          />
          <section className={`output-dock${isProbability ? " probability-output" : ""}`}>
            <ExperimentMetricStrip
              ariaLabel={isProbability ? (language === "zh" ? "关键指标" : "Key metrics") : state.copy.modelOutput}
              maxVisible={isProbability ? 4 : 5}
              metrics={outputMetrics.map((metric, index) => {
                const presentationMetric = isProbability
                  ? formatProbabilityMetric(metric, index, state.controls, language)
                  : metric;
                return {
                  key: String(index),
                  label: presentationMetric.label,
                  value: presentationMetric.value,
                  note: presentationMetric.detail,
                  help: presentationMetric.help,
                  semantics: isProbability ? "derived" : index === 0 ? "derived" : "comparison",
                };
              })}
            />
            {!isProbability && changeSummaryNode}
            <ChartFrame>
              <Chart spec={state.result.chart} />
            </ChartFrame>
            {isProbability && changeSummaryNode}
          </section>
        </>
      }
      sidebar={isAnova ? (
        <>
          {parameterPanelNode}
          <section className="anova-sidebar-results" aria-label={language === "zh" ? "方差分析结果" : "ANOVA results"}>
            {anovaStatisticsNode}
          </section>
        </>
      ) : (
        <>
          {parameterPanelNode}
          <section className="teaching-panel">
            <p className="eyebrow">{language === "zh" ? "研究问题" : "Research question"}</p>
            <p>{metadata?.localizedQuestion ?? state.activeExample.title}</p>
            <h3>{language === "zh" ? "如何工作" : "How it works"}</h3>
            <p>{state.activeExample.description}</p>
            <h3>{language === "zh" ? "观察什么" : "What to observe"}</h3>
            <ul className="teaching-list">
              {state.activeExample.teachingPoints.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
          </section>
          <FormulaCard eyebrow={state.copy.formula} formula={renderFormula(state)}>
            <p>{state.copy.formulaHelper}</p>
          </FormulaCard>
          {(state.result.tables ?? (state.result.table ? [state.result.table] : [])).map((table, index) => (
            <section className="teaching-panel table-panel" key={table.title ?? index}>
              <details open={state.activeExample.kind !== "anova"}>
                <summary>{table.title ?? state.copy.dataTable}</summary>
                <StatisticsTable columns={table.columns} rows={table.rows.map((row) => row.map((cell) => String(cell)))} />
              </details>
            </section>
          ))}
        </>
      )}
    />
  );
}

function probabilityChangeInterpretation(
  change: { parameterId: string; previousValue: ControlValue; currentValue: ControlValue },
  language: "zh" | "en",
  distribution: string,
): string {
  if (language === "en") {
    if (change.parameterId === "a" && distribution === "norm") {
      const previous = Number(change.previousValue);
      const current = Number(change.currentValue);
      if (current < previous) return "The expected value decreases and the curve shifts left.";
      if (current > previous) return "The expected value increases and the curve shifts right.";
    }
    if (change.parameterId === "b" && distribution === "norm") return "The variance changes with σ², widening or narrowing the curve.";
    if (change.parameterId === "lower" || change.parameterId === "upper") return "The interval boundary and highlighted probability area update together.";
    if (change.parameterId === "dist") return "The distribution family changes, updating the curve shape and moments.";
    return "The parameter change is reflected immediately in the chart.";
  }

  if (change.parameterId === "a" && distribution === "norm") {
    const previous = Number(change.previousValue);
    const current = Number(change.currentValue);
    if (current < previous) return "期望值同步下降，曲线整体向左移动。";
    if (current > previous) return "期望值同步上升，曲线整体向右移动。";
  }
  if (change.parameterId === "b" && distribution === "norm") return "方差随 σ² 变化，曲线宽度与峰高同步改变。";
  if (change.parameterId === "lower" || change.parameterId === "upper") return "区间端点与橙色高亮区域、区间概率同步更新。";
  if (change.parameterId === "dist") return "分布类型变化，曲线形状与理论矩同步更新。";
  return "参数变化已即时反馈到当前图形。";
}

function formatProbabilityMetric(
  metric: State["result"]["metrics"][number],
  index: number,
  controls: Record<string, ControlValue>,
  language: "zh" | "en",
) {
  if (language === "zh") {
    if (index === 0) return { ...metric, label: "期望 E(X)" };
    if (index === 1) return { ...metric, label: "方差 Var(X)" };
    if (index === 2) return { ...metric, label: "区间概率" };
    if (index === 3) {
      return {
        ...metric,
        label: "当前分布",
        value: formatProbabilityDistribution(controls),
        detail: undefined,
      };
    }
  } else {
    if (index === 0) return { ...metric, label: "Expected value E(X)" };
    if (index === 1) return { ...metric, label: "Variance Var(X)" };
    if (index === 2) return { ...metric, label: "Interval probability" };
    if (index === 3) {
      return {
        ...metric,
        label: "Current distribution",
        value: formatProbabilityDistribution(controls),
        detail: undefined,
      };
    }
  }
  return metric;
}

function formatProbabilityDistribution(controls: Record<string, ControlValue>): string {
  const dist = String(controls.dist ?? "norm");
  const a = Number(controls.a ?? 0);
  const b = Number(controls.b ?? 1);
  const fixed = (value: number) => Number.isFinite(value) ? value.toFixed(2) : "—";
  switch (dist) {
    case "norm": return `N(${fixed(a)}, ${fixed(b)}²)`;
    case "t": return `t(df=${Math.round(a)})`;
    case "beta": return `Beta(${fixed(a)}, ${fixed(b)})`;
    case "gamma": return `Gamma(${fixed(a)}, rate=${fixed(b)})`;
    case "chisq": return `χ²(df=${Math.round(b)})`;
    case "exp": return `Exp(λ=${fixed(b)})`;
    case "unif": return `U(${fixed(Math.min(a, b))}, ${fixed(Math.max(a, b))})`;
    case "binom": return `Bin(n=${Math.round(b)}, p=${fixed(a)})`;
    case "geom": return `Geom(p=${fixed(a)})`;
    case "pois": return `Pois(λ=${fixed(b)})`;
    default: return dist;
  }
}

function formatProbabilityChangeValue(parameterId: string, value: ControlValue): string {
  if (["a", "b", "lower", "upper"].includes(parameterId) && typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  return String(value);
}
