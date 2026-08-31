// WALS calculation engine — facade / dispatcher.
//
// The 23 example runners live in domain modules under ./engine/ (monte-carlo,
// samplers, variance-reduction, resampling, mcmc, inference, distributions,
// regression, clt); the shared helpers (num/str/result, ControlMap) live in
// ./engine/internal. This file owns only the `kind` -> runner registry and the
// public API (runExample, generateSampleMeans). Splitting the previous 830-line
// god file by domain changes no behavior — every runner body is unchanged.

import { centralLimitTheorem } from "./engine/clt";
import { distribution } from "./engine/distributions";
import { anova, confidenceInterval } from "./engine/inference";
import { type ControlMap, result } from "./engine/internal";
import { gibbsBivariate, mcmcMixture, politician } from "./engine/mcmc";
import {
  buffon,
  mcIntegralExp,
  mcTransform,
  normalCdfExample,
  piCircle,
} from "./engine/monte-carlo";
import { linearRegressionExample } from "./engine/regression";
import { bootstrapMax, meanBootstrap, permutationMeanDifference } from "./engine/resampling";
import { gammaRejection, randomExponential, randomNormal } from "./engine/samplers";
import {
  antitheticExp,
  antitheticGamma,
  conditionalCircle,
  controlExp,
  controlRatio,
  importancePower,
} from "./engine/variance-reduction";
import type { CityRecord, ExampleConfig, SimulationResult } from "./types";

export { DEFAULT_CLT_SAMPLE_COUNT, generateSampleMeans } from "./engine/clt";

type ExampleRunner = (
  controls: ControlMap,
  seed: number,
  data?: { cities?: CityRecord[] },
  sampleMeans?: number[],
) => SimulationResult;

// One record per example kind — adding a module's computation means adding one
// entry here, not a new switch branch. Each runner accepts the full call shape
// and ignores the arguments it does not need.
const runners: Record<string, ExampleRunner> = {
  "pi-circle": (c, s) => piCircle(c, s),
  buffon: (c, s) => buffon(c, s),
  "random-normal": (c, s) => randomNormal(c, s),
  "random-exponential": (c, s) => randomExponential(c, s),
  "gamma-rejection": (c, s) => gammaRejection(c, s),
  "mc-integral-exp": (c, s) => mcIntegralExp(c, s),
  "mc-transform": (c, s) => mcTransform(c, s),
  "normal-cdf": (c, s) => normalCdfExample(c, s),
  "antithetic-exp": (c, s) => antitheticExp(c, s),
  "antithetic-gamma": (c, s) => antitheticGamma(c, s),
  "control-exp": (c, s) => controlExp(c, s),
  "control-ratio": (c, s) => controlRatio(c, s),
  "importance-power": (c, s) => importancePower(c, s),
  "conditional-circle": (c, s) => conditionalCircle(c, s),
  "bootstrap-max": (c, s) => bootstrapMax(c, s),
  "mean-bootstrap": (c, s) => meanBootstrap(c, s),
  "permutation-mean-difference": (c, s) => permutationMeanDifference(c, s),
  "mcmc-mixture": (c, s) => mcmcMixture(c, s),
  "gibbs-bivariate": (c, s) => gibbsBivariate(c, s),
  politician: (c, s) => politician(c, s),
  anova: (c, s) => anova(c, s),
  "confidence-interval": (c, s) => confidenceInterval(c, s),
  distribution: (c) => distribution(c),
  "linear-regression": (c, s, data) => linearRegressionExample(c, s, data),
  "central-limit-theorem": (c, s, _data, sampleMeans) => centralLimitTheorem(c, s, sampleMeans),
};

export function runExample(
  example: ExampleConfig,
  controls: ControlMap,
  seed: number,
  data?: { cities?: CityRecord[] },
  sampleMeans?: number[],
): SimulationResult {
  const runner = runners[example.kind];
  if (runner) {
    return runner(controls, seed, data, sampleMeans);
  }
  return result(
    "Template pending",
    `No calculation engine has been mapped for ${example.kind}.`,
    [{ label: "source", value: example.sourcePath }],
    {
      type: "bars",
      title: "No data",
      xLabel: "template",
      yLabel: "value",
      bars: [{ label: example.id, value: 1 }],
    },
  );
}
