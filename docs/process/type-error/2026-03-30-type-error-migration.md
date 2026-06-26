# Type Error Visualization Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Type 1/2 error statistical visualization from `original_code/` to TypeScript Cycle.js project, replacing the counter example.

**Architecture:** Cycle.js MVI pattern with D3.js for visualization. Streams flow through intent → model → view, with D3 components using Snabbdom hooks for DOM manipulation.

**Tech Stack:** Cycle.js, xstream, TypeScript, D3.js, jStat, Mocha, Chai

---

## File Structure

**Files to create:**
- `src/type-errors/model.ts` - Business logic (distributions, scales, critical values)
- `src/type-errors/axes.ts` - D3 axis components (XAxis, YAxis)
- `src/type-errors/graph.ts` - Visualization components (distributions, error areas)
- `src/type-errors/index.ts` - Main component (intent, model, view wiring)
- `test/type-errors/model.test.ts` - Model tests

**Files to modify:**
- `src/main.ts` - Replace counter import with type-errors
- `package.json` - Add d3, jstat, @types/d3 dependencies

**Files to delete:**
- `src/counter/` - Entire folder (6 files)
- `original_code/` - Entire folder after verification

---

## Task 1: Install Dependencies

- [ ] **Step 1: Add d3 dependency**

Run: `npm install d3@^7.9.0 --save`
Expected: Package installs successfully, package.json updated

- [ ] **Step 2: Add jstat dependency**

Run: `npm install jstat@^1.9.6 --save`
Expected: Package installs successfully, package.json updated

- [ ] **Step 3: Add @types/d3 dev dependency**

Run: `npm install @types/d3@^7.4.3 --save-dev`
Expected: Package installs successfully, package.json updated

- [ ] **Step 4: Commit dependencies**

```bash
git add package.json package-lock.json
git commit -m "deps: add d3, jstat, and @types/d3 for type error visualization"
```

---

## Task 2: Create Model Layer

**Files:**
- Create: `src/type-errors/model.ts`

- [ ] **Step 1: Create model.ts with types and utility functions**

