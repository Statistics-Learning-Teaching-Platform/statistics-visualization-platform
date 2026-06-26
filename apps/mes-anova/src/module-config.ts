import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "mes-anova",
  "repoName": "mes-anova-visualization",
  "title": "ANOVA",
  "subtitle": "WALS Modern Elementary Statistics analysis-of-variance template.",
  "category": "WALS MES",
  "sourcePath": "apps/mes-anova/src",
  "examples": [
    {
      "id": "anova-workbench",
      "title": "Analysis of Variance Workbench",
      "kind": "anova",
      "sourcePath": "apps/mes-anova/src/module-config.ts",
      "description": "Generate or load three-group data, inspect group summaries, and compare between-group and within-group variation.",
      "teachingPoints": [
        "ANOVA partitions total variability into between-group and within-group components.",
        "The F statistic grows when group means differ relative to within-group noise."
      ],
      "controls": [
        {
          "id": "dataset",
          "label": "Dataset",
          "type": "select",
          "defaultValue": "random",
          "options": [
            {
              "value": "random",
              "label": "Random Data"
            },
            {
              "value": "fuel",
              "label": "Fuel Consumption"
            },
            {
              "value": "temperature",
              "label": "Temperature Effect"
            }
          ]
        },
        {
          "id": "n1",
          "label": "Group 1 size",
          "type": "number",
          "min": 5,
          "max": 100,
          "step": 1,
          "defaultValue": 5
        },
        {
          "id": "n2",
          "label": "Group 2 size",
          "type": "number",
          "min": 5,
          "max": 100,
          "step": 1,
          "defaultValue": 5
        },
        {
          "id": "n3",
          "label": "Group 3 size",
          "type": "number",
          "min": 5,
          "max": 100,
          "step": 1,
          "defaultValue": 5
        },
        {
          "id": "mu1",
          "label": "Group 1 mean",
          "type": "number",
          "min": 0,
          "max": 10,
          "step": 0.5,
          "defaultValue": 1
        },
        {
          "id": "mu2",
          "label": "Group 2 mean",
          "type": "number",
          "min": 0,
          "max": 10,
          "step": 0.5,
          "defaultValue": 2
        },
        {
          "id": "mu3",
          "label": "Group 3 mean",
          "type": "number",
          "min": 0,
          "max": 10,
          "step": 0.5,
          "defaultValue": 3
        },
        {
          "id": "sigma",
          "label": "Within-group sigma",
          "type": "number",
          "min": 0.1,
          "max": 5,
          "step": 0.1,
          "defaultValue": 1
        }
      ]
    }
  ]
};
