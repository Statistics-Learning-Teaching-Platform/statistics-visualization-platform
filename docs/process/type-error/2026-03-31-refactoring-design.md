# Type Errors Visualization - Refactoring Design

**Date**: 2026-03-31
**Author**: Claude (with user collaboration)
**Status**: Approved
**Approach**: Minimalist Pragmatic with Parallel Implementation

## Executive Summary

Refactor the Type Errors visualization application from a monolithic component structure to a maintainable, Cycle.js-compliant architecture. The refactoring addresses critical code quality issues (`startWith` anti-patterns, missing `@cycle/state`, lack of component isolation) while preparing the codebase for future feature expansion.

**Goal**: Fix code quality issues and prepare for feature expansion
**Strategy**: Parallel implementation (build new alongside old)
**Timeline**: 4 days
**Risk**: Low - each phase is independently revertible

## Problem Statement

### Current Issues

The application has three critical violations of Cycle.js best practices:

1. **Using `startWith` for state initialization** (src/type-errors/model.ts:176-179)
   - Violates the "Three Iron Laws" of Cycle.js
   - Breaks unidirectional dataflow
   - Should use `defaultReducer` pattern instead

2. **Missing `@cycle/state` integration**
   - No reducer-based state management
   - State managed through stream composition only
   - No component isolation

3. **Monolithic structure**
   - Single component with 400+ lines
   - Intent and view mixed in one file
   - Hard to extend or test independently

4. **Type safety issues**
   - State tuples with 12+ `any` types
   - Unclear data contracts between components

### Why Refactor Now

- **Feature expansion planned**: Need maintainable architecture
- **Production readiness**: Code quality issues must be fixed
- **Learning opportunity**: Understand proper Cycle.js patterns deeply

## Proposed Solution

### Architecture: Minimalist Pragmatic Approach

Three parallel components under `src/components/`:

```
src/components/
├── TypeErrorsApp/              # Root - orchestrates everything
├── ControlPanel/               # User input controls
└── Chart/                      # Visualization (stateless)
```

**Each component follows full MVI structure**:
- **Intent**: DOM events → actions
- **Model**: Actions → state (pure functions)
- **View**: State → VNode (pure functions)

### Component Responsibilities

| Component | State Management | Responsibility |
|-----------|------------------|----------------|
| **TypeErrorsApp** | Global state tree (config + params + computed) | - Compose ControlPanel & Chart<br>- Manage @cycle/state<br>- Compute derived state from params<br>- Provide CONFIG driver |
| **ControlPanel** | `params: { alpha, nullMean, trueMean, stdDev }` | - Isolated with key `'params'`<br>- Manage 4 slider inputs<br>- Emit params reducers |
| **Chart** | None (pure component) | - Receive computed state as props<br>- Render SVG chart<br>- No state, pure view |

### State Tree Structure

```typescript
interface AppState {
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
    hypothesisText: {
      H0: string;
      H1: string;
    };
  };
}
```

## Data Flow

### Component Communication

```
┌─────────────────────────────────────────────────┐
│              TypeErrorsApp (Root)                │
│                                                   │
│  Sources.In:                                      │
│  ├── state: Global state tree                    │
│  └── CONFIG: Driver stream                       │
│                                                   │
│  Internal Flow:                                   │
│  1. Extract params from state                     │
│  2. Pass to ControlPanel via state isolation      │
│  3. Compute Chart props from state                │
│  4. Pass to Chart via props stream               │
│                                                   │
│  Sinks.Out:                                       │
│  ├── DOM: Combined from children                 │
│  └── state: Merged reducers (default + computed) │
└────────┬──────────────────────┬──────────────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐    ┌─────────────────┐
│  ControlPanel    │    │     Chart       │
│                  │    │                 │
│  Sources.In:     │    │  Sources.In:    │
│  ├── DOM         │    │  └── props      │
│  └── state       │    │                 │
│     (isolated)   │    │  Sinks.Out:     │
│                 │    │  └── DOM        │
│  Sinks.Out:      │    │                 │
│  ├── DOM         │    │  (No state -    │
│  └── state       │    │   pure)         │
│     (params)     │    │                 │
└──────────────────┘    └─────────────────┘
```