```typescript
import { Stream as xs } from "xstream";
import * as d3 from "d3";
import jStat from "jstat";

// Constants
const marginTop = 20;
const marginRight = 10;
const marginBottom = 30;
const marginLeft = 40;

// Types
export interface DistributionPoint {
  x: number;
  y: number;
}

export interface Scales {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
}

export interface HypothesisText {
  H0Text: string;
  H1Text: string;
}

export interface Actions {
  alpha$: xs<number>;
  nullMean$: xs<number>;
  trueMean$: xs<number>;
  stdDev$: xs<number>;
  width$: xs<number>;
  height$: xs<number>;
  TestType$: xs<string>;
}

export type CriticalAreaFn = (d: DistributionPoint, c: number[]) => boolean;
export type PValueFn = (alpha: number) => number[];

interface TestStrategy {
  p: PValueFn;
  criticalAreaFn: CriticalAreaFn;
  hypoText: HypothesisText;
}

interface TestStrategies {
  "right-tailed": TestStrategy;
  "left-tailed": TestStrategy;
  "two-tailed": TestStrategy;
}

const TestStrategy: TestStrategies = {
  "right-tailed": {
    p: (alpha: number) => [1 - alpha],
    criticalAreaFn: (d: DistributionPoint, c: number[]) => d.x > c[0],
    hypoText: { H0Text: "H₀: μ = 0", H1Text: "Hₐ: μ > 0" },
  },
  "left-tailed": {
    p: (alpha: number) => [alpha],
    criticalAreaFn: (d: DistributionPoint, c: number[]) => d.x < c[0],
    hypoText: { H0Text: "H₀: μ = 0", H1Text: "Hₐ: μ < 0" },
  },
  "two-tailed": {
    p: (alpha: number) => [alpha / 2, 1 - alpha / 2],
    criticalAreaFn: (d: DistributionPoint, c: number[]) =>
      d.x < c[0] || d.x > c[1],
    hypoText: { H0Text: "H₀: μ = 0", H1Text: "Hₐ: μ ≠ 0" },
  },
};

// Utility functions
export function normalPDF(x: number, mean: number, stdDev: number): number {
  return (
    (1 / (stdDev * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2))
  );
}

export function generateDistribution(
  mean: number,
  stdDev: number
): DistributionPoint[] {
  return d3.range(-5, 10, 0.05).map((x) => ({
    x,
    y: normalPDF(x, mean, stdDev),
  }));
}

export function createScales$(
  width$: xs<number>,
  height$: xs<number>
): xs<Scales> {
  return xs
    .combine(width$, height$)
    .map(([width, height]) => {
      const chartWidth = width - marginLeft - marginRight;
      const chartHeight = height - marginTop - marginBottom;
      const xScale = d3.scaleLinear().domain([-5, 10]).range([0, chartWidth]);
      const yScale = d3.scaleLinear().domain([0, 0.5]).range([chartHeight, 0]);
      return { xScale, yScale };
    });
}

export function createNullDistribution$(
  nullMean$: xs<number>,
  stdDev$: xs<number>
): xs<DistributionPoint[]> {
  return xs.combine(nullMean$, stdDev$).map(([nullMean, stdDev]) =>
    generateDistribution(nullMean, stdDev)
  );
}

export function createTrueDistribution$(
  trueMean$: xs<number>,
  stdDev$: xs<number>
): xs<DistributionPoint[]> {
  return xs.combine(trueMean$, stdDev$).map(([trueMean, stdDev]) =>
    generateDistribution(trueMean, stdDev)
  );
}

export function createPValueFn$(TestType$: xs<string>): xs<PValueFn> {
  return TestType$.map((testType) => {
    const testStrategy = TestStrategy[testType as keyof TestStrategies];
    return testStrategy.p;
  });
}

export function createCriticalAreaFn$(
  TestType$: xs<string>
): xs<CriticalAreaFn> {
  return TestType$.map((testType) => {
    const testStrategy = TestStrategy[testType as keyof TestStrategies];
    return testStrategy.criticalAreaFn;
  });
}

export const makeCriticalValueCreator$ = (PValueFn$: xs<PValueFn>) =>
  (
    alpha$: xs<number>,
    nullMean$: xs<number>,
    stdDev$: xs<number>
  ): xs<number[]> =>
    xs
      .combine(PValueFn$, alpha$, nullMean$, stdDev$)
      .map(([PValueFn, alpha, nullMean, stdDev]) => {
        const pValues = PValueFn(alpha);
        return pValues.map((p) => jStat.normal.inv(p, nullMean, stdDev));
      });

export function createHypoText$(TestType: xs<string>): xs<HypothesisText> {
  return TestType.map((testType) => {
    const testStrategy = TestStrategy[testType as keyof TestStrategies];
    return testStrategy.hypoText;
  });
}

export function model(actions: Actions): xs<[
  Scales,
  DistributionPoint[],
  DistributionPoint[],
  number[],
  CriticalAreaFn,
  HypothesisText,
  number,
  number
]> {
  const alpha$ = actions.alpha$.startWith(0.05);
  const nullMean$ = actions.nullMean$.startWith(0);
  const trueMean$ = actions.trueMean$.startWith(1);
  const stdDev$ = actions.stdDev$.startWith(1);

  const scales$ = createScales$(actions.width$, actions.height$);
  const nullDistribution$ = createNullDistribution$(nullMean$, stdDev$);
  const trueDistribution$ = createTrueDistribution$(trueMean$, stdDev$);
  const PValueFn$ = createPValueFn$(actions.TestType$);
  const criticalAreaFn$ = createCriticalAreaFn$(actions.TestType$);
  const createCriticalValue$ = makeCriticalValueCreator$(PValueFn$);
  const criticalValue$ = createCriticalValue$(alpha$, nullMean$, stdDev$);
  const hypoText$ = createHypoText$(actions.TestType$);

  return xs.combine(
    scales$,
    nullDistribution$,
    trueDistribution$,
    criticalValue$,
    criticalAreaFn$,
    hypoText$,
    actions.width$,
    actions.height$
  );
}
```

