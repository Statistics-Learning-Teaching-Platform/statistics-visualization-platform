# StatMind Product Design System & UI Redesign Plan

> Status: Adopted visual baseline. The style system may change presentation and component composition, but it does not authorize changes to statistical algorithms, APIs, datasets, lesson semantics, runtime behavior, or question-bank behavior.

## 0. Product Thesis

StatMind is an education SaaS for university-level statistics learning. Its job is not to display a collection of tools; its job is to guide a learner from a statistical idea to evidence, code, interpretation, and practice.

Core proposition:

> StatMind — 在思考中学习统计

The product experience should feel like a calm academic workspace: part textbook, part scientific notebook, part learning IDE. It should borrow the clarity and restraint of Linear, Notion, Khan Academy, Observable, Apple Education, and Vercel Dashboard without visually copying any of them.

### Target users

- Students learning introductory and intermediate statistics.
- Instructors preparing demonstrations, labs, and assessments.
- Learners moving between conceptual understanding, simulation, code, and exercises.

### The single product model

```text
Understand → Experiment → Code → Analyze → Practice
    概念         模拟       编程      分析       练习
```

Every major page should make the learner's current position and next useful action visible.

## 1. Audit Scope & Method

This audit combines:

- React/component and CSS inspection across the portal, catalog, visualization shell, and R/Python workspaces.
- Current Vercel Web Interface Guidelines for accessibility, focus, navigation, animation, content handling, and responsive behavior.
- Anthropic frontend-design principles: subject-grounded choices, deliberate typography, one signature element, restrained motion, and self-critique against generic AI output.
- shadcn/ui architecture guidance: semantic tokens, composable primitives, accessible component structure, and incremental source-owned adoption.
- ui-ux-pro-max searches for academic typography, education color, statistical charts, learning navigation, and accessibility.

The automatic ui-ux-pro-max recommendation of blue/orange Glassmorphism was rejected because it conflicts with the explicit StatMind brief. Only its accessibility, density, chart, and academic-type findings are retained.

### Visual evidence

The audit also includes four user-provided screenshots covering the current home, confidence-interval simulation, R learning IDE, and textbook resource catalog. They confirm the code-level findings at wide desktop scale. Before implementation sign-off, every redesigned route must still receive controlled visual QA at 375, 768, 1024, and 1440 px.

## 2. Current UI Audit

### 2.1 Color

Current evidence:

- `apps/shared/styles/tokens.css:6-33` defines a warm cream, sage, teal, and lavender system with translucent cards and a large soft shadow.
- `src/styles.css:1-16` duplicates a related portal palette instead of consuming one shared semantic system.
- `src/styles.css:246-288` gives destination cards separate sage, lavender, teal, and Python blue/yellow treatments.
- `apps/shared/styles/workspace.css:29-36` combines translucent backgrounds, shadows, and backdrop blur on most workspace surfaces.
- Module CSS files continue to hard-code colors, gradients, radii, and shadows outside the shared tokens.

Problems:

1. The palette communicates “friendly generated dashboard” more than academic precision.
2. Warm cream + sage + lavender + Python brand colors create too many simultaneous visual voices.
3. Color currently categorizes product areas, but does not encode statistical meaning consistently.
4. Translucent surfaces and gradients reduce edge clarity and make dense scientific controls feel decorative.
5. The same semantic role can receive different raw colors across portal, course, code-learning, and visualization CSS.

Direction:

- Use a neutral paper-like canvas, white work surfaces, deep forest green as the primary brand action, and academic blue for analytical/navigation accents.
- Reserve chart colors for data encoding; do not reuse the full categorical chart palette for navigation cards.
- Remove ambient gradients, glass layers, and colored card backgrounds from primary layouts.

### 2.2 Typography

Current evidence:

- `apps/shared/styles/tokens.css:35-38` uses Plus Jakarta Sans / Inter globally.
- `src/styles.css:140-147`, `196-205`, and `318-323` switch selected headings to Georgia.
- There is no explicit modern Chinese serif/sans system; CJK typography depends on platform fallback.
- `apps/shared/styles/workspace.css:77-81` allows large 32–48 px experiment headings inside already dense workspaces.

Problems:

1. English SaaS typography and Chinese system fallback do not form a deliberate bilingual pair.
2. Georgia is a generic editorial fallback, not a controlled Chinese academic identity.
3. Type scale and weight vary by product area; hierarchy is re-created locally instead of tokenized.
4. Large title blocks consume experiment workspace height without improving task orientation.
5. Data and numeric readouts do not consistently use tabular numerals or a data/mono face.

