import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  localizeModuleConfig,
  localizeSimulationResult,
  useLanguage,
  walsCopy,
} from "@stats-viz/shared/i18n";
import { DEFAULT_CLT_SAMPLE_COUNT, generateSampleMeans, runExample } from "./engine";
import { Chart } from "./charts";
import {
  ChartFrame,
  FormulaCard,
  MetricGrid,
  ObservationCard,
  ParameterPanel,
  ReadingGuide,
  VisualizationFrame,
  VisualizationHeader,
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

function selectValueFor(control: ControlConfig, serializedValue: string): ControlValue {
  if (typeof control.defaultValue !== "number") return serializedValue;
  const numericValue = Number(serializedValue);
  return Number.isFinite(numericValue) ? numericValue : control.defaultValue;
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
): ReactNode {
  const effectiveControl = resolveControlConfig(control, controls);
  const value = valueFor(effectiveControl, controls);
  const dependentValue = control.labelByValue ? String(controls[control.labelByValue.controlId] ?? "") : "";
  const visibleLabel = control.labelByValue?.labels[dependentValue] ?? control.label;

  if (effectiveControl.type === "select") {
    return (
      <label className="control-field" key={control.id}>
        <span className="control-label">{visibleLabel}</span>
        <select
          className="control-input"
          data-control-id={control.id}
          aria-label={visibleLabel}
          value={String(value)}
          onChange={(e) => onChange(control.id, selectValueFor(effectiveControl, e.target.value))}
        >
          {(effectiveControl.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (effectiveControl.type === "number" && effectiveControl.min !== undefined && effectiveControl.max !== undefined) {
    return (
      <label className="control-field control-field--range" key={control.id}>
        <span className="control-label-row">
          <span className="control-label">{visibleLabel}</span>
          <output className="control-value" htmlFor={`control-${control.id}`}>{String(value)}</output>
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
        <span className="control-range-bounds" aria-hidden="true">
          <span>{effectiveControl.min}</span>
          <span>{effectiveControl.max}</span>
        </span>
      </label>
    );
  }

  return (
    <label className="control-field" key={control.id}>
      <span className="control-label">{visibleLabel}</span>
      <input
        className="control-input"
        data-control-id={control.id}
        aria-label={visibleLabel}
        type={effectiveControl.type}
        value={String(value)}
        min={effectiveControl.min}
        max={effectiveControl.max}
        maxLength={effectiveControl.maxLength}
        step={effectiveControl.step}
        onChange={(e) =>
          onChange(control.id, effectiveControl.type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
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
  "permutation-mean-difference": () => (
    <div className="math-expression">
      <span>H₀:</span>
      <span>group labels are exchangeable</span>
    </div>
  ),
};

function renderFormula(state: State): ReactNode {
  const renderer = formulaRenderers[state.activeExample.kind];
  if (renderer) {
    return renderer(state);
  }
  return (
    <div className="math-expression">
      <span>{walsCopy[state.language].simulationResult}</span>
      <span className="math-symbol">=</span>
      <span>{walsCopy[state.language].simulationResultFormula}</span>
    </div>
  );
}

// Cap accumulated CLT sample means so repeated "draw" clicks cannot grow the
// histogram data without bound.
const MAX_SAMPLE_MEANS = 1000;

export interface WalsAppProps {
  moduleConfig: ModuleConfig;
}

export function WalsApp({ moduleConfig }: WalsAppProps) {
  const language = useLanguage();
  const [exampleId, setExampleId] = useState<string | undefined>(undefined);
  const [controls, setControls] = useState<Record<string, ControlValue> | undefined>(undefined);
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [sampleMeans, setSampleMeans] = useState<number[] | undefined>(undefined);

  // Defer the expensive simulation so slider drags stay responsive.
  // `controls`/`seed` update urgently (slider thumb tracks the cursor); the
  // `runExample` work runs in a lower-priority deferred render that React
  // coalesces, dropping stale intermediate runs instead of freezing the UI.
  const deferredControls = useDeferredValue(controls);
  const deferredSeed = useDeferredValue(seed);

  const state = useMemo(
    () => createState(moduleConfig, exampleId, deferredControls, deferredSeed, language, sampleMeans),
    [moduleConfig, exampleId, deferredControls, deferredSeed, language, sampleMeans],
  );

  // Behavior the generic framework does not model is declared on the active
  // example itself (accumulateSampleMeans / quickActions), not detected by
  // matching a module id or example kind.
  const accumulate = state.activeExample.accumulateSampleMeans ?? false;
  const quickActions = state.activeExample.quickActions ?? [];

  const handleSelectExample = useCallback((id: string) => {
    setExampleId(id);
    setControls(undefined);
    setSeed((s) => s + 1);
    setSampleMeans(undefined);
  }, []);

  const handleUpdateControl = useCallback((id: string, value: ControlValue) => {
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
      setSampleMeans(undefined);
    }
    setSeed((s) => s + 1);
  }, [state.activeExample, accumulate]);

  const handleRun = useCallback(() => {
    if (accumulate) {
      const current = controls ?? createDefaultControls(state.activeExample);
      const nextSeed = Date.now();
      setSampleMeans(generateSampleMeans(current, DEFAULT_CLT_SAMPLE_COUNT, nextSeed));
      setSeed(nextSeed);
    } else {
      setSeed(Date.now());
    }
  }, [accumulate, controls, state.activeExample]);

  // "bumpControl" quick actions increment a numeric control (e.g. the
  // random-variable module's sample size) by a fixed delta.
  const handleBumpControl = useCallback((controlId: string, delta: number) => {
    setControls((prev) => {
      const current = prev ?? createDefaultControls(state.activeExample);
      return normalizeControls(
        state.activeExample,
        { ...current, [controlId]: Number(current[controlId] ?? 0) + delta },
        controlId,
      );
    });
  }, [state.activeExample]);

  const handleDrawSamples = useCallback((count: number) => {
    const current = controls ?? createDefaultControls(state.activeExample);
    const nextSeed = Date.now();
    const previous = sampleMeans ?? generateSampleMeans(current, DEFAULT_CLT_SAMPLE_COUNT, seed);
    const combined = [...previous, ...generateSampleMeans(current, count, nextSeed)];
    setSampleMeans(combined.length > MAX_SAMPLE_MEANS ? combined.slice(combined.length - MAX_SAMPLE_MEANS) : combined);
    setSeed(nextSeed);
  }, [controls, state.activeExample, sampleMeans, seed]);

  return (
    <VisualizationFrame
      busy={controls !== deferredControls || seed !== deferredSeed}
      content={
        <>
          <VisualizationHeader
            eyebrow={state.config.category}
            title={state.config.title}
            description={state.config.subtitle}
          />
          <section className="output-dock">
            <div className="output-heading">
              <p className="eyebrow">{state.copy.modelOutput}</p>
              <h2>{state.result.headline}</h2>
              <p>{state.result.narrative}</p>
            </div>
            <ReadingGuide title={state.copy.howToReadThis}>
              <p>{state.activeExample.teachingPoints[0] ?? state.result.narrative}</p>
            </ReadingGuide>
            <MetricGrid
              ariaLabel={state.copy.modelOutput}
              metrics={state.result.metrics.map((metric, index) => ({
                key: String(index),
                label: metric.label,
                value: metric.value,
                note: metric.detail,
                help: metric.help,
              }))}
            />
            <ChartFrame>
              <Chart spec={state.result.chart} />
            </ChartFrame>
          </section>
        </>
      }
      sidebar={
        <>
          <ParameterPanel eyebrow={state.copy.parameters}>
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
            <div className="control-grid">
              {state.activeExample.controls
                .filter((control) => !control.hideWhen?.values.includes(String((controls ?? createDefaultControls(state.activeExample))[control.hideWhen.controlId] ?? "")))
                .map((control) => renderControl(control, controls ?? createDefaultControls(state.activeExample), handleUpdateControl))}
            </div>
            <button type="button" className="run-button" onClick={handleRun}>
              {accumulate ? walsCopy[language].restartWith500 : state.copy.run}
            </button>
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
                      } else if (action.type === "setControl") {
                        handleUpdateControl(action.control ?? "sampleSize", action.amount);
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
          <section className="teaching-panel">
            <p className="eyebrow">{state.copy.conceptKeyIdea}</p>
            <h2>{state.activeExample.title}</h2>
            <p>{state.activeExample.description}</p>
            <ul className="teaching-list">
              {state.activeExample.teachingPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
          <FormulaCard eyebrow={state.copy.formula} formula={renderFormula(state)}>
            <p>{state.copy.formulaHelper}</p>
          </FormulaCard>
          <ObservationCard eyebrow={state.copy.howToReadThis} title={state.result.headline}>
            <p>{state.result.narrative}</p>
          </ObservationCard>
          {state.result.table && (
            <section className="teaching-panel table-panel">
              <h3>{state.copy.dataTable}</h3>
              <div className="table-scroll">
                <table className="result-table">
                  <thead>
                    <tr>
                      {state.result.table.columns.map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.result.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      }
    />
  );
}