- [ ] **Step 2: Commit model layer**

```bash
git add src/type-errors/model.ts
git commit -m "feat: add model layer for type error visualization"
```

---

## Task 3: Create Axes Components

**Files:**
- Create: `src/type-errors/axes.ts`

- [ ] **Step 1: Create axes.ts with XAxis and YAxis components**

```typescript
import { div } from "@cycle/dom";
import * as d3 from "d3";

function drawXAxis(container: any, scale: d3.ScaleLinear<number, number>): void {
  const existingAxis = container.select("#x-axis");
  if (existingAxis.node()) {
    if (
      existingAxis.attr("data-scale-range") === scale.range().toString() &&
      existingAxis.attr("data-scale-domain") === scale.domain().toString()
    ) {
      return;
    } else {
      existingAxis.remove();
    }
  }

  const axis = d3.axisBottom(scale);
  container
    .append("g")
    .call(axis)
    .attr("id", "x-axis")
    .attr("data-scale-range", scale.range())
    .attr("data-scale-domain", scale.domain())
    .style("user-select", "none")
    .style("pointer-events", "none");
}

function drawYAxis(container: any, scale: d3.ScaleLinear<number, number>): void {
  const existingAxis = container.select("#y-axis");
  if (existingAxis.node()) {
    if (
      existingAxis.attr("data-scale-range") === scale.range().toString() &&
      existingAxis.attr("data-scale-domain") === scale.domain().toString()
    ) {
      return;
    } else {
      existingAxis.remove();
    }
  }

  const axis = d3.axisLeft(scale);
  container
    .append("g")
    .call(axis)
    .attr("id", "y-axis")
    .attr("data-scale-range", scale.range())
    .attr("data-scale-domain", scale.domain())
    .style("user-select", "none")
    .style("pointer-events", "none");
}

export function XAxis(props: { scale: d3.ScaleLinear<number, number> }) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawXAxis(g, props.scale);
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawXAxis(g, props.scale);
      },
    },
  });
}

export function YAxis(props: { scale: d3.ScaleLinear<number, number> }) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawYAxis(g, props.scale);
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawYAxis(g, props.scale);
      },
    },
  });
}
```

- [ ] **Step 2: Commit axes components**

```bash
git add src/type-errors/axes.ts
git commit -m "feat: add D3 axis components"
```

---

## Task 4: Create Graph Visualization Components

**Files:**
- Create: `src/type-errors/graph.ts`

- [ ] **Step 1: Create graph.ts with visualization components**