Direction:

- Chinese display: Source Han Serif SC / Noto Serif CJK SC / Songti SC.
- Chinese body: Source Han Sans SC / Noto Sans CJK SC / PingFang SC.
- English UI and body: Geist Sans, with Inter as fallback.
- Code and data: Geist Mono / JetBrains Mono with tabular numerals.
- Use serif only for meaningful page or lesson titles, never for buttons, labels, navigation, or dense controls.

### 2.3 Layout

Current evidence:

- `src/PortalHome.tsx:126-171` presents a catalog strip followed by four equal destination cards.
- `src/styles.css:486-496`, `784-790`, `830-833`, `949-954`, and `1051-1083` repeatedly redefine shell layout selectors; later rules win.
- `src/course/components/TextbookResourceCatalog.tsx:76-132` renders a jump grid followed by every chapter and every resource branch on one page.
- `apps/shared/visualization/VisualizationFrame.tsx:34-63` exposes only a main content slot and a right sidebar slot.
- `apps/shared/styles/workspace.css:397-449` enforces a full-height dashboard with independent scroll areas.
- `src/r-learning/styles.css:165-179` uses a fixed three-column IDE layout, then manages separate breakpoint overrides.

Problems:

1. The home page is organized by internal features rather than the learner's journey.
2. The resource page is a long catalog dump, not a reading and study environment.
3. The visualization shell has only “dashboard content + settings panel,” leaving no place for experiment context or notebook flow.
4. Several independent scroll containers increase orientation and focus-management cost.
5. Repeated CSS overrides make responsive behavior difficult to reason about and easy to regress.

### 2.4 Information Density

Current evidence:

- Each portal card repeats eyebrow, title, description, icon, and action (`src/PortalHome.tsx:143-171`).
- Each catalog chapter repeats a chapter header, topic chips, count, up to four resource columns, and another question-bank CTA (`src/course/components/TextbookResourceCatalog.tsx:86-130`).
- Visualization output stacks header, metrics, chart cards, control cards, and supporting panels (`apps/shared/wals/WalsApp.tsx:395-450`).
- R/Python place tutor, runtime tabs, output, review, lesson brief, editor controls, hints, and solutions in one viewport.

Problems:

1. Everything is visually promoted; little is allowed to remain secondary.
2. Counts and capability descriptions compete with the next learning action.
3. Card boundaries multiply faster than conceptual hierarchy.
4. Long titles and resource names are often truncated rather than given an appropriate reading layout.

Direction:

- Prefer progressive disclosure, lists, separators, and clear reading columns over nested cards.
- Show one active chapter, experiment, or lesson context at a time.
- Keep one primary action per region and demote counts to metadata.

### 2.5 Component Consistency

Current evidence:

- The root project has no `components.json`, no Tailwind configuration, and no installed shadcn components.
- Shared visualization tokens exist, but the portal, course, code-learning, and module CSS maintain their own systems.
- Across the principal CSS files there are many independent radius, shadow, gradient, and background definitions.
- `src/python-learning/PythonLearningWorkspace.tsx:8-9` reuses R CSS and adds Python overrides, while the JSX remains separately maintained.
- Simulation modules contain substantially duplicated custom CSS.

Problems:

1. “Card,” “button,” “tab,” “sidebar,” and “panel” are visual conventions, not shared product components.
2. Radius values range from nearly square to highly rounded with no semantic mapping.
3. Focus, hover, disabled, loading, error, and empty states are not governed by one contract.
4. R and Python can drift because shared learning-IDE structure is duplicated.
5. A design change currently requires editing multiple CSS islands.

### 2.6 User Learning Path

Current evidence:

- The home page links to catalog, teaching platform, paper builder, R, and Python but defines no prerequisite or recommended order (`src/PortalHome.tsx:126-171`).
- The catalog treats chapters as a resource aggregation axis, not a guided sequence (`src/course/components/TextbookResourceCatalog.tsx:76-132`).
- `src/code-learning/types.ts:5-27` already contains objective, explanation, task, starter code, solution, check, hint, and success fields.
- R/Python currently order the main content as brief → code → hint/solution, with output in a separate right panel.

Problems:

1. New learners must infer where to start and what to do next.
2. Tools are presented as destinations instead of steps in learning.
3. Progress exists, but is not used as a first-class navigation signal on the portal.
4. “Example” is not an explicit lesson stage; “Explanation” is separated from the learner's output and reflection.
5. Assessment appears as a peer product area rather than the final practice/verification step.

