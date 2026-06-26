# Type Error Review-Aligned Staged PR Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Also use `teaching-ui-pr-architecture` before each PR.

**Goal:** Rebuild `type-error-visualization` into reviewer-aligned staged PRs with clean component ownership, clean props/state flow, and a visual structure that can later sit beside `confidence-interval-visualization` and `regression-visualizer` on one teaching website.

**Architecture:** `TypeErrorsApp` remains the domain component and owns state, raw derived teaching data, and page composition. Page-level teaching modules become independent MVI components: the parent passes raw props, and each child component model owns display formatting. Existing canonical components, especially `ControlPanel` and `Chart`, must be edited in their own folders instead of duplicated under `TypeErrorsApp`.

**Tech Stack:** Cycle.js, `@cycle/state`, TypeScript, D3, Vite, Mocha/Chai.

---

## Current Reviewer Feedback To Satisfy

- PR #1 is too large and should be split.
- Hero, lesson, stats, explanation, and related teaching sections should be independent components, not raw markup inside `TypeErrorsApp/view.ts`.
- `view.ts` should only compose state into VNodes. It should not hardcode large child props objects.
- Raw props for page-level components should be produced by `TypeErrorsApp/model.ts` and carried on `AppState`.
- Each extracted page-level Cycle/MVI component should include `intent.ts`, `model.ts`, `view.ts`, `types.ts`, and `index.ts`; its `model.ts` formats labels, values, notes, and other display state.
- Existing component changes should land in their canonical folders. For example, control panel work belongs in `src/components/ControlPanel/`.
- Features that do not depend on each other should use `main` as base.
- Before opening each PR, check mergeability and whether the diff is clean.

## Current Open PR Comments Checked

- PR #1 comment: the full redesign is too large; split the PR and make each part a component composed by `TypeErrorsApp`.
- PR #2 inline comment on `src/components/TypeErrorsApp/view.ts`: hero must be an independent component, not inline markup inside `TypeErrorsApp`.
- PR #3 comment: lesson framing does not truly depend on the hero branch; use the original mainline as base when possible, and make the lesson section a component too.
- PR #4 has no current reviewer comment, but its diff is too broad because controls, chart, model, app view, config driver, and tests are bundled together.
- PR #5 has no current reviewer comment, but it is stacked on PR #4 even though it is CSS-only and should normally target `main`.

## Existing PR Handling

- Keep PR #1 as reference only.
- Do not continue PR #2 through PR #5 in their current form.
- Create a new v2 PR set from `main`.
- After the new PRs exist and are verified, close or mark old PRs #2 through #5 as superseded.
- Use English PR titles without adding `codex` to the title.
- Write PR summaries/descriptions and reviewer conversation in Chinese.

## Target Component Map

- `src/components/TypeErrorsApp/`
  - Owns `intent.ts`, `model.ts`, `types.ts`, `view.ts`, and `index.ts`.
  - Owns domain state, raw derived teaching props, and page composition.
  - Does not inline hero, lesson, stats, chart card, or explanation markup.

- `src/components/HeroPanel/`
  - Receives raw/static hero props from the domain state.
  - Formats hero copy and teaching chips in its own model.

- `src/components/LessonBanner/`
  - Receives raw `testType` and `criticalValue` props.
  - Formats scenario title, teaching prompt, test type, and critical-value summary in its own model.

- `src/components/StatsGrid/`
  - Receives raw alpha, beta, power, and effect-size props.
  - Formats percentages, numbers, labels, and notes in its own model.

- `src/components/ExplanationCard/`
  - Receives raw interpretation inputs from the domain state.
  - Formats interpretation, strategy tip, and hypothesis strip in its own model.

- `src/components/ChartCard/`
  - Receives raw chart-card props and chart body slot from the domain composition.
  - Formats chart title, subtitle, and legend in its own model.

- `src/components/ControlPanel/`
  - Remains the canonical control panel component.
  - Any teaching copy, labels, hints, sliders, or layout updates go here.

- `src/components/Chart/`
  - Remains the canonical chart component.
  - Axis labels, annotations, shading, and chart-specific display behavior go here.

## PR Set

### PR1: Extract Type Error Hero Panel

**Base:** `main`

**Purpose:** Replace inline hero markup with an independent `HeroPanel` MVI component, with raw props owned by `TypeErrorsApp/model.ts` and display formatting owned by `HeroPanel/model.ts`.

**Files:**
- Create: `src/components/HeroPanel/index.ts`
- Create: `src/components/HeroPanel/intent.ts`
- Create: `src/components/HeroPanel/model.ts`
- Create: `src/components/HeroPanel/types.ts`
- Create: `src/components/HeroPanel/view.ts`
- Modify: `src/components/TypeErrorsApp/model.ts`
- Modify: `src/components/TypeErrorsApp/types.ts`
- Modify: `src/components/TypeErrorsApp/view.ts`
- Test: `test/components/HeroPanel/view.test.ts`
- Test: `test/components/TypeErrorsApp/model.test.ts`

