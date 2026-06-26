import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "simulation-resampling",
  "repoName": "simulation-resampling-visualization",
  "title": "Resampling Methods",
  "subtitle": "Bootstrap and resampling workflows from WALS Simulation/Resampling.",
  "category": "WALS Simulation",
  "sourcePath": "apps/simulation-resampling/src",
  "examples": [
    {
      "id": "parametric-bootstrap",
      "title": "Parametric Bootstrap",
      "kind": "bootstrap-max",
      "sourcePath": "apps/simulation-resampling/src/module-config.ts",
      "description": "Treat the observed sample as a finite population and bootstrap maxima.",
      "teachingPoints": [
        "Bootstrap distributions approximate sampling variability from observed data.",
        "The maximum is sensitive to tail behavior and sample size."
      ],
      "controls": [
        {
          "id": "data",
          "label": "Data values",
          "type": "text",
          "defaultValue": "0.6939, 0.8069, 0.1412, 0.9245, 0.5227, 0.7899, 0.6966, 0.6325, 0.3847, 0.6208"
        },
        {
          "id": "replicates",
          "label": "Bootstrap replicates",
          "type": "number",
          "min": 100,
          "max": 10000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "mean-bootstrap",
      "title": "MeanBoot",
      "kind": "mean-bootstrap",
      "sourcePath": "apps/simulation-resampling/src/module-config.ts",
      "description": "Compare true, sample, and bootstrap estimates of mean and standard error.",
      "teachingPoints": [
        "Bootstrap samples reuse the observed data with replacement.",
        "The bootstrap standard error estimates sampling variability."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Generated sample size",
          "type": "number",
          "min": 50,
          "max": 100000,
          "step": 50,
          "defaultValue": 10000
        },
        {
          "id": "replicates",
          "label": "Bootstrap replicates",
          "type": "number",
          "min": 100,
          "max": 10000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    }
  ]
};
