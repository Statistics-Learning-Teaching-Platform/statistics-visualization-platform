export const topicLabels: Readonly<Record<string, string>> = {
  "statistics-foundations": "统计学基础",
  "data-and-variables": "数据与变量",
  "sampling-methods": "抽样方法",
  "visual-encoding": "数据可视化",
  histograms: "直方图与分布形状",
  "descriptive-statistics": "描述统计",
  standardization: "标准化与 z 分数",
  "probability-foundations": "概率基础",
  "random-variables": "随机变量",
  "probability-distributions": "概率分布",
  "normal-distribution": "正态分布",
  "t-distribution": "t 分布",
  "sampling-distributions": "抽样分布",
  "central-limit-theorem": "中心极限定理",
  "point-estimation": "点估计",
  "confidence-interval": "置信区间",
  "hypothesis-testing": "假设检验",
  "type-i-type-ii-errors": "一类/二类错误",
  correlation: "相关分析",
  "linear-regression": "线性回归",
  "categorical-data": "分类数据",
  "time-series": "时间序列",
};

const chapterFallbacks: Readonly<Record<string, string[]>> = {
  Ch01: ["statistics-foundations"], Ch02: ["descriptive-statistics"], Ch03: ["probability-foundations"],
  Ch04: ["probability-foundations"], Ch05: ["probability-distributions"], Ch06: ["sampling-distributions"],
  Ch07: ["point-estimation"], Ch08: ["hypothesis-testing"], Ch09: ["hypothesis-testing"],
  Ch10: ["hypothesis-testing"], Ch11: ["correlation"], Ch12: ["time-series"], Ch13: ["linear-regression"],
};

const keywordMatchers: ReadonlyArray<[RegExp, string[]]> = [
  [/type i|type ii|power of (?:a )?test/i, ["type-i-type-ii-errors"]],
  [/hypothesis|p-?value|(?:one|two)[ -]sample .*test|paired t test|z-test|t test/i, ["hypothesis-testing"]],
  [/confidence interval|margin of error|critical value|wilson interval/i, ["confidence-interval"]],
  [/point estimate/i, ["point-estimation"]],
  [/central limit theorem/i, ["central-limit-theorem"]],
  [/sampling distribution|standard error/i, ["sampling-distributions"]],
  [/t distribution|degrees of freedom/i, ["t-distribution"]],
  [/normal distribution|normal approximation|standard normal|empirical rule|chebyshev/i, ["normal-distribution"]],
  [/binomial|poisson|uniform distribution|probability density|expected value|discrete probability distribution/i, ["probability-distributions"]],
  [/random variable/i, ["random-variables"]],
  [/conditional probability|independence|sample space|probability|bayes|tree diagram|complement rule|addition rule|multiplication rule/i, ["probability-foundations"]],
  [/z-score|standardization/i, ["standardization"]],
  [/histogram|stem-and-leaf|dotplot|box plot|frequency distribution|skewness/i, ["histograms"]],
  [/bar chart|pie chart|truncated axis|misleading graph/i, ["visual-encoding"]],
  [/mean|median|mode|variance|standard deviation|quartile|percentile|range|outlier|five-number|coefficient of variation/i, ["descriptive-statistics"]],
  [/sampling bias|simple random sampling|stratified|cluster sampling|systematic sampling|target population/i, ["sampling-methods"]],
  [/quantitative variable|qualitative variable|level of measurement|nominal|ordinal/i, ["data-and-variables"]],
  [/linear regression|least squares|slope|intercept|prediction|extrapolation|sse/i, ["linear-regression"]],
  [/correlation|linear association|causation/i, ["correlation"]],
  [/contingency table|categorical data|chi-square/i, ["categorical-data"]],
  [/time series|runs plot/i, ["time-series"]],
];

export function inferTopicIds(chapterId: string, keywords: readonly string[]): string[] {
  const text = keywords.join(" ");
  const inferred = keywordMatchers.flatMap(([pattern, ids]) => pattern.test(text) ? ids : []);
  return [...new Set(inferred.length ? inferred : (chapterFallbacks[chapterId] ?? ["statistics-foundations"]))];
}

export function normalizeTopicIds(chapterId: string, keywords: readonly string[], explicit?: unknown): string[] {
  const valid = Array.isArray(explicit)
    ? explicit.filter((id): id is string => typeof id === "string" && id in topicLabels)
    : [];
  return [...new Set(valid.length ? valid : inferTopicIds(chapterId, keywords))];
}
