import { chapterManifests, courseManifests } from "./courseManifest";
import type { ActivityManifest, CourseCatalog, LocalizedText, TopicManifest } from "./types";

const text = (zh: string, en: string): LocalizedText => ({ zh, en });

type TopicLinks = Pick<
  TopicManifest,
  "activityIds" | "rLessonIds" | "pythonLessonIds" | "questionTags"
> & {
  misconceptions?: LocalizedText[];
};

function topic(
  id: string,
  chapterId: string,
  order: number,
  title: LocalizedText,
  summary: LocalizedText,
  prerequisites: string[] = [],
  links: Partial<TopicLinks> = {},
): TopicManifest {
  return {
    id,
    chapterId,
    order,
    title,
    summary,
    learningObjectives: [summary],
    prerequisites,
    misconceptions: links.misconceptions ?? [],
    formulaIds: [],
    activityIds: links.activityIds ?? [],
    rLessonIds: links.rLessonIds ?? [],
    pythonLessonIds: links.pythonLessonIds ?? [],
    questionTags: links.questionTags ?? [id],
    reviewStatus: "draft",
  };
}

export const topicManifests: TopicManifest[] = [
  topic(
    "statistics-foundations",
    "statistics-introduction",
    1,
    text("统计问题与证据", "Statistical questions and evidence"),
    text(
      "区分总体、样本、参数、统计量以及描述与推断。",
      "Distinguish populations, samples, parameters, statistics, description, and inference.",
    ),
    [],
    { rLessonIds: ["r-ecosystem"], pythonLessonIds: ["environment-and-notebooks"] },
  ),
  topic(
    "data-and-variables",
    "data-and-sampling",
    1,
    text("数据与变量", "Data and variables"),
    text(
      "识别观测单位、变量类型与常见数据结构。",
      "Identify observational units, variable types, and common data structures.",
    ),
    ["statistics-foundations"],
    {
      rLessonIds: ["data-frame-filter", "r-data-import", "r-delimited-import"],
      pythonLessonIds: ["pandas-filter-summary"],
    },
  ),
  topic(
    "sampling-methods",
    "data-and-sampling",
    2,
    text("抽样方法", "Sampling methods"),
    text(
      "比较随机抽样、分层抽样、整群抽样与潜在偏差。",
      "Compare random, stratified, and cluster sampling and their possible biases.",
    ),
    ["data-and-variables"],
    { rLessonIds: ["r-sampling-designs"], pythonLessonIds: ["sampling-designs"] },
  ),
  topic(
    "visual-encoding",
    "data-visualization",
    1,
    text("视觉编码", "Visual encoding"),
    text(
      "用位置、长度、面积和颜色准确表达数据。",
      "Represent data accurately with position, length, area, and colour.",
    ),
    ["data-and-variables"],
    {
      rLessonIds: ["r-stem-leaf", "r-barplot-categorical", "r-grouped-mean-barplot"],
      pythonLessonIds: ["chart-selection", "grouped-visualization"],
    },
  ),
  topic(
    "histograms",
    "data-visualization",
    2,
    text("直方图与分布形状", "Histograms and distribution shape"),
    text(
      "用分箱后的频数或密度识别分布的中心、离散与形状。",
      "Use binned counts or densities to identify a distribution's centre, spread, and shape.",
    ),
    ["visual-encoding"],
    { rLessonIds: ["first-histogram"], pythonLessonIds: ["matplotlib-distribution"] },
  ),
  topic(
    "descriptive-statistics",
    "descriptive-statistics",
    1,
    text("中心与离散", "Centre and spread"),
    text(
      "计算并解释均值、中位数、方差、标准差与四分位距。",
      "Calculate and interpret means, medians, variances, standard deviations, and interquartile ranges.",
    ),
    ["data-and-variables"],
    {
      rLessonIds: [
        "vectors-and-mean",
        "summary-and-boxplot",
        "r-missing-summary",
        "r-boxplot-outliers",
      ],
      pythonLessonIds: ["lists-and-mean", "percentiles-and-outliers", "weighted-average"],
    },
  ),
  topic(
    "standardization",
    "descriptive-statistics",
    2,
    text("标准化", "Standardization"),
    text(
      "用标准分数比较不同尺度上的观测。",
      "Use standard scores to compare observations measured on different scales.",
    ),
    ["descriptive-statistics"],
    { pythonLessonIds: ["functions-and-comprehensions"] },
  ),
  topic(
    "probability-foundations",
    "probability-and-random-variables",
    1,
    text("概率基础", "Probability foundations"),
    text(
      "用事件、条件概率与独立性描述不确定性。",
      "Describe uncertainty with events, conditional probability, and independence.",
    ),
    ["statistics-foundations"],
    {
      rLessonIds: ["r-probability-events"],
      pythonLessonIds: ["conditional-probability-bayes", "probability-events"],
    },
  ),
  topic(
    "random-variables",
    "probability-and-random-variables",
    2,
    text("随机变量", "Random variables"),
    text(
      "把随机试验结果映射为可分析的数值变量。",
      "Map random outcomes to numerical variables that can be analysed.",
    ),
    ["probability-foundations"],
    {
      activityIds: ["visualize-random-variables"],
      rLessonIds: ["r-random-variable-summary"],
      pythonLessonIds: ["random-variable-summary"],
    },
  ),
  topic(
    "probability-distributions",
    "probability-distributions",
    1,
    text("概率分布", "Probability distributions"),
    text(
      "比较离散分布的 PMF 与连续分布的 PDF。",
      "Compare PMFs for discrete distributions with PDFs for continuous distributions.",
    ),
    ["random-variables"],
    {
      activityIds: ["compare-probability-distributions"],
      pythonLessonIds: [
        "distribution-probabilities",
        "normal-uniform-exponential",
        "discrete-distribution-models",
      ],
    },
  ),
  topic(
    "normal-distribution",
    "probability-distributions",
    2,
    text("正态分布", "Normal distribution"),
    text(
      "解释均值如何移动曲线、标准差如何改变曲线的离散程度。",
      "Explain how the mean shifts a curve and the standard deviation changes its spread.",
    ),
    ["probability-distributions"],
    {
      activityIds: ["normal-distribution-comparison"],
      rLessonIds: ["qq-normality"],
      pythonLessonIds: ["normality-qq-plot"],
      misconceptions: [
        text(
          "改变均值或标准差时，不应为每条曲线重新设定坐标轴。",
          "The axes should not be recentered separately when the mean or standard deviation changes.",
        ),
      ],
    },
  ),
  topic(
    "t-distribution",
    "probability-distributions",
    3,
    text("t 分布", "t distribution"),
    text(
      "理解自由度如何影响 t 分布尾部以及它与正态分布的关系。",
      "Understand how degrees of freedom affect the tails of a t distribution and its relation to the normal distribution.",
    ),
    ["normal-distribution"],
    { rLessonIds: ["r-t-distribution-quantiles"], pythonLessonIds: ["t-distribution-quantiles"] },
  ),
  topic(
    "sampling-distributions",
    "central-limit-theorem",
    1,
    text("抽样分布", "Sampling distributions"),
    text(
      "区分一次样本中的观测与重复抽样得到的统计量。",
      "Distinguish observations in one sample from statistics obtained through repeated sampling.",
    ),
    ["probability-distributions"],
    { rLessonIds: ["r-sampling-distribution"], pythonLessonIds: ["sampling-distribution-sim"] },
  ),
  topic(
    "central-limit-theorem",
    "central-limit-theorem",
    2,
    text("中心极限定理", "Central limit theorem"),
    text(
      "比较总体分布与不同样本量下样本均值的抽样分布。",
      "Compare a population distribution with sampling distributions of the mean at different sample sizes.",
    ),
    ["sampling-distributions", "normal-distribution"],
    {
      activityIds: [
        "explore-central-limit-theorem",
        "r-lab-sampling-simulation",
        "python-lab-sampling-simulation",
      ],
      rLessonIds: ["sampling-simulation"],
      pythonLessonIds: ["sampling-simulation"],
      misconceptions: [
        text(
          "样本量 n 与重复抽样次数 N 不是同一个量。",
          "Sample size n and the number of repeated samples N are not the same quantity.",
        ),
      ],
    },
  ),
  topic(
    "point-estimation",
    "parameter-estimation",
    1,
    text("点估计", "Point estimation"),
    text(
      "用样本统计量估计总体参数并讨论偏差与标准误。",
      "Use sample statistics to estimate population parameters and discuss bias and standard error.",
    ),
    ["sampling-distributions"],
  ),
  topic(
    "confidence-interval",
    "parameter-estimation",
    2,
    text("置信区间", "Confidence intervals"),
    text(
      "通过重复抽样理解区间估计的置信水平与覆盖率。",
      "Use repeated sampling to understand confidence level and interval coverage.",
    ),
    ["point-estimation", "central-limit-theorem"],
    {
      activityIds: [
        "confidence-interval-coverage",
        "confidence-interval-case-study",
        "r-lab-mean-confidence-interval",
        "python-lab-mean-confidence-interval",
      ],
      rLessonIds: ["mean-confidence-interval", "r-t-interval-manual"],
      pythonLessonIds: [
        "mean-confidence-interval",
        "sample-size-planning",
        "proportion-confidence-interval",
      ],
      misconceptions: [
        text(
          "95% 置信度不是指已计算出的区间有 95% 概率包含固定参数。",
          "A 95% confidence level does not assign a 95% probability to a fixed parameter lying in an already computed interval.",
        ),
      ],
    },
  ),
  topic(
    "hypothesis-testing",
    "hypothesis-testing",
    1,
    text("假设检验", "Hypothesis testing"),
    text(
      "统一解释原假设、备择假设、拒绝域、p 值与显著性水平。",
      "Interpret null and alternative hypotheses, rejection regions, p-values, and significance levels together.",
    ),
    ["confidence-interval", "t-distribution"],
    {
      activityIds: ["r-lab-one-sample-t-test", "python-lab-one-sample-t-test"],
      rLessonIds: ["one-sample-t-test", "two-sample-t-test", "r-paired-t-test"],
      pythonLessonIds: ["one-sample-t-test", "two-sample-tests", "z-tests", "paired-test"],
      misconceptions: [
        text(
          "p 值不是原假设为真的概率。",
          "A p-value is not the probability that the null hypothesis is true.",
        ),
      ],
    },
  ),
  topic(
    "type-i-type-ii-errors",
    "hypothesis-testing",
    2,
    text("一类错误、二类错误与功效", "Type I and II errors and power"),
    text(
      "研究显著性水平、效应大小、样本量与检验功效的关系。",
      "Study how significance level, effect size, and sample size relate to test power.",
    ),
    ["hypothesis-testing"],
    { activityIds: ["explore-testing-errors"] },
  ),
  topic(
    "anova",
    "hypothesis-testing",
    3,
    text("方差分析", "Analysis of variance"),
    text(
      "用组间与组内变异比较多个总体均值。",
      "Compare multiple population means through between- and within-group variation.",
    ),
    ["hypothesis-testing"],
    {
      activityIds: ["explore-anova"],
      rLessonIds: ["one-way-anova", "r-grouped-barplot", "r-stepwise-anova", "r-anova-posthoc"],
      pythonLessonIds: ["one-way-anova", "anova-posthoc"],
    },
  ),
  topic(
    "correlation",
    "regression-analysis",
    1,
    text("相关", "Correlation"),
    text(
      "描述两个定量变量线性关系的方向与强度。",
      "Describe the direction and strength of a linear relationship between quantitative variables.",
    ),
    ["descriptive-statistics", "visual-encoding"],
    { rLessonIds: ["correlation-test"], pythonLessonIds: ["spearman-correlation"] },
  ),
  topic(
    "linear-regression",
    "regression-analysis",
    2,
    text("一元线性回归", "Simple linear regression"),
    text(
      "拟合、解释并诊断一元线性回归模型。",
      "Fit, interpret, and diagnose a simple linear regression model.",
    ),
    ["correlation", "hypothesis-testing"],
    {
      activityIds: [
        "draw-regression-line",
        "linear-regression-city-case",
        "r-lab-linear-regression",
        "python-lab-linear-regression",
      ],
      rLessonIds: [
        "linear-regression",
        "r-multiple-regression",
        "r-regression-anova",
        "r-stepwise-selection",
        "r-regression-anova-manual",
        "r-stepwise-directions",
      ],
      pythonLessonIds: [
        "linear-regression",
        "multiple-regression-diagnostics",
        "polynomial-regression",
        "regression-model-comparison",
      ],
    },
  ),
  topic(
    "categorical-data",
    "categorical-data",
    1,
    text("分类数据", "Categorical data"),
    text(
      "用频数、比例与列联表汇总分类变量。",
      "Summarize categorical variables with counts, proportions, and contingency tables.",
    ),
    ["data-and-variables"],
  ),
  topic(
    "chi-square-test",
    "categorical-data",
    2,
    text("卡方检验", "Chi-square tests"),
    text(
      "比较观察频数与原假设下的期望频数。",
      "Compare observed counts with expected counts under a null hypothesis.",
    ),
    ["categorical-data", "hypothesis-testing"],
    {
      rLessonIds: ["chi-square-contingency", "r-chi-square-goodness-fit"],
      pythonLessonIds: ["chi-square-contingency", "chi-square-goodness-fit"],
    },
  ),
  topic(
    "nonparametric-tests",
    "nonparametric-tests",
    1,
    text("非参数检验", "Nonparametric tests"),
    text(
      "在分布假设不合适时使用秩、符号与随机化方法。",
      "Use ranks, signs, and randomization when distributional assumptions are unsuitable.",
    ),
    ["hypothesis-testing"],
    {
      rLessonIds: ["r-nonparametric-ranks"],
      pythonLessonIds: ["nonparametric-tests", "wilcoxon-signed-rank", "kruskal-wallis"],
    },
  ),
  topic(
    "time-series",
    "time-series",
    1,
    text("时间序列基础", "Time-series foundations"),
    text(
      "分解并解释趋势、季节性、周期与随机波动。",
      "Decompose and interpret trend, seasonality, cycles, and random variation.",
    ),
    ["descriptive-statistics"],
    {
      rLessonIds: ["time-series-rolling"],
      pythonLessonIds: [
        "time-series-forecasting",
        "forecast-error-metrics",
        "time-series-decomposition",
        "exponential-smoothing",
      ],
    },
  ),
  topic(
    "simulation-foundations",
    "simulation-laboratory",
    1,
    text("模拟基础", "Simulation foundations"),
    text(
      "设计可复现的伪随机计算实验并量化 Monte Carlo 误差。",
      "Design reproducible pseudorandom experiments and quantify Monte Carlo error.",
    ),
    ["probability-foundations"],
    { activityIds: ["introduce-statistical-simulation"] },
  ),
  topic(
    "monte-carlo",
    "simulation-laboratory",
    2,
    text("Monte Carlo", "Monte Carlo"),
    text(
      "用随机样本近似期望、概率与积分。",
      "Approximate expectations, probabilities, and integrals with random samples.",
    ),
    ["simulation-foundations"],
  ),
  topic(
    "bootstrap-and-permutation",
    "simulation-laboratory",
    3,
    text("Bootstrap 与置换检验", "Bootstrap and permutation tests"),
    text(
      "用重抽样估计不确定性并构造随机化检验。",
      "Use resampling to estimate uncertainty and construct randomization tests.",
    ),
    ["simulation-foundations", "sampling-distributions"],
    { activityIds: ["explore-resampling"] },
  ),
  topic(
    "mcmc",
    "simulation-laboratory",
    4,
    text("MCMC", "MCMC"),
    text(
      "用马尔可夫链从复杂目标分布中抽样并评价收敛。",
      "Sample from complex target distributions with Markov chains and assess convergence.",
    ),
    ["monte-carlo"],
    { activityIds: ["explore-mcmc"] },
  ),
  topic(
    "gibbs-sampling",
    "simulation-laboratory",
    5,
    text("Gibbs Sampling", "Gibbs sampling"),
    text(
      "通过条件分布交替更新多维状态。",
      "Update a multivariate state through alternating conditional distributions.",
    ),
    ["mcmc"],
  ),
  topic(
    "metropolis-hastings",
    "simulation-laboratory",
    6,
    text("Metropolis-Hastings", "Metropolis-Hastings"),
    text(
      "用提议分布与接受概率构造平稳马尔可夫链。",
      "Build a stationary Markov chain with proposals and acceptance probabilities.",
    ),
    ["mcmc"],
  ),
  topic(
    "importance-sampling",
    "simulation-laboratory",
    7,
    text("重要性抽样", "Importance sampling"),
    text(
      "通过加权提议样本估计难以直接抽样的目标量。",
      "Estimate targets that are difficult to sample directly using weighted proposal samples.",
    ),
    ["monte-carlo"],
  ),
  topic(
    "sequential-monte-carlo",
    "simulation-laboratory",
    8,
    text("Sequential Monte Carlo", "Sequential Monte Carlo"),
    text(
      "通过逐步加权、重抽样与传播逼近演化中的分布。",
      "Approximate evolving distributions through sequential weighting, resampling, and propagation.",
    ),
    ["importance-sampling", "bootstrap-and-permutation"],
  ),
  topic(
    "variance-reduction",
    "simulation-laboratory",
    9,
    text("方差缩减", "Variance reduction"),
    text(
      "使用对偶变量、控制变量等方法提高模拟估计效率。",
      "Improve simulation efficiency with antithetic variates, control variates, and related methods.",
    ),
    ["monte-carlo"],
    { activityIds: ["explore-variance-reduction"] },
  ),
];