```typescript
import { div } from "@cycle/dom";
import * as d3 from "d3";
import type { DistributionPoint, Scales, CriticalAreaFn } from "./model";

function drawNullDistribution(
  container: any,
  data: DistributionPoint[],
  scales: Scales
): void {
  container.selectAll(".null-distribution").remove();

  container
    .append("path")
    .datum(data)
    .attr("class", "null-distribution")
    .attr(
      "d",
      d3
        .line<DistributionPoint>()
        .x((d) => scales.xScale(d.x))
        .y((d) => scales.yScale(d.y))
    )
    .attr("stroke", "blue")
    .attr("fill", "none")
    .attr("stroke-width", 2);
}

export function NullDistribution(props: {
  data: DistributionPoint[];
  scales: Scales;
}) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawNullDistribution(g, props.data, props.scales);
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawNullDistribution(g, props.data, props.scales);
      },
    },
  });
}

function drawTrueDistribution(
  container: any,
  data: DistributionPoint[],
  scales: Scales
): void {
  container.selectAll(".true-distribution").remove();

  container
    .append("path")
    .datum(data)
    .attr("class", "true-distribution")
    .attr(
      "d",
      d3
        .line<DistributionPoint>()
        .x((d) => scales.xScale(d.x))
        .y((d) => scales.yScale(d.y))
    )
    .attr("stroke", "red")
    .attr("fill", "none")
    .attr("stroke-width", 2);
}

export function TrueDistribution(props: {
  data: DistributionPoint[];
  scales: Scales;
}) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawTrueDistribution(g, props.data, props.scales);
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawTrueDistribution(g, props.data, props.scales);
      },
    },
  });
}

function drawCriticalLine(
  container: any,
  criticalValue: number[],
  scales: Scales
): void {
  container.selectAll(".critical-line").remove();

  container
    .selectAll(".critical-line")
    .data(criticalValue)
    .enter()
    .append("line")
    .attr("class", "critical-line")
    .attr("x1", (d: number) => scales.xScale(d))
    .attr("x2", (d: number) => scales.xScale(d))
    .attr("y1", scales.yScale(0))
    .attr("y2", scales.yScale(0.5))
    .attr("stroke", "black")
    .attr("stroke-dasharray", "5,5");
}

export function CriticalLine(props: {
  criticalValue: number[];
  scales: Scales;
}) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawCriticalLine(g, props.criticalValue, props.scales);
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawCriticalLine(g, props.criticalValue, props.scales);
      },
    },
  });
}

function drawType1ErrorArea(
  container: any,
  data: DistributionPoint[],
  criticalValue: number[],
  filterFn: CriticalAreaFn,
  scales: Scales
): void {
  if (!data) return;
  const curriedFilterFn = (d: DistributionPoint) =>
    filterFn(d, criticalValue);

  const type1ErrorArea = data.map((d) => {
    if (curriedFilterFn(d)) {
      return { x: d.x, y: d.y };
    } else {
      return { x: d.x, y: 0 };
    }
  });

  type1ErrorArea.push({ x: type1ErrorArea[0].x, y: 0 });
  type1ErrorArea.unshift({ x: type1ErrorArea.at(-1)!.x, y: 0 });
  type1ErrorArea.unshift({ x: type1ErrorArea[0].x, y: 0 });

  container.selectAll(".type1-error").remove();

  const line = d3
    .line<DistributionPoint>()
    .x((d) => scales.xScale(d.x))
    .y((d) => scales.yScale(d.y));

  container
    .append("path")
    .datum(type1ErrorArea)
    .attr("class", "type1-error")
    .attr("d", line)
    .attr("fill", "blue")
    .attr("opacity", 0.3);
}

export function Type1ErrorArea(props: {
  data: DistributionPoint[];
  criticalValue: number[];
  filterFn: CriticalAreaFn;
  scales: Scales;
}) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawType1ErrorArea(
          g,
          props.data,
          props.criticalValue,
          props.filterFn,
          props.scales
        );
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawType1ErrorArea(
          g,
          props.data,
          props.criticalValue,
          props.filterFn,
          props.scales
        );
      },
    },
  });
}

function drawType2ErrorArea(
  container: any,
  data: DistributionPoint[],
  criticalValue: number[],
  filterFn: CriticalAreaFn,
  scales: Scales
): void {
  if (!data) return;
  const curriedFilterFn = (d: DistributionPoint) =>
    filterFn(d, criticalValue);

  const type2ErrorArea = data.map((d) => {
    if (curriedFilterFn(d)) {
      return { x: d.x, y: d.y };
    } else {
      return { x: d.x, y: 0 };
    }
  });

  type2ErrorArea.push({ x: type2ErrorArea[0].x, y: 0 });
  type2ErrorArea.unshift({ x: type2ErrorArea.at(-1)!.x, y: 0 });
  type2ErrorArea.unshift({ x: type2ErrorArea[0].x, y: 0 });

  container.selectAll(".type2-error").remove();

  const line = d3
    .line<DistributionPoint>()
    .x((d) => scales.xScale(d.x))
    .y((d) => scales.yScale(d.y));

  container
    .append("path")
    .datum(type2ErrorArea)
    .attr("class", "type2-error")
    .attr("d", line)
    .attr("fill", "red")
    .attr("opacity", 0.3);
}

export function Type2ErrorArea(props: {
  data: DistributionPoint[];
  criticalValue: number[];
  filterFn: CriticalAreaFn;
  scales: Scales;
}) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawType2ErrorArea(
          g,
          props.data,
          props.criticalValue,
          props.filterFn,
          props.scales
        );
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawType2ErrorArea(
          g,
          props.data,
          props.criticalValue,
          props.filterFn,
          props.scales
        );
      },
    },
  });
}

function drawHypothesisText(
  container: any,
  text0: string,
  text1: string
): void {
  const prevText0 = container.select(".hypothesis-text0");
  const prevText1 = container.select(".hypothesis-text1");
  if (prevText0.node() && prevText1.node()) {
    if (prevText0.text() === text0 && prevText1.text() === text1) {
      return;
    }
  }

  container.selectAll(".hypothesis-text").remove();
  container
    .append("text")
    .attr("class", "hypothesis-text hypothesis-text0")
    .attr("x", 10)
    .attr("y", 20)
    .attr("text-anchor", "start")
    .style("font-weight", "bold")
    .attr("font-size", "14px")
    .text(text0);

  container
    .append("text")
    .attr("class", "hypothesis-text hypothesis-text1")
    .attr("x", 10)
    .attr("y", 40)
    .attr("text-anchor", "start")
    .style("font-weight", "bold")
    .attr("font-size", "14px")
    .text(text1);
}

export function HypothesisText(props: { text0: string; text1: string }) {
  return div({
    hook: {
      insert: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawHypothesisText(g, props.text0, props.text1);
      },
      update: (vnode: any) => {
        const g = d3.select(vnode.elm);
        drawHypothesisText(g, props.text0, props.text1);
      },
    },
  });
}
```