### Props-Down, Events-Up Pattern

```typescript
// TypeErrorsApp → Chart (Props Down)
const chartProps$ = sources.state.stream
  .map(state => state.computed);
const chartSinks = Chart({ props: chartProps$ });

// ControlPanel → TypeErrorsApp (Events Up via Reducers)
const controlPanelSinks = isolate(ControlPanel, 'params')(sources);
// controlPanelSinks.state bubbles up as params reducer
```

## State Management

### Initialization (defaultReducer)

**Before** ❌:
```typescript
const alpha$ = actions.alpha$.startWith(0.05);
const nullMean$ = actions.nullMean$.startWith(0);
```

**After** ✅:
```typescript
const defaultReducer$ = xs.of<Reducer<AppState>>(prev => {
  if (prev !== undefined) return prev;

  return {
    config: { width: 600, height: 400, testType: 'two-tailed' },
    params: { alpha: 0.05, nullMean: 0, trueMean: 1, stdDev: 1 },
    computed: { /* initial empty state */ }
  };
});
```

### Reducer Flow

```
1. defaultReducer$     → Initialize entire state tree
2. paramsReducer$      → From ControlPanel (isolated)
3. computedReducer$    → React to params, recompute derived state
4. Merge all reducers  → Single state stream
```

## Component Interfaces

### TypeErrorsApp

```typescript
interface Sources {
  state: StateSource<AppState>;
  CONFIG: Stream<{ width: number; height: number; testType: string }>;
}

interface Sinks {
  DOM: Stream<VNode>;
  state: Stream<Reducer<AppState>>;
}
```

### ControlPanel

```typescript
interface ParamsState {
  alpha: number;
  nullMean: number;
  trueMean: number;
  stdDev: number;
}

interface Sources {
  DOM: DOMSource;
  state: StateSource<ParamsState>;
}

interface Sinks {
  DOM: Stream<VNode>;
  state: Stream<Reducer<ParamsState>>;
}
```

### Chart

```typescript
interface ChartProps {
  scales: Scales;
  nullDistribution: DistributionPoint[];
  trueDistribution: DistributionPoint[];
  criticalValue: number[];
  criticalAreaFn: CriticalAreaFn;
  hypothesisText: { H0: string; H1: string };
  width: number;
  height: number;
}

interface Sources {
  props: Stream<ChartProps>;
}

interface Sinks {
  DOM: Stream<VNode>;
  // No state sink - pure component
}
```

## Testing Strategy

### Philosophy

- Use `fromDiagram` for deterministic stream timing
- Test pure streams, not DOM or drivers
- Test behavior, not implementation

### Test Structure

```
test/
├── components/
│   ├── TypeErrorsApp/
│   │   └── model.test.ts           # State tree + computed logic
│   ├── ControlPanel/
│   │   ├── intent.test.ts          # Event extraction with fromDiagram
│   │   └── model.test.ts           # Reducers with stream sequences
│   └── Chart/
│       └── view.test.ts            # Pure rendering
├── type-errors/
│   └── model.test.ts               # Existing tests (keep passing)
└── helpers/
    └── test-utils.ts               # Stream assertion helpers
```

### fromDiagram Example

```typescript
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

  const actions = intent({ DOM: domSource });
  const values = [];

  actions.alpha$.addListener({
    next: (val) => values.push(val),
    complete: () => {
      expect(values).to.deep.equal([0.05, 0.08, 0.10]);
      done();
    },
    error: done
  });
});
```

## Type Safety Strategy

### Balanced Approach

**Strong types where it matters**:
- ✅ Business logic state objects
- ✅ Component interfaces (Sources/Sinks)
- ✅ Stream data transformations
- ✅ Public API contracts

