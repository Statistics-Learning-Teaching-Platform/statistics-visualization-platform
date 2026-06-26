# Cycle.js Refactoring Design Document

**Date**: 2026-03-28
**Project**: Confidence Interval Visualization
**Goal**: Refactor codebase to fully comply with Cycle.js development standards

## Executive Summary

This document outlines a comprehensive refactoring plan to bring the Confidence Interval Visualization application into full compliance with Cycle.js development standards. The refactoring will be executed in three incremental phases, maintaining application functionality at each stage.

**Current Status**: The project follows MVI architecture but has critical violations of Cycle.js principles.
**Target Status**: Full compliance with Cycle.js Three Iron Laws and best practices.

---

## 1. Architecture Overview

### Target Architecture

The refactored project will adopt a **layered MVI architecture** that fully adheres to Cycle.js's Three Iron Laws:

```
┌─────────────────────────────────────────────────────┐
│           ConfidenceInterval (Root Component)        │
│                                                      │
│   Intent → Model → View                              │
│   (events→actions) (reducers→state) (state→vdom)    │
│                                                      │
│   Side Effect Descriptions:                          │
│   - state sink: reducer$ (pure function stream)      │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ControlPanel  GraphVisualization  StatsDisplay
   (Child)         (Child)            (Child)
```

### Core Improvements

1. **Remove all `startWith` usage** - All initialization through `defaultReducer`
2. **Declarative D3 wrappers** - D3 operations return VNode configs, not direct DOM manipulation
3. **Component decomposition** - Single responsibility principle for each component
4. **Pure function priority** - All business logic independently testable

### Key Design Decisions

- **Keep `@cycle/state`** - Continue using withState and reducer pattern
- **D3 Integration** - Create declarative wrapper layer (d3-components/)
- **Test-first approach** - Each pure function has corresponding tests
- **Incremental migration** - Three phases, each maintaining runnable state

---

## 2. Component Design

### Component File Structure

```
src/components/
├── confidence-interval/        # Root component (coordinator)
│   ├── index.ts
│   ├── intent.ts
│   ├── model.ts
│   ├── view.ts
│   └── types.ts
├── control-panel/              # Control panel child component
│   ├── index.ts
│   ├── intent.ts
│   ├── model.ts
│   ├── view.ts
│   └── types.ts
├── graph-visualization/        # Chart visualization child component
│   ├── index.ts
│   ├── intent.ts
│   ├── model.ts
│   ├── view.ts
│   └── types.ts
└── stats-display/              # Statistics display child component
    ├── index.ts
    ├── view.ts
    └── types.ts               # Pure presentational, may not need intent/model

src/utils/
├── dom-helper.ts               # Existing DOM selector
└── d3-components/              # NEW: Declarative D3 components
    ├── index.ts
    ├── axis.ts
    ├── ci-lines.ts
    ├── mean-line.ts
    └── types.ts
```

### Component Responsibilities

#### ConfidenceInterval (Root Component)
- **Purpose**: Coordinate child components, manage global state
- **State**:
  ```typescript
  {
    sampleSize: number;
    populationSD: number;
    confidenceLevel: number;
    samples: Sample[];
    coverage: number;
    collapsed: boolean;
  }
  ```
- **Sinks**: DOM, state

#### ControlPanel (Control Panel)
- **Purpose**: Handle user input (sliders, buttons, dropdowns)
- **Props**: `{ sampleSize, populationSD, confidenceLevel, collapsed }`
- **Actions**:
  ```typescript
  {
    sampleSizeChange$: Stream<number>;
    populationSDChange$: Stream<number>;
    confidenceLevelChange$: Stream<number>;
    addSample$: Stream<null>;
    addMultiple$: Stream<null>;
    reset$: Stream<null>;
    toggleSidebar$: Stream<null>;
  }
  ```
- **Sinks**: value (action stream), DOM (optional)

