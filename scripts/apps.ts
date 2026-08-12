// Single source of truth for the platform's app registry.
// Consumed by:
//   - src/shell/appRegistry.tsx (auto-discovers each app's main.tsx)
//   - src/shell/Sidebar.tsx     (navigation + icons)
//   - src/shell/AppShell.tsx    (default/fallback visualizer helpers)
//   - test/visualizers.test.ts, test/platform-inventory.test.ts
// Note: scripts/build.mjs runs a single `vite build` of the SPA shell and no
// longer reads this list — the shell imports apps via dynamic glob.
// Adding a new app: append ONE record here. Do not duplicate the list elsewhere.
//
// Navigation labels (label / pageTitle) live in apps/shared/i18n/copy.ts
// (`visualizerLabels`), which is the single source consumed by the Sidebar via
// getVisualizerLabel(). Do NOT duplicate them back onto AppRecord.
export type AppGroup = "Statistical Foundations" | "Statistical Simulation";
export type AppSource = "existing" | "wals";

export interface AppRecord {
  id: string;
  topicId: string;
  activityId: string;
  group: AppGroup;
  path: string;
  repositoryUrl: string;
  source: AppSource;
  // Sidebar glyph for the app. Co-located with the record (one source of truth)
  // instead of being derived by substring-matching the id in the Sidebar.
  icon: string;
}

export const apps: AppRecord[] = [
  {
    id: "mes-distributions",
    topicId: "probability-distributions",
    activityId: "compare-probability-distributions",
    group: "Statistical Foundations",
    path: "apps/mes-distributions/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-distributions-visualization",
    source: "wals",
    icon: "φ",
  },
  {
    id: "simulation-random-variable",
    topicId: "random-variables",
    activityId: "visualize-random-variables",
    group: "Statistical Foundations",
    path: "apps/simulation-random-variable/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-random-variable-visualization",
    source: "wals",
    icon: "ξ",
  },
  {
    id: "simulation-clt",
    topicId: "central-limit-theorem",
    activityId: "explore-central-limit-theorem",
    group: "Statistical Foundations",
    path: "apps/simulation-clt/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-clt-visualization",
    source: "wals",
    icon: "μ",
  },
  {
    id: "confidence-interval",
    topicId: "confidence-interval",
    activityId: "confidence-interval-coverage",
    group: "Statistical Foundations",
    path: "apps/confidence-interval/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/confidence-interval-visualization",
    source: "existing",
    icon: "∫",
  },
  {
    id: "mes-confidence-interval",
    topicId: "confidence-interval",
    activityId: "confidence-interval-case-study",
    group: "Statistical Foundations",
    path: "apps/mes-confidence-interval/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-confidence-interval-visualization",
    source: "wals",
    icon: "∫",
  },
  {
    id: "type-error",
    topicId: "type-i-type-ii-errors",
    activityId: "explore-testing-errors",
    group: "Statistical Foundations",
    path: "apps/type-error/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/type-error-visualization",
    source: "existing",
    icon: "α",
  },
  {
    id: "mes-anova",
    topicId: "anova",
    activityId: "explore-anova",
    group: "Statistical Foundations",
    path: "apps/mes-anova/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-anova-visualization",
    source: "wals",
    icon: "F",
  },
  {
    id: "regression",
    topicId: "linear-regression",
    activityId: "draw-regression-line",
    group: "Statistical Foundations",
    path: "apps/regression/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/regression-visualizer",
    source: "existing",
    icon: "β",
  },
  {
    id: "mes-linear-regression",
    topicId: "linear-regression",
    activityId: "linear-regression-city-case",
    group: "Statistical Foundations",
    path: "apps/mes-linear-regression/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-linear-regression-visualization",
    source: "wals",
    icon: "β",
  },
  {
    id: "simulation-introduction",
    topicId: "simulation-foundations",
    activityId: "introduce-statistical-simulation",
    group: "Statistical Simulation",
    path: "apps/simulation-introduction/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-introduction-visualization",
    source: "wals",
    icon: "μ",
  },
  {
    id: "simulation-resampling",
    topicId: "bootstrap-and-permutation",
    activityId: "explore-resampling",
    group: "Statistical Simulation",
    path: "apps/simulation-resampling/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-resampling-visualization",
    source: "wals",
    icon: "⟳",
  },
  {
    id: "simulation-mcmc",
    topicId: "mcmc",
    activityId: "explore-mcmc",
    group: "Statistical Simulation",
    path: "apps/simulation-mcmc/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-mcmc-visualization",
    source: "wals",
    icon: "π",
  },
  {
    id: "simulation-variance-reduction",
    topicId: "variance-reduction",
    activityId: "explore-variance-reduction",
    group: "Statistical Simulation",
    path: "apps/simulation-variance-reduction/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-variance-reduction-visualization",
    source: "wals",
    icon: "σ²",
  },
];

// ── Visualizer selection helpers (folded in from the former src/visualizers.ts) ──
export const DEFAULT_VISUALIZER_ID = "confidence-interval";

export function getDefaultVisualizer(): AppRecord {
  const defaultVisualizer = apps.find(
    (visualizer) => visualizer.id === DEFAULT_VISUALIZER_ID,
  );

  if (!defaultVisualizer) {
    throw new Error("Default visualizer is not registered.");
  }

  return defaultVisualizer;
}

export function getVisualizerById(id: string | null): AppRecord {
  return (
    apps.find((visualizer) => visualizer.id === id) ?? getDefaultVisualizer()
  );
}