Direction:

- Keep the four large workspace cards as the primary product entrances on the home page.
- Use the Learning Journey as an auxiliary orientation layer that explains learning order; it must not replace or visually overpower the four cards.
- Carry chapter/topic/lesson context through URLs and visible breadcrumbs.

### 2.7 Accessibility & Interaction Quality

High-priority findings:

- `apps/shared/styles/workspace.css:248-269` and `540-565` use `outline: none`; focus replacement is incomplete or fragile.
- `apps/regression/src/styles/custom.css:375` and `428` use `transition: all`.
- `src/course/components/LearnRouter.tsx:95-98`, `src/r-learning/RLearningWorkspace.tsx:496-513`, and the Python equivalent use tab roles without a complete tab/tabpanel relationship and keyboard model.
- `src/styles.css:36-39` locks body scrolling globally, increasing mobile and focus-navigation risk.
- App shell and course layouts have no skip link to the main content.
- Stateful tabs and filters are not consistently reflected in the URL.
- Statistical graphics need visible summaries or data tables; color and canvas labels alone are insufficient.

Required baseline:

- WCAG AA contrast for normal text.
- Visible `:focus-visible` on every operable element.
- 44 px minimum touch targets where touch use is expected.
- Complete keyboard navigation and semantic landmarks.
- Reduced-motion mode covering the entire platform.
- Charts pair color with labels, line styles, shapes, summaries, or tables.

### 2.8 Screenshot-Based Findings

#### Home screenshot

- The centered composition has generous calmness, but the large empty band above the logo and the narrow content column make the page feel like a static student landing page rather than an active SaaS workspace.
- The colorful lightbulb logo, large Song-style headline, pale gradient cards, soft shadows, and rounded corners compete as separate brand gestures.
- The four destination cards are visually equal and occupy most of the meaningful viewport; they describe product areas but give no indication of learning order, current progress, or recommended next step.
- The catalog strip above the cards is structurally another card, producing a “banner + four cards” template rather than a product narrative.
- The strongest retained qualities are the calm canvas, bilingual restraint, and clear Chinese thesis. The redesign should preserve these while removing gradient card differentiation and introducing the Learning Journey.

#### Simulation screenshot

- The screen is divided into a narrow navigation rail, a very large center chart, and a dense right control rail. On a wide monitor, navigation and control typography become very small relative to the chart.
- The center begins with four KPI cards and then an oversized plot. At sample count 0, the plot is mostly empty, so the largest surface communicates the least information.
- The right rail stacks parameters, actions, concept notes, formulas, and learning hints as separate rounded cards. This produces a dashboard inspector rather than an experimental narrative.
- The left navigation has many equal rows and weak separation between “statistical principles” and “simulation,” while the current experiment context is visually distant from its parameter controls.
- The redesign must make the scientific question, procedure, observation, and interpretation the dominant sequence; chart size should respond to content state instead of occupying a fixed giant canvas.

#### R learning IDE screenshot

- The three-column structure is technically complete, but the left lesson list and right output/tutor rail are too narrow and text-heavy at the captured width.
- Lesson numbers, descriptions, concepts, progress, tutor actions, output tabs, and editor controls all use similarly small visual weights, weakening scan hierarchy.
- The editor occupies a large dark block, followed by a very large unused neutral area. The screen has both high local density and low global information efficiency.
- Goal and task appear in two pale cards above the editor, but Example, Output, Explanation, and Check are not perceived as one guided learning sequence.
- The dark editor is a useful focal instrument and should remain; the redesign should wrap it in a clear notebook flow and give output/explanation a stronger relationship to the code that produced them.

#### Textbook resource screenshot

- A large editorial hero, four statistic pills, a full-width chapter jump panel, and large chapter cards create too many oversized vertical layers before the learner reaches a resource.
- Each chapter is a large rounded container holding smaller resource cards. Chapters with few resources retain substantial blank space, making the page feel sparse and heavy at the same time.
- The horizontal 12-chapter jump block works as an index but does not maintain location while reading; the learner still scrolls through an extremely long page.
- Resource type is encoded through small pastel badges and nested cards, while the central learning content of the chapter is absent.
- The redesign should retain the strong chapter typography but move chapters to a persistent left tree, display one chapter at a time, and use the right rail for tools and topic navigation.

## 3. New Design System

