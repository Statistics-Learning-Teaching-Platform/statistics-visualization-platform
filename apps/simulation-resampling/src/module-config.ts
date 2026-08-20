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
      "id": "nonparametric-bootstrap",
      "title": "Nonparametric Bootstrap",
      "kind": "bootstrap-max",
      "sourcePath": "apps/simulation-resampling/src/module-config.ts",
      "description": "Resample the observed values with replacement and study the bootstrap distribution of the sample maximum.",
      "teachingPoints": [
        "Bootstrap distributions approximate sampling variability from observed data.",
        "The maximum is sensitive to tail behavior and sample size."
      ],
      "controls": [
        {
          "id": "data",
          "label": "Data values",
          "type": "text",
          "maxLength": 4096,
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
          "max": 5000,
          "step": 50,
          "defaultValue": 500
        },
        {
          "id": "replicates",
          "label": "Bootstrap replicates",
          "type": "number",
          "min": 100,
          "max": 5000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "permutation-test",
      "title": "Permutation Test",
      "kind": "permutation-mean-difference",
      "sourcePath": "apps/simulation-resampling/src/module-config.ts",
      "description": "Test a difference in two means by repeatedly shuffling group labels under the null hypothesis.",
      "teachingPoints": [
        "Under the null hypothesis, group labels are exchangeable.",
        "The p value is the proportion of shuffled differences at least as extreme as the observed difference."
      ],
      "controls": [
        {
          "id": "groupSize",
          "label": "Observations per group",
          "type": "number",
          "min": 5,
          "max": 80,
          "step": 1,
          "defaultValue": 20
        },
        {
          "id": "effect",
          "label": "Mean shift in group B",
          "type": "number",
          "min": 0,
          "max": 2,
          "step": 0.1,
          "defaultValue": 0.6
        },
        {
          "id": "replicates",
          "label": "Permutations",
          "type": "number",
          "min": 100,
          "max": 5000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    }
  ]
};
