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
      "description": "Compare a fixed reference curve with the current normal distribution, switch between PDF/PMF and CDF/CMF views, and calculate interval probabilities.",
      "teachingPoints": [
        "For a normal distribution, the mean shifts the curve while the variance changes its width and peak height.",
        "A fixed N(0, 1) reference makes parameter changes visible on a shared coordinate system.",
        "Interval probability is the area under the density or a CDF difference."
      ],
      "quickActions": [
        { "type": "bumpControl", "control": "a", "amount": 1, "copyKey": "changeMeanOnly", "showWhen": { "controlId": "dist", "values": ["norm"] } },
        { "type": "bumpControl", "control": "b", "amount": 0.5, "copyKey": "changeSdOnly", "showWhen": { "controlId": "dist", "values": ["norm"] } }
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
          "label": "Location or first shape parameter",
          "labelByValue": {
            "controlId": "dist",
            "labels": {
              "norm": "Mean μ",
              "t": "Degrees of freedom ν",
              "beta": "Shape α",
              "gamma": "Shape α",
              "unif": "Lower bound a",
              "binom": "Success probability p",
              "geom": "Success probability p"
            }
          },
          "rangeByValue": {
            "controlId": "dist",
            "ranges": {
              "norm": { "min": -4, "max": 4, "step": 0.1, "defaultValue": 1.5 },
              "t": { "min": 1, "max": 30, "step": 1, "defaultValue": 6 },
              "beta": { "min": 0.1, "max": 10, "step": 0.1, "defaultValue": 2 },
              "gamma": { "min": 0.1, "max": 10, "step": 0.1, "defaultValue": 2 },
              "chisq": { "min": 0, "max": 1, "step": 1, "defaultValue": 0 },
              "exp": { "min": 0, "max": 1, "step": 1, "defaultValue": 0 },
              "unif": { "min": -10, "max": 9.9, "step": 0.1, "defaultValue": 0 },
              "binom": { "min": 0.01, "max": 0.99, "step": 0.01, "defaultValue": 0.5 },
              "pois": { "min": 0, "max": 1, "step": 1, "defaultValue": 0 },
              "geom": { "min": 0.01, "max": 0.99, "step": 0.01, "defaultValue": 0.5 }
            }
          },
          "hideWhen": { "controlId": "dist", "values": ["chisq", "exp", "pois"] },
          "type": "number",
          "min": 0.1,
          "max": 20,
          "step": 0.1,
          "defaultValue": 1.5
        },
        {
          "id": "b",
          "label": "Scale or second shape parameter",
          "labelByValue": {
            "controlId": "dist",
            "labels": {
              "norm": "Standard deviation σ (variance σ²)",
              "beta": "Shape β",
              "gamma": "Rate β",
              "chisq": "Degrees of freedom ν",
              "exp": "Rate λ",
              "unif": "Upper bound b",
              "binom": "Number of trials n",
              "pois": "Rate λ"
            }
          },
          "rangeByValue": {
            "controlId": "dist",
            "ranges": {
              "norm": { "min": 0.5, "max": 3, "step": 0.1, "defaultValue": 1.6 },
              "t": { "min": 0, "max": 1, "step": 1, "defaultValue": 1 },
              "beta": { "min": 0.1, "max": 10, "step": 0.1, "defaultValue": 2 },
              "gamma": { "min": 0.1, "max": 5, "step": 0.1, "defaultValue": 1 },
              "chisq": { "min": 1, "max": 30, "step": 1, "defaultValue": 5 },
              "exp": { "min": 0.1, "max": 5, "step": 0.1, "defaultValue": 1 },
              "unif": { "min": -9.9, "max": 10, "step": 0.1, "defaultValue": 1 },
              "binom": { "min": 1, "max": 50, "step": 1, "defaultValue": 10 },
              "pois": { "min": 0.1, "max": 30, "step": 0.1, "defaultValue": 4 },
              "geom": { "min": 0, "max": 1, "step": 1, "defaultValue": 1 }
            }
          },
          "hideWhen": { "controlId": "dist", "values": ["t", "geom"] },
          "type": "number",
          "min": 0.1,
          "max": 20,
          "step": 0.1,
          "defaultValue": 1.6
        },
        {
          "id": "lower",
          "label": "Interval lower",
          "type": "number",
          "rangeByValue": {
            "controlId": "dist",
            "ranges": {
              "norm": { "min": -12, "max": 12, "step": 0.1, "defaultValue": -2 },
              "t": { "min": -20, "max": 20, "step": 0.1, "defaultValue": -2 },
              "beta": { "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.2 },
              "gamma": { "min": 0, "max": 30, "step": 0.1, "defaultValue": 0 },
              "chisq": { "min": 0, "max": 60, "step": 0.1, "defaultValue": 0 },
              "exp": { "min": 0, "max": 30, "step": 0.1, "defaultValue": 0 },
              "unif": { "min": -10, "max": 10, "step": 0.1, "defaultValue": 0.2 },
              "binom": { "min": 0, "max": 50, "step": 1, "defaultValue": 0 },
              "pois": { "min": 0, "max": 60, "step": 1, "defaultValue": 0 },
              "geom": { "min": 0, "max": 100, "step": 1, "defaultValue": 0 }
            }
          },
          "min": -10,
          "max": 10,
          "step": 0.1,
          "defaultValue": -2
        },
        {
          "id": "upper",
          "label": "Interval upper",
          "type": "number",
          "rangeByValue": {
            "controlId": "dist",
            "ranges": {
              "norm": { "min": -12, "max": 12, "step": 0.1, "defaultValue": 2 },
              "t": { "min": -20, "max": 20, "step": 0.1, "defaultValue": 2 },
              "beta": { "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.8 },
              "gamma": { "min": 0, "max": 30, "step": 0.1, "defaultValue": 5 },
              "chisq": { "min": 0, "max": 60, "step": 0.1, "defaultValue": 10 },
              "exp": { "min": 0, "max": 30, "step": 0.1, "defaultValue": 5 },
              "unif": { "min": -10, "max": 10, "step": 0.1, "defaultValue": 0.8 },
              "binom": { "min": 0, "max": 50, "step": 1, "defaultValue": 10 },
              "pois": { "min": 0, "max": 60, "step": 1, "defaultValue": 10 },
              "geom": { "min": 0, "max": 100, "step": 1, "defaultValue": 10 }
            }
          },
          "min": -10,
          "max": 10,
          "step": 0.1,
          "defaultValue": 2
        }
      ]
    }
  ]
};