## Brand Identity

StatMind represents:

- 统计学习
- 数据思维
- 科学探索

Visual keywords:

- Academic
- Scientific
- Calm
- Precise
- Modern

Avoid:

- AI gradients
- Excessive border radius
- Glassmorphism as a page-level style
- Decorative floating orbs
- Dense card mosaics
- Unexplained animation
- Emoji as product icons

### Signature element: The Evidence Line

The memorable StatMind device is a restrained “Evidence Line”: a 1 px axis-like rule with ticks, step markers, or confidence-band annotations. It appears in the Learning Journey, notebook cells, experiment progress, and selected navigation states.

It is not decoration. It encodes sequence, measurement, or the path from question to evidence. This is the one deliberate visual risk; the rest of the system remains quiet.

## 3.1 Color Tokens

### Core interface palette — Warm Paper Academic

| Token | Value | Use |
|---|---:|---|
| `--color-canvas` | `#F5F4ED` | Fixed warm paper background |
| `--color-surface` | `#FBFAF6` | Reading sheets, controls, and work surfaces |
| `--color-ink` | `#272521` | Primary text and the permitted dark code surface |
| `--color-ink-muted` | `#756E63` | Secondary text, captions, and marginalia |
| `--color-border` | `#DDD6C8` | Hairlines, axes, dividers, and panel borders |
| `--color-primary` | `#1B365D` | The single interface accent: logo, active navigation, CTA, chapter number, and key statistical mark |
| `--color-primary-subtle` | `#ECEBE6` | Quiet selected background derived from the warm neutral system |
| `--color-focus` | `#1B365D` | Keyboard focus ring |

Rules:

- Use semantic tokens in components; no raw colors inside component JSX.
- Light text is allowed only on the dark primary or code surface when contrast is verified.
- Muted text must still meet AA contrast on its surface.
- Product-area navigation does not receive a unique rainbow color.
- Ink blue owns navigation, action, chapter numbering, and statistical reference marks, and should occupy no more than roughly 5% of a page.
- All neutral grays must remain warm. Product areas do not receive independent brand palettes.

### Statistical chart palette

The default chart system is publication-like and intentionally narrow:

```text
estimate/reference  #1B365D
secondary series    #756E63
axis/ink            #272521
grid/rule           #DDD6C8
plot paper          #FBFAF6
```

Chart rules:

- Do not encode meaning by color alone.
- Pair categories with direct labels, shapes, dashes, patterns, or table fallback before introducing another hue.
- Axis and grid lines use neutral tokens; data marks carry the color.
- Statistical roles stay consistent: estimate, interval, null/reference, observed, simulated.
- Use `font-variant-numeric: tabular-nums` for comparable values.

## 3.2 Typography

### Families

| Role | Primary | Fallback |
|---|---|---|
| Chinese display | Source Han Serif SC | Noto Serif CJK SC, Songti SC, serif |
| Chinese body/UI | Source Han Sans SC | Noto Sans CJK SC, PingFang SC, sans-serif |
| English body/UI | Geist Sans | Inter, system-ui, sans-serif |
| Code/data | Geist Mono | JetBrains Mono, SFMono-Regular, monospace |

### Scale

| Token | Size / line height | Use |
|---|---|---|
| `display-lg` | 48 / 56 | Home thesis only |
| `display-md` | 36 / 44 | Page title |
| `heading-lg` | 28 / 36 | Lesson/chapter title |
| `heading-md` | 22 / 30 | Section title |
| `heading-sm` | 18 / 26 | Component heading |
| `body-lg` | 18 / 30 | Introductory copy |
| `body-md` | 16 / 26 | Default reading text |
| `body-sm` | 14 / 22 | Controls and metadata |
| `label` | 13 / 18 | UI labels |
| `caption` | 12 / 18 | Supporting metadata only |

Experiment hierarchy:

- Research title: 40–52 px desktop, 34–42 px narrow screens.
- Research question / module description: 16 / 25, medium weight.
- Visualization finding or output title: 24–28 / 35.
- Reading body and control labels: 14–16 / 22–26.
- Supporting metadata: 12–13 / 18–20; never use it for core instructions.

Rules:

- Default body size is 16 px for reading surfaces.
- Headings use `text-wrap: balance`; body copy uses `text-wrap: pretty` where supported.
- Avoid all-caps Chinese. English eyebrows may use uppercase only at 12–13 px with modest tracking.
- Keep reading measure between 62 and 76 Latin characters, or approximately 28–36 Chinese characters.

