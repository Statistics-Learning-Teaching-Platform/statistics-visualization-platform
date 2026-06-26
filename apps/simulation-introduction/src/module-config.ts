import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "simulation-introduction",
  "repoName": "simulation-introduction-visualization",
  "title": "Simulation Introduction",
  "subtitle": "WALS introductory simulation templates rendered as a React teaching app.",
  "category": "WALS Simulation",
  "sourcePath": "apps/simulation-introduction/src",
  "examples": [
    {
      "id": "pi-circle",
      "title": "Estimation of pi: Drawing a Circle",
      "kind": "pi-circle",
      "sourcePath": "apps/simulation-introduction/src/module-config.ts",
      "description": "Drop random points into a square and estimate pi from the proportion that lands inside the unit circle.",
      "teachingPoints": [
        "Monte Carlo estimators turn geometric areas into frequencies.",
        "The estimate stabilizes as the number of simulated points grows."
      ],
      "controls": [
        {
          "id": "points",
          "label": "Number of points",
          "type": "number",
          "min": 100,
          "max": 10000,
          "step": 100,
          "defaultValue": 1000
        }
      ]
    },
    {
      "id": "buffon-needle",
      "title": "Estimation of pi: Buffon's Needle Experiment",
      "kind": "buffon",
      "sourcePath": "apps/simulation-introduction/src/module-config.ts",
      "description": "Cast needles across parallel lines and estimate pi from the crossing probability.",
      "teachingPoints": [
        "The crossing rate links random angles and distances to pi.",
        "Repeated experiments show convergence and sampling variability."
      ],
      "controls": [
        {
          "id": "planeWidth",
          "label": "Plane width",
          "type": "number",
          "min": 1,
          "max": 10,
          "step": 0.5,
          "defaultValue": 6
        },
        {
          "id": "trials",
          "label": "Trials per experiment",
          "type": "number",
          "min": 100,
          "max": 10000,
          "step": 100,
          "defaultValue": 1000
        },
        {
          "id": "experiments",
          "label": "Experiments",
          "type": "number",
          "min": 1,
          "max": 1000,
          "step": 1,
          "defaultValue": 20
        }
      ]
    }
  ]
};
