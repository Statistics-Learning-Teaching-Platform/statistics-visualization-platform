# StatMind Warm Editorial Demo

This document is the source of truth for the editorial visual system. `/visual-demo` remains the review surface, while the approved home and textbook structures are also used by the production `/` and `/catalog` routes. Product mode keeps the live API, canonical catalog data, and business behavior intact.

## 1. Design System

### Product thesis

StatMind is a runnable statistics textbook: reading establishes a concept, a simulation makes uncertainty visible, code makes the method reproducible, and analysis turns output into evidence. The interface should resemble a carefully typeset academic publication with live instruments embedded in the page.

### Visual character

- Editorial Academic Product Design
- Japanese editorial pacing and asymmetry
- Apple-like alignment and interaction precision
- Scientific-publishing figures, captions, rules, and marginalia
- Warm paper, quiet technology, no dashboard chrome

### Color tokens

| Token | Value | Purpose |
|---|---:|---|
| `paper` | `#F5F4ED` | Fixed page canvas |
| `surface` | `#FBFAF6` | Reading sheets, figure plates, controls |
| `ink` | `#272521` | Primary text and the dark code surface |
| `ink-muted` | `#756E63` | Captions, metadata, secondary prose |
| `rule` | `#DDD6C8` | Hairlines, axes, table rules |
| `navy` | `#1B365D` | The only accent: navigation, CTA, section numbers, statistical reference marks |

Navy should occupy no more than roughly 5% of a page. Status is expressed through text, line style, symbols, and placement rather than adding more colors.

### Typography

- Display and chapter titles: Source Han Serif SC / Noto Serif CJK SC / Songti SC, weight 400–500.
- Interface and reading copy: Geist / Source Han Sans SC / PingFang SC, weight 400–600.
- Code and values: Geist Mono / SFMono-Regular.
- Home thesis: 72–104px desktop; page title: 48–68px; section title: 30–42px; body: 16–18px; metadata: 12–14px.
- Reading measure: 28–36 Chinese characters. Body line height: 1.75–1.9.

### Spacing and borders

- Spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 72, 96, 128.
- Default border: 1px warm rule; key statistical reference: 1.5px navy.
- Surface radius: 8–10px. Capsules are reserved for CTA buttons only.
- No decorative shadows. Separation comes from rules, whitespace, and paper tone.

### Signature: Statistical Margin Rule

A measured navy hairline with ticks and marginal notes appears as the learning journey, chapter progress, confidence reference line, notebook sequence, and active navigation marker. It always encodes order, scale, or evidence; it is never decorative.

### Motion

- Entry: opacity plus at most 8px upward movement, 240–320ms.
- Hover: border or underline transition, 160–220ms.
- Respect `prefers-reduced-motion`; no parallax, particles, glow, or scroll choreography.

## 2. Page Structure

### Home

Masthead → asymmetric two-column thesis hero and textbook statistical plate → four-step evidence timeline → digital textbook entry → 2×2 editorial workspace index → colophon.

### Textbook

The desktop keeps its full three-column study workspace: sticky numbered chapter index → rich continuous reading sheet → stacked chapter tools. The reading sheet contains a chapter thesis, learning goals, five concept sections, key-idea notes, equations, scientific figures, an inline parameter experiment, R/Python reproduction links, and expandable exercises. The right rail keeps simulation, coding, question-bank, outline, and reading-note tools visible without replacing the textbook narrative.

### Statistical Laboratory

Experiment index and procedure → research question, explanatory prose, confidence-interval figure and evidence caption → quiet parameter rail with sample size, confidence level and generation actions.

### Exam Composer

Textbook blueprint and filters → editorial question list → current examination manuscript with numbered sections, points, time, and export path. It reads like assembling a publication, not monitoring KPIs.

### R / Python Learning IDE

Course folio → Goal, Example, Task, Code, Output, Explanation, Check notebook sequence → Tutor, Console and Variables marginal rail. The code cell is the only dark surface.

## 3. Component Tree

```text
EditorialDemoRouter / Production route adapters
└── EditorialDemoShell (`demo` or `product` mode)
    ├── EditorialHeader
    │   ├── Wordmark
    │   ├── SectionNavigation
    │   └── LanguageSwitch
    └── ActivePage
        ├── EditorialHomePage
        │   ├── EditorialHero
        │   ├── StatisticalFigure
        │   ├── LearningJourney
        │   ├── DigitalTextbookEntry
        │   └── AcademicCard × 4
        ├── EditorialTextbookPage
        │   ├── TextbookReadingRail
        │   ├── ChapterHeader
        │   ├── ReadingSection × 5
        │   ├── MiniEvidenceLab
        │   ├── PracticeResources
        │   ├── ExerciseSet
        │   └── TextbookChapterTools
        ├── EditorialExperimentPage
        │   ├── ExperimentSidebar
        │   ├── ExperimentPanel
        │   ├── StatisticalFigure
        │   └── ParameterRail
        ├── EditorialPaperPage
        │   ├── BlueprintRail
        │   ├── QuestionManuscript
        │   └── PaperFolio
        └── EditorialLearningIdePage
            ├── CourseFolio
            ├── LearningNotebook
            └── TutorOutputRail
```

shadcn/ui provides accessible `Button`, `Separator`, `Tabs`, and `Slider` primitives. StatMind-specific components own the editorial composition and visual language.

## 4. Production Style Rollout

The approved structure and visual language are applied to the production shells without changing their data or interactions:

- `/`: uses the same editorial hero, statistical plate, Learning Journey, digital textbook entry, and 2×2 workspace index as the approved Demo; every CTA targets a real workspace.
- `/catalog`: uses the same sticky three-column reader as the Demo. Its left rail exposes all 12 canonical chapters, the center retains rich long-form content, and the right tool stack resolves real visualization, R, Python, and chapter-filtered question-bank links.
- `/teaching-platform`: keeps the live experiment navigation and resizable three-column workspace while mapping its header, evidence, visualization, metrics, and parameter tools to the same editorial hierarchy.
- `/r-learning` and `/python-learning`: the existing three-column Learning IDE remains intact; gradients, glass surfaces, oversized radii, and tiny interface type are replaced by paper surfaces, 8px corners, readable 12px minimum labels, and a single dark code surface.
- `/st-qselector`: its filter, question, AI, and selection workflows remain intact while the independent application adopts the same paper, ink, rule, navy, serif-title, and low-shadow tokens.