- [ ] **Step 2: Commit graph components**

```bash
git add src/type-errors/graph.ts
git commit -m "feat: add visualization components for distributions and error areas"
```

---

## Task 5: Create Main Component

**Files:**
- Create: `src/type-errors/index.ts`

- [ ] **Step 1: Create index.ts with main component**

```typescript
import type { VNode } from "@cycle/dom";
import type { DOMSource } from "@cycle/dom";
import { div, input, h1, span, svg, g } from "@cycle/dom";
import xs, { type Stream } from "xstream";
import { model, type Actions } from "./model";
import {
  NullDistribution,
  TrueDistribution,
  CriticalLine,
  Type1ErrorArea,
  Type2ErrorArea,
  HypothesisText,
} from "./graph";
import { XAxis } from "./axes";

// Constants
const marginTop = 20;
const marginRight = 10;
const marginBottom = 30;
const marginLeft = 40;
const hypoTextOffset = 80;

export interface Sources {
  DOM: DOMSource;
  CONFIG: Stream<{ width: number; height: number; TestType: string }>;
}

export interface Sinks {
  DOM: Stream<VNode>;
}

function makeConfigDriver() {
  return function configDriver(): Stream<{
    width: number;
    height: number;
    TestType: string;
  }> {
    return xs.of({
      width: 600,
      height: 400,
      TestType: "two-tailed",
    });
  };
}

function intent(domSource: DOMSource, configSource: Stream<any>): Actions {
  const alpha$ = domSource
    .select("#alpha")
    .events("input")
    .map((ev) => Number((ev.target as HTMLInputElement).value));

  const trueMean$ = domSource
    .select("#true-mean")
    .events("input")
    .map((ev) => Number((ev.target as HTMLInputElement).value));

  const stdDev$ = domSource
    .select("#std-dev")
    .events("input")
    .map((ev) => Number((ev.target as HTMLInputElement).value));

  const nullMean$ = xs.of(0);

  const width$ = configSource.map((config) => config.width);
  const height$ = configSource.map((config) => config.height);
  const TestType$ = configSource.map((config) => config.TestType);

  return {
    alpha$,
    nullMean$,
    trueMean$,
    stdDev$,
    width$,
    height$,
    TestType$,
  };
}

function view(
  state$: Stream<[
    any,
    any[],
    any[],
    number[],
    any,
    any,
    number,
    number
  ]>
): Stream<VNode> {
  return state$.map(
    ([
      scales,
      nullDistribution,
      trueDistribution,
      criticalValue,
      criticalAreaFn,
      hypoText,
      width,
      height,
    ]) => {
      const xScale = scales.xScale;
      const yScale = scales.yScale;
      const chartHeight = height - marginTop - marginBottom;
      const chartWidth = width - marginLeft - marginRight;

      return div([
        h1("Two types of errors"),
        div(".slider-container", [
          span(".slider-label", "significance level:"),
          input({
            attrs: { type: "range", id: "alpha", min: "0.01", max: "0.2", step: "0.01", value: "0.05" },
          }),
          span("#alpha-value", "0.05"),
        ]),
        div(".slider-container", [
          span("", "零假设均值 (μ₀):"),
          input({
            attrs: { type: "range", id: "null-mean", min: "0", max: "2", step: "0.1", value: "0" },
          }),
          span("#null-mean-value", "0"),
        ]),
        div(".slider-container", [
          span(".slider-label", "真实均值 (μ₁):"),
          input({
            attrs: { type: "range", id: "true-mean", min: "0", max: "3", step: "0.1", value: "1" },
          }),
          span("#true-mean-value", "1"),
        ]),
        div(".slider-container", [
          span(".slider-label", "标准差 (σ):"),
          input({
            attrs: { type: "range", id: "std-dev", min: "0.1", max: "2", step: "0.1", value: "1" },
          }),
          span("#std-dev-value", "1"),
        ]),
        svg({ attrs: { width: width, height: height } }, [
          g(
            { attrs: { transform: `translate(${marginLeft}, ${marginTop})`, id: "main_group" } },
            [
              g({ attrs: { transform: `translate(0, ${chartHeight})` } }, [XAxis({ scale: xScale })]),
              NullDistribution({ data: nullDistribution, scales: { x: xScale, y: yScale } }),
              TrueDistribution({ data: trueDistribution, scales: { x: xScale, y: yScale } }),
              CriticalLine({ criticalValue, scales: { x: xScale, y: yScale } }),
              Type1ErrorArea({
                data: nullDistribution,
                criticalValue,
                filterFn: criticalAreaFn,
                scales: { x: xScale, y: yScale },
              }),
              Type2ErrorArea({
                data: trueDistribution,
                criticalValue,
                filterFn: (d: any, x: any) => !criticalAreaFn(d, x),
                scales: { x: xScale, y: yScale },
              }),
            ]
          ),
          g({ attrs: { transform: `translate(${chartWidth - hypoTextOffset}, 0)` } }, [
            HypothesisText({ text0: hypoText.H0Text, text1: hypoText.H1Text }),
          ]),
        ]),
      ]);
    }
  );
}

export default function TypeErrors(sources: Sources): Sinks {
  const action = intent(sources.DOM, sources.CONFIG);
  const state$ = model(action);
  const vdom$ = view(state$);

  return {
    DOM: vdom$,
  };
}

export { TypeErrors, makeConfigDriver };
```