#### GraphVisualization (Chart Visualization)
- **Purpose**: Render D3 chart showing confidence intervals
- **Props**: `{ samples, coverage, config }`
- **View**: Uses declarative D3 components
- **Sinks**: DOM

#### StatsDisplay (Statistics Display)
- **Purpose**: Display coverage statistics
- **Props**: `{ coverage, totalSamples }`
- **Sinks**: DOM

### New: Declarative D3 Component Layer

```
src/utils/d3-components/
├── index.ts
├── axis.ts           # d3Axis({ type, scale, transform })
├── ci-lines.ts       # d3CILines({ samples, scales })
├── mean-line.ts      # d3MeanLine({ x, y })
└── types.ts
```

**Each D3 component returns VNode configuration, not direct DOM manipulation:**

```typescript
// Example: axis.ts
export function d3Axis(config: AxisConfig): VNode {
  return svg('g', {
    attrs: {
      transform: config.transform,
      class: config.type === 'x' ? 'x-axis' : 'y-axis'
    },
    hook: {
      insert: (vnode) => {
        // Delay DOM manipulation to Snabbdom hooks
        // But logic is encapsulated in pure functions
      }
    }
  }, [
    // Axis tick configuration
  ]);
}
```

---

## 3. Data Flow and State Management

### Overall Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   ConfidenceInterval                        │
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Intent  │───▶│  Model  │───▶│  State  │───▶│  View   │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│       │              │                              │       │
│       │              │                              │       │
│       ▼              ▼                              ▼       │
│  ┌─────────┐    ┌─────────┐                    ┌─────┐   │
│  │ Actions │    │Reducers │                    │ VNode│   │
│  └─────────┘    └─────────┘                    └─────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ControlPanel  GraphVisualization  StatsDisplay
    (Child)         (Receives props)   (Receives props)
```

### State Management Strategy

#### Root Component State

```typescript
// confidence-interval/types.ts
export interface State {
  // User-controlled parameters
  sampleSize: number;
  populationSD: number;
  confidenceLevel: number;

  // Computed results
  samples: Sample[];
  coverage: number;

  // UI state
  collapsed: boolean;

  // Derived data (computed in view, not stored)
  // scales: Scales;  ❌ REMOVE - compute in view or child component
  // chartData: RenderData; ❌ REMOVE - compute in child component
}
```

#### Child Component Props Design

**Principle**: Props should be immutable, child components should not modify props.

```typescript
// control-panel/types.ts
export interface Props {
  sampleSize: number;
  populationSD: number;
  confidenceLevel: number;
  collapsed: boolean;
}

// graph-visualization/types.ts
export interface Props {
  samples: Sample[];
  coverage: number;
  config: Config;
}

// stats-display/types.ts
export interface Props {
  coverage: number;
  totalSamples: number;
}
```

### Key Improvement: Remove startWith Anti-Pattern

#### ❌ Current Wrong Pattern

```typescript
// intent.ts - current code
const sampleSize$ = $el(sources.DOM, "#sampleSize")
  .events("input")
  .map((ev) => Number((ev.target as HTMLInputElement).value))
  .startWith(10);  // ❌ Violates principles
```

#### ✅ Correct Pattern

```typescript
// intent.ts - refactored
const sampleSize$ = $el(sources.DOM, "#sampleSize")
  .events("input")
  .map((ev) => Number((ev.target as HTMLInputElement).value));
  // Remove startWith - let defaultReducer handle initialization

// model.ts - refactored
const defaultReducer$ = xs.of((prevState: State | undefined): State => {
  if (prevState !== undefined) {
    return prevState;
  }

  return {
    sampleSize: 10,        // ✅ Initialize here
    populationSD: 2,
    confidenceLevel: 0.95,
    samples: [],
    coverage: 0,
    collapsed: false,
  };
});
```

### State Derivation Strategy

**Principle**: Only store core data, compute derived data when needed.

```typescript
// ❌ Should NOT store derived data
interface State {
  samples: Sample[];
  scales: Scales;        // This is derived data
  chartData: RenderData; // This is also derived data
}

