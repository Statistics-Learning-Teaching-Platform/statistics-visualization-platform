import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "simulation-variance-reduction",
  "repoName": "simulation-variance-reduction-visualization",
  "title": "MC Integration and Variance Reduction",
  "subtitle": "Nine WALS variance-reduction templates rebuilt as independent teaching tabs.",
  "category": "WALS Simulation",
  "sourcePath": "apps/simulation-variance-reduction/src",
  "examples": [
    {
      "id": "mc-exp-integral",
      "title": "Example 1: Basic Monte Carlo Integration",
      "kind": "mc-integral-exp",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Estimate int_2^4 exp(-x) dx and compare with the exact value.",
      "teachingPoints": [
        "Simple Monte Carlo turns an integral into an average.",
        "Sampling error is visible even when the estimator is unbiased."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 10000
        }
      ]
    },
    {
      "id": "mc-transform",
      "title": "Example 2: Uniform vs Exponential Sampling",
      "kind": "mc-transform",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Compare two sampling strategies for the same integral.",
      "teachingPoints": [
        "Changing the sampling distribution can reduce variance.",
        "Estimator design matters as much as sample size."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "normal-cdf",
      "title": "Example 3: Normal CDF Estimation",
      "kind": "normal-cdf",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Estimate Phi(x) by transformation and by indicator simulation.",
      "teachingPoints": [
        "Two unbiased estimators can have different precision.",
        "A grid of x values shows where approximation error changes."
      ],
      "controls": [
        {
          "id": "low",
          "label": "Lower bound",
          "type": "number",
          "min": 0.1,
          "max": 2,
          "step": 0.1,
          "defaultValue": 0.1
        },
        {
          "id": "high",
          "label": "Upper bound",
          "type": "number",
          "min": 0.5,
          "max": 3,
          "step": 0.1,
          "defaultValue": 2.5
        },
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "antithetic-exp",
      "title": "Example 4: Antithetic Variables",
      "kind": "antithetic-exp",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Estimate int_0^1 exp(u) du using paired uniforms U and 1-U.",
      "teachingPoints": [
        "Negative correlation between paired samples can reduce variance.",
        "The mean is unchanged while the estimator spread shrinks."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "antithetic-gamma",
      "title": "Example 5: Antithetic Gamma Integral",
      "kind": "antithetic-gamma",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Use antithetic variables for a gamma-like integral.",
      "teachingPoints": [
        "Antithetic sampling can apply beyond simple exponential integrals.",
        "Standard error is the comparison target."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "control-exp",
      "title": "Example 6: Control Variates",
      "kind": "control-exp",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Use U - 1/2 as a control variate for exp(U).",
      "teachingPoints": [
        "A correlated variable with known expectation can lower variance.",
        "The coefficient controls how much adjustment is applied."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        },
        {
          "id": "coefficient",
          "label": "Control coefficient c",
          "type": "number",
          "min": -4,
          "max": 4,
          "step": 0.1,
          "defaultValue": -1.6903
        }
      ]
    },
    {
      "id": "control-ratio",
      "title": "Example 7: Control Variate Ratio Integral",
      "kind": "control-ratio",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Compare a simple estimator with a control-variate adjusted estimator.",
      "teachingPoints": [
        "The control coefficient can be estimated from pilot samples.",
        "Variance reduction is reported as a percent change."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "importance-power",
      "title": "Example 8: Importance Sampling",
      "kind": "importance-power",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Estimate E[X^5.1] using an importance density proportional to x^4.",
      "teachingPoints": [
        "Importance sampling spends more draws where the integrand matters.",
        "A good proposal can make variance collapse."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "conditional-circle",
      "title": "Example 9: Conditional Monte Carlo",
      "kind": "conditional-circle",
      "sourcePath": "apps/simulation-variance-reduction/src/module-config.ts",
      "description": "Estimate a unit-circle probability by conditioning on one coordinate.",
      "teachingPoints": [
        "Conditioning replaces a noisy indicator with a smoother expectation.",
        "The target mean is similar, but estimator variance falls."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Number of simulations",
          "type": "number",
          "min": 100,
          "max": 100000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    }
  ]
};
