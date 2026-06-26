# Type Error Visualization Migration Design

**Date:** 2026-03-30
**Status:** Approved
**Approach:** Big Bang Migration

## Overview

Migrate the Type 1/2 error statistical visualization application from `original_code/` folder into the current Cycle.js + TypeScript project, replacing the existing counter example.

## Project Structure

```
src/
  type-errors/
    index.ts       # Main entry point (Main component + drivers)
    model.ts       # Business logic (distributions, scales, critical values)
    graph.ts       # Visualization components (distributions, error areas)
    axes.ts        # Axis components
  main.ts          # App bootstrap (replaces current counter bootstrap)
  counter/         # DELETE this folder

test/
  type-errors/
    model.test.ts  # Model tests
```

**Key changes from original:**
- All `.js/.mjs` files → `.ts` (TypeScript)
- Feature-based organization under `type-errors/`
- Tests organized by feature
- Delete `src/counter/` entirely
- Delete `original_code/` after migration verified

## Architecture

### Component Architecture

**Cycle.js Architecture (unchanged from original):**
```
DOM Source → intent() → model() → view() → DOM Sink
                     ↑
              CONFIG Source
```

**Component breakdown:**

1. **`src/type-errors/index.ts`** (Main component)
   - `intent()`: Extract user input from sliders (alpha, trueMean, stdDev)
   - `main()`: Wire up DOM + CONFIG drivers, call intent/model/view
   - `makeConfigDriver()`: Provide static config (width, height, TestType)

2. **`src/type-errors/model.ts`** (Pure functions)
   - `normalPDF()`: Calculate probability density
   - `generateDistribution()`: Create distribution data points
   - `createScales$()`: D3 scale factory
   - Stream creators: `createNullDistribution$()`, `createTrueDistribution$()`, etc.
   - `model()`: Combine all streams into state

3. **`src/type-errors/graph.ts`** (D3 components → hyperscript)
   - Convert JSX/snabbdom-pragma → Cycle.js hyperscript (`div`, `svg`, `g`)
   - Components: `NullDistribution`, `TrueDistribution`, `Type1ErrorArea`, `Type2ErrorArea`, `CriticalLine`, `HypothesisText`
   - Each uses Snabbdom hooks for D3 rendering on insert/update

4. **`src/type-errors/axes.ts`** (D3 axes → hyperscript)
   - `XAxis`, `YAxis` components
   - Same pattern: hyperscript + Snabbdom hooks

5. **`src/main.ts`** (Bootstrap)
   - Replace counter import with type-errors import
   - Wire up DOM driver to `#app` container

### Data Flow

Data flow unchanged from original - streams flow through intent → model → view:
- User inputs (sliders) → DOM events → intent → actions
- Actions + CONFIG → model → state streams
- State streams → view → VTree → DOM

## TypeScript Conversion

### Type Safety Strategy (Moderate)

```typescript
// WELL-TYPED: Public APIs and main data structures
interface DistributionPoint {
  x: number;
  y: number;
}

interface Scales {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
}

interface Actions {
  alpha$: Stream<number>;
  nullMean$: Stream<number>;
  trueMean$: Stream<number>;
  stdDev$: Stream<number>;
  width$: Stream<number>;
  height$: Stream<number>;
  TestType$: Stream<string>;
}

// TYPED WITH ANY: Internal D3/Snabbdom hook code
function drawNullDistribution(
  container: any,  // d3.Selection
  data: DistributionPoint[],
  scales: Scales
): void {
  // implementation uses any for D3 chaining
}
```

**Principle:** Add proper types to public interfaces and main data structures. Use `any` for internal D3 selection manipulation and Snabbdom vnode operations to avoid complex type gymnastics.

### Hyperscript Conversion

Convert from JSX/snabbdom-pragma to Cycle.js hyperscript helpers:

```javascript
// ORIGINAL (JSX):
<XAxis scale={xScale} />

// NEW (hyperscript):
XAxis({ scale: xScale })

// ORIGINAL:
<svg attrs={{ width: width, height: height }}>
  <g attrs={{ transform: `translate(${x}, ${y})` }}>
    <NullDistribution data={data} scales={scales} />
  </g>
</svg>

// NEW:
svg({ attrs: { width: width, height: height } }, [
  g({ attrs: { transform: `translate(${x}, ${y})` } }, [
    NullDistribution({ data, scales })
  ])
])
```

### Dependencies

**Add to `package.json`:**
```json
{
  "dependencies": {
    "d3": "^7.x",
    "jstat": "^1.x"
  },
  "devDependencies": {
    "@types/d3": "^7.x"
  }
}
```

- `d3`: Already used in original for data visualization
- `jstat`: Statistical functions (inverse normal distribution)
- `@types/d3`: TypeScript definitions for D3

## Testing

### Test Framework
- Keep existing Mocha + Chai setup
- Use jsdom for DOM environment (already configured)
- Convert test to TypeScript: `test/type-errors/model.test.ts`

### Test Coverage

Tests verify:
1. Model function output structure
2. Statistical utility functions (normalPDF, generateDistribution)
3. Stream factories return correct data types
4. Critical values calculate correctly for different test types
5. Scale creation with various dimensions

### Running Tests

```bash
npm test
```

Tests must pass before deleting `original_code/`.

## Migration Steps

1. **Install dependencies** - Add `d3`, `jstat`, `@types/d3`

2. **Create type-errors structure** - New `src/type-errors/` folder with empty `.ts` files

3. **Migrate model.ts** - Convert logic from `model.mjs`, add types to exports

4. **Migrate graph.ts** - Convert from `graph.js`, replace JSX with hyperscript, add type interfaces

5. **Migrate axes.ts** - Convert from `axes.js`, replace JSX with hyperscript

6. **Migrate index.ts** - Main component from `main.js`, convert JSX to hyperscript

7. **Migrate main.ts** - Replace counter bootstrap with type-errors component

8. **Migrate tests** - Convert `model.test.mjs` to TypeScript

9. **Run tests** - Verify correctness with `npm test`

10. **Run dev server** - Verify application works visually

11. **Delete old code** - Remove `src/counter/` and `original_code/`

12. **Final verification** - Build and ensure no regressions

## Success Criteria

- [ ] All TypeScript files compile without errors
- [ ] All tests pass (`npm test`)
- [ ] Dev server runs without errors (`npm run dev`)
- [ ] Visual application matches original behavior
- [ ] `src/counter/` deleted
- [ ] `original_code/` deleted
- [ ] Build succeeds (`npm run build`)
