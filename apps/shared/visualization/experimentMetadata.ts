import type { Language } from "../i18n";

/** UI-only metadata for the laboratory shell. Numerical engines and route ids
 * remain unchanged; this table answers the learner's four orientation
 * questions without coupling presentation to calculation code. */
export interface ExperimentMetadata {
  number: number;
  category: { zh: string; en: string };
  researchQuestion: { zh: string; en: string };
  interaction: "live" | "stochastic";
}

export const experimentMetadata: Record<string, ExperimentMetadata> = {
  "mes-distributions": { number: 1, category: { zh: "统计基本原理", en: "Statistical foundations" }, researchQuestion: { zh: "分布参数如何改变随机变量的形状、位置、离散程度以及区间概率？", en: "How do distribution parameters change shape, location, spread, and interval probability?" }, interaction: "live" },
  "simulation-random-variable": { number: 2, category: { zh: "统计模拟", en: "Statistical simulation" }, researchQuestion: { zh: "随机样本为什么每次不同？样本量增加时统计量如何变化？", en: "Why does every random sample differ, and how do statistics change as sample size grows?" }, interaction: "stochastic" },
  "simulation-clt": { number: 3, category: { zh: "统计基本原理", en: "Statistical foundations" }, researchQuestion: { zh: "为什么非正态总体的样本均值也可能逐渐呈现正态分布？", en: "Why can sample means become approximately normal even when the population is not?" }, interaction: "stochastic" },
  "confidence-interval": { number: 4, category: { zh: "统计推断", en: "Statistical inference" }, researchQuestion: { zh: "95% 置信到底意味着什么？", en: "What does 95% confidence actually mean?" }, interaction: "stochastic" },
  "mes-confidence-interval": { number: 5, category: { zh: "统计推断", en: "Statistical inference" }, researchQuestion: { zh: "样本量、置信水平和 σ 是否已知如何影响区间宽度与覆盖表现？", en: "How do sample size, confidence level, and known σ affect interval width and coverage?" }, interaction: "stochastic" },
  "type-error": { number: 6, category: { zh: "统计推断", en: "Statistical inference" }, researchQuestion: { zh: "α、效应大小和样本量如何共同影响错误概率与检验功效？", en: "How do α, effect size, and sample size jointly affect error probabilities and power?" }, interaction: "live" },
  "mes-anova": { number: 7, category: { zh: "统计推断", en: "Statistical inference" }, researchQuestion: { zh: "ANOVA 为什么比较组间差异与组内波动？", en: "Why does ANOVA compare between-group differences with within-group variation?" }, interaction: "stochastic" },
  regression: { number: 8, category: { zh: "统计基本原理", en: "Statistical foundations" }, researchQuestion: { zh: "怎样的直线才算更好地拟合数据？", en: "What makes one line a better fit to the data than another?" }, interaction: "live" },
  "mes-linear-regression": { number: 9, category: { zh: "应用回归", en: "Applied regression" }, researchQuestion: { zh: "变量选择和高杠杆城市如何影响真实回归模型？", en: "How do predictor choices and high-leverage cities affect a fitted regression model?" }, interaction: "live" },
  "simulation-introduction": { number: 10, category: { zh: "统计模拟", en: "Statistical simulation" }, researchQuestion: { zh: "怎样利用随机试验估计一个无法直接观察的量？", en: "How can random trials estimate a quantity that is difficult to observe directly?" }, interaction: "stochastic" },
  "simulation-resampling": { number: 11, category: { zh: "统计模拟", en: "Statistical simulation" }, researchQuestion: { zh: "只有一个样本时，如何近似统计量的抽样分布？", en: "With only one sample, how can we approximate a statistic's sampling distribution?" }, interaction: "stochastic" },
  "simulation-mcmc": { number: 12, category: { zh: "统计模拟", en: "Statistical simulation" }, researchQuestion: { zh: "马尔可夫链如何逐步探索复杂目标分布？", en: "How does a Markov chain gradually explore a complex target distribution?" }, interaction: "stochastic" },
  "simulation-variance-reduction": { number: 13, category: { zh: "统计模拟", en: "Statistical simulation" }, researchQuestion: { zh: "怎样通过更合理的抽样方法降低 Monte Carlo 估计的不确定性？", en: "How can better sampling reduce uncertainty in a Monte Carlo estimate?" }, interaction: "stochastic" },
};

export function getExperimentMetadata(id: string): ExperimentMetadata | undefined {
  return experimentMetadata[id];
}

export function localizedExperimentMetadata(id: string, language: Language) {
  const metadata = getExperimentMetadata(id);
  if (!metadata) return undefined;
  return { ...metadata, localizedCategory: metadata.category[language], localizedQuestion: metadata.researchQuestion[language] };
}