**Rules:**
- No `const heroPanelProps = { ... }` inside `TypeErrorsApp/view.ts`.
- Use `state.heroPanelProps`.
- `HeroPanel/view.ts` renders component state and does not format values.
- Keep `main.ts` unchanged unless a build import requires otherwise.

**Verification:**
- `npm test`
- `npm run build`
- `gh pr diff --name-only` should only show hero-related files and model/type/view wiring.

### PR2: Extract Type Error Lesson Banner

**Base:** Prefer `main`. If it conflicts only because PR1 has not merged, keep it on `main` first and rebase after PR1 merges. Use a stacked base only if the GitHub diff becomes misleading.

**Purpose:** Replace inline lesson/scenario banner markup with `LessonBanner`, with raw props owned by `TypeErrorsApp/model.ts` and display formatting owned by `LessonBanner/model.ts`.

**Files:**
- Create: `src/components/LessonBanner/index.ts`
- Create: `src/components/LessonBanner/intent.ts`
- Create: `src/components/LessonBanner/model.ts`
- Create: `src/components/LessonBanner/types.ts`
- Create: `src/components/LessonBanner/view.ts`
- Modify: `src/components/TypeErrorsApp/model.ts`
- Modify: `src/components/TypeErrorsApp/types.ts`
- Modify: `src/components/TypeErrorsApp/view.ts`
- Test: `test/components/LessonBanner/view.test.ts`
- Test: `test/components/TypeErrorsApp/model.test.ts`

**Rules:**
- No `lessonBannerProps` inside `TypeErrorsApp/view.ts`.
- Use `state.lessonBannerProps` with raw `{ testType, criticalValue }`.
- Critical-value label formatting belongs in `LessonBanner/model.ts`, not in `TypeErrorsApp/model.ts` or `view.ts`.
- `LessonBanner/view.ts` renders component state and does not format values.

**Verification:**
- `npm test`
- `npm run build`
- Confirm PR diff does not include hero changes unless PR1 is its selected base.

### PR3: Add Stats Grid And Teaching Metrics

**Base:** `main`

**Purpose:** Add a complete stats feature in one PR: raw model-derived metrics plus the `StatsGrid` MVI UI consumer.

**Files:**
- Create: `src/components/StatsGrid/index.ts`
- Create: `src/components/StatsGrid/intent.ts`
- Create: `src/components/StatsGrid/model.ts`
- Create: `src/components/StatsGrid/types.ts`
- Create: `src/components/StatsGrid/view.ts`
- Modify: `src/components/TypeErrorsApp/model.ts`
- Modify: `src/components/TypeErrorsApp/types.ts`
- Modify: `src/components/TypeErrorsApp/view.ts`
- Test: `test/components/StatsGrid/view.test.ts`
- Test: `test/components/TypeErrorsApp/model.test.ts`

**Rules:**
- Do not create a model-only PR first.
- `typeOneErrorRate`, `typeTwoErrorRate`, `power`, and `effectSize` must be computed raw in `TypeErrorsApp/model.ts`.
- `StatsGrid` should receive `state.statsGridProps`, not a props object assembled in `view.ts`.
- Percentage and number formatting belongs in `StatsGrid/model.ts`.
- `StatsGrid/view.ts` renders component state and does not format values.

**Verification:**
- `npm test`
- `npm run build`
- Confirm this PR is a complete feature slice.

### PR4: Add Explanation Card And Interpretation Config

**Base:** `main`

**Purpose:** Add interpretation and teaching guidance as a complete feature: raw model-derived explanation props plus the `ExplanationCard` MVI UI consumer.

**Files:**
- Create: `src/components/ExplanationCard/index.ts`
- Create: `src/components/ExplanationCard/intent.ts`
- Create: `src/components/ExplanationCard/model.ts`
- Create: `src/components/ExplanationCard/types.ts`
- Create: `src/components/ExplanationCard/view.ts`
- Modify: `src/components/TypeErrorsApp/model.ts`
- Modify: `src/components/TypeErrorsApp/types.ts`
- Modify: `src/components/TypeErrorsApp/view.ts`
- Test: `test/components/ExplanationCard/view.test.ts`
- Test: `test/components/TypeErrorsApp/model.test.ts`

**Rules:**
- No `getInterpretation()` or `getStrategyTip()` inside `TypeErrorsApp/view.ts`.
- Use `state.explanationCardProps`.
- Hypothesis display text belongs to `ExplanationCard/model.ts`.
- `ExplanationCard/view.ts` renders component state and does not format values.

**Verification:**
- `npm test`
- `npm run build`

### PR5: Extract Chart Card Around Existing Chart

**Base:** Prefer `main`. If the card placement requires already-merged stats/explanation layout, wait until those PRs merge or use a stacked base with a clear summary.

**Purpose:** Add the page-level chart wrapper without changing chart logic, using a `ChartCard` MVI wrapper around the existing chart DOM stream.