## 3.3 Spacing Scale

Base unit: 4 px.

```text
0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
```

Semantic use:

- 4–8: icon/text and compact control gaps.
- 12–16: component internal spacing.
- 20–24: related content groups.
- 32–48: page section separation.
- 64–80: marketing/hero breathing room only.

Use `gap` for layout. Do not use arbitrary per-component spacing values.

## 3.4 Shape, Border & Elevation

```text
radius-xs: 4px
radius-sm: 6px
radius-md: 8px
radius-lg: 12px
```

- Default cards and panels: 8 px.
- Buttons and inputs: 6 px.
- Large modal: 12 px maximum.
- Pills are reserved for status, filters, and compact tags.
- Default separation is a 1 px border, not a shadow.
- Use one low elevation for popovers and one medium elevation for dialogs only.
- No backdrop blur on normal page surfaces.

## 3.5 Motion

- Motion level: 2/10, subtle.
- Hover/focus transitions: 120–180 ms.
- Panel expansion: 180–240 ms.
- Animate only `opacity` and `transform` unless a specific interaction requires otherwise.
- Never use `transition: all`.
- No ambient hero animation or parallax.
- Under `prefers-reduced-motion: reduce`, render final states immediately.

## 3.6 Responsive Framework

Reference widths:

```text
375  mobile
768  tablet
1024 compact desktop
1280 standard desktop
1440 wide desktop
```

- Desktop sidebars collapse into sheets or explicit view switches; they do not simply stack every panel into an endless page.
- Use CSS grid/flex rather than JS measurement for primary layout.
- Preserve browser zoom and safe-area insets.
- Avoid global body scroll locking except inside a confirmed app-shell route.

## 4. Component Specifications

## Sidebar

- Width: 240 px expanded, 64 px collapsed for the platform shell.
- Neutral surface with right border; no floating card container.
- Group labels are quiet text, not colored capsules.
- Active row uses primary-subtle background, primary text, and a 2 px Evidence Line marker.
- Navigation uses links when URL state changes; include `aria-current="page"`.
- Mobile/tablet becomes an accessible Sheet with preserved focus.

## Header

- Height: 56 px desktop, 52 px mobile.
- Contains product identity, breadcrumb/current context, and utilities.
- One border-bottom; no glass blur.
- Page heading remains in content, not duplicated in the header.
- Include a skip link before navigation.

## Card

- Use only when an object has a distinct boundary, action, or reusable identity.
- Default: surface, 1 px border, 8 px radius, no shadow.
- Do not wrap every section in a card; use headings and separators for document flow.
- Card composition: header, title, description, content, footer/action.

## Button

- Variants: primary, secondary, outline, ghost, destructive, link.
- Heights: 32, 36, 40 px; touch contexts use at least 44 px hit area.
- Labels describe the resulting action: “运行代码”, “检查答案”, “打开实验”.
- Icon-only buttons require an accessible name and tooltip.
- Loading uses spinner + disabled state + live status.

## Tabs

- Default visual treatment is an underline or bottom-border tab, not pills.
- `Tab`/`TabList`/`TabPanel` receive complete IDs, `aria-controls`, `aria-labelledby`, and roving keyboard behavior.
- Stateful tabs that define shareable views sync to URL query/hash.
- Use segmented controls only for short mutually exclusive display modes.

## Code Editor

- The editor is a scientific instrument, not a generic dark widget.
- One restrained dark ink surface (`#101815`) is allowed for code; surrounding lesson UI stays light.
- Header contains language/runtime, run shortcut, status, and primary Run action.
- Line numbers, code, errors, and selection states meet contrast requirements.
- Preserve Cmd/Ctrl+Enter, Reset, Check, and Clear session behavior.
- Errors appear adjacent to the relevant output with a next step.

## Chart Container

- Structure: title → question/hypothesis → toolbar → plot → legend/annotation → interpretation/data table.
- No gradient plot background.
- Plot area uses a white or subtle neutral surface and hairline border.
- Key values become annotations or a compact summary row, not a grid of KPI cards.
- Every chart exposes a concise text summary and, when meaningful, a data table.
- Hover and keyboard focus reveal equivalent information.

## Lesson Module

- Canonical sequence: Goal → Example → Code → Output → Explanation → Check.
- Current step and completion state appear on the Evidence Line.
- One primary action per step.
- Hints are progressive disclosure with `aria-expanded` and `aria-controls`.
- Explanation is contextual to the learner's latest output, not an isolated preamble.

