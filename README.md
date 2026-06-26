# Statistics Visualization Platform

One static GitHub Pages site for statistics teaching visualizers. The platform
shell lives in `src/`, and each teaching module is built as an isolated Vite app
under `apps/<module>/`.

## Visualizers

### Core Visualizers

- Confidence interval visualization
- Type I and Type II error visualization
- Regression visualization

### WALS Simulation

- Simulation introduction
- Random variable generation
- Monte Carlo variance reduction
- Resampling methods
- Markov Chain Monte Carlo

### WALS MES

- ANOVA
- MES confidence interval
- Distributions
- MES linear regression

## Local Commands

```bash
npm install
npm test
npm run build:pages
```

To preview the exact project Pages path locally:

```bash
rm -rf /tmp/statistics-platform-pages-preview
mkdir -p /tmp/statistics-platform-pages-preview
ln -s "$PWD/dist" /tmp/statistics-platform-pages-preview/statistics-visualization-platform
python3 -m http.server 4180 --directory /tmp/statistics-platform-pages-preview
```

Then open:

```text
http://127.0.0.1:4180/statistics-visualization-platform/
```

## Structure

```text
apps/confidence-interval/
apps/type-error/
apps/regression/
apps/simulation-introduction/
apps/simulation-random-variable/
apps/simulation-variance-reduction/
apps/simulation-resampling/
apps/simulation-mcmc/
apps/mes-anova/
apps/mes-confidence-interval/
apps/mes-distributions/
apps/mes-linear-regression/
src/
scripts/build.mjs
docs/integration/
.github/workflows/deploy.yml
```

The platform builds as a single Vite SPA. The shell in `src/shell/` lazy-loads
the selected visualizer via dynamic import (`src/shell/appRegistry.tsx`) inside
a `<Suspense>` boundary, so each visualizer is code-split into its own chunk
rather than loaded in an iframe. The app registry itself lives in
`scripts/apps.ts` (one typed source of truth, including each app's sidebar
icon and the default/lookup helpers).

## Integration Notes

- `docs/integration/platform-inventory.md` records the current app inventory,
  source repositories, and verification coverage.
- `docs/integration/regression-source-comparison.md` records the current
  regression source-of-truth comparison across the platform app, the private
  `regression-visualizer` repository, and the public `code` repository.
- The current consolidation rule is behavior-preserving: do not change
  statistical algorithms, teaching interactions, or dataset meaning as part of
  platform ownership cleanup.
