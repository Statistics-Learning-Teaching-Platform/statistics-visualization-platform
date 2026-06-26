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
export type AppGroup = "Core Visualizers" | "WALS Simulation" | "WALS MES";
export type AppSource = "existing" | "wals";

export interface AppRecord {
  id: string;
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
    id: "confidence-interval",
    group: "Core Visualizers",
    path: "apps/confidence-interval/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/confidence-interval-visualization",
    source: "existing",
    icon: "∫",
  },
  {
    id: "type-error",
    group: "Core Visualizers",
    path: "apps/type-error/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/type-error-visualization",
    source: "existing",
    icon: "α",
  },
  {
    id: "regression",
    group: "Core Visualizers",
    path: "apps/regression/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/regression-visualizer",
    source: "existing",
    icon: "β",
  },
  {
    id: "simulation-introduction",
    group: "WALS Simulation",
    path: "apps/simulation-introduction/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-introduction-visualization",
    source: "wals",
    icon: "μ",
  },
  {
    id: "simulation-random-variable",
    group: "WALS Simulation",
    path: "apps/simulation-random-variable/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-random-variable-visualization",
    source: "wals",
    icon: "ξ",
  },
  {
    id: "simulation-clt",
    group: "WALS Simulation",
    path: "apps/simulation-clt/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-clt-visualization",
    source: "wals",
    icon: "μ",
  },
  {
    id: "simulation-variance-reduction",
    group: "WALS Simulation",
    path: "apps/simulation-variance-reduction/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-variance-reduction-visualization",
    source: "wals",
    icon: "σ²",
  },
  {
    id: "simulation-resampling",
    group: "WALS Simulation",
    path: "apps/simulation-resampling/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-resampling-visualization",
    source: "wals",
    icon: "⟳",
  },
  {
    id: "simulation-mcmc",
    group: "WALS Simulation",
    path: "apps/simulation-mcmc/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/simulation-mcmc-visualization",
    source: "wals",
    icon: "π",
  },
  {
    id: "mes-anova",
    group: "WALS MES",
    path: "apps/mes-anova/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-anova-visualization",
    source: "wals",
    icon: "F",
  },
  {
    id: "mes-confidence-interval",
    group: "WALS MES",
    path: "apps/mes-confidence-interval/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-confidence-interval-visualization",
    source: "wals",
    icon: "∫",
  },
  {
    id: "mes-distributions",
    group: "WALS MES",
    path: "apps/mes-distributions/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-distributions-visualization",
    source: "wals",
    icon: "φ",
  },
  {
    id: "mes-linear-regression",
    group: "WALS MES",
    path: "apps/mes-linear-regression/",
    repositoryUrl:
      "https://github.com/Statistics-Learning-Teaching-Platform/mes-linear-regression-visualization",
    source: "wals",
    icon: "β",
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
