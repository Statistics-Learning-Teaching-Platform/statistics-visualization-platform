import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "simulation-random-variable",
  "repoName": "simulation-random-variable-visualization",
  "title": "Random Variable Generation",
  "subtitle": "Distribution sampling templates from WALS Simulation/RandomVariable.",
  "category": "WALS Simulation",
  "sourcePath": "apps/simulation-random-variable/src",
  "examples": [
    {
      "id": "normal-generation",
      "title": "Example 1: Normal Random Variables",
      "kind": "random-normal",
      "sourcePath": "apps/simulation-random-variable/src/module-config.ts",
      "description": "Generate a normal sample and compare its simulated histogram with the target center.",
      "teachingPoints": [
        "Random generators approximate the target distribution in aggregate.",
        "Mean and spread become visible as sample size increases."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Sample size",
          "type": "number",
          "min": 1,
          "max": 10000,
          "step": 1,
          "defaultValue": 1000
        },
        {
          "id": "mean",
          "label": "Mean",
          "type": "number",
          "min": -5,
          "max": 5,
          "step": 0.5,
          "defaultValue": 0
        },
        {
          "id": "sd",
          "label": "Standard deviation",
          "type": "number",
          "min": 0.2,
          "max": 5,
          "step": 0.1,
          "defaultValue": 1
        }
      ],
      "quickActions": [
        { "type": "bumpControl", "control": "sampleSize", "amount": 1, "copyKey": "addOneSample" },
        { "type": "bumpControl", "control": "sampleSize", "amount": 20, "copyKey": "addTwentySamples" }
      ]
    },
    {
      "id": "exponential-generation",
      "title": "Example 2: Exponential Random Variables",
      "kind": "random-exponential",
      "sourcePath": "apps/simulation-random-variable/src/module-config.ts",
      "description": "Generate exponential data and examine how the rate parameter controls the tail.",
      "teachingPoints": [
        "Inverse transform sampling maps uniform draws into exponential draws.",
        "The exponential mean is the reciprocal of the rate."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Sample size",
          "type": "number",
          "min": 1,
          "max": 10000,
          "step": 1,
          "defaultValue": 1000
        },
        {
          "id": "lambda",
          "label": "Rate lambda",
          "type": "number",
          "min": 0.1,
          "max": 5,
          "step": 0.1,
          "defaultValue": 2
        }
      ],
      "quickActions": [
        { "type": "bumpControl", "control": "sampleSize", "amount": 1, "copyKey": "addOneSample" },
        { "type": "bumpControl", "control": "sampleSize", "amount": 20, "copyKey": "addTwentySamples" }
      ]
    },
    {
      "id": "gamma-rejection",
      "title": "Example 3: Gamma Rejection Sampling",
      "kind": "gamma-rejection",
      "sourcePath": "apps/simulation-random-variable/src/module-config.ts",
      "description": "Sample from a gamma target by accepting uniform proposals with probability proportional to the gamma density.",
      "teachingPoints": [
        "Acceptance-rejection sampling needs an envelope that dominates the target.",
        "The accepted sample follows the target only after the rejection rule is applied."
      ],
      "controls": [
        {
          "id": "sampleSize",
          "label": "Candidate draws",
          "type": "number",
          "min": 1,
          "max": 10000,
          "step": 1,
          "defaultValue": 2000
        },
        {
          "id": "alpha",
          "label": "Gamma alpha",
          "type": "number",
          "min": 0.5,
          "max": 5,
          "step": 0.1,
          "defaultValue": 2
        },
        {
          "id": "beta",
          "label": "Gamma beta",
          "type": "number",
          "min": 0.2,
          "max": 5,
          "step": 0.1,
          "defaultValue": 1
        }
      ],
      "quickActions": [
        { "type": "bumpControl", "control": "sampleSize", "amount": 1, "copyKey": "addOneSample" },
        { "type": "bumpControl", "control": "sampleSize", "amount": 20, "copyKey": "addTwentySamples" }
      ]
    }
  ]
};
