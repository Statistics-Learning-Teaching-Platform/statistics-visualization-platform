import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  id: "simulation-clt",
  repoName: "simulation-clt-visualization",
  title: "Central Limit Theorem",
  subtitle:
    "Build the sampling distribution of sample means and compare it with the normal approximation.",
  category: "WALS Simulation",
  sourcePath: "apps/simulation-clt/src",
  examples: [
    {
      id: "clt-lab",
      title: "Sampling Means Lab",
      kind: "central-limit-theorem",
      sourcePath: "apps/simulation-clt/src/module-config.ts",
      description:
        "Repeatedly draw samples from a population, compute each sample mean, and watch those means form a sampling distribution.",
      teachingPoints: [
        "The population can be skewed or uneven while the sample means become more bell-shaped.",
        "Larger sample sizes make sample means less variable.",
        "The observed SD of sample means should move toward the standard error sigma / sqrt(n)."
      ],
      controls: [
        {
          id: "populationShape",
          label: "Population shape",
          type: "select",
          defaultValue: "exponential",
          options: [
            { value: "normal", label: "Normal" },
            { value: "uniform", label: "Uniform" },
            { value: "exponential", label: "Exponential" },
            { value: "skewed", label: "Right-skewed" },
            { value: "bimodal", label: "Bimodal" }
          ]
        },
        {
          id: "sampleSize",
          label: "Sample size n",
          type: "number",
          min: 1,
          max: 200,
          step: 1,
          defaultValue: 5
        }
      ],
      accumulateSampleMeans: true,
      quickActions: [
        { type: "drawSampleMeans", amount: 1, copyKey: "draw1Sample" },
        { type: "drawSampleMeans", amount: 20, copyKey: "draw20Samples" }
      ]
    }
  ]
};
