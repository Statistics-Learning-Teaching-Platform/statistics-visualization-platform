import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "simulation-mcmc",
  "repoName": "simulation-mcmc-visualization",
  "title": "Markov Chain Monte Carlo",
  "subtitle": "MCMC templates from WALS Simulation/MCMC.",
  "category": "WALS Simulation",
  "sourcePath": "apps/simulation-mcmc/src",
  "examples": [
    {
      "id": "mixture-normals",
      "title": "Mixture of Normals",
      "kind": "mcmc-mixture",
      "sourcePath": "apps/simulation-mcmc/src/module-config.ts",
      "description": "Run a Metropolis-Hastings sampler over a two-component normal mixture.",
      "teachingPoints": [
        "The chain accepts or rejects proposals using a target-density ratio.",
        "Burn-in and sample size affect how much of the target surface is explored."
      ],
      "controls": [
        {
          "id": "burnin",
          "label": "Burn-in",
          "type": "number",
          "min": 0,
          "max": 5000,
          "step": 50,
          "defaultValue": 200
        },
        {
          "id": "proposalSd",
          "label": "Proposal step size",
          "type": "number",
          "min": 0.1,
          "max": 4,
          "step": 0.1,
          "defaultValue": 1
        },
        {
          "id": "sampleSize",
          "label": "Number of samples",
          "type": "number",
          "min": 50,
          "max": 5000,
          "step": 50,
          "defaultValue": 400
        }
      ]
    },
    {
      "id": "gibbs-bivariate",
      "title": "Gibbs Sampling",
      "kind": "gibbs-bivariate",
      "sourcePath": "apps/simulation-mcmc/src/module-config.ts",
      "description": "Sample a correlated bivariate normal by alternating between the two conditional distributions.",
      "teachingPoints": [
        "A Gibbs sweep changes one coordinate while holding the other coordinate fixed.",
        "Stronger correlation produces slower movement along the narrow direction of the target."
      ],
      "controls": [
        {
          "id": "correlation",
          "label": "Target correlation",
          "type": "number",
          "min": -0.95,
          "max": 0.95,
          "step": 0.05,
          "defaultValue": 0.8
        },
        {
          "id": "burnin",
          "label": "Burn-in sweeps",
          "type": "number",
          "min": 0,
          "max": 2000,
          "step": 50,
          "defaultValue": 100
        },
        {
          "id": "sampleSize",
          "label": "Retained sweeps",
          "type": "number",
          "min": 50,
          "max": 5000,
          "step": 50,
          "defaultValue": 400
        }
      ]
    },
    {
      "id": "politician-stumble",
      "title": "Politician's Stumble Case Study",
      "kind": "politician",
      "sourcePath": "apps/simulation-mcmc/src/module-config.ts",
      "description": "Simulate a simple Metropolis walk over islands with unequal populations.",
      "teachingPoints": [
        "Stationary visit frequency is shaped by the acceptance rule.",
        "Visit frequencies converge toward the population-weighted target distribution."
      ],
      "controls": [
        {
          "id": "steps",
          "label": "Number of steps",
          "type": "number",
          "min": 1000,
          "max": 20000,
          "step": 500,
          "defaultValue": 5000
        }
      ]
    }
  ]
};