## 5. Page Redesigns

## 5.1 Home

Current model: catalog banner + four equal workspace cards.

New model: product thesis + auxiliary Learning Journey + preserved 2×2 workspace-card grid with useful state information.

```text
┌──────────────────────────────────────────────────────────────┐
│ StatMind                 教材  实验  编程  题库      中文/EN │
├──────────────────────────────────────────────────────────────┤
│ STATISTICAL THINKING                                      │
│ StatMind                                                    │
│ 在思考中学习统计                                            │
│ 从问题出发，用模拟、代码与证据建立统计直觉。                  │
│ [继续学习]  [浏览教材]                                      │
├──────────────────────────────────────────────────────────────┤
│ LEARNING JOURNEY                                            │
│ 01 理解概念 ─ 02 模拟实验 ─ 03 编程实践 ─ 04 统计分析       │
│      当前进度/下一步沿 Evidence Line 展示                    │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────────┐          │
│ │ 统计教学平台          │  │ 统计学组卷系统        │          │
│ │ 状态 + 最近使用 + CTA │  │ 状态 + 当前试卷 + CTA │          │
│ └──────────────────────┘  └──────────────────────┘          │
│ ┌──────────────────────┐  ┌──────────────────────┐          │
│ │ R 语言知识库          │  │ Python 语言知识库     │          │
│ │ 进度 + 最近课程 + CTA │  │ 进度 + 最近课程 + CTA │          │
│ └──────────────────────┘  └──────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

Rules:

- Hero is a thesis, not a capability catalog.
- Preserve the four large cards in a prominent 2×2 grid; they are the main entrances to the four product workspaces.
- Learning Journey is a secondary guidance section and uses real sequence numbering; it never replaces the four cards.
- Upgrade each card from a marketing description to a stateful product entrance with module/lesson/question counts, recent activity or progress, and a clear CTA.
- Use consistent surfaces, border, radius, spacing, and hierarchy across all four cards; distinguish them with restrained icons and local accent details rather than four full-card gradients.
- Surface “继续学习” from existing progress data when available.
- Treat the paper builder as the Practice/Assessment workspace inside the learning model while retaining equal prominence as one of the four home entrances.

## 5.2 Textbook Resource Page

Target: Notion + GitBook reading architecture.

```text
┌──────────────┬──────────────────────────────────┬──────────────┐
│ 章节目录      │ 当前章节                          │ 本章工具      │
│ 00 数据       │ Chapter title + learning goal    │ 可视化实验    │
│ 01 描述统计   │ Reading/content/resource lists   │ R / Python    │
│ 02 概率       │ Examples and topic sections      │ 章节题库      │
│ …            │ Previous / Next                   │ On this page │
└──────────────┴──────────────────────────────────┴──────────────┘
```

Rules:

- Left: sticky chapter tree with current state and resource counts.
- Center: one active chapter; natural document flow and readable measure.
- Right: tools, topic anchors, experiment links, question-bank entry, previous/next.
- Do not render all 12 expanded chapter cards simultaneously.
- Preserve `textbookResourceCatalog` as the data source; change presentation and route state only.

## 5.3 Simulation & Visualization Pages

Target: scientific experiment workbench, influenced by Observable and Jupyter.

```text
┌──────────────┬──────────────────────────────────────┬──────────────┐
│ 实验导航      │ RESEARCH NOTEBOOK                    │ 参数 / 检查器 │
│ 问题          │ Hypothesis / concept cell            │ Sample size  │
│ 方法          │ Visualization output                 │ Distribution │
│ 结果          │ Statistical annotation               │ Seed / reset │
│ 解释          │ Interpretation / data table           │ Summary      │
└──────────────┴──────────────────────────────────────┴──────────────┘
```

Rules:

- Extend the shared frame from two slots to context/content/inspector slots.
- Remove the single giant rounded experiment card.
- Use cell separators and notebook rhythm rather than nested dashboard widgets.
- Demote MetricGrid into a compact statistical summary.
- Keep existing calculation, parameters, state, and chart rendering unchanged.
- At narrow widths, expose navigation and inspector as explicit Sheets or view tabs.

## 5.4 R/Python Learning IDE

Target: Google Colab structure + Codecademy pedagogy.

```text
┌──────────────┬──────────────────────────────────────┬──────────────┐
│ 课程/单元      │ LESSON NOTEBOOK                      │ OUTPUT       │
│ lesson list  │ Goal                                │ Console      │
│ progress     │ Example                             │ Plot         │
│ prerequisites│ Code editor                         │ Environment  │
│              │ Explanation + Check                 │ Review       │
└──────────────┴──────────────────────────────────────┴──────────────┘
```

Canonical flow:

1. Lesson Goal — from existing `objective`.
2. Example — introduce a dedicated example model or clearly distinguish example from solution.
3. Code — preserve current editor/runtime interactions.
4. Output — console, plot, environment.
5. Explanation — connect the result to the statistical concept.
6. Check — preserve automatic validation and completion recording.

Architecture direction:

- Extract shared R/Python presentation components while retaining separate runtime adapters.
- Do not duplicate new JSX in both workspaces.
- Preserve lesson IDs, progress keys, runtime API, tutor request structure, and result data.

## 6. Frontend Architecture Strategy

### Non-negotiable boundaries

Do not change:

- API contracts.
- Question-bank data structures.
- Statistical algorithms or interpretation logic.
- WebR/Pyodide execution behavior.
- Existing lesson IDs, route meanings, or progress semantics.
- Visualization inputs/outputs and dataset meaning.

### Incremental design-system architecture

The project is currently Vite + React + TypeScript with CSS, Bootstrap, and isolated visualization apps. shadcn/Tailwind is not initialized. Migration must be additive:

```text
Semantic CSS variables
        ↓