// ✅ Only store core data
interface State {
  samples: Sample[];
  coverage: number;
  config: Config;
}

// Compute derived data in view or child component
function view(state$: Stream<State>) {
  return state$.map(state => {
    const scales = createScales(state.config, state.samples);
    const chartData = createRenderData(state.samples, scales);
    // Use derived data for rendering
  });
}
```

### Reducer Organization

**Eliminate code duplication** - Extract common initialization logic:

```typescript
// model.ts
function createInitialState(configOverrides?: Partial<Config>): State {
  const config: Config = {
    width: 600,
    height: 400,
    margin: { top: 20, right: 30, bottom: 30, left: 40 },
    populationMean: 10,
    ...configOverrides
  };

  const scales = createScales(config.width, config.height, config.margin, []);

  return {
    sampleSize: 10,
    populationSD: 2,
    confidenceLevel: 0.95,
    samples: [],
    coverage: 0,
    collapsed: false,
    scales,  // if needed
    config,
  };
}

// Usage
const defaultReducer$ = xs.of(() => createInitialState());

const resetReducer$ = resetClick$.mapTo(() => createInitialState());
```

---

## 4. Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  (Optional - minimal)
        │     (5%)    │
        ├─────────────┤
        │Integration  │  (DOM integration - medium)
        │   (20%)     │
        ├─────────────┤
        │  Unit Tests │  (Pure function tests - extensive)
        │    (75%)    │
        └─────────────┘
```

### Test File Structure

```
test/
├── unit/
│   ├── utils/
│   │   ├── statistics.test.ts           # Sample generation, CI calculation
│   │   └── d3-components.test.ts        # D3 wrapper outputs
│   ├── components/
│   │   ├── confidence-interval/
│   │   │   ├── intent.test.ts           # Intent extraction tests
│   │   │   ├── model.test.ts            # State transition tests
│   │   │   └── view.test.ts             # (optional) View output tests
│   │   ├── control-panel/
│   │   │   ├── intent.test.ts
│   │   │   └── model.test.ts
│   │   ├── graph-visualization/
│   │   │   └── view.test.ts
│   │   └── stats-display/
│   │       └── view.test.ts
│   └── helpers.test.ts                  # Helper function tests
├── integration/
│   └── component-interaction.test.ts    # Component interaction tests
└── test-setup.ts                        # Mocha configuration
```

### Core Testing Principles

#### 1. Test Pure Functions, Not DOM/Driver

```typescript
// ✅ Correct: Test pure stream transformations
import { mockDOMSource } from '@cycle/dom';
import fromDiagram from 'xstream/extra/fromDiagram';

describe('ConfidenceInterval Model', () => {
  it('should add sample on click', (done) => {
    const mockClick$ = fromDiagram('--a--|').mapTo({});
    const actions = { addSampleClick$: mockClick$, ... };

    const reducer$ = model(actions);
    reducer$.compose(drop(1)).take(1).addListener({
      next: (reducer) => {
        const newState = reducer(undefined);
        expect(newState.samples).to.have.length(1);
      },
      error: done,
      complete: done
    });
  });
});

// ❌ Wrong: Test DOM rendering
describe('View', () => {
  it('should render button', () => {
    // Don't test actual DOM manipulation
    // Cycle.js components should test streams, not DOM
  });
});
```

#### 2. Use fromDiagram for Time Control

```typescript
import fromDiagram from 'xstream/extra/fromDiagram';

// Create deterministic time sequences
const clickStream = fromDiagram('--a--b--a-|');
// a = click, b = click
// Enables precise testing of timing-dependent behavior
```

#### 3. Test State Transitions

