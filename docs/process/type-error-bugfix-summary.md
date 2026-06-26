# Control Panel Sliders Bug Fix

## Problem
Control Panel sliders were not working - moving them didn't update the slider labels or the chart.

**Additional Issue #1:** Initial fix caused page to freeze due to infinite loop.
**Additional Issue #2:** Second fix didn't update sliders or chart due to corrupted state structure.

## Root Cause #1: Broken Data Flow
The parent component (`TypeErrorsApp`) expected to receive parameter changes via `actions.params$`, which:
1. Didn't exist in the Actions interface
2. Was never emitted by the child component
3. Caused the computed state recalculation to never trigger

**Broken Data Flow:**
```
User moves slider
  ↓
ControlPanel: DOM event → intent → reducer$
  ↓
Child reducer updates params in parent state ✓
  ↓
Parent expects actions.params$ to trigger recompute ✗ (NEVER EMITS)
  ↓
computedReducer$ never triggers
  ↓
Chart never updates
```

## Root Cause #2: Infinite Loop (First Fix Attempt)
Initial fix watched `state.stream` and triggered on every state change, creating an infinite cycle:
```
state$ emits → computedReducer$ creates reducer
→ reducer updates computed state
→ state$ emits again (infinite loop!)
```

## Root Cause #3: Corrupted State Structure (Second Fix Attempt)
The parent was **manually wrapping** the child reducer:
```typescript
// WRONG - manual wrapping breaks isolate's automatic wrapping
const paramsReducer$ = childReducer.map(cr => (prev) => {
  const newParams = cr(prev.params);  // Manually accessing prev.params
  return { ...prev, params: newParams };
});
```

This created a corrupted state structure where:
- `isolate` wraps the child reducer to work with `state.params` automatically
- Parent **also** wrapped the child reducer manually
- Result: Child reducer received `state.params.params` (nested!) instead of `state.params`
- State became: `{ params: { alpha: 0.05, ..., params: {...} } }` ✗
- Parent's change detection failed because it was comparing `state.params.params` with previous values

## Final Solution

### Fix #1: Watch state instead of actions
Changed from expecting `actions.params$` to watching `sources.state.stream`

### Fix #2: Only recompute when params change
Added comparison logic to prevent infinite loop:
```typescript
let previousParams: Params | null = null;
const paramsChanged$ = state$
  .map(state => state.params)
  .filter((params) => {
    if (previousParams === null) {
      previousParams = params;
      return false; // Skip initial state
    }
    const changed =
      params.alpha !== previousParams.alpha ||
      params.nullMean !== previousParams.nullMean ||
      params.trueMean !== previousParams.trueMean ||
      params.stdDev !== previousParams.stdDev;
    previousParams = params;
    return changed;
  });
```

### Fix #3: Don't manually wrap child reducer
**Critical:** When using `isolate`, the child reducer is **already wrapped** to work with its portion of state. Just merge it directly:
```typescript
// CORRECT - isolate already wrapped the reducer
const paramsReducer$ = controlPanelSinks.state
  .map((childReducer) => {
    return (prev) => {
      const result = childReducer(prev);  // Child reducer already receives full state
      if (!result) return prev;
      return result;  // Child reducer already returns updated full state
    };
  });
```

**Fixed Data Flow:**
```
User moves slider
  ↓
ControlPanel: DOM event → intent → reducer$
  ↓
Child reducer (wrapped by isolate) updates params in parent state ✓
  ↓
Parent watches state.stream for params changes ✓
  ↓
computedReducer$ triggers only when params change ✓
  ↓
Chart updates ✓
```

## Changes Made

### 1. `src/components/TypeErrorsApp/index.ts`
**Changed:** Parent reducer merging to not manually wrap child reducer
- **Before:** Manually extracted `prev.params`, applied child reducer, spread back
- **After:** Let child reducer (already wrapped by isolate) work on full state

### 2. `src/components/TypeErrorsApp/model.ts`
- **Removed:** Broken `actions.params$` pattern
- **Added:** `paramsChanged$` stream that only emits when params actually change
- **Added:** Previous params comparison to prevent infinite loop
- **Changed:** `computedReducer$` to trigger on `paramsChanged$`

### 3. `test/components/TypeErrorsApp/model.test.ts`
- Updated test to provide state stream instead of non-existent `actions.params$`

## Key Changes
```typescript
// WRONG (manual wrapping breaks isolate):
const paramsReducer$ = childReducer.map(cr => (prev) => {
  const newParams = cr(prev.params);  // Don't manually unwrap!
  return { ...prev, params: newParams };
});

// CORRECT (isolate already wrapped it):
const paramsReducer$ = childReducer.map((cr) => (prev) => {
  const result = cr(prev);  // Child reducer already handles its portion
  return result || prev;
});
```

## Verification
- ✅ All 16 tests passing
- ✅ Build succeeds
- ✅ Dev server starts without hanging
- ✅ Sliders update labels
- ✅ Sliders update chart
- ✅ Follows Cycle.js conventions

## Pattern Lesson

**In Cycle.js parent-child composition with `isolate`:**

1. **`isolate(Component, 'key')`** automatically wraps child reducer:
   - Child receives only `state.key` as its state
   - Child reducer returns updated `state.key`
   - Isolate wraps this to work with parent's full state

2. **Parent should NOT manually wrap child reducer:**
   - Don't manually extract `prev[key]`
   - Don't manually spread back `{ ...prev, key }`
   - Isolate already did this!

3. **Parent watches state.stream for changes:**
   - Use comparison to detect actual changes
   - Skip initial state emission to prevent unwanted updates

4. **State flows up via reducers, not action streams**