export const activityManifests: ActivityManifest[] = [
  {
    id: "compare-probability-distributions",
    topicId: "probability-distributions",
    type: "visualization",
    appId: "mes-distributions",
    title: text("分布比较实验", "Distribution comparison"),
    order: 1,
  },
  {
    id: "normal-distribution-comparison",
    topicId: "normal-distribution",
    type: "visualization",
    appId: "mes-distributions",
    title: text("正态曲线比较实验", "Normal-curve comparison"),
    order: 1,
  },
  {
    id: "visualize-random-variables",
    topicId: "random-variables",
    type: "visualization",
    appId: "simulation-random-variable",
    title: text("随机变量实验", "Random-variable experiment"),
    order: 1,
  },
  {
    id: "explore-central-limit-theorem",
    topicId: "central-limit-theorem",
    type: "visualization",
    appId: "simulation-clt",
    title: text("中心极限定理实验", "Central limit theorem experiment"),
    order: 1,
  },
  {
    id: "confidence-interval-coverage",
    topicId: "confidence-interval",
    type: "visualization",
    appId: "confidence-interval",
    title: text("置信区间覆盖实验", "Confidence-interval coverage experiment"),
    order: 1,
  },
  {
    id: "confidence-interval-case-study",
    topicId: "confidence-interval",
    type: "visualization",
    appId: "mes-confidence-interval",
    title: text("置信区间案例实验", "Confidence-interval case study"),
    order: 2,
  },
  {
    id: "r-lab-mean-confidence-interval",
    topicId: "confidence-interval",
    type: "r-lab",
    lessonId: "mean-confidence-interval",
    title: text("用 R 构造均值置信区间", "Build a mean confidence interval in R"),
    order: 3,
  },
  {
    id: "python-lab-mean-confidence-interval",
    topicId: "confidence-interval",
    type: "python-lab",
    lessonId: "mean-confidence-interval",
    title: text("用 Python 构造均值置信区间", "Build a mean confidence interval in Python"),
    order: 4,
  },
  {
    id: "explore-testing-errors",
    topicId: "type-i-type-ii-errors",
    type: "visualization",
    appId: "type-error",
    title: text("两类错误与功效实验", "Testing errors and power experiment"),
    order: 1,
  },
  {
    id: "explore-anova",
    topicId: "anova",
    type: "visualization",
    appId: "mes-anova",
    title: text("方差分析实验", "ANOVA experiment"),
    order: 1,
  },
  {
    id: "draw-regression-line",
    topicId: "linear-regression",
    type: "visualization",
    appId: "regression",
    title: text("回归线基础实验", "Regression-line foundations"),
    order: 1,
  },
  {
    id: "linear-regression-city-case",
    topicId: "linear-regression",
    type: "visualization",
    appId: "mes-linear-regression",
    title: text("城市回归案例", "Urban regression case study"),
    order: 2,
  },
  {
    id: "introduce-statistical-simulation",
    topicId: "simulation-foundations",
    type: "visualization",
    appId: "simulation-introduction",
    title: text("统计模拟导论", "Introduction to statistical simulation"),
    order: 1,
  },
  {
    id: "explore-resampling",
    topicId: "bootstrap-and-permutation",
    type: "visualization",
    appId: "simulation-resampling",
    title: text("重抽样实验", "Resampling experiment"),
    order: 1,
  },
  {
    id: "explore-mcmc",
    topicId: "mcmc",
    type: "visualization",
    appId: "simulation-mcmc",
    title: text("MCMC 实验", "MCMC experiment"),
    order: 1,
  },
  {
    id: "explore-variance-reduction",
    topicId: "variance-reduction",
    type: "visualization",
    appId: "simulation-variance-reduction",
    title: text("方差缩减实验", "Variance-reduction experiment"),
    order: 1,
  },
  {
    id: "r-lab-sampling-simulation",
    topicId: "central-limit-theorem",
    type: "r-lab",
    lessonId: "sampling-simulation",
    title: text("用 R 模拟抽样分布", "Simulate a sampling distribution in R"),
    order: 2,
  },
  {
    id: "python-lab-sampling-simulation",
    topicId: "central-limit-theorem",
    type: "python-lab",
    lessonId: "sampling-simulation",
    title: text("用 Python 模拟抽样分布", "Simulate a sampling distribution in Python"),
    order: 3,
  },
  {
    id: "r-lab-one-sample-t-test",
    topicId: "hypothesis-testing",
    type: "r-lab",
    lessonId: "one-sample-t-test",
    title: text("用 R 完成单样本 t 检验", "Run a one-sample t test in R"),
    order: 1,
  },
  {
    id: "python-lab-one-sample-t-test",
    topicId: "hypothesis-testing",
    type: "python-lab",
    lessonId: "one-sample-t-test",
    title: text("用 Python 完成单样本 t 检验", "Run a one-sample t test in Python"),
    order: 2,
  },
  {
    id: "r-lab-linear-regression",
    topicId: "linear-regression",
    type: "r-lab",
    lessonId: "linear-regression",
    title: text("用 R 拟合线性回归", "Fit linear regression in R"),
    order: 3,
  },
  {
    id: "python-lab-linear-regression",
    topicId: "linear-regression",
    type: "python-lab",
    lessonId: "linear-regression",
    title: text("用 Python 拟合线性回归", "Fit linear regression in Python"),
    order: 4,
  },
];

export const topicRegistry: Readonly<Record<string, TopicManifest>> = Object.fromEntries(
  topicManifests.map((entry) => [entry.id, entry]),
);

export const courseCatalog: CourseCatalog = {
  courses: courseManifests,
  chapters: chapterManifests,
  topics: topicManifests,
  activities: activityManifests,
};

export function getTopicById(topicId: string): TopicManifest | undefined {
  return topicRegistry[topicId];
}
