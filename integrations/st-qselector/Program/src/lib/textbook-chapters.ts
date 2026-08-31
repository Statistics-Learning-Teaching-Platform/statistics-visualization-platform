export const textbookChapters = [
  { id: "mes-ch00", number: 0, title: "什么是统计学", titleEn: "What is statistics?" },
  { id: "mes-ch01", number: 1, title: "抽样调查", titleEn: "Sample surveys" },
  { id: "mes-ch02", number: 2, title: "数据的图形化描述", titleEn: "Graphical description of data" },
  { id: "mes-ch03", number: 3, title: "描述数据分布的数值特征", titleEn: "Numerical summaries of distributions" },
  { id: "mes-ch04", number: 4, title: "随机事件与概率", titleEn: "Random events and probability" },
  { id: "mes-ch05", number: 5, title: "几种重要的随机变量及其分布", titleEn: "Important random variables and distributions" },
  { id: "mes-ch06", number: 6, title: "样本的统计推断", titleEn: "Statistical inference from samples" },
  { id: "mes-ch07", number: 7, title: "总体均值的比较", titleEn: "Comparing population means" },
  { id: "mes-ch08", number: 8, title: "相关与回归分析", titleEn: "Correlation and regression" },
  { id: "mes-ch09", number: 9, title: "拟合优度检验与列联表分析", titleEn: "Goodness of fit and contingency tables" },
  { id: "mes-ch10", number: 10, title: "不依赖于分布的统计推断", titleEn: "Distribution-free inference" },
  { id: "mes-ch11", number: 11, title: "时间序列分析", titleEn: "Time-series analysis" },
] as const;

export type TextbookChapterId = (typeof textbookChapters)[number]["id"];

export const textbookChapterIds: TextbookChapterId[] = textbookChapters.map(({ id }) => id);

/**
 * The textbook and platform learning path have different boundaries. This is
 * the canonical semantic mapping shared by the portal and the question bank.
 */
export const textbookChapterByTopicId: Readonly<Record<string, TextbookChapterId>> = {
  "statistics-foundations": "mes-ch00",
  "data-and-variables": "mes-ch00",
  "sampling-methods": "mes-ch01",
  "visual-encoding": "mes-ch02",
  histograms: "mes-ch02",
  "descriptive-statistics": "mes-ch03",
  standardization: "mes-ch03",
  "probability-foundations": "mes-ch04",
  "random-variables": "mes-ch04",
  "probability-distributions": "mes-ch05",
  "normal-distribution": "mes-ch05",
  "t-distribution": "mes-ch05",
  "sampling-distributions": "mes-ch06",
  "central-limit-theorem": "mes-ch06",
  "point-estimation": "mes-ch06",
  "confidence-interval": "mes-ch06",
  "hypothesis-testing": "mes-ch07",
  "type-i-type-ii-errors": "mes-ch07",
  anova: "mes-ch07",
  correlation: "mes-ch08",
  "linear-regression": "mes-ch08",
  "categorical-data": "mes-ch09",
  "chi-square-test": "mes-ch09",
  "nonparametric-tests": "mes-ch10",
  "time-series": "mes-ch11",
  "simulation-foundations": "mes-ch04",
  "monte-carlo": "mes-ch04",
  "bootstrap-and-permutation": "mes-ch10",
  mcmc: "mes-ch04",
  "gibbs-sampling": "mes-ch04",
  "metropolis-hastings": "mes-ch04",
  "importance-sampling": "mes-ch04",
  "sequential-monte-carlo": "mes-ch04",
  "variance-reduction": "mes-ch04",
};

export function isTextbookChapterId(value: unknown): value is TextbookChapterId {
  return typeof value === "string" && textbookChapterIds.includes(value as TextbookChapterId);
}

export function getTextbookChapterIdForTopic(topicId: string): TextbookChapterId {
  const chapterId = textbookChapterByTopicId[topicId];
  if (!chapterId) throw new Error(`No textbook chapter registered for topic ${topicId}`);
  return chapterId;
}

export function getTextbookChapterIdsForTopics(topicIds: readonly string[]): TextbookChapterId[] {
  return [...new Set(topicIds.map(getTextbookChapterIdForTopic))];
}