**Files:**
- Create: `src/components/ChartCard/index.ts`
- Create: `src/components/ChartCard/intent.ts`
- Create: `src/components/ChartCard/model.ts`
- Create: `src/components/ChartCard/types.ts`
- Create: `src/components/ChartCard/view.ts`
- Modify: `src/components/TypeErrorsApp/model.ts`
- Modify: `src/components/TypeErrorsApp/types.ts`
- Modify: `src/components/TypeErrorsApp/view.ts`
- Test: `test/components/ChartCard/view.test.ts`
- Test: `test/components/TypeErrorsApp/model.test.ts`

**Rules:**
- `ChartCard` can take the chart VNode as `body`, but title/subtitle/legend raw props should come from `state.chartCardProps`.
- Title, subtitle, and legend display formatting belongs in `ChartCard/model.ts`.
- Do not create `chartCardProps` inside `TypeErrorsApp/view.ts`.
- Do not edit `src/components/Chart/` in this PR except for type compatibility if unavoidable.

**Verification:**
- `npm test`
- `npm run build`

### PR6: Refresh Control Panel In Canonical Component

**Base:** `main`

**Purpose:** Update the existing `ControlPanel` component with teaching labels, hints, and clearer controls.

**Files:**
- Modify: `src/components/ControlPanel/view.ts`
- Modify: `src/components/ControlPanel/types.ts` if props/state need naming cleanup
- Test: `test/components/ControlPanel/model.test.ts`
- Test: `test/components/ControlPanel/intent.test.ts`
- Add if needed: `test/components/ControlPanel/view.test.ts`

**Rules:**
- Do not create or modify a duplicate control panel under `TypeErrorsApp/components/`.
- Keep control IDs stable: `alpha`, `null-mean`, `true-mean`, `std-dev`.
- Keep reducer and intent behavior unchanged unless this PR explicitly tests it.

**Verification:**
- `npm test`
- `npm run build`
- Diff must show `src/components/ControlPanel/` rather than a domain-local duplicate.

### PR7: Refresh Chart Behavior In Canonical Chart

**Base:** `main`

**Purpose:** Improve chart labels, annotations, legend compatibility, and visible Type I/Type II teaching affordances in the existing `Chart` component.

**Files:**
- Modify: `src/components/Chart/view.ts`
- Modify: `src/components/Chart/graph.ts`
- Modify: `src/components/Chart/axes.ts`
- Modify: `src/components/Chart/types.ts` if config props are needed
- Test: `test/components/Chart/view.test.ts`

**Rules:**
- Do not mix page-level `ChartCard` work into this PR.
- Do not move chart logic into `TypeErrorsApp/view.ts`.
- Keep D3 drawing helpers under `Chart/`.

**Verification:**
- `npm test`
- `npm run build`

### PR8: CSS-Only Teaching Style Alignment

**Base:** `main`

**Purpose:** Align visual language with `confidence-interval-visualization` and `regression-visualizer` while keeping this PR pure styling.

**Files:**
- Modify or create: `src/styles/custom.css`
- Modify: `src/main.ts` only to import CSS if needed
- Test: `test/styles/custom-css.test.ts`

**Rules:**
- No component logic changes.
- No model/type changes.
- No layout markup changes except class names if absolutely necessary. If class names are needed, move that to the relevant component PR instead.
- Confirm `gh pr diff --name-only` only shows style entry files and style tests.

**Verification:**
- `npm test`
- `npm run build`

## Unified Website Readiness

This repo should be made compatible with a future combined teaching webpage, but that combined site should not be built inside these component PRs.

Prepare for the future combined page by keeping:

- consistent page module names across repos: hero, lesson, controls, chart, stats, explanation
- consistent CSS selector language where practical
- clean app bootstrap in `main.ts`
- no cross-repo dependencies
- one domain app export that a parent shell can mount later

Future combined webpage work should be a separate integration project or PR after all three visualizers have clean component boundaries.

## Pre-PR Checklist For Every PR

- [ ] `main.ts` remains an app entrypoint only.
- [ ] `TypeErrorsApp/view.ts` only combines child VNodes and reads state.
- [ ] No large `const xxxProps = { ... }` objects live in `TypeErrorsApp/view.ts`.
- [ ] New child component props/config are produced by `TypeErrorsApp/model.ts` and stored on `AppState`.
- [ ] Changes land in the canonical component folder.
- [ ] The PR is a complete reviewable feature.
- [ ] `base` is `main` unless the diff would be misleading.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `gh pr diff --name-only` matches the PR scope.

## Recommended Execution Order

1. Update or create the clean PR branches from `main`.
2. Open PR1, PR2, PR3, PR4, PR6, PR7, and PR8 against `main` whenever their diffs are clean.
3. Use a stacked base only for PR5 if chart-card placement truly needs prior layout components.
4. After any prior PR merges, immediately re-check whether later PRs can retarget to `main`.
5. Close or mark old PRs #2 through #5 as superseded after replacement PRs are available.

## PR Communication Template

Use an English title like `PR1: extract type error hero panel`.

Use a Chinese summary:

- 本 PR 做了什么
- 为什么这个 PR 可以独立 review
- base 是什么，是否依赖前一条 PR
- 已运行的检查：`npm test`、`npm run build`