Shared primitives (Button, Tabs, Card, Sidebar, Sheet, Separator)
        ↓
Page-level compositions
        ↓
Legacy CSS retired module by module
```

Recommended structure:

```text
src/design-system/tokens.css
src/design-system/base.css
src/lib/cn.ts
src/components/ui/
src/components/layout/
src/components/learning/
apps/shared/visualization/
apps/shared/styles/
```

shadcn rules:

- Initialize once with a project-owned `components.json`.
- Use the npm runner already used by the project.
- Prefer accessible source primitives and semantic tokens.
- Preview registry changes with `--dry-run` and `--diff` before adding/updating.
- Never overwrite locally modified components without explicit approval.
- Tailwind utilities handle composition/layout; component colors and typography come from semantic variants/tokens.

## 7. Implementation Plan

## Phase 1: Design System

| Modify/Create | Reason | Expected effect |
|---|---|---|
| `DESIGN.md` | Single product/design source of truth | Prevents local visual drift |
| `package.json`, lockfile | Add Tailwind/shadcn prerequisites only after approval | Enables incremental component adoption |
| `components.json` | Initialize shadcn for this Vite project | Defines aliases, component ownership, registry behavior |
| `src/design-system/tokens.css` | Central semantic colors, type, spacing, radius, motion | One visual language across product areas |
| `src/design-system/base.css` | Focus, typography, reduced motion, safe-area, base elements | Accessibility and consistent defaults |
| `apps/shared/styles/tokens.css` | Map legacy visualization variables to new tokens | Preserves module behavior during migration |
| `src/styles.css`, `src/course/course.css`, `src/r-learning/styles.css` | Remove duplicate root tokens, consume semantic variables | Reduces color/radius/shadow drift |
| `src/lib/cn.ts`, `src/components/ui/*` | Add Button, Card, Tabs, Separator, Sheet, Tooltip, ScrollArea | Shared accessible primitives |

Exit criteria:

- One token source controls portal, course, visualization, and code-learning surfaces.
- No new raw color/radius/shadow values inside component files.
- Focus and reduced-motion behavior are global and tested.
- Existing routes and business tests remain green.

## Phase 2: Layout Redesign

| Modify/Create | Reason | Expected effect |
|---|---|---|
| `src/PortalHome.tsx` | Preserve and upgrade the 2×2 workspace cards; add thesis, auxiliary Learning Journey, and state information | Clear product identity without losing direct workspace access |
| `src/styles.css` or scoped home stylesheet | Implement restrained hero and journey rail | Removes AI-card/gradient feel |
| `src/course/components/TextbookResourceCatalog.tsx` | Introduce chapter tree, active chapter content, tools rail | Notion/GitBook-style study flow |
| `src/course/course.css` | Three-column reading layout and responsive Sheets | Less scrolling, stronger orientation |
| `apps/shared/visualization/VisualizationFrame.tsx` | Add context/content/inspector slots | Enables scientific workbench across modules |
| `apps/shared/styles/workspace.css` | Replace two-column card dashboard with notebook grid | Observable/Jupyter character |
| `src/r-learning/RLearningWorkspace.tsx` | Adopt shared lesson-notebook layout | Explicit pedagogical sequence |
| `src/python-learning/PythonLearningWorkspace.tsx` | Use the same shared layout with Python runtime adapter | Prevents R/Python drift |

Exit criteria:

- Home preserves four prominent workspace cards while making the auxiliary learning path and next step understandable.
- Catalog shows one active chapter in a three-column study layout.
- Every visualization uses context/content/inspector structure.
- R/Python visibly expose Goal → Example → Code → Output → Explanation.

## Phase 3: Component Migration

| Modify/Create | Reason | Expected effect |
|---|---|---|
| `src/shell/Sidebar.tsx`, `src/shell/AppShell.tsx` | Shared sidebar/header, semantic links, skip link | Predictable global navigation |
| `src/course/components/LearnRouter.tsx` | Replace incomplete custom tabs/navigation | Correct keyboard/ARIA behavior |
| `src/components/learning/LearningJourney.tsx` | Reusable sequence/progress model | Consistent learning-path language |
| `src/components/learning/LessonModule.tsx` | Canonical lesson stages | Shared pedagogy across R/Python |
| `src/code-learning/CodeEditor.tsx` | Shared editor chrome and controls | Consistent execution UX |
| `src/code-learning/RuntimeOutput.tsx` | Shared output tabs/panels | Correct tab semantics and less duplication |
| `apps/shared/visualization/ChartContainer.tsx` | Standard title, plot, legend, summary, table slots | Consistent accessible charts |
| `apps/shared/visualization/MetricGrid.tsx` | Convert dashboard cards to compact statistical summary | Keeps information without KPI-dashboard feel |
| `apps/simulation-*/src/styles/custom.css` | Remove duplicated base styles | Lower maintenance cost |
| `apps/*/src/styles/custom.css` | Retain module-specific visualization details only | Prevents legacy overrides from restoring old UI |

Exit criteria:

- Button, Card, Tabs, Sidebar, Header, Sheet, code editor, and chart container have one owned implementation each.
- R/Python JSX no longer duplicates shared presentation logic.
- Tabs, disclosures, icon buttons, and navigation pass keyboard and screen-reader checks.
- URL reflects shareable chapter, lesson, experiment, and tab state.

## Phase 4: Animation Polishing

| Modify/Create | Reason | Expected effect |
|---|---|---|
| `src/design-system/base.css` | Central motion tokens and reduced-motion fallback | Consistent, accessible motion |
| Home/journey styles | Add one restrained progress reveal | Makes sequence legible without spectacle |
| Sidebar/Sheet/Tabs primitives | Add interruptible 120–240 ms transitions | Clear state changes |
| Chart interactions | Standardize hover/focus equivalence and annotations | Better analytical feedback |
| `apps/regression/src/styles/custom.css` | Remove `transition: all` | Better performance and guideline compliance |
| Visual regression/a11y tests | Validate 375/768/1024/1440, focus, contrast, reduced motion | Prevents polish regressions |

Exit criteria:

- No `transition: all`.
- No ambient loops or decorative parallax.
- Reduced-motion users receive a complete static interface.
- Motion communicates navigation, progress, or result change only.

## 8. Delivery Order & Risk Control

Recommended delivery sequence:

1. Tokens and primitives behind existing UI.
2. Home as the visual reference implementation.
3. Catalog as the information-architecture reference.
4. One representative visualization as the workbench pilot.
5. Shared visualization migration.
6. R learning IDE pilot, then Python adapter.
7. Accessibility, responsive, and motion hardening.

Risk controls:

- Keep each phase behavior-preserving and independently testable.
- Use existing tests as regression gates; add visual/a11y tests before broad migration.
- Avoid a “big bang” Tailwind rewrite.
- Do not replace D3/WebR/Pyodide/statistical logic while changing presentation.
- Compare before/after at fixed viewports and keyboard-only navigation.

## 9. Definition of Done

The redesign is complete when:

- A first-time learner can identify where to start and what comes next without reading feature descriptions.
- The visual language is recognizably StatMind rather than generic SaaS or AI-generated UI.
- Home, catalog, experiments, R, and Python share the same tokens and interaction primitives.
- Pages use document/workbench structure instead of nested card mosaics.
- All business logic, data, and APIs remain unchanged.
- Core routes pass existing unit tests, responsive visual QA, keyboard navigation, WCAG AA contrast, and reduced-motion checks.