```typescript
describe('Model Reducers', () => {
  it('should initialize state correctly', () => {
    const reducer = model(actions);
    const lastReducer$ = reducer.compose(take(1));

    lastReducer$.addListener({
      next: (reducer) => {
        const state = reducer(undefined);
        expect(state).to.deep.equal({
          sampleSize: 10,
          populationSD: 2,
          confidenceLevel: 0.95,
          samples: [],
          coverage: 0,
          collapsed: false
        });
      }
    });
  });

  it('should update sampleSize when input changes', () => {
    // Test state update logic
  });
});
```

### Key Test Coverage Points

#### Business Logic Tests (Highest Priority)

```typescript
// test/unit/utils/statistics.test.ts
describe('Statistics Utilities', () => {
  describe('generateSample', () => {
    it('should generate sample of correct size');
    it('should generate values within expected range');
    it('should be deterministic with seeded random');
  });

  describe('ci', () => {
    it('should calculate correct confidence interval');
    it('should correctly identify if contains population mean');
    it('should handle empty sample');
  });

  describe('calculateCoverage', () => {
    it('should return 0 for empty array');
    it('should return correct percentage');
    it('should handle all samples containing mean');
    it('should handle no samples containing mean');
  });
});
```

#### Intent Tests

```typescript
// test/unit/components/confidence-interval/intent.test.ts
describe('ConfidenceInterval Intent', () => {
  it('should extract sampleSize from input events');
  it('should extract populationSD from input events');
  it('should extract confidenceLevel from change events');
  it('should extract click events from buttons');

  it('should NOT use startWith', () => {
    // Verify no startWith anti-pattern
    const domSource = mockDOMSource({
      '#sampleSize': { input: xs.of() }
    });

    const actions = intent({ DOM: domSource });

    // actions.sampleSize$ should not have initial value
    let hasInitialValue = false;
    actions.sampleSize$.subscribe({
      next: () => { hasInitialValue = true; }
    });

    expect(hasInitialValue).to.be.false;
  });
});
```

#### Model Tests

```typescript
// test/unit/components/confidence-interval/model.test.ts
describe('ConfidenceInterval Model', () => {
  it('should provide defaultReducer for initialization');
  it('should handle addSample action');
  it('should handle addMultiple action');
  it('should handle reset action');
  it('should handle parameter changes with reset');
  it('should calculate coverage correctly');
  it('should update scales when samples change');
});
```

### Test Execution Configuration

Maintain existing Mocha configuration with improvements:

```json
{
  "scripts": {
    "test": "npm run build:test && npm run test:node",
    "test:watch": "npm run build:test && mocha -r jsdom-global/register dist-test/test/**/*.js --watch",
    "test:coverage": "npm run build:test && nyc mocha -r jsdom-global/register dist-test/test/**/*.js"
  }
}
```

### Expected Test Count

- **Unit Tests**: 30-35 tests
  - Statistics utilities: 10 tests
  - Component intent/model: 15-20 tests
  - D3 components: 5 tests

- **Integration Tests**: 5-8 tests
  - Component interaction: 5-8 tests

**Total**: 35-43 test cases

---

## 5. Migration Phases

### Three-Phase Incremental Refactoring

Each phase maintains runnable and testable code state.

---

## Phase 1: Fix Critical Anti-Patterns (1-2 hours)

**Goal**: Remove `startWith` anti-pattern, extract duplicate code

### Task List

- [ ] 1.1 Remove all `startWith` from intent.ts
- [ ] 1.2 Add initial values in model.ts's defaultReducer
- [ ] 1.3 Extract `createInitialState` utility function
- [ ] 1.4 Update all reducers to use `createInitialState`
- [ ] 1.5 Run existing tests (if any)
- [ ] 1.6 Manual testing of application functionality

### Acceptance Criteria

- ✅ No `startWith` in intent.ts
- ✅ Application displays correct default values on startup
- ✅ All control buttons work correctly
- ✅ No console errors

### Risk: Low

---

## Phase 2: Add Tests and Improve Organization (2-3 hours)

**Goal**: Establish testing foundation, extract reusable utilities

### Task List