**Pragmatic `any` for complex libraries**:
- ✅ Cycle.js DOMSource helpers (`dom-helper.ts`)
- ✅ D3 Selection operations
- ✅ Snabbdom vnode hooks
- ✅ Test mocks

### Key Type Improvements

**Before** ❌:
```typescript
function view(
  state$: Stream<[any, any[], any[], number[], any, any, ...]>
): Stream<VNode>
```

**After** ✅:
```typescript
interface ChartState {
  scales: Scales;
  nullDistribution: DistributionPoint[];
  trueDistribution: DistributionPoint[];
  // ... all fields named and typed
}

function view(state$: Stream<ChartState>): Stream<VNode>
```

## Migration Plan

### Strategy: Parallel Implementation

Build new structure alongside existing code, switch over when ready.

### Timeline: 4 Days

| Day | Phase | Deliverable | Status Gates |
|-----|-------|-------------|--------------|
| **1** | **Foundation** | Empty component skeleton | ✅ Compiles |
| **1-2** | **Chart Component** | Pure rendering component | ✅ Tests pass |
| **2-3** | **ControlPanel Component** | Isolated state management | ✅ Tests pass |
| **3-4** | **TypeErrorsApp Root** | Wire everything together | ✅ Tests pass |
| **4** | **Switch Over** | Replace old with new | ✅ All tests pass |

### Phase Details

#### Phase 1: Foundation (Day 1)

**Tasks**:
1. Install `@cycle/state` and `@cycle/isolate`
2. Create directory structure
3. Add type definitions
4. Create empty files with basic exports
5. Update tests to run both old and new

**Files Created**:
```
src/components/
├── TypeErrorsApp/
│   ├── index.ts
│   ├── intent.ts
│   ├── model.ts
│   ├── view.ts
│   └── types.ts
├── ControlPanel/
│   ├── index.ts
│   ├── intent.ts
│   ├── model.ts
│   ├── view.ts
│   └── types.ts
└── Chart/
    ├── index.ts
    ├── view.ts
    ├── graph.ts
    └── axes.ts
```

#### Phase 2: Chart Component (Day 1-2)

**Tasks**:
1. Move `graph.ts` and `axes.ts` to `Chart/`
2. Create `Chart/view.ts` (pure render function)
3. Create `Chart/index.ts` (wrapper)
4. Write tests for Chart rendering
5. Keep existing code working

**Key Changes**:
- Extract view logic from current `index.ts`
- Create `ChartProps` interface
- Pure component, no state

#### Phase 3: ControlPanel Component (Day 2-3)

**Tasks**:
1. Extract slider logic from current `intent()`
2. Create `ControlPanel/intent.ts`
3. Implement `ControlPanel/model.ts` with reducers
4. Add `defaultReducer` for params initialization
5. Use `isolate` with key `'params'`
6. Write tests with `fromDiagram`

**Key Changes**:
- Remove `startWith` usage
- Implement reducer pattern
- Isolate child state

#### Phase 4: TypeErrorsApp Root (Day 3-4)

**Tasks**:
1. Implement state tree management
2. Compose ControlPanel + Chart
3. Move computed logic from `model.ts`
4. Remove all remaining `startWith` usage
5. Write integration tests

**Key Changes**:
- Global state tree with `@cycle/state`
- Merge child reducers
- Compute derived state

#### Phase 5: Switch Over (Day 4)

**Tasks**:
1. Update `src/main.ts` to use TypeErrorsApp
2. Run full test suite
3. Fix any broken tests
4. Remove old `src/type-errors/` directory
5. Update imports
6. Final verification

**Before**:
```typescript
// src/main.ts
run(TypeErrors, {
  DOM: makeDOMDriver('#app'),
  CONFIG: makeConfigDriver()
});
```

