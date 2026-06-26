# Type Errors Visualization Refactoring - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Type Errors visualization from a monolithic component to a maintainable, Cycle.js-compliant architecture using @cycle/state, proper MVI structure, and component isolation.

**Architecture:** Three parallel components (TypeErrorsApp, ControlPanel, Chart) following full MVI pattern. TypeErrorsApp manages global state with @cycle/state, ControlPanel handles user input with isolated state, Chart renders as a pure component.

**Tech Stack:** Cycle.js, @cycle/state, @cycle/isolate, TypeScript, xstream, D3.js, fromDiagram for testing

---

## File Structure

```
src/
├── components/
│   ├── TypeErrorsApp/
│   │   ├── index.ts              # Main: glue intent+model+view
│   │   ├── intent.ts             # Handle top-level events (minimal)
│   │   ├── model.ts              # State tree + computed logic
│   │   ├── view.ts               # Compose ControlPanel + Chart
│   │   └── types.ts              # AppState interface
│   ├── ControlPanel/
│   │   ├── index.ts              # Main: glue intent+model+view
│   │   ├── intent.ts             # Slider events → actions
│   │   ├── model.ts              # Params state + reducers
│   │   ├── view.ts               # Slider UI rendering
│   │   └── types.ts              # ParamsState interface
│   └── Chart/
│       ├── index.ts              # Component wrapper
│       ├── view.ts               # Pure render function
│       ├── graph.ts              # D3 helpers (moved from type-errors/)
│       └── axes.ts               # Axis components (moved from type-errors/)
├── utils/
│   └── dom-helper.ts             # DOM selection helper (keep as-is)
├── main.ts                       # Entry point (update to use withState)
└── types/
    └── jstat.d.ts                # External types (unchanged)

test/
├── components/
│   ├── TypeErrorsApp/
│   │   └── model.test.ts         # State management tests
│   ├── ControlPanel/
│   │   ├── intent.test.ts        # Event extraction with fromDiagram
│   │   └── model.test.ts         # Reducer tests
│   └── Chart/
│       └── view.test.ts          # Pure rendering tests
├── type-errors/
│   └── model.test.ts             # Existing tests (keep passing)
└── helpers/
    └── test-utils.ts             # fromDiagram helpers
```

---

## Phase 1: Foundation

### Task 1: Install @cycle/state and @cycle/isolate

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add dependencies to package.json**

Add to `dependencies` section:
```json
"@cycle/state": "^1.4.0",
"@cycle/isolate": "^5.2.0"
```

- [ ] **Step 2: Install the packages**

Run: `npm install`

Expected output: Packages installed successfully

- [ ] **Step 3: Verify installation**

Run: `npm ls @cycle/state @cycle/isolate`

Expected: Both packages listed with versions

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @cycle/state and @cycle/isolate"
```

### Task 2: Create directory structure

**Files:**
- Create: `src/components/TypeErrorsApp/`
- Create: `src/components/ControlPanel/`
- Create: `src/components/Chart/`
- Create: `test/components/TypeErrorsApp/`
- Create: `test/components/ControlPanel/`
- Create: `test/components/Chart/`

- [ ] **Step 1: Create component directories**

Run:
```bash
mkdir -p src/components/TypeErrorsApp
mkdir -p src/components/ControlPanel
mkdir -p src/components/Chart
mkdir -p test/components/TypeErrorsApp
mkdir -p test/components/ControlPanel
mkdir -p test/components/Chart
```

- [ ] **Step 2: Create test helpers directory**

Run: `mkdir -p test/helpers`

- [ ] **Step 3: Commit**

```bash
git add src/components test/components
git commit -m "refactor: create component directory structure"
```

### Task 3: Create TypeScript type definitions for TypeErrorsApp

**Files:**
- Create: `src/components/TypeErrorsApp/types.ts`

- [ ] **Step 1: Write AppState interface**

Create `src/components/TypeErrorsApp/types.ts`:
```typescript
import { Stream } from 'xstream';
import { Reducer } from '@cycle/state';
import { DOMSource } from '@cycle/dom';
import { VNode } from '@cycle/dom';

// Import types from existing code
export interface DistributionPoint {
  x: number;
  y: number;
}

export interface Scales {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
}

export type CriticalAreaFn = (d: DistributionPoint, c: number[]) => boolean;

export interface HypothesisText {
  H0Text: string;
  H1Text: string;
}

export interface AppState {
  config: {
    width: number;
    height: number;
    testType: 'left-tailed' | 'right-tailed' | 'two-tailed';
  };
  params: {
    alpha: number;
    nullMean: number;
    trueMean: number;
    stdDev: number;
  };
  computed: {
    scales: Scales;
    nullDistribution: DistributionPoint[];
    trueDistribution: DistributionPoint[];
    criticalValue: number[];
    criticalAreaFn: CriticalAreaFn;
    hypothesisText: HypothesisText;
  };
}

export interface Sources {
  state: StateSource<AppState>;
  CONFIG: Stream<{ width: number; height: number; testType: string }>;
}

