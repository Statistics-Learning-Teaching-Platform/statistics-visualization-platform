# Statistics Visualization Platform

A Vite single-page application for statistics teaching visualizers. The
platform shell lives in `src/`, and each teaching module lives under
`apps/<module>/`. Production deployment is configured for Cloudflare Pages.

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
npm run check
npm run build
```

The portal and question bank are separate development servers. Start the
question-bank service first, then start Vite with a fixed port so its
`/st-qselector` development proxy can reach Next.js:

```bash
# terminal 1
cd integrations/st-qselector/Program
npm install
STAT_ALLOWED_ORIGINS=http://127.0.0.1:4174 npm run dev

# terminal 2, from the repository root
npm install
npm run dev -- --port 4174
```

Open `http://127.0.0.1:4174/`. The question bank runs on port 3200 and is
available through the portal proxy. The explicit development origin above is
required for authenticated POST requests through Vite; production origins
remain configured separately. The service also requires the database
environment described in `integrations/st-qselector/Program/README.md`.

To preview only the root Pages production build locally:

```bash
npm run preview
```

Then open:

```text
http://127.0.0.1:4173/
```

This preview does not proxy `/st-qselector`. Use the two-server setup above,
or run the question bank's OpenNext preview separately, when testing the full
portal.

## Deployment

Production has two deployment units:

1. The OpenNext Worker in `integrations/st-qselector/Program` owns the
   `/st-qselector*` route.
2. The root Cloudflare Pages project serves the portal, visualizers, and coding
   studios from `dist`.

Deploy or verify the question-bank Worker before publishing Pages so the SPA
fallback cannot mask a missing Worker route:

```bash
cd integrations/st-qselector/Program
npm run lint
npm run typecheck
npm test
npm run build:cloudflare
npx wrangler deploy --dry-run
npm run deploy:cloudflare

cd ../../..
npm run check
npm run build
npx wrangler pages deploy dist --project-name statmind-platform
```

Cloudflare Pages reads `wrangler.toml` as its build source of truth. The Node
version is pinned in `.node-version`. Vite copies the enforced security
headers, cache policy, and SPA fallback from `public/` into every root build.
After deployment, smoke-test `/`, `/teaching`, `/r-learning`,
`/python-learning`, and `/st-qselector/login`. An anonymous request to
`/st-qselector/api/questions` must be rejected, and the retired static path
`/st-qselector/data/reviewed-questions.json` must return 404.

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
apps/shared/styles/wals-custom.css
src/
scripts/build.mjs
public/_headers
public/_redirects
wrangler.toml
docs/integration/
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
