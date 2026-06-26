import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "mes-confidence-interval",
  "repoName": "mes-confidence-interval-visualization",
  "title": "MES Confidence Interval",
  "subtitle": "The WALS/MES confidence interval interval-comparison template.",
  "category": "WALS MES",
  "sourcePath": "apps/mes-confidence-interval/src",
  "examples": [
    {
      "id": "interval-comparison",
      "title": "Confidence Interval Comparison",
      "kind": "confidence-interval",
      "sourcePath": "apps/mes-confidence-interval/src/module-config.ts",
      "description": "Draw repeated random samples and build a z- or t-interval from each, then watch how often they cover the true mean.",
      "teachingPoints": [
        "Each interval is built from a fresh random sample; choose z (sigma known) or t (sigma estimated).",
        "Over many repeated samples the observed coverage approaches the confidence level."
      ],
      "controls": [
        {
          "id": "mu",
          "label": "Population mean",
          "type": "number",
          "min": 0,
          "max": 100,
          "step": 0.1,
          "defaultValue": 31.5
        },
        {
          "id": "sigma",
          "label": "Population SD",
          "type": "number",
          "min": 0.01,
          "max": 10,
          "step": 0.01,
          "defaultValue": 0.3577
        },
        {
          "id": "sampleSize",
          "label": "Sample size",
          "type": "number",
          "min": 1,
          "max": 100,
          "step": 1,
          "defaultValue": 5
        },
        {
          "id": "intervalCount",
          "label": "Number of intervals",
          "type": "number",
          "min": 1,
          "max": 100,
          "step": 1,
          "defaultValue": 20
        },
        {
          "id": "confidenceLevel",
          "label": "Confidence level",
          "type": "select",
          "options": [
            { "value": "0.8", "label": "80%" },
            { "value": "0.9", "label": "90%" },
            { "value": "0.95", "label": "95%" },
            { "value": "0.99", "label": "99%" }
          ],
          "defaultValue": "0.95"
        },
        {
          "id": "sigmaKnown",
          "label": "Sigma assumption",
          "type": "select",
          "options": [
            { "value": "true", "label": "Known" },
            { "value": "false", "label": "Estimated" }
          ],
          "defaultValue": "true"
        }
      ]
    }
  ]
};
