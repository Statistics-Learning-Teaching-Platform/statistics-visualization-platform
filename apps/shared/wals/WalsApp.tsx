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
  const mergedControls = { ...createDefaultControls(activeExample), ...(controls ?? {}) };
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

function renderControl(
  control: ControlConfig,
  controls: Record<string, ControlValue>,
  onChange: (id: string, value: ControlValue) => void,
): ReactNode {
  const value = valueFor(control, controls);

  if (control.type === "select") {
    return (
      <label className="control-field" key={control.id}>
        <span className="control-label">{control.label}</span>
        <select
          className="control-input"
          data-control-id={control.id}
          value={String(value)}
          onChange={(e) => onChange(control.id, e.target.value)}
        >
          {(control.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="control-field" key={control.id}>
      <span className="control-label">{control.label}</span>
      <input
        className="control-input"
        data-control-id={control.id}
        type={control.type}
        value={String(value)}
        min={control.min}
        max={control.max}
        step={control.step}
        onChange={(e) =>
          onChange(control.id, control.type === "number" ? Number(e.target.value) : e.target.value)
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
  "distribution": () => (
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
    setControls((prev) => ({ ...createDefaultControls(state.activeExample), ...prev, [id]: value }));
    if (accumulate) {
      setSampleMeans(undefined);
    }
    setSeed((s) => s + 1);
  }, [state.activeExample, accumulate]);

  const handleRun = useCallback(() => {
    if (accumulate) {
      // Per the accumulateSampleMeans contract, the run button APPENDS a fresh
      // batch of sample means (count = current length, min 20) instead of
      // reseeding from scratch. Previously this replaced the array, which wiped
      // the accumulation the quick-action buttons had built up.
      const current = controls ?? createDefaultControls(state.activeExample);
      const count = Math.max(sampleMeans?.length ?? 0, 20);
      const nextSeed = Date.now();
      const previous = sampleMeans ?? [];
      const combined = [...previous, ...generateSampleMeans(current, count, nextSeed)];
      setSampleMeans(combined.length > MAX_SAMPLE_MEANS ? combined.slice(combined.length - MAX_SAMPLE_MEANS) : combined);
      setSeed(nextSeed);
    } else {
      setSeed(Date.now());
    }
  }, [accumulate, controls, state.activeExample, sampleMeans]);

  // "bumpControl" quick actions increment a numeric control (e.g. the
  // random-variable module's sample size) by a fixed delta.
  const handleBumpControl = useCallback((controlId: string, delta: number) => {
    setControls((prev) => {
      const current = prev ?? createDefaultControls(state.activeExample);
      return { ...current, [controlId]: Number(current[controlId] ?? 0) + delta };
    });
    setSeed(Date.now());
  }, [state.activeExample]);

  const handleDrawSamples = useCallback((count: number) => {
    const current = controls ?? createDefaultControls(state.activeExample);
    const nextSeed = Date.now();
    const previous = sampleMeans ?? [];
    const combined = [...previous, ...generateSampleMeans(current, count, nextSeed)];
    setSampleMeans(combined.length > MAX_SAMPLE_MEANS ? combined.slice(combined.length - MAX_SAMPLE_MEANS) : combined);
    setSeed(nextSeed);
  }, [controls, state.activeExample, sampleMeans]);

  return (
    <div className="module-shell">
      <main className="module-layout">
        <section className="experiment-board">
          <header className="experiment-header">
            <div>
              <p className="eyebrow">{state.config.category}</p>
              <h1>{state.config.title}</h1>
              <p>{state.config.subtitle}</p>
            </div>
          </header>
          <section className="output-dock">
            <div className="output-heading">
              <p className="eyebrow">{state.copy.modelOutput}</p>
              <h2>{state.result.headline}</h2>
              <p>{state.result.narrative}</p>
            </div>
            <div className="chart-frame">
              <Chart spec={state.result.chart} />
            </div>
          </section>
          <section className="metrics-grid">
            {state.result.metrics.map((metric, i) => (
              <article className="metric-card" key={i}>
                <span className="metric-label">{metric.label}</span>
                <strong className="metric-value">{metric.value}</strong>
                {metric.detail && <small className="metric-note">{metric.detail}</small>}
              </article>
            ))}
          </section>
        </section>
        <aside className="teaching-area">
          <section className="teaching-panel parameter-panel">
            <p className="eyebrow">{state.copy.parameters}</p>
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
              {state.activeExample.controls.map((control) =>
                renderControl(control, controls ?? {}, handleUpdateControl),
              )}
            </div>
            <button type="button" className="run-button" onClick={handleRun}>
              {accumulate ? walsCopy[language].redraw : state.copy.run}
            </button>
            {quickActions.length > 0 && (
              <div className="sample-quick-actions">
                {quickActions.map((action) => (
                  <button
                    key={`${action.type}-${action.amount}`}
                    type="button"
                    className="sample-quick-button"
                    onClick={() => {
                      if (action.type === "drawSampleMeans") {
                        handleDrawSamples(action.amount);
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
          </section>
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
          <section className="teaching-panel formula-panel">
            <p className="eyebrow">{state.copy.formula}</p>
            <div className="latex-formula">{renderFormula(state)}</div>
            <p>{state.copy.formulaHelper}</p>
          </section>
          <section className="teaching-panel">
            <p className="eyebrow">{state.copy.howToReadThis}</p>
            <h3>{state.result.headline}</h3>
            <p>{state.result.narrative}</p>
          </section>
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
        </aside>
      </main>
    </div>
  );
}
