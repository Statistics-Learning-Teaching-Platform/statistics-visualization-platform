import { describe, expect, it } from "vitest";
import { createState } from "../apps/shared/wals/WalsApp";
import { moduleConfig as cltConfig } from "../apps/simulation-clt/src/module-config";
import { moduleConfig as anovaConfig } from "../apps/mes-anova/src/module-config";
import { moduleConfig as mesConfidenceConfig } from "../apps/mes-confidence-interval/src/module-config";
import { moduleConfig as distributionsConfig } from "../apps/mes-distributions/src/module-config";
import { moduleConfig as mesRegressionConfig } from "../apps/mes-linear-regression/src/module-config";
import { moduleConfig as introductionConfig } from "../apps/simulation-introduction/src/module-config";
import { moduleConfig as mcmcConfig } from "../apps/simulation-mcmc/src/module-config";
import { moduleConfig as randomVariableConfig } from "../apps/simulation-random-variable/src/module-config";
import { moduleConfig as resamplingConfig } from "../apps/simulation-resampling/src/module-config";
import { moduleConfig as varianceReductionConfig } from "../apps/simulation-variance-reduction/src/module-config";

const allowedLatinWords = new Set([
  "ANOVA",
  "CDF",
  "CMF",
  "GDP",
  "Gamma",
  "MCMC",
  "MES",
  "PDF",
  "PMF",
  "Phi",
  "React",
  "SSE",
  "WALS",
  "exp",
  "int",
  "sigma",
  "sqrt"
]);

function collectStrings(value: unknown, strings: string[] = []): string[] {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, strings));
    return strings;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectStrings(entry, strings));
  }

  return strings;
}

function collectVisibleStateStrings(state: any): string[] {
  const strings: string[] = [];

  collectStrings(
    {
      category: state.config.category,
      title: state.config.title,
      subtitle: state.config.subtitle,
      examples: state.config.examples.map((example: any) => ({
        title: example.title,
        description: example.description,
        teachingPoints: example.teachingPoints,
        controls: example.controls.map((control: any) => ({
          label: control.label,
          options: control.options?.map((option: any) => option.label)
        }))
      })),
      activeExample: {
        title: state.activeExample.title,
        description: state.activeExample.description,
        teachingPoints: state.activeExample.teachingPoints,
        controls: state.activeExample.controls.map((control: any) => ({
          label: control.label,
          options: control.options?.map((option: any) => option.label)
        }))
      },
      result: {
        headline: state.result.headline,
        narrative: state.result.narrative,
        metrics: state.result.metrics,
        chart: {
          title: state.result.chart.title,
          xLabel: state.result.chart.xLabel,
          yLabel: state.result.chart.yLabel,
          populationTitle: state.result.chart.populationTitle,
          samplingTitle: state.result.chart.samplingTitle,
          bars: state.result.chart.bars?.map((bar: any) => bar.label),
          populationBars: state.result.chart.populationBars?.map((bar: any) => bar.label),
          sampleMeanBars: state.result.chart.sampleMeanBars?.map((bar: any) => bar.label),
          intervals: state.result.chart.intervals?.map((interval: any) => interval.label),
          series: state.result.chart.series?.map((series: any) => series.label),
          points: state.result.chart.points?.map((point: any) => point.label),
          line: state.result.chart.line?.label
        },
        tableColumns: state.result.table?.columns
      }
    },
    strings
  );

  return strings;
}

function unexpectedLatin(text: string): boolean {
  const matches = text.match(/\b[A-Za-z]{3,}\b/g) ?? [];
  return matches.some((word) => !allowedLatinWords.has(word));
}

describe("template modules Chinese completeness", () => {
  it("does not leave visible template module copy in English", () => {
    const states = [
      createState(introductionConfig, undefined, undefined, 510, "zh"),
      createState(randomVariableConfig, undefined, undefined, 510, "zh"),
      createState(cltConfig, undefined, undefined, 510, "zh"),
      createState(varianceReductionConfig, undefined, undefined, 510, "zh"),
      createState(resamplingConfig, undefined, undefined, 510, "zh"),
      createState(mcmcConfig, undefined, undefined, 510, "zh"),
      createState(anovaConfig, undefined, undefined, 510, "zh"),
      createState(mesConfidenceConfig, undefined, undefined, 510, "zh"),
      createState(distributionsConfig, undefined, undefined, 510, "zh"),
      createState(mesRegressionConfig, undefined, undefined, 510, "zh")
    ];

    const leftovers = [...new Set(states.flatMap((state) => collectVisibleStateStrings(state)).filter(unexpectedLatin))];

    expect(leftovers).toEqual([]);
  });
});
