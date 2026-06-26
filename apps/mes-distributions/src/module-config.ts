import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "mes-distributions",
  "repoName": "mes-distributions-visualization",
  "title": "Distributions",
  "subtitle": "Continuous and discrete distribution exploration from WALS/MES.",
  "category": "WALS MES",
  "sourcePath": "apps/mes-distributions/src",
  "examples": [
    {
      "id": "distribution-explorer",
      "title": "Distribution Explorer",
      "kind": "distribution",
      "sourcePath": "apps/mes-distributions/src/module-config.ts",
      "description": "Switch between PDF/PMF and CDF/CMF views for common distributions and calculate interval probabilities.",
      "teachingPoints": [
        "Parameters reshape location, spread, skew, and tail behavior.",
        "Interval probability is the area under the density or a CDF difference."
      ],
      "controls": [
        {
          "id": "dist",
          "label": "Distribution",
          "type": "select",
          "defaultValue": "norm",
          "options": [
            {
              "value": "norm",
              "label": "Normal"
            },
            {
              "value": "t",
              "label": "Student t"
            },
            {
              "value": "beta",
              "label": "Beta"
            },
            {
              "value": "gamma",
              "label": "Gamma"
            },
            {
              "value": "chisq",
              "label": "Chi-squared"
            },
            {
              "value": "exp",
              "label": "Exponential"
            },
            {
              "value": "unif",
              "label": "Uniform"
            },
            {
              "value": "binom",
              "label": "Binomial"
            },
            {
              "value": "geom",
              "label": "Geometric"
            },
            {
              "value": "pois",
              "label": "Poisson"
            }
          ]
        },
        {
          "id": "mode",
          "label": "PDF/PMF or CDF/CMF",
          "type": "select",
          "defaultValue": "PDF",
          "options": [
            {
              "value": "PDF",
              "label": "PDF/PMF"
            },
            {
              "value": "CDF",
              "label": "CDF/CMF"
            }
          ]
        },
        {
          "id": "a",
          "label": "Parameter a (μ / shape / df / p)",
          "type": "number",
          "min": 0.1,
          "max": 20,
          "step": 0.1,
          "defaultValue": 0
        },
        {
          "id": "b",
          "label": "Parameter b (σ / shape / df / n / λ)",
          "type": "number",
          "min": 0.1,
          "max": 20,
          "step": 0.1,
          "defaultValue": 1
        },
        {
          "id": "lower",
          "label": "Interval lower",
          "type": "number",
          "min": -10,
          "max": 10,
          "step": 0.1,
          "defaultValue": -2
        },
        {
          "id": "upper",
          "label": "Interval upper",
          "type": "number",
          "min": -10,
          "max": 10,
          "step": 0.1,
          "defaultValue": 2
        }
      ]
    }
  ]
};