- [ ] **Step 2: Commit main component**

```bash
git add src/type-errors/index.ts
git commit -m "feat: add main component with intent, model, view wiring"
```

---

## Task 6: Update Bootstrap

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace counter with type-errors in main.ts**

Read current: `src/main.ts`
Delete all content, replace with:

```typescript
import { makeDOMDriver } from "@cycle/dom";
import { run } from "@cycle/run";
import TypeErrors, { makeConfigDriver } from "./type-errors";

run(TypeErrors, {
  DOM: makeDOMDriver("#app"),
  CONFIG: makeConfigDriver(),
});
```

- [ ] **Step 2: Commit bootstrap update**

```bash
git add src/main.ts
git commit -m "refactor: replace counter with type error visualization"
```

---

## Task 7: Migrate Tests

**Files:**
- Create: `test/type-errors/model.test.ts`

- [ ] **Step 1: Create test directory and model.test.ts**

```typescript
import { Stream as xs } from "xstream";
import * as d3 from "d3";
import { expect } from "chai";
import {
  model,
  normalPDF,
  generateDistribution,
  createScales$,
  createNullDistribution$,
  createTrueDistribution$,
  createPValueFn$,
  createCriticalAreaFn$,
  makeCriticalValueCreator$,
  createHypoText$,
  type Actions,
} from "../../src/type-errors/model";

// Test the model function
describe("Model", () => {
  it("should combine all streams and output expected state", (done) => {
    const alpha$ = xs.of(0.05);
    const nullMean$ = xs.of(0);
    const trueMean$ = xs.of(1);
    const stdDev$ = xs.of(1);
    const width$ = xs.of(600);
    const height$ = xs.of(400);
    const TestType$ = xs.of("two-tailed");

    const actions: Actions = {
      alpha$,
      nullMean$,
      trueMean$,
      stdDev$,
      width$,
      height$,
      TestType$,
    };

    const state$ = model(actions);
    state$.addListener({
      next: ([
        scales,
        nullDist,
        trueDist,
        criticalVal,
        criticalAreaFn,
        hypoText,
        width,
        height,
      ]) => {
        // Test scales
        expect(scales).to.have.property("xScale");
        expect(scales).to.have.property("yScale");

        // Test distributions
        expect(nullDist).to.be.an("array");
        expect(nullDist[0]).to.have.property("x");
        expect(nullDist[0]).to.have.property("y");

        expect(trueDist).to.be.an("array");
        expect(trueDist[0]).to.have.property("x");
        expect(trueDist[0]).to.have.property("y");

        // Test critical values for two-tailed test
        expect(criticalVal).to.be.an("array");
        expect(criticalVal).to.have.length(2);

        // Test critical area function
        expect(criticalAreaFn).to.be.a("function");

        // Test hypothesis text
        expect(hypoText).to.have.property("H0Text");
        expect(hypoText).to.have.property("H1Text");
        expect(hypoText.H0Text).to.equal("H₀: μ = 0");
        expect(hypoText.H1Text).to.equal("Hₐ: μ ≠ 0");

        // Test width and height pass-through
        expect(width).to.equal(600);
        expect(height).to.equal(400);

        done();
      },
      error: done,
      complete: () => {},
    });
  });
});

describe("Statistical Model Utilities", () => {
  describe("normalPDF", () => {
    it("should return correct value for standard normal at mean", () => {
      const result = normalPDF(0, 0, 1);
      expect(result).to.be.closeTo(0.3989, 0.0001);
    });
  });

  describe("generateDistribution", () => {
    it("should return array of normal distribution points", () => {
      const dist = generateDistribution(0, 1);
      expect(dist).to.be.an("array");
      expect(dist[0]).to.have.keys(["x", "y"]);
      expect(dist[0].x).to.be.closeTo(-5, 0.1);
      expect(dist.length).to.equal(300);
    });
  });

  describe("createNullDistribution$", () => {
    it("should generate null distribution stream", (done) => {
      const mean$ = xs.of(0);
      const std$ = xs.of(1);

      createNullDistribution$(mean$, std$).addListener({
        next: (dist) => {
          expect(dist).to.be.an("array");
          expect(dist[0]).to.have.keys(["x", "y"]);
          done();
        },
        error: done,
        complete: () => {},
      });
    });
  });

  describe("createScales$", () => {
    it("should return x and y scales based on width and height", (done) => {
      const width$ = xs.of(500);
      const height$ = xs.of(400);

      createScales$(width$, height$).addListener({
        next: (scales) => {
          expect(scales).to.have.keys(["xScale", "yScale"]);
          expect(scales.xScale(0)).to.be.a("number");
          expect(scales.yScale(0)).to.be.a("number");
          done();
        },
        error: done,
        complete: () => {},
      });
    });
  });

  describe("createPValueFn$", () => {
    it("should return correct p-value function for right-tailed test", (done) => {
      createPValueFn$(xs.of("right-tailed")).addListener({
        next: (pFn) => {
          const result = pFn(0.05);
          expect(result).to.deep.equal([0.95]);
          done();
        },
        error: done,
        complete: () => {},
      });
    });
  });

  describe("createCriticalAreaFn$", () => {
    it("should return a function that evaluates critical area correctly", (done) => {
      createCriticalAreaFn$(xs.of("right-tailed")).addListener({
        next: (fn) => {
          const result = fn({ x: 1.7 }, [1.645]);
          expect(result).to.be.true;
          done();
        },
        error: done,
        complete: () => {},
      });
    });
  });

  describe("makeCriticalValueCreator$", () => {
    it("should compute correct critical value", (done) => {
      const testType = "right-tailed";
      const PValueFn$ = createPValueFn$(xs.of(testType));
      const createCriticalValue$ = makeCriticalValueCreator$(PValueFn$);

      const alpha$ = xs.of(0.05);
      const nullMean$ = xs.of(0);
      const stdDev$ = xs.of(1);

      createCriticalValue$(alpha$, nullMean$, stdDev$).addListener({
        next: (criticalValues) => {
          expect(criticalValues).to.have.lengthOf(1);
          expect(criticalValues[0]).to.be.closeTo(1.645, 0.01);
          done();
        },
        error: done,
        complete: () => {},
      });
    });
  });

  describe("createHypoText$", () => {
    it("should return correct hypothesis text for two-tailed", (done) => {
      createHypoText$(xs.of("two-tailed")).addListener({
        next: (hypoText) => {
          expect(hypoText.H0Text).to.equal("H₀: μ = 0");
          expect(hypoText.H1Text).to.equal("Hₐ: μ ≠ 0");
          done();
        },
        error: done,
        complete: () => {},
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit tests**

```bash
git add test/type-errors/model.test.ts
git commit -m "test: add model tests for type error visualization"
```

---

## Task 8: Verify Compilation

- [ ] **Step 1: Build project to verify no TypeScript errors**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Start dev server**

Run: `npm run dev`
Expected: Dev server starts, application loads in browser

- [ ] **Step 3: Verify application visually**

Open browser to dev server URL (typically http://localhost:5173)
Expected: See "Two types of errors" heading with sliders and visualization

- [ ] **Step 4: Test interactive features**

- Move the "significance level" slider
- Move the "真实均值 (μ₁)" slider
- Move the "标准差 (σ)" slider
Expected: Distributions and error areas update in real-time

- [ ] **Step 5: Stop dev server**

Press Ctrl+C in terminal

---

## Task 9: Delete Old Code

**Files:**
- Delete: `src/counter/` (entire folder)
- Delete: `original_code/` (entire folder)

- [ ] **Step 1: Delete counter folder**

Run: `rm -rf src/counter/`
Expected: Folder removed

- [ ] **Step 2: Delete original_code folder**

Run: `rm -rf original_code/`
Expected: Folder removed

- [ ] **Step 3: Run tests to verify nothing broken**

Run: `npm test`
Expected: All tests still pass

- [ ] **Step 4: Build to verify no issues**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit cleanup**

```bash
git add -A
git commit -m "refactor: remove counter and original_code folders after migration"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Build production bundle**

Run: `npm run build`
Expected: Production build succeeds

- [ ] **Step 3: Preview production build**

Run: `npm run preview`
Expected: Preview server starts, application works

- [ ] **Step 4: Stop preview server**

Press Ctrl+C in terminal

- [ ] **Step 5: Run linter**

Run: `npm run lint`
Expected: No linting errors (fix any with `npm run lint:fix` if needed)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final verification complete - type error migration successful"
```

---

## Success Criteria

After completing all tasks, verify:
- ✅ All TypeScript files compile without errors (`npm run build`)
- ✅ All tests pass (`npm test`)
- ✅ Dev server runs without errors (`npm run dev`)
- ✅ Visual application matches original behavior (sliders work, distributions render)
- ✅ `src/counter/` deleted
- ✅ `original_code/` deleted
- ✅ No linting errors (`npm run lint`)