**After**:
```typescript
// src/main.ts
import { withState } from '@cycle/state';

run(withState(TypeErrorsApp), {
  DOM: makeDOMDriver('#app'),
  CONFIG: makeConfigDriver()
});
```

### Safety Measures

**Parallel Implementation**:
- Old code stays functional until final switch
- Tests run on both old and new
- Can rollback any phase independently

**Continuous Testing**:
```
npm test                    # Run all tests (old + new)
npm run test:components     # Only new component tests
npm run test:legacy         # Only old tests
```

## File Structure (Final)

```
src/
├── components/
│   ├── TypeErrorsApp/
│   │   ├── index.ts              # Main: glue intent+model+view
│   │   ├── intent.ts             # (Empty or minimal)
│   │   ├── model.ts              # State tree + computed logic
│   │   ├── view.ts               # Compose ControlPanel + Chart
│   │   └── types.ts              # AppState interface
│   ├── ControlPanel/
│   │   ├── index.ts              # Main: glue intent+model+view
│   │   ├── intent.ts             # Slider events → actions
│   │   ├── model.ts              # Params state + reducers
│   │   ├── view.ts               # Slider UI
│   │   └── types.ts              # ParamsState interface
│   └── Chart/
│       ├── index.ts              # Component wrapper
│       ├── view.ts               # Pure render function
│       ├── graph.ts              # D3 helpers (moved from type-errors/)
│       └── axes.ts               # Axis components (moved from type-errors/)
├── utils/
│   └── dom-helper.ts             # DOM selection (uses any)
├── main.ts                       # Entry point with withState
└── types/
    └── jstat.d.ts                # External types

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

## Success Criteria

### Technical Requirements

- ✅ No `startWith` anywhere in the codebase
- ✅ All components follow MVI structure
- ✅ Full test coverage using `fromDiagram`
- ✅ Type-safe component interfaces
- ✅ Isolated child state via `isolate`

### Quality Requirements

- ✅ Old tests still pass during migration
- ✅ New tests added incrementally
- ✅ No regression in functionality
- ✅ Code is easier to extend
- ✅ Clear component boundaries

### Process Requirements

- ✅ Each phase independently revertible
- ✅ Tests run continuously
- ✅ Can stop after any phase with working code

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing tests | Low | High | Parallel implementation, old code stays functional |
| @cycle/state learning curve | Medium | Low | Incremental adoption, clear examples in spec |
| Time overrun | Low | Medium | Can stop after Phase 2-3 if needed, each phase delivers value |
| Type complexity | Low | Low | Pragmatic `any` for DOM/D3, strong types for business logic |

## What Stays The Same

- ✅ Chart visualization logic (D3/Snabbdom hooks)
- ✅ Model computation logic (distributions, critical values, hypothesis text)
- ✅ Test structure (add new, keep old passing)
- ✅ External dependencies (D3, jStat, xstream)
- ✅ Business functionality and user experience

## Dependencies

### New Packages Required

```json
{
  "dependencies": {
    "@cycle/state": "^1.4.0",
    "@cycle/isolate": "^5.2.0"
  }
}
```

### Existing Packages (No Changes)

- @cycle/dom
- @cycle/run
- xstream
- d3
- jstat
- typescript

## Future Extensibility

The new architecture supports easy addition of:

- **Multiple distributions**: Create isolated instances of Chart components
- **Dynamic component lists**: Use `makeCollection` for dynamic charts
- **Save/export functionality**: Add new sinks (HTTP, File) at root level
- **Additional controls**: Add new components to ControlPanel
- **Different chart types**: Create new chart components, reuse state management

## Open Questions

None - all design decisions finalized.

## References

- [Component Architecture Discussion](../../component-architecture.md)
- Cycle.js Development Guide
- @cycle/state Documentation
- [Anti-Patterns Guide](../cyclejs/references/development/anti-patterns.md)

## Approval

**User**: Approved design as written
**Date**: 2026-03-31
**Next Step**: Invoke writing-plans skill to create implementation plan