- [ ] 2.1 Create test directory structure
- [ ] 2.2 Write statistics utilities tests (10 tests)
- [ ] 2.3 Write confidence-interval intent tests (5 tests)
- [ ] 2.4 Write confidence-interval model tests (10 tests)
- [ ] 2.5 Extract D3 utility functions to separate files
- [ ] 2.6 Add type definitions for D3 utilities
- [ ] 2.7 Run all tests and ensure they pass

### Acceptance Criteria

- ✅ 25+ test cases passing
- ✅ Code coverage > 70%
- ✅ All business logic has test protection

### Risk: Medium

---

## Phase 3: Component Decomposition and D3 Declarative Refactoring (3-4 hours)

**Goal**: Split into child components, create declarative D3 wrappers

### Task List

- [ ] 3.1 Create d3-components wrapper
  - [ ] 3.1.1 axis.ts
  - [ ] 3.1.2 ci-lines.ts
  - [ ] 3.1.3 mean-line.ts
- [ ] 3.2 Create control-panel child component
- [ ] 3.3 Create graph-visualization child component
- [ ] 3.4 Create stats-display child component
- [ ] 3.5 Refactor confidence-interval to use child components
- [ ] 3.6 Add tests for each child component (5-8 tests)
- [ ] 3.7 Update graph-visualization to use d3-components
- [ ] 3.8 Remove direct DOM manipulation hooks
- [ ] 3.9 End-to-end test the entire application
- [ ] 3.10 Performance testing (if there are many samples)

### Acceptance Criteria

- ✅ 4 independent components, each independently testable
- ✅ D3 operations fully declarative (return VNode configs)
- ✅ No direct `d3.select(vnode.elm)` calls
- ✅ 35+ test cases all passing
- ✅ Application functionality identical to pre-refactoring

### Risk: Medium-High

---

## Rollback Strategy

Create git tags after completing each phase:

```bash
git tag -a phase1-complete -m "Phase 1 complete: Fix critical anti-patterns"
git tag -a phase2-complete -m "Phase 2 complete: Add tests"
git tag -a phase3-complete -m "Phase 3 complete: Component refactoring"
```

If Phase 3 encounters issues, quick rollback to phase2-complete:

```bash
git reset --hard phase2-complete
```

---

## Expected Timeline

| Phase | Estimated Time | Cumulative Time |
|-------|---------------|-----------------|
| Phase 1 | 1-2 hours | 1-2 hours |
| Phase 2 | 2-3 hours | 3-5 hours |
| Phase 3 | 3-4 hours | 6-9 hours |

**Total**: 6-9 hours of development work

---

## Success Criteria

After completing all phases, the project should:

### 1. Fully Comply with Cycle.js Three Iron Laws
   - ✅ Components are pure functions
   - ✅ All state changes go through reducers
   - ✅ Side effects only in drivers (or explicit hook boundaries)

### 2. Code Quality
   - ✅ 35+ test cases
   - ✅ 70%+ code coverage
   - ✅ No linting errors

### 3. Maintainability
   - ✅ Clear component boundaries
   - ✅ Good type definitions
   - ✅ Reusable D3 component library

### 4. Functional Completeness
   - ✅ All existing features work correctly
   - ✅ No performance regression
   - ✅ Consistent user experience

---

## Post-Refactoring Benefits

1. **Improved Testability**: Pure functions are easy to test
2. **Better Maintainability**: Clear component boundaries and responsibilities
3. **Enhanced Reusability**: D3 components and child components can be reused
4. **Strict Adherence to Standards**: Fully compliant with Cycle.js best practices
5. **Easier Debugging**: Predictable data flow and state management
6. **Future-Proof Architecture**: Easy to extend with new features

---

## References

- [Cycle.js Development Guide](../cyclejs/references/development_guide.md)
- [MVI Pattern Deep Dive](../cyclejs/references/development/mvi-pattern.md)
- [Cycle.js Anti-Patterns](../cyclejs/references/development/anti-patterns.md)
- [Testing Best Practices](../cyclejs/references/development/testing.md)