export interface Sinks {
  DOM: Stream<VNode>;
  state: Stream<Reducer<AppState>>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TypeErrorsApp/types.ts
git commit -m "refactor: add TypeErrorsApp type definitions"
```

### Task 4: Create TypeScript type definitions for ControlPanel

**Files:**
- Create: `src/components/ControlPanel/types.ts`

- [ ] **Step 1: Write ParamsState interface**

Create `src/components/ControlPanel/types.ts`:
```typescript
import { Stream } from 'xstream';
import { Reducer } from '@cycle/state';
import { DOMSource } from '@cycle/dom';
import { VNode } from '@cycle/dom';

export interface ParamsState {
  alpha: number;
  nullMean: number;
  trueMean: number;
  stdDev: number;
}

export interface Sources {
  DOM: DOMSource;
  state: StateSource<ParamsState>;
}

export interface Sinks {
  DOM: Stream<VNode>;
  state: Stream<Reducer<ParamsState>>;
}

export interface Actions {
  alpha$: Stream<number>;
  nullMean$: Stream<number>;
  trueMean$: Stream<number>;
  stdDev$: Stream<number>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ControlPanel/types.ts
git commit -m "refactor: add ControlPanel type definitions"
```

### Task 5: Create TypeScript type definitions for Chart

**Files:**
- Create: `src/components/Chart/types.ts`

- [ ] **Step 1: Write ChartProps interface**

Create `src/components/Chart/types.ts`:
```typescript
import { Stream } from 'xstream';
import { VNode } from '@cycle/dom';

export interface DistributionPoint {
  x: number;
  y: number;
}

export interface Scales {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
}

export type CriticalAreaFn = (d: DistributionPoint, c: number[]) => boolean;

export interface HypothesisText {
  H0Text: string;
  H1Text: string;
}

export interface ChartProps {
  scales: Scales;
  nullDistribution: DistributionPoint[];
  trueDistribution: DistributionPoint[];
  criticalValue: number[];
  criticalAreaFn: CriticalAreaFn;
  hypothesisText: HypothesisText;
  width: number;
  height: number;
}

export interface Sources {
  props: Stream<ChartProps>;
}

export interface Sinks {
  DOM: Stream<VNode>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Chart/types.ts
git commit -m "refactor: add Chart type definitions"
```

### Task 6: Create empty component skeleton files

**Files:**
- Create: `src/components/TypeErrorsApp/index.ts`
- Create: `src/components/TypeErrorsApp/intent.ts`
- Create: `src/components/TypeErrorsApp/model.ts`
- Create: `src/components/TypeErrorsApp/view.ts`
- Create: `src/components/ControlPanel/index.ts`
- Create: `src/components/ControlPanel/intent.ts`
- Create: `src/components/ControlPanel/model.ts`
- Create: `src/components/ControlPanel/view.ts`
- Create: `src/components/Chart/index.ts`
- Create: `src/components/Chart/view.ts`

- [ ] **Step 1: Create TypeErrorsApp skeleton files**

Create `src/components/TypeErrorsApp/intent.ts`:
```typescript
import type { Sources, Actions } from './types';

export function intent(sources: Sources): Actions {
  // No top-level DOM events currently
  return {} as Actions;
}
```

Create `src/components/TypeErrorsApp/model.ts`:
```typescript
import type { Sources, Sinks, AppState } from './types';
import xs, { Stream } from 'xstream';
import { Reducer } from '@cycle/state';

export function model(
  actions: any,
  sources: Sources
): { reducer$: Stream<Reducer<AppState>>, state$: Stream<AppState> } {
  // Will be implemented in Phase 4
  const reducer$ = xs.of<Reducer<AppState>>(prev => prev);
  const state$ = sources.state.stream;
  return { reducer$, state$ };
}
```

Create `src/components/TypeErrorsApp/view.ts`:
```typescript
import xs, { Stream } from 'xstream';
import { VNode } from '@cycle/dom';
import { div } from '@cycle/dom';

export function view(
  controlPanelDOM: Stream<VNode>,
  chartDOM: Stream<VNode>
): Stream<VNode> {
  return xs.combine(controlPanelDOM, chartDOM)
    .map(([panel, chart]) =>
      div([
        panel,
        chart
      ])
    );
}
```

Create `src/components/TypeErrorsApp/index.ts`:
```typescript
import type { Sources, Sinks } from './types';
import { intent } from './intent';
import { model } from './model';
import { view } from './view';
import xs from 'xstream';

export default function TypeErrorsApp(sources: Sources): Sinks {
  const actions = intent(sources);
  const { reducer$ } = model(actions, sources);

  // Temporary - will be wired in Phase 4
  const controlPanelDOM = xs.of<any>(div('.control-panel', 'ControlPanel'));
  const chartDOM = xs.of<any>(div('.chart', 'Chart'));
  const vdom$ = view(controlPanelDOM, chartDOM);

  return {
    DOM: vdom$,
    state: reducer$
  };
}
```

- [ ] **Step 2: Create ControlPanel skeleton files**

Create `src/components/ControlPanel/intent.ts`:
```typescript
import type { Sources, Actions } from './types';

export function intent(sources: Sources): Actions {
  // Will be implemented in Phase 3
  return {
    alpha$: xs.of(0.05),
    nullMean$: xs.of(0),
    trueMean$: xs.of(1),
    stdDev$: xs.of(1)
  };
}
```

Create `src/components/ControlPanel/model.ts`:
```typescript
import type { Actions, ParamsState } from './types';
import xs, { Stream } from 'xstream';
import { Reducer } from '@cycle/state';

export function model(
  actions: Actions
): { reducer$: Stream<Reducer<ParamsState>>, state$: Stream<ParamsState> } {
  // Will be implemented in Phase 3
  const reducer$ = xs.of<Reducer<ParamsState>>(prev => prev);
  return { reducer$ };
}
```

Create `src/components/ControlPanel/view.ts`:
```typescript
import xs, { Stream } from 'xstream';
import { VNode } from '@cycle/dom';
import { div } from '@cycle/dom';
import type { ParamsState } from './types';

export function view(state$: Stream<ParamsState>): Stream<VNode> {
  return state$.map(state =>
    div('.control-panel', 'ControlPanel')
  );
}
```

Create `src/components/ControlPanel/index.ts`:
```typescript
import type { Sources, Sinks } from './types';
import { intent } from './intent';
import { model } from './model';
import { view } from './view';

export default function ControlPanel(sources: Sources): Sinks {
  const actions = intent(sources);
  const { reducer$ } = model(actions);
  const state$ = sources.state.stream;
  const vdom$ = view(state$);

  return {
    DOM: vdom$,
    state: reducer$
  };
}
```

- [ ] **Step 3: Create Chart skeleton files**

Create `src/components/Chart/view.ts`:
```typescript
import xs, { Stream } from 'xstream';
import { VNode } from '@cycle/dom';
import { div } from '@cycle/dom';
import type { ChartProps } from './types';

export function view(props$: Stream<ChartProps>): Stream<VNode> {
  return props$.map(props =>
    div('.chart', 'Chart')
  );
}
```

Create `src/components/Chart/index.ts`:
```typescript
import type { Sources, Sinks } from './types';
import { view } from './view';

export default function Chart(sources: Sources): Sinks {
  const vdom$ = view(sources.props);

  return {
    DOM: vdom$
  };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/TypeErrorsApp src/components/ControlPanel src/components/Chart
git commit -m "refactor: create component skeleton files"
```

### Task 7: Create test utilities with fromDiagram helpers

**Files:**
- Create: `test/helpers/test-utils.ts`

- [ ] **Step 1: Write test utility functions**

Create `test/helpers/test-utils.ts`:
```typescript
import xs from 'xstream';
import fromDiagram from 'xstream/extra/fromDiagram';
import { mockDOMSource } from '@cycle/dom';

export function createMockDOMSource(events: Record<string, string>) {
  const sources: Record<string, any> = {};

  for (const [selector, diagram] of Object.entries(events)) {
    sources[selector] = {
      input: fromDiagram(diagram).mapTo({ target: { value: '0.05' } })
    };
  }

  return mockDOMSource(sources);
}

export function expectStreamSequence<T>(
  stream: xs<T>,
  expected: T[],
  done: Mocha.Done
) {
  const actual: T[] = [];

  stream.addListener({
    next: (val) => actual.push(val),
    complete: () => {
      try {
        expect(actual).to.deep.equal(expected);
        done();
      } catch (e) {
        done(e);
      }
    },
    error: done
  });
}

export function createMockState<T>(initialState: T) {
  return {
    stream: xs.of(initialState)
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add test/helpers/test-utils.ts
git commit -m "test: add fromDiagram test utilities"
```

---

## Phase 2: Chart Component

### Task 8: Move graph.ts and axes.ts to Chart component

**Files:**
- Move: `src/type-errors/graph.ts` → `src/components/Chart/graph.ts`
- Move: `src/type-errors/axes.ts` → `src/components/Chart/axes.ts`

- [ ] **Step 1: Move graph.ts**

Run:
```bash
mv src/type-errors/graph.ts src/components/Chart/graph.ts
```

- [ ] **Step 2: Move axes.ts**

Run:
```bash
mv src/type-errors/axes.ts src/components/Chart/axes.ts
```

- [ ] **Step 3: Update imports in moved files**

In `src/components/Chart/graph.ts`, update imports:
```typescript
// Change from: import type { CriticalAreaFn, DistributionPoint, Scales } from "./model";
// To:
import type { CriticalAreaFn, DistributionPoint, Scales } from "./types";
```

In `src/components/Chart/axes.ts`, update imports:
```typescript
// Add import for scales type
import type { Scales } from './types';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/Chart/graph.ts src/components/Chart/axes.ts src/type-errors/graph.ts src/type-errors/axes.ts
git commit -m "refactor: move graph and axes to Chart component"
```

### Task 9: Write failing test for Chart view component

**Files:**
- Create: `test/components/Chart/view.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/components/Chart/view.test.ts`:
```typescript
import xs from 'xstream';
import { expect } from 'chai';
import { view } from '../../../src/components/Chart/view';
import type { ChartProps } from '../../../src/components/Chart/types';

describe('Chart view', () => {
  it('should render SVG container', (done) => {
    const mockScales = {
      xScale: (val: number) => val,
      yScale: (val: number) => val
    } as any;

    const props: ChartProps = {
      scales: mockScales,
      nullDistribution: [],
      trueDistribution: [],
      criticalValue: [],
      criticalAreaFn: () => false,
      hypothesisText: { H0Text: 'H0', H1Text: 'H1' },
      width: 600,
      height: 400
    };

    const props$ = xs.of(props);
    const vdom$ = view(props$);

    vdom$.addListener({
      next: (vnode) => {
        expect(vnode).to.exist;
        expect(vnode.sel).to.include('div');
        expect(vnode.data.class).to.equal('chart');
        done();
      },
      error: done,
      complete: () => {}
    });
  });

  it('should render with correct props data', (done) => {
    const mockScales = {
      xScale: (val: number) => val * 10,
      yScale: (val: number) => val * 5
    } as any;

    const mockDistribution = [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.4 }
    ];

    const props: ChartProps = {
      scales: mockScales,
      nullDistribution: mockDistribution,
      trueDistribution: mockDistribution,
      criticalValue: [1.96, -1.96],
      criticalAreaFn: (d, c) => d.x > c[0],
      hypothesisText: { H0Text: 'H₀: μ = 0', H1Text: 'Hₐ: μ ≠ 0' },
      width: 600,
      height: 400
    };

    const props$ = xs.of(props);
    const vdom$ = view(props$);

    let called = false;
    vdom$.addListener({
      next: (vnode) => {
        if (called) return;
        called = true;
        expect(vnode).to.exist;
        done();
      },
      error: done,
      complete: () => {}
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:test && npm run test:node:files -- test/components/Chart/view.test.ts`

Expected: Tests fail (view not implemented yet)

- [ ] **Step 3: Commit**

```bash
git add test/components/Chart/view.test.ts
git commit -m "test: add failing tests for Chart view"
```

### Task 10: Implement Chart view component

**Files:**
- Modify: `src/components/Chart/view.ts`

- [ ] **Step 1: Implement view function**

Replace contents of `src/components/Chart/view.ts` with:
```typescript
import xs, { Stream } from 'xstream';
import { VNode, svg, div } from '@cycle/dom';
import { h } from 'snabbdom';
import type { ChartProps } from './types';
import * as d3 from 'd3';
import {
  NullDistribution,
  TrueDistribution,
  CriticalLine,
  Type1ErrorArea,
  Type2ErrorArea,
} from './graph';
import { XAxis } from './axes';
import { HypothesisText } from './graph';

// Constants
const marginTop = 20;
const marginRight = 10;
const marginBottom = 30;
const marginLeft = 40;
const hypoTextOffset = 80;

export function view(props$: Stream<ChartProps>): Stream<VNode> {
  return props$.map((props) => {
    const { scales, nullDistribution, trueDistribution, criticalValue,
            criticalAreaFn, hypothesisText, width, height } = props;

    const chartHeight = height - marginTop - marginBottom;
    const chartWidth = width - marginLeft - marginRight;

    return svg({ attrs: { width, height } }, [
      h('g', { attrs: { transform: `translate(${marginLeft}, ${marginTop})`, id: 'main_group' } }, [
        h('g', { attrs: { transform: `translate(0, ${chartHeight})` } }, [
          XAxis({ scale: scales.xScale }),
        ]),
        NullDistribution({ data: nullDistribution, scales }),
        TrueDistribution({ data: trueDistribution, scales }),
        CriticalLine({ criticalValue, scales }),
        Type1ErrorArea({
          data: nullDistribution,
          criticalValue,
          filterFn: criticalAreaFn,
          scales,
        }),
        Type2ErrorArea({
          data: trueDistribution,
          criticalValue,
          filterFn: (d: any, x: any) => !criticalAreaFn(d, x),
          scales,
        }),
      ]),
      h('g', { attrs: { transform: `translate(${chartWidth - hypoTextOffset}, 0)` } }, [
        HypothesisText({ text0: hypothesisText.H0Text, text1: hypothesisText.H1Text }),
      ]),
    ]);
  });
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run build:test && npm run test:node:files -- test/components/Chart/view.test.ts`

Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/Chart/view.ts
git commit -m "feat: implement Chart view component"
```

### Task 11: Update Chart index.ts to export properly

**Files:**
- Modify: `src/components/Chart/index.ts`

- [ ] **Step 1: Update Chart index exports**

Replace contents of `src/components/Chart/index.ts` with:
```typescript
import type { Sources, Sinks } from './types';
import { view } from './view';

export default function Chart(sources: Sources): Sinks {
  const vdom$ = view(sources.props);

  return {
    DOM: vdom$
  };
}

export { view };
export type { ChartProps, Sources, Sinks } from './types';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Chart/index.ts
git commit -m "refactor: update Chart index exports"
```

---

## Phase 3: ControlPanel Component

### Task 12: Write failing test for ControlPanel intent

**Files:**
- Create: `test/components/ControlPanel/intent.test.ts`

- [ ] **Step 1: Write failing test for slider event extraction**

Create `test/components/ControlPanel/intent.test.ts`:
```typescript
import xs from 'xstream';
import fromDiagram from 'xstream/extra/fromDiagram';
import { mockDOMSource } from '@cycle/dom';
import { expect } from 'chai';
import { intent } from '../../../src/components/ControlPanel/intent';
import type { Sources } from '../../../src/components/ControlPanel/types';

describe('ControlPanel intent', () => {
  it('should extract alpha slider input sequence', (done) => {
    const domSource = mockDOMSource({
      '#alpha': {
        input: fromDiagram('--a--b--c-|')
          .map({
            a: () => ({ target: { value: '0.05' } }),
            b: () => ({ target: { value: '0.08' } }),
            c: () => ({ target: { value: '0.10' } })
          })
      }
    });

    const sources: Sources = {
      DOM: domSource,
      state: { stream: xs.of({ alpha: 0.05, nullMean: 0, trueMean: 1, stdDev: 1 }) }
    };

    const actions = intent(sources);

    const values: number[] = [];
    actions.alpha$.addListener({
      next: (val) => values.push(val),
      complete: () => {
        expect(values).to.deep.equal([0.05, 0.08, 0.10]);
        done();
      },
      error: done
    });
  });

  it('should extract nullMean slider input', (done) => {
    const domSource = mockDOMSource({
      '#null-mean': {
        input: fromDiagram('--a-|')
          .mapTo({ target: { value: '1.5' } })
      }
    });

    const sources: Sources = {
      DOM: domSource,
      state: { stream: xs.of({ alpha: 0.05, nullMean: 0, trueMean: 1, stdDev: 1 }) }
    };

    const actions = intent(sources);

    actions.nullMean$.addListener({
      next: (val) => {
        expect(val).to.equal(1.5);
        done();
      },
      error: done
    });
  });

  it('should extract trueMean slider input', (done) => {
    const domSource = mockDOMSource({
      '#true-mean': {
        input: fromDiagram('--a-|')
          .mapTo({ target: { value: '2.0' } })
      }
    });

    const sources: Sources = {
      DOM: domSource,
      state: { stream: xs.of({ alpha: 0.05, nullMean: 0, trueMean: 1, stdDev: 1 }) }
    };

    const actions = intent(sources);

    actions.trueMean$.addListener({
      next: (val) => {
        expect(val).to.equal(2.0);
        done();
      },
      error: done
    });
  });

  it('should extract stdDev slider input', (done) => {
    const domSource = mockDOMSource({
      '#std-dev': {
        input: fromDiagram('--a-|')
          .mapTo({ target: { value: '1.5' } })
      }
    });

    const sources: Sources = {
      DOM: domSource,
      state: { stream: xs.of({ alpha: 0.05, nullMean: 0, trueMean: 1, stdDev: 1 }) }
    };

    const actions = intent(sources);

    actions.stdDev$.addListener({
      next: (val) => {
        expect(val).to.equal(1.5);
        done();
      },
      error: done
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:test && npm run test:node:files -- test/components/ControlPanel/intent.test.ts`

Expected: Tests fail (intent not implemented yet)

- [ ] **Step 3: Commit**

```bash
git add test/components/ControlPanel/intent.test.ts
git commit -m "test: add failing tests for ControlPanel intent"
```

### Task 13: Implement ControlPanel intent

**Files:**
- Modify: `src/components/ControlPanel/intent.ts`

- [ ] **Step 1: Implement intent function**

Replace contents of `src/components/ControlPanel/intent.ts` with:
```typescript
import type { Sources, Actions } from './types';
import { $el } from '../../../utils/dom-helper';

export function intent(sources: Sources): Actions {
  const alpha$ = $el(sources.DOM, '#alpha')
    .events('input')
    .map((ev: Event) => Number((ev.target as HTMLInputElement).value));

  const nullMean$ = $el(sources.DOM, '#null-mean')
    .events('input')
    .map((ev: Event) => Number((ev.target as HTMLInputElement).value));

  const trueMean$ = $el(sources.DOM, '#true-mean')
    .events('input')
    .map((ev: Event) => Number((ev.target as HTMLInputElement).value));

  const stdDev$ = $el(sources.DOM, '#std-dev')
    .events('input')
    .map((ev: Event) => Number((ev.target as HTMLInputElement).value));

  return {
    alpha$,
    nullMean$,
    trueMean$,
    stdDev$,
  };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run build:test && npm run test:node:files -- test/components/ControlPanel/intent.test.ts`

Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/ControlPanel/intent.ts
git commit -m "feat: implement ControlPanel intent"
```

### Task 14: Write failing test for ControlPanel model

**Files:**
- Create: `test/components/ControlPanel/model.test.ts`

- [ ] **Step 1: Write failing test for model reducers**

Create `test/components/ControlPanel/model.test.ts`:
```typescript
import xs from 'xstream';
import fromDiagram from 'xstream/extra/fromDiagram';
import { expect } from 'chai';
import { model } from '../../../src/components/ControlPanel/model';
import type { Actions, ParamsState } from '../../../src/components/ControlPanel/types';

describe('ControlPanel model', () => {
  it('should initialize with defaultReducer', (done) => {
    const actions: Actions = {
      alpha$: xs.never(),
      nullMean$: xs.never(),
      trueMean$: xs.never(),
      stdDev$: xs.never()
    };

    const { reducer$ } = model(actions);

    reducer$.compose(xs.take(1)).addListener({
      next: (reducer) => {
        const state = reducer(undefined);
        expect(state).to.deep.equal({
          alpha: 0.05,
          nullMean: 0,
          trueMean: 1,
          stdDev: 1
        });
        done();
      },
      error: done
    });
  });

  it('should update alpha from actions', (done) => {
    const actions: Actions = {
      alpha$: xs.of(0.10),
      nullMean$: xs.never(),
      trueMean$: xs.never(),
      stdDev$: xs.never()
    };

    const { reducer$ } = model(actions);

    const states: ParamsState[] = [];
    reducer$.addListener({
      next: (reducer) => {
        const currentState = states.length > 0
          ? reducer(states[states.length - 1])
          : reducer(undefined);
        states.push(currentState);
      },
      complete: () => {
        expect(states).to.have.length(2);
        expect(states[0].alpha).to.equal(0.05); // default
        expect(states[1].alpha).to.equal(0.10);
        done();
      },
      error: done
    });
  });

  it('should update multiple params simultaneously', (done) => {
    const actions: Actions = {
      alpha$: fromDiagram('--a--b-|').mapTo(0.08),
      nullMean$: fromDiagram('--c--d-|').mapTo(1.5),
      trueMean$: xs.never(),
      stdDev$: xs.never()
    };

    const { reducer$ } = model(actions);

    const states: ParamsState[] = [];
    reducer$.addListener({
      next: (reducer) => {
        const currentState = states.length > 0
          ? reducer(states[states.length - 1])
          : reducer(undefined);
        states.push(currentState);
      },
      complete: () => {
        expect(states.length).to.be.greaterThan(1);
        // Check that both alpha and nullMean were updated
        const finalState = states[states.length - 1];
        expect(finalState.alpha).to.equal(0.08);
        expect(finalState.nullMean).to.equal(1.5);
        done();
      },
      error: done
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:test && npm run test:node:files -- test/components/ControlPanel/model.test.ts`

Expected: Tests fail (model not implemented yet)

- [ ] **Step 3: Commit**

```bash
git add test/components/ControlPanel/model.test.ts
git commit -m "test: add failing tests for ControlPanel model"
```

### Task 15: Implement ControlPanel model with reducers

**Files:**
- Modify: `src/components/ControlPanel/model.ts`

- [ ] **Step 1: Implement model with defaultReducer**

Replace contents of `src/components/ControlPanel/model.ts` with:
```typescript
import type { Actions, ParamsState } from './types';
import xs, { Stream } from 'xstream';
import { Reducer } from '@cycle/state';

export function model(
  actions: Actions
): { reducer$: Stream<Reducer<ParamsState>> } {
  // Default reducer for initialization (replaces startWith)
  const defaultReducer$ = xs.of<Reducer<ParamsState>>((prev) => {
    if (prev !== undefined) {
      return prev;
    }
    return {
      alpha: 0.05,
      nullMean: 0,
      trueMean: 1,
      stdDev: 1
    };
  });

  // Reducers for each action
  const alphaReducer$ = actions.alpha$.map((alpha) => (prev: ParamsState) => ({
    ...prev,
    alpha
  }));

  const nullMeanReducer$ = actions.nullMean$.map((nullMean) => (prev: ParamsState) => ({
    ...prev,
    nullMean
  }));

  const trueMeanReducer$ = actions.trueMean$.map((trueMean) => (prev: ParamsState) => ({
    ...prev,
    trueMean
  }));

  const stdDevReducer$ = actions.stdDev$.map((stdDev) => (prev: ParamsState) => ({
    ...prev,
    stdDev
  }));

  // Merge all reducers
  const reducer$ = xs.merge(
    defaultReducer$,
    alphaReducer$,
    nullMeanReducer$,
    trueMeanReducer$,
    stdDevReducer$
  );

  return { reducer$ };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run build:test && npm run test:node:files -- test/components/ControlPanel/model.test.ts`

Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/ControlPanel/model.ts
git commit -m "feat: implement ControlPanel model with reducers"
```

### Task 16: Implement ControlPanel view

**Files:**
- Modify: `src/components/ControlPanel/view.ts`

- [ ] **Step 1: Implement view with sliders**

Replace contents of `src/components/ControlPanel/view.ts` with:
```typescript
import xs, { Stream } from 'xstream';
import { VNode, div, input, span, h1 } from '@cycle/dom';
import type { ParamsState } from './types';

export function view(state$: Stream<ParamsState>): Stream<VNode> {
  return state$.map((state) => {
    const { alpha, nullMean, trueMean, stdDev } = state;

    return div('.control-panel', [
      h1('Type I & II Error Visualization'),

      div('.slider-container', [
        span('.slider-label', 'Significance Level (α):'),
        input({
          attrs: {
            type: 'range',
            id: 'alpha',
            min: '0.01',
            max: '0.2',
            step: '0.01',
            value: String(alpha)
          }
        }),
        span('#alpha-value', String(alpha))
      ]),

      div('.slider-container', [
        span('.slider-label', 'Null Mean (μ₀):'),
        input({
          attrs: {
            type: 'range',
            id: 'null-mean',
            min: '0',
            max: '2',
            step: '0.1',
            value: String(nullMean)
          }
        }),
        span('#null-mean-value', String(nullMean))
      ]),

      div('.slider-container', [
        span('.slider-label', 'True Mean (μ₁):'),
        input({
          attrs: {
            type: 'range',
            id: 'true-mean',
            min: '0',
            max: '3',
            step: '0.1',
            value: String(trueMean)
          }
        }),
        span('#true-mean-value', String(trueMean))
      ]),

      div('.slider-container', [
        span('.slider-label', 'Standard Deviation (σ):'),
        input({
          attrs: {
            type: 'range',
            id: 'std-dev',
            min: '0.1',
            max: '2',
            step: '0.1',
            value: String(stdDev)
          }
        }),
        span('#std-dev-value', String(stdDev))
      ])
    ]);
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ControlPanel/view.ts
git commit -m "feat: implement ControlPanel view with sliders"
```

### Task 17: Update ControlPanel index.ts

**Files:**
- Modify: `src/components/ControlPanel/index.ts`

- [ ] **Step 1: Update ControlPanel index**

Replace contents of `src/components/ControlPanel/index.ts` with:
```typescript
import type { Sources, Sinks } from './types';
import { intent } from './intent';
import { model } from './model';
import { view } from './view';

export default function ControlPanel(sources: Sources): Sinks {
  const actions = intent(sources);
  const { reducer$ } = model(actions);
  const state$ = sources.state.stream;
  const vdom$ = view(state$);

  return {
    DOM: vdom$,
    state: reducer$
  };
}

export { ControlPanel as default };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ControlPanel/index.ts
git commit -m "refactor: update ControlPanel index"
```

---

## Phase 4: TypeErrorsApp Root Component

### Task 18: Write failing test for TypeErrorsApp model

**Files:**
- Create: `test/components/TypeErrorsApp/model.test.ts`

- [ ] **Step 1: Write failing test for state tree management**

Create `test/components/TypeErrorsApp/model.test.ts`:
```typescript
import xs from 'xstream';
import { expect } from 'chai';
import { model } from '../../../src/components/TypeErrorsApp/model';
import type { AppState } from '../../../src/components/TypeErrorsApp/types';

describe('TypeErrorsApp model', () => {
  it('should initialize complete state tree', (done) => {
    const mockSources = {
      state: { stream: xs.of({} as AppState) },
      CONFIG: xs.of({
        width: 600,
        height: 400,
        testType: 'two-tailed'
      })
    };

    const { reducer$ } = model({}, mockSources);

    reducer$.compose(xs.take(1)).addListener({
      next: (reducer) => {
        const state = reducer(undefined);

        expect(state.config).to.exist;
        expect(state.params).to.exist;
        expect(state.computed).to.exist;
        expect(state.config.width).to.equal(600);
        expect(state.config.height).to.equal(400);
        expect(state.params.alpha).to.equal(0.05);
        expect(state.params.nullMean).to.equal(0);
        expect(state.params.trueMean).to.equal(1);
        expect(state.params.stdDev).to.equal(1);
        done();
      },
      error: done
    });
  });

  it('should compute derived state from params', (done) => {
    const mockState: AppState = {
      config: {
        width: 600,
        height: 400,
        testType: 'two-tailed'
      },
      params: {
        alpha: 0.05,
        nullMean: 0,
        trueMean: 1,
        stdDev: 1
      },
      computed: {} as any
    };

    const mockSources = {
      state: { stream: xs.of(mockState) },
      CONFIG: xs.of({
        width: 600,
        height: 400,
        testType: 'two-tailed'
      })
    };

    const { state$ } = model({}, mockSources);

    state$.compose(xs.take(1)).addListener({
      next: (state) => {
        expect(state.computed.scales).to.exist;
        expect(state.computed.nullDistribution).to.exist;
        expect(state.computed.trueDistribution).to.exist;
        expect(state.computed.criticalValue).to.exist;
        expect(state.computed.hypothesisText).to.exist;
        done();
      },
      error: done
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:test && npm run test:node:files -- test/components/TypeErrorsApp/model.test.ts`

Expected: Tests fail (model not implemented yet)

- [ ] **Step 3: Commit**

```bash
git add test/components/TypeErrorsApp/model.test.ts
git commit -m "test: add failing tests for TypeErrorsApp model"
```

### Task 19: Implement TypeErrorsApp model with computed state

**Files:**
- Modify: `src/components/TypeErrorsApp/model.ts`

- [ ] **Step 1: Implement model with state tree and computed logic**

Replace contents of `src/components/TypeErrorsApp/model.ts` with:
```typescript
import type { Sources, Sinks, AppState } from './types';
import xs, { Stream } from 'xstream';
import { Reducer } from '@cycle/state';
import * as d3 from 'd3';
import jStat from 'jstat';

// Constants
const marginTop = 20;
const marginRight = 10;
const marginBottom = 30;
const marginLeft = 40;

// Reuse utility functions from existing model
function normalPDF(x: number, mean: number, stdDev: number): number {
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

function generateDistribution(mean: number, stdDev: number) {
  return d3.range(-5, 10, 0.05).map((x) => ({
    x,
    y: normalPDF(x, mean, stdDev),
  }));
}

function createScales(width: number, height: number) {
  const chartWidth = width - marginLeft - marginRight;
  const chartHeight = height - marginTop - marginBottom;
  const xScale = d3.scaleLinear().domain([-5, 10]).range([0, chartWidth]);
  const yScale = d3.scaleLinear().domain([0, 0.5]).range([chartHeight, 0]);
  return { xScale, yScale };
}

// Test strategy pattern
interface TestStrategy {
  p: (alpha: number) => number[];
  criticalAreaFn: (d: any, c: number[]) => boolean;
  hypoText: (nullMean: number) => { H0Text: string; H1Text: string };
}

const TestStrategies: Record<string, TestStrategy> = {
  'right-tailed': {
    p: (alpha: number) => [1 - alpha],
    criticalAreaFn: (d: any, c: number[]) => d.x > (c[0] ?? 0),
    hypoText: (nullMean: number) => ({
      H0Text: `H₀: μ = ${nullMean}`,
      H1Text: `Hₐ: μ > ${nullMean}`,
    }),
  },
  'left-tailed': {
    p: (alpha: number) => [alpha],
    criticalAreaFn: (d: any, c: number[]) => d.x < (c[0] ?? 0),
    hypoText: (nullMean: number) => ({
      H0Text: `H₀: μ = ${nullMean}`,
      H1Text: `Hₐ: μ < ${nullMean}`,
    }),
  },
  'two-tailed': {
    p: (alpha: number) => [alpha / 2, 1 - alpha / 2],
    criticalAreaFn: (d: any, c: number[]) => d.x < (c[0] ?? 0) || d.x > (c[1] ?? 0),
    hypoText: (nullMean: number) => ({
      H0Text: `H₀: μ = ${nullMean}`,
      H1Text: `Hₐ: μ ≠ ${nullMean}`,
    }),
  },
};

export function model(
  actions: any,
  sources: Sources
): { reducer$: Stream<Reducer<AppState>>, state$: Stream<AppState> } {
  const state$ = sources.state.stream;

  // Default reducer for initialization
  const defaultReducer$ = xs.of<Reducer<AppState>>((prev) => {
    if (prev !== undefined) {
      return prev;
    }

    const config = {
      width: 600,
      height: 400,
      testType: 'two-tailed' as const
    };

    const params = {
      alpha: 0.05,
      nullMean: 0,
      trueMean: 1,
      stdDev: 1
    };

    const scales = createScales(config.width, config.height);
    const strategy = TestStrategies[config.testType];

    return {
      config,
      params,
      computed: {
        scales,
        nullDistribution: generateDistribution(params.nullMean, params.stdDev),
        trueDistribution: generateDistribution(params.trueMean, params.stdDev),
        criticalValue: strategy.p(params.alpha).map((p) => jStat.normal.inv(p, params.nullMean, params.stdDev)),
        criticalAreaFn: strategy.criticalAreaFn,
        hypothesisText: strategy.hypoText(params.nullMean)
      }
    };
  });

  // Computed state reducer - reacts to params changes
  const computedReducer$ = xs.combine(
    sources.CONFIG,
    state$.filter(state => state.params !== undefined)
  ).map(([config, state]) => {
    const { params } = state;
    const scales = createScales(config.width, config.height);
    const strategy = TestStrategies[config.testType];

    return (prev: AppState) => ({
      ...prev,
      config,
      computed: {
        scales,
        nullDistribution: generateDistribution(params.nullMean, params.stdDev),
        trueDistribution: generateDistribution(params.trueMean, params.stdDev),
        criticalValue: strategy.p(params.alpha).map((p) => jStat.normal.inv(p, params.nullMean, params.stdDev)),
        criticalAreaFn: strategy.criticalAreaFn,
        hypothesisText: strategy.hypoText(params.nullMean)
      }
    });
  });

  // Merge reducers
  const reducer$ = xs.merge(defaultReducer$, computedReducer$);

  return { reducer$, state$ };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run build:test && npm run test:node:files -- test/components/TypeErrorsApp/model.test.ts`

Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/TypeErrorsApp/model.ts
git commit -m "feat: implement TypeErrorsApp model with computed state"
```

### Task 20: Implement TypeErrorsApp view

**Files:**
- Modify: `src/components/TypeErrorsApp/view.ts`

- [ ] **Step 1: Implement view to compose children**

Replace contents of `src/components/TypeErrorsApp/view.ts` with:
```typescript
import xs, { Stream } from 'xstream';
import { VNode, div } from '@cycle/dom';

export function view(
  controlPanelDOM: Stream<VNode>,
  chartDOM: Stream<VNode>
): Stream<VNode> {
  return xs.combine(controlPanelDOM, chartDOM)
    .map(([panel, chart]) =>
      div('.type-errors-app', [
        panel,
        chart
      ])
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TypeErrorsApp/view.ts
git commit -m "feat: implement TypeErrorsApp view"
```

### Task 21: Wire TypeErrorsApp component

**Files:**
- Modify: `src/components/TypeErrorsApp/index.ts`

- [ ] **Step 1: Wire up TypeErrorsApp with child components**

Replace contents of `src/components/TypeErrorsApp/index.ts` with:
```typescript
import type { Sources, Sinks } from './types';
import { intent } from './intent';
import { model } from './model';
import { view } from './view';
import isolate from '@cycle/isolate';
import ControlPanel from '../ControlPanel';
import Chart from '../Chart';

export default function TypeErrorsApp(sources: Sources): Sinks {
  // Compose child components
  const controlPanelSinks = isolate(ControlPanel, 'params')(sources);

  // Prepare props for Chart (stateless component)
  const chartProps$ = sources.state.stream
    .filter(state => state.computed && state.computed.scales)
    .map(state => ({
      ...state.computed,
      width: state.config.width,
      height: state.config.height
    }));

  const chartSinks = Chart({ props: chartProps$ });

  // Model
  const actions = intent(sources);
  const { reducer$ } = model(actions, sources);

  // Merge all reducers
  const allReducers$ = xs.merge(
    reducer$,
    controlPanelSinks.state
  );

  // View
  const vdom$ = view(controlPanelSinks.DOM, chartSinks.DOM);

  return {
    DOM: vdom$,
    state: allReducers$
  };
}

export { TypeErrorsApp as default };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors (may need to add xs import)

- [ ] **Step 3: Fix imports if needed**

Add to imports at top of file:
```typescript
import xs from 'xstream';
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TypeErrorsApp/index.ts
git commit -m "feat: wire TypeErrorsApp with child components"
```

---

## Phase 5: Switch Over

### Task 22: Update main.ts to use new architecture

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update main.ts to use withState**

Replace contents of `src/main.ts` with:
```typescript
import { makeDOMDriver } from '@cycle/dom';
import { run } from '@cycle/run';
import { withState } from '@cycle/state';
import TypeErrorsApp from './components/TypeErrorsApp';

function makeConfigDriver() {
  return function configDriver() {
    return xs.of({
      width: 600,
      height: 400,
      testType: 'two-tailed',
    });
  };
}

run(withState(TypeErrorsApp), {
  DOM: makeDOMDriver('#app'),
  CONFIG: makeConfigDriver(),
});
```

- [ ] **Step 2: Add missing import**

Add import at top:
```typescript
import xs from 'xstream';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "refactor: update main.ts to use new architecture"
```

### Task 23: Run full test suite and fix any issues

**Files:**
- Test: All test files

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass (both old and new)

- [ ] **Step 2: If tests fail, debug and fix**

Review error messages and fix issues in component code or tests

- [ ] **Step 3: Re-run tests until all pass**

Run: `npm test`

Expected: All tests pass

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add .
git commit -m "fix: resolve test failures after migration"
```

### Task 24: Verify application works in browser

**Files:**
- Test: Application in browser

- [ ] **Step 1: Start development server**

Run: `npm run dev`

Expected: Server starts at http://localhost:5173

- [ ] **Step 2: Open application in browser**

Navigate to http://localhost:5173

Expected: Application loads without errors

- [ ] **Step 3: Test all sliders**

Move each slider and verify:
- Alpha slider updates
- Null Mean slider updates
- True Mean slider updates
- Std Dev slider updates
- Chart updates in real-time

Expected: All sliders work and chart responds

- [ ] **Step 4: Check for console errors**

Open browser DevTools console

Expected: No errors or warnings

- [ ] **Step 5: Stop dev server**

Press Ctrl+C in terminal

- [ ] **Step 6: Commit if any fixes needed**

```bash
git add .
git commit -m "fix: resolve runtime issues"
```

### Task 25: Remove old type-errors directory

**Files:**
- Remove: `src/type-errors/`
- Remove: `test/type-errors/` (tests only, keep if they're still useful)

- [ ] **Step 1: Remove old component files**

Run:
```bash
rm -rf src/type-errors/index.ts
```

Note: Keep `src/type-errors/model.ts` temporarily as it may have utilities we're using

- [ ] **Step 2: Check if model.ts has any unique exports**

Run: `grep -r "from.*type-errors/model" src/`

If no results, remove it:
```bash
rm -rf src/type-errors/
```

- [ ] **Step 3: Update or remove old tests**

Decide whether to keep old tests as reference or remove them:
```bash
# If keeping as reference:
mv test/type-errors test/type-errors.deprecated

# Or if removing:
rm -rf test/type-errors/
```

- [ ] **Step 4: Run tests to verify everything still works**

Run: `npm test`

Expected: All new tests pass

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "refactor: remove old type-errors directory"
```

### Task 26: Final cleanup and verification

**Files:**
- All project files

- [ ] **Step 1: Run linter**

Run: `npm run lint`

Expected: No linting errors

- [ ] **Step 2: Fix any linting issues**

Run: `npm run lint:fix`

- [ ] **Step 3: Run type checking**

Run: `npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 4: Build production version**

Run: `npm run build`

Expected: Build succeeds without errors

- [ ] **Step 5: Run all tests one final time**

Run: `npm test`

Expected: All tests pass

- [ ] **Step 6: Commit final cleanup**

```bash
git add .
git commit -m "chore: final cleanup and verification"
```

### Task 27: Update documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with new architecture**

Update the "Architecture" section in `README.md` to reflect the new component structure:

```markdown
## Architecture

The application follows Cycle.js best practices with three main components:

- **TypeErrorsApp**: Root component managing global state with @cycle/state
- **ControlPanel**: User input controls (isolated state for sliders)
- **Chart**: Pure visualization component (no state)

Each component follows the MVI (Model-View-Intent) pattern.
```

- [ ] **Step 2: Update file structure section**

Update the file structure to match new organization

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for new architecture"
```

---

## Completion Checklist

- [ ] All tasks completed
- [ ] All tests pass
- [ ] Application runs in browser
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Old code removed
- [ ] Git history clean with meaningful commits

## Success Criteria

✅ **No `startWith` anywhere** - All initialization uses `defaultReducer`
✅ **@cycle/state integrated** - State managed through reducers
✅ **Component isolation** - ControlPanel isolated with key `'params'`
✅ **Full MVI structure** - Every component has intent, model, view
✅ **Tests pass** - All tests use fromDiagram where appropriate
✅ **Type safe** - Strong types on business logic, pragmatic `any` on DOM/D3
✅ **Works in browser** - Application functions correctly

---

**Implementation complete!**
