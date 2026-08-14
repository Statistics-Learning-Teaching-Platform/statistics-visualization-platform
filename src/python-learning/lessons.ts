import type { CodeLesson } from "../code-learning/types";

const normalizeCode = (code: string) => code.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

export type PythonLesson = CodeLesson<"foundations" | "data" | "visualization" | "statistics", "python">;

export const pythonLessonUnits = [
  { id: "foundations", number: "01", zh: "Python 基础", en: "Python foundations" },
  { id: "data", number: "02", zh: "数据处理", en: "Working with data" },
  { id: "visualization", number: "03", zh: "数据可视化", en: "Visualization" },
  { id: "statistics", number: "04", zh: "统计建模", en: "Statistical modelling" },
] as const;

const rawPythonLessons: PythonLesson[] = [
  {
    language: "python",
    prerequisites: [],
    id: "lists-and-mean",
    topicId: "descriptive-statistics",
    unit: "foundations",
    order: 1,
    eyebrow: { zh: "第一课 · 序列与计算", en: "Lesson 1 · Sequences and calculation" },
    title: { zh: "用列表计算样本均值", en: "Calculate a sample mean" },
    objective: {
      zh: "理解列表、变量赋值与 `sum()`、`len()` 的基本用法。",
      en: "Use lists, assignment, `sum()`, and `len()` to calculate a statistic.",
    },
    explanation: {
      zh: "Python 列表保存一组有顺序的观测值。样本均值等于观测总和除以观测个数。",
      en: "A Python list stores an ordered collection of observations. The sample mean is their sum divided by their count.",
    },
    task: {
      zh: "把六个成绩保存为 `scores`，并把均值保存为 `mean_score`。",
      en: "Store the six scores in `scores` and save their mean as `mean_score`.",
    },
    concepts: ["list", "sum()", "len()"],
    starterCode: `scores = [72, 81, 88, 91, 76, 84]

# Calculate the sample mean
mean_score =

print(f"Mean score: {mean_score:.2f}")`,
    hint: {
      zh: "使用 `sum(scores) / len(scores)`。",
      en: "Use `sum(scores) / len(scores)`.",
    },
    solution: `scores = [72, 81, 88, 91, 76, 84]
mean_score = sum(scores) / len(scores)
print(f"Mean score: {mean_score:.2f}")`,
    checkCode: `isinstance(scores, list) and scores == [72, 81, 88, 91, 76, 84] and abs(mean_score - sum(scores) / len(scores)) < 1e-12`,
    success: {
      zh: "完成：列表与样本均值均正确。",
      en: "Complete: the list and sample mean are correct.",
    },
  },
  {
    language: "python",
    prerequisites: ["lists-and-mean"],
    id: "functions-and-comprehensions",
    topicId: "standardization",
    unit: "foundations",
    order: 2,
    eyebrow: { zh: "第二课 · 函数与推导式", en: "Lesson 2 · Functions and comprehensions" },
    title: { zh: "标准化一组观测值", en: "Standardize observations" },
    objective: {
      zh: "定义函数并使用列表推导式批量转换数据。",
      en: "Define a function and transform data with a list comprehension.",
    },
    explanation: {
      zh: "函数把可复用的计算规则封装起来；列表推导式则把同一规则应用到每个观测值。",
      en: "Functions package reusable logic; comprehensions apply that logic to every observation.",
    },
    task: {
      zh: "定义 `z_score(x, mean, sd)`，然后把标准化结果保存为 `z_scores`。",
      en: "Define `z_score(x, mean, sd)` and store the standardized values in `z_scores`.",
    },
    concepts: ["def", "return", "list comprehension"],
    starterCode: `values = [10, 12, 14, 16, 18]
mean = 14
sd = 2.8284271247461903

def z_score(x, mean, sd):
    # Return the standardized value
    return

z_scores = [z_score(x, mean, sd) for x in values]
print(z_scores)`,
    hint: {
      zh: "标准分数公式是 `(x - mean) / sd`。",
      en: "The standard-score formula is `(x - mean) / sd`.",
    },
    solution: `values = [10, 12, 14, 16, 18]
mean = 14
sd = 2.8284271247461903

def z_score(x, mean, sd):
    return (x - mean) / sd

z_scores = [z_score(x, mean, sd) for x in values]
print(z_scores)`,
    checkCode: `callable(z_score) and len(z_scores) == 5 and abs(z_scores[2]) < 1e-12 and abs(z_scores[0] + 1.41421356237) < 1e-8`,
    success: {
      zh: "完成：函数与列表推导式都按预期工作。",
      en: "Complete: the function and list comprehension work as intended.",
    },
  },
  {
    language: "python",
    prerequisites: ["lists-and-mean"],
    id: "pandas-filter-summary",
    topicId: "data-and-variables",
    unit: "data",
    order: 3,
    eyebrow: { zh: "第三课 · pandas", en: "Lesson 3 · pandas" },
    title: { zh: "筛选数据并汇总分组", en: "Filter and summarize data" },
    objective: {
      zh: "使用 DataFrame、布尔筛选和 `groupby()` 完成常见数据整理。",
      en: "Use a DataFrame, Boolean filtering, and `groupby()` for a common data workflow.",
    },
    explanation: {
      zh: "pandas 用二维表组织数据。筛选决定保留哪些行，分组汇总则比较不同类别。",
      en: "pandas organizes data in tables. Filtering chooses rows; grouped summaries compare categories.",
    },
    task: {
      zh: "保留分数不低于 80 的学生为 `high_scores`，并计算各组平均分 `group_means`。",
      en: "Save students scoring at least 80 as `high_scores`, then calculate `group_means`.",
    },
    concepts: ["DataFrame", "Boolean filter", "groupby()"],
    packages: ["pandas"],
    starterCode: `import pandas as pd

students = pd.DataFrame({
    "group": ["A", "A", "B", "B", "B"],
    "score": [72, 88, 79, 91, 85]
})

# Keep scores of 80 or higher
high_scores =

# Mean score by group
group_means =

print(high_scores)
print(group_means)`,
    hint: {
      zh: '筛选可写为 `students[students["score"] >= 80]`；分组均值使用 `students.groupby("group")["score"].mean()`。',
      en: "Filter with `students[students[\"score\"] >= 80]`; group with `students.groupby(\"group\")[\"score\"].mean()`.",
    },
    solution: `import pandas as pd

students = pd.DataFrame({
    "group": ["A", "A", "B", "B", "B"],
    "score": [72, 88, 79, 91, 85]
})
high_scores = students[students["score"] >= 80]
group_means = students.groupby("group")["score"].mean()
print(high_scores)
print(group_means)`,
    checkCode: `list(high_scores["score"]) == [88, 91, 85] and abs(float(group_means["A"]) - 80.0) < 1e-12 and abs(float(group_means["B"]) - 85.0) < 1e-12`,
    success: {
      zh: "完成：筛选结果与分组均值均正确。",
      en: "Complete: the filtered rows and grouped means are correct.",
    },
  },
  {
    language: "python",
    prerequisites: ["pandas-filter-summary"],
    id: "matplotlib-distribution",
    topicId: "histograms",
    unit: "visualization",
    order: 4,
    eyebrow: { zh: "第四课 · Matplotlib", en: "Lesson 4 · Matplotlib" },
    title: { zh: "绘制分布直方图", en: "Plot a distribution" },
    objective: {
      zh: "用 Matplotlib 创建带标题和坐标标签的统计图形。",
      en: "Create a labelled statistical graphic with Matplotlib.",
    },
    explanation: {
      zh: "直方图把连续数据分箱，帮助观察分布的中心、离散程度、偏度与异常值。",
      en: "A histogram bins continuous data to reveal center, spread, skewness, and possible outliers.",
    },
    task: {
      zh: "绘制 `waiting_time` 的直方图，使用 6 个组，并添加标题与横轴标签。",
      en: "Plot `waiting_time` with 6 bins and add a title and x-axis label.",
    },
    concepts: ["matplotlib", "hist()", "labels"],
    packages: ["matplotlib"],
    starterCode: `import matplotlib.pyplot as plt

waiting_time = [4, 6, 7, 8, 8, 9, 10, 12, 13, 15, 18, 21]

fig, ax = plt.subplots(figsize=(7, 4))
# Draw a histogram with 6 bins

ax.set_title("Waiting Time Distribution")
ax.set_xlabel("Minutes")
ax.set_ylabel("Frequency")
plt.show()`,
    hint: {
      zh: '在注释下添加 `ax.hist(waiting_time, bins=6, color="#6f8f7a", edgecolor="white")`。',
      en: "Add `ax.hist(waiting_time, bins=6, color=\"#6f8f7a\", edgecolor=\"white\")`.",
    },
    solution: `import matplotlib.pyplot as plt

waiting_time = [4, 6, 7, 8, 8, 9, 10, 12, 13, 15, 18, 21]
fig, ax = plt.subplots(figsize=(7, 4))
ax.hist(waiting_time, bins=6, color="#6f8f7a", edgecolor="white")
ax.set_title("Waiting Time Distribution")
ax.set_xlabel("Minutes")
ax.set_ylabel("Frequency")
plt.show()`,
    checkCode: `'fig' in globals() and 'ax' in globals() and len(ax.patches) == 6 and ax.get_xlabel() == "Minutes"`,
    success: {
      zh: "完成：直方图、分组数和标签均正确。",
      en: "Complete: the histogram, bin count, and labels are correct.",
    },
  },
  {
    language: "python",
    prerequisites: ["lists-and-mean"],
    id: "one-sample-t-test",
    topicId: "hypothesis-testing",
    unit: "statistics",
    order: 5,
    eyebrow: { zh: "第五课 · 假设检验", en: "Lesson 5 · Hypothesis testing" },
    title: { zh: "完成单样本 t 检验", en: "Run a one-sample t test" },
    objective: {
      zh: "使用 SciPy 独立计算检验统计量和 p 值，并写出统计结论。",
      en: "Use SciPy to calculate a test statistic and p-value, then state a conclusion.",
    },
    explanation: {
      zh: "单样本 t 检验在总体标准差未知时，将样本均值与假设均值进行比较。",
      en: "A one-sample t test compares a sample mean with a hypothesized mean when population variability is unknown.",
    },
    task: {
      zh: "检验平均等待时间是否不同于 10；把统计量、p 值和 5% 水平的结论分别保存。",
      en: "Test whether the mean differs from 10; save the statistic, p-value, and 5% conclusion.",
    },
    concepts: ["scipy.stats", "ttest_1samp", "p-value"],
    packages: ["scipy"],
    starterCode: `from scipy import stats

wait = [8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9]

result =
t_statistic =
p_value =
reject_null =

print(f"t = {t_statistic:.4f}, p = {p_value:.4f}")
print("Reject H0" if reject_null else "Fail to reject H0")`,
    hint: {
      zh: "使用 `stats.ttest_1samp(wait, popmean=10)`；若 `p_value < 0.05` 则拒绝原假设。",
      en: "Use `stats.ttest_1samp(wait, popmean=10)` and reject when `p_value < 0.05`.",
    },
    solution: `from scipy import stats

wait = [8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9]
result = stats.ttest_1samp(wait, popmean=10)
t_statistic = float(result.statistic)
p_value = float(result.pvalue)
reject_null = p_value < 0.05
print(f"t = {t_statistic:.4f}, p = {p_value:.4f}")
print("Reject H0" if reject_null else "Fail to reject H0")`,
    checkCode: `'result' in globals() and abs(t_statistic - float(result.statistic)) < 1e-12 and abs(p_value - float(result.pvalue)) < 1e-12 and reject_null == (p_value < 0.05)`,
    success: {
      zh: "完成：检验统计量、p 值与结论均一致。",
      en: "Complete: the statistic, p-value, and conclusion are consistent.",
    },
  },
  {
    language: "python",
    prerequisites: ["pandas-filter-summary"],
    id: "linear-regression",
    topicId: "linear-regression",
    unit: "statistics",
    order: 6,
    eyebrow: { zh: "第六课 · 回归分析", en: "Lesson 6 · Regression" },
    title: { zh: "拟合一元线性回归", en: "Fit a simple linear regression" },
    objective: {
      zh: "使用 `linregress()` 拟合直线并解释斜率与决定系数。",
      en: "Fit a line with `linregress()` and interpret its slope and coefficient of determination.",
    },
    explanation: {
      zh: "回归直线描述解释变量与结果变量的平均线性关系；$R^2$ 衡量线性模型解释的变异比例。",
      en: "A regression line describes the average linear relationship; $R^2$ is the proportion of variation explained by the line.",
    },
    task: {
      zh: "拟合学习时间对成绩的回归，保存 `slope`、`intercept` 和 `r_squared`。",
      en: "Regress score on study hours and save `slope`, `intercept`, and `r_squared`.",
    },
    concepts: ["linregress()", "slope", "R²"],
    packages: ["scipy"],
    starterCode: `from scipy import stats

hours = [1, 2, 3, 4, 5, 6]
scores = [52, 57, 65, 70, 78, 84]

model =
slope =
intercept =
r_squared =

print(f"score = {intercept:.3f} + {slope:.3f} × hours")
print(f"R² = {r_squared:.3f}")`,
    hint: {
      zh: "先运行 `model = stats.linregress(hours, scores)`，然后读取 `model.slope`、`model.intercept`，并计算 `model.rvalue ** 2`。",
      en: "Use `stats.linregress(hours, scores)`, read its slope and intercept, and square `model.rvalue`.",
    },
    solution: `from scipy import stats

hours = [1, 2, 3, 4, 5, 6]
scores = [52, 57, 65, 70, 78, 84]
model = stats.linregress(hours, scores)
slope = float(model.slope)
intercept = float(model.intercept)
r_squared = float(model.rvalue ** 2)
print(f"score = {intercept:.3f} + {slope:.3f} × hours")
print(f"R² = {r_squared:.3f}")`,
    checkCode: `'model' in globals() and abs(slope - model.slope) < 1e-12 and abs(intercept - model.intercept) < 1e-12 and abs(r_squared - model.rvalue ** 2) < 1e-12`,
    success: {
      zh: "完成：回归系数与决定系数均正确。",
      en: "Complete: the regression coefficients and R-squared are correct.",
    },
  },
  {
    language: "python",
    prerequisites: ["lists-and-mean", "matplotlib-distribution"],
    id: "sampling-simulation",
    topicId: "central-limit-theorem",
    unit: "statistics",
    order: 7,
    eyebrow: { zh: "第七课 · 统计模拟", en: "Lesson 7 · Statistical simulation" },
    title: { zh: "模拟样本均值的抽样分布", en: "Simulate a sampling distribution" },
    objective: {
      zh: "使用 NumPy 随机生成器重复抽样，连接模拟结果与标准误。",
      en: "Use NumPy's random generator for repeated sampling and connect simulation with standard error.",
    },
    explanation: {
      zh: "一次样本只给出一个样本均值；重复抽样得到的均值分布揭示估计量的抽样变异。",
      en: "One sample gives one mean. Repeated samples reveal the sampling variability of that estimator.",
    },
    task: {
      zh: "生成 1000 个样本均值，每个样本含 30 个来自 $N(100,15^2)$ 的观测，并保存模拟标准误。",
      en: "Generate 1,000 means from samples of 30 observations drawn from $N(100,15^2)$ and save the simulated standard error.",
    },
    concepts: ["numpy", "random.normal", "standard error"],
    packages: ["numpy", "matplotlib"],
    starterCode: `import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(42)

# Shape: 1000 repeated samples × 30 observations
samples =
sample_means =
simulated_se =

print(f"Mean of means: {sample_means.mean():.3f}")
print(f"Simulated SE: {simulated_se:.3f}")

fig, ax = plt.subplots(figsize=(7, 4))
ax.hist(sample_means, bins=25, color="#6f8f7a", edgecolor="white")
ax.axvline(100, color="#8d75b5", linestyle="--")
ax.set_xlabel("Sample mean")
plt.show()`,
    hint: {
      zh: "使用 `rng.normal(100, 15, size=(1000, 30))`，再沿 `axis=1` 求均值，并用 `ddof=1` 求标准差。",
      en: "Use `rng.normal(100, 15, size=(1000, 30))`, take means along `axis=1`, then use `std(ddof=1)`.",
    },
    solution: `import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(42)
samples = rng.normal(100, 15, size=(1000, 30))
sample_means = samples.mean(axis=1)
simulated_se = sample_means.std(ddof=1)
print(f"Mean of means: {sample_means.mean():.3f}")
print(f"Simulated SE: {simulated_se:.3f}")

fig, ax = plt.subplots(figsize=(7, 4))
ax.hist(sample_means, bins=25, color="#6f8f7a", edgecolor="white")
ax.axvline(100, color="#8d75b5", linestyle="--")
ax.set_xlabel("Sample mean")
plt.show()`,
    checkCode: `'samples' in globals() and samples.shape == (1000, 30) and len(sample_means) == 1000 and abs(float(sample_means.mean()) - 100) < 1 and 2.1 < simulated_se < 3.4`,
    success: {
      zh: "完成：1000 次重复抽样与模拟标准误符合理论预期。",
      en: "Complete: the 1,000 repeated samples and simulated standard error agree with theory.",
    },
  },
  {
    language: "python",
    prerequisites: ["lists-and-mean", "sampling-simulation"],
    id: "mean-confidence-interval",
    topicId: "confidence-interval",
    unit: "statistics",
    order: 8,
    eyebrow: { zh: "第八课 · 区间估计", en: "Lesson 8 · Interval estimation" },
    title: { zh: "构造总体均值的 95% 置信区间", en: "Build a 95% confidence interval for a mean" },
    objective: {
      zh: "使用 NumPy 与 SciPy 计算样本均值、标准误、t 临界值和置信区间。",
      en: "Use NumPy and SciPy to calculate a sample mean, standard error, t critical value, and confidence interval.",
    },
    explanation: {
      zh: "总体标准差未知时，均值区间使用样本标准误和 t 临界值。95% 置信度描述重复抽样下这种构造方法的长期覆盖率。",
      en: "When the population standard deviation is unknown, a mean interval uses the sample standard error and a t critical value. The 95% level describes the method's long-run coverage under repeated sampling.",
    },
    task: {
      zh: "计算等待时间的 95% 均值置信区间，将误差界限、下限和上限分别保存为 `margin_of_error`、`ci_lower` 和 `ci_upper`。",
      en: "Calculate a 95% interval for the mean waiting time and save its margin, lower endpoint, and upper endpoint.",
    },
    concepts: ["standard error", "t.ppf()", "confidence interval"],
    packages: ["numpy", "scipy"],
    starterCode: `import numpy as np
from scipy import stats

wait = np.array([8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9])
sample_mean = wait.mean()
standard_error =
critical_value =
margin_of_error =
ci_lower =
ci_upper =

print(f"95% CI: ({ci_lower:.3f}, {ci_upper:.3f})")`,
    hint: {
      zh: "用 `stats.sem(wait)` 求标准误，用 `stats.t.ppf(0.975, df=len(wait) - 1)` 求双侧 95% 区间的临界值。",
      en: "Use `stats.sem(wait)` and the two-sided critical value `stats.t.ppf(0.975, df=len(wait) - 1)`.",
    },
    solution: `import numpy as np
from scipy import stats

wait = np.array([8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9])
sample_mean = wait.mean()
standard_error = stats.sem(wait)
critical_value = stats.t.ppf(0.975, df=len(wait) - 1)
margin_of_error = critical_value * standard_error
ci_lower = sample_mean - margin_of_error
ci_upper = sample_mean + margin_of_error
print(f"95% CI: ({ci_lower:.3f}, {ci_upper:.3f})")`,
    checkCode: `'wait' in globals() and len(wait) == 8 and
abs(standard_error - stats.sem(wait)) < 1e-12 and
abs(critical_value - stats.t.ppf(0.975, df=len(wait) - 1)) < 1e-12 and
abs(margin_of_error - critical_value * standard_error) < 1e-12 and
abs(ci_lower - (sample_mean - margin_of_error)) < 1e-12 and
abs(ci_upper - (sample_mean + margin_of_error)) < 1e-12`,
    success: {
      zh: "完成：样本均值、标准误、临界值和 95% 置信区间均计算正确。",
      en: "Complete: the sample mean, standard error, critical value, and 95% confidence interval are correct.",
    },
  },
  {
    language: "python",
    prerequisites: ["pandas-filter-summary"],
    id: "distribution-probabilities",
    topicId: "probability-distributions",
    unit: "statistics",
    order: 9,
    eyebrow: { zh: "第九课 · 概率分布", en: "Lesson 9 · Probability distributions" },
    title: { zh: "计算二项分布的概率", en: "Calculate binomial probabilities" },
    objective: { zh: "使用 SciPy 的二项分布计算 PMF、CDF，并解释成功次数的概率。", en: "Use SciPy's binomial distribution to calculate PMF and CDF probabilities." },
    explanation: { zh: "二项分布描述固定次数、相互独立且成功概率相同的试验；先确认情境满足这些条件。", en: "The binomial model describes a fixed number of independent trials with a common success probability." },
    task: { zh: "计算 10 次试验中恰好 3 次成功的概率，以及至多 3 次成功的概率。", en: "Calculate the probability of exactly three successes and at most three successes in ten trials." },
    concepts: ["scipy.stats.binom", "pmf", "cdf"],
    packages: ["scipy"],
    starterCode: `from scipy import stats

n = 10
p = 0.4
exactly_three =
at_most_three =

print(exactly_three, at_most_three)`,
    hint: { zh: "使用 `stats.binom.pmf(3, n, p)` 和 `stats.binom.cdf(3, n, p)`。", en: "Use `stats.binom.pmf(3, n, p)` and `stats.binom.cdf(3, n, p)`." },
    solution: `from scipy import stats
n = 10
p = 0.4
exactly_three = float(stats.binom.pmf(3, n, p))
at_most_three = float(stats.binom.cdf(3, n, p))
print(exactly_three, at_most_three)`,
    checkCode: `'exactly_three' in globals() and 'at_most_three' in globals() and abs(exactly_three - stats.binom.pmf(3, n, p)) < 1e-12 and abs(at_most_three - stats.binom.cdf(3, n, p)) < 1e-12`,
    success: { zh: "完成：PMF 和 CDF 都与二项分布模型一致。", en: "Complete: the PMF and CDF agree with the binomial model." },
  },
  {
    language: "python",
    prerequisites: ["one-sample-t-test"],
    id: "two-sample-tests",
    topicId: "hypothesis-testing",
    unit: "statistics",
    order: 10,
    eyebrow: { zh: "第十课 · 两组比较", en: "Lesson 10 · Comparing two groups" },
    title: { zh: "比较两组均值", en: "Compare two group means" },
    objective: { zh: "使用 `ttest_ind()` 比较两组均值，并保存差异的 p 值。", en: "Use `ttest_ind()` to compare two means and save the p-value." },
    explanation: { zh: "独立样本 t 检验把两组均值差与两组样本的不确定性结合起来；不要只看 p 值。", en: "An independent-samples t test compares a mean difference with uncertainty from both samples; do not report only the p-value." },
    task: { zh: "比较两种教学方法的成绩，将检验结果保存为 `result`，均值差和 p 值保存为 `mean_difference`、`p_value`。", en: "Compare two teaching methods and save the result, mean difference, and p-value." },
    concepts: ["ttest_ind()", "independent samples", "effect size"],
    packages: ["scipy"],
    starterCode: `import numpy as np
from scipy import stats

method_a = np.array([72, 75, 78, 80, 82, 79])
method_b = np.array([78, 81, 83, 85, 87, 84])

result =
mean_difference =
p_value =

print(mean_difference, p_value)`,
    hint: { zh: "使用 `stats.ttest_ind(method_b, method_a, equal_var=False)`，均值差为 `method_b.mean() - method_a.mean()`。", en: "Use Welch's `stats.ttest_ind(method_b, method_a, equal_var=False)` and subtract the means." },
    solution: `import numpy as np
from scipy import stats
method_a = np.array([72, 75, 78, 80, 82, 79])
method_b = np.array([78, 81, 83, 85, 87, 84])
result = stats.ttest_ind(method_b, method_a, equal_var=False)
mean_difference = float(method_b.mean() - method_a.mean())
p_value = float(result.pvalue)
print(mean_difference, p_value)`,
    checkCode: `'result' in globals() and abs(mean_difference - (method_b.mean() - method_a.mean())) < 1e-12 and abs(p_value - result.pvalue) < 1e-12`,
    success: { zh: "完成：均值差、Welch t 检验和 p 值均已保存。", en: "Complete: the mean difference, Welch t test, and p-value are saved." },
  },
  {
    language: "python",
    prerequisites: ["two-sample-tests"],
    id: "one-way-anova",
    topicId: "anova",
    unit: "statistics",
    order: 11,
    eyebrow: { zh: "第十一课 · 方差分析", en: "Lesson 11 · ANOVA" },
    title: { zh: "比较三个总体均值", en: "Compare three population means" },
    objective: { zh: "使用 `f_oneway()` 完成整体 ANOVA，并解释 F 统计量和 p 值。", en: "Run an overall ANOVA with `f_oneway()` and interpret its F statistic and p-value." },
    explanation: { zh: "显著的整体检验说明至少有一组均值不同，后续还要做有计划的组间比较。", en: "A significant omnibus test says at least one mean differs; planned pairwise comparisons come next." },
    task: { zh: "对三组成绩进行 ANOVA，将 F 统计量和 p 值保存为 `f_statistic`、`p_value`。", en: "Run ANOVA on three score groups and save the F statistic and p-value." },
    concepts: ["f_oneway()", "F statistic", "omnibus test"],
    packages: ["scipy"],
    starterCode: `from scipy import stats

group_a = [71, 72, 70, 73, 69]
group_b = [78, 80, 77, 79, 81]
group_c = [86, 88, 84, 87, 89]

result =
f_statistic =
p_value =

print(f_statistic, p_value)`,
    hint: { zh: "使用 `stats.f_oneway(group_a, group_b, group_c)`，再读取 `.statistic` 和 `.pvalue`。", en: "Use `stats.f_oneway(group_a, group_b, group_c)` and read `.statistic` and `.pvalue`." },
    solution: `from scipy import stats
group_a = [71, 72, 70, 73, 69]
group_b = [78, 80, 77, 79, 81]
group_c = [86, 88, 84, 87, 89]
result = stats.f_oneway(group_a, group_b, group_c)
f_statistic = float(result.statistic)
p_value = float(result.pvalue)
print(f_statistic, p_value)`,
    checkCode: `'result' in globals() and abs(f_statistic - result.statistic) < 1e-12 and abs(p_value - result.pvalue) < 1e-12 and p_value < 0.05`,
    success: { zh: "完成：整体 F 检验显示三组均值并不完全相同。", en: "Complete: the omnibus F test indicates that the three means are not all equal." },
  },
  {
    language: "python",
    prerequisites: ["pandas-filter-summary"],
    id: "chi-square-contingency",
    topicId: "chi-square-test",
    unit: "statistics",
    order: 12,
    eyebrow: { zh: "第十二课 · 分类数据", en: "Lesson 12 · Categorical data" },
    title: { zh: "检验列联表独立性", en: "Test independence in a contingency table" },
    objective: { zh: "使用 `chi2_contingency()` 计算卡方统计量、期望频数和 p 值。", en: "Use `chi2_contingency()` for the chi-square statistic, expected counts, and p-value." },
    explanation: { zh: "列联表检验比较观察频数与独立性假设下的期望频数；先检查每个期望频数是否足够大。", en: "A contingency-table test compares observed and expected counts under independence; check expected counts first." },
    task: { zh: "检验学习方式与是否通过考试的关联，将结果、期望频数和 p 值保存。", en: "Test the association between study mode and passing, saving the result, expected counts, and p-value." },
    concepts: ["chi2_contingency()", "expected counts", "categorical association"],
    packages: ["scipy"],
    starterCode: `import numpy as np
from scipy import stats

observed = np.array([[32, 8], [24, 16]])

result =
chi2_statistic =
expected =
p_value =

print(chi2_statistic, p_value)`,
    hint: { zh: "使用 `stats.chi2_contingency(observed, correction=False)`，返回值依次包含卡方统计量、p 值、自由度和期望频数。", en: "Use `stats.chi2_contingency(observed, correction=False)` and unpack statistic, p-value, degrees of freedom, and expected counts." },
    solution: `import numpy as np
from scipy import stats
observed = np.array([[32, 8], [24, 16]])
result = stats.chi2_contingency(observed, correction=False)
chi2_statistic, p_value, dof, expected = result
print(chi2_statistic, p_value)`,
    checkCode: `'result' in globals() and abs(chi2_statistic - result[0]) < 1e-12 and abs(p_value - result[1]) < 1e-12 and expected.shape == observed.shape`,
    success: { zh: "完成：卡方统计量、期望频数和独立性检验结果均已得到。", en: "Complete: the chi-square statistic, expected counts, and independence result are available." },
  },
  {
    language: "python",
    prerequisites: ["linear-regression"],
    id: "multiple-regression-diagnostics",
    topicId: "linear-regression",
    unit: "statistics",
    order: 13,
    eyebrow: { zh: "第十三课 · 多元回归", en: "Lesson 13 · Multiple regression" },
    title: { zh: "拟合多元回归并检查残差", en: "Fit multiple regression and inspect residuals" },
    objective: { zh: "使用 `linregress` 之外的矩阵公式拟合多元模型，并计算 R² 与残差。", en: "Fit a multiple regression with a matrix formula and calculate R-squared and residuals." },
    explanation: { zh: "多元回归同时控制多个解释变量；系数解释依赖于其他变量保持不变，残差检查是模型评价的一部分。", en: "Multiple regression controls for several predictors; coefficients are conditional effects and residual checks are essential." },
    task: { zh: "用截距和两个解释变量拟合成绩模型，保存系数 `coefficients`、R² 和残差。", en: "Fit a score model with an intercept and two predictors, saving coefficients, R-squared, and residuals." },
    concepts: ["numpy.linalg.lstsq", "R²", "residuals"],
    packages: ["numpy"],
    starterCode: `import numpy as np

hours = np.array([1, 2, 3, 4, 5, 6])
attendance = np.array([70, 72, 75, 79, 82, 86])
score = np.array([55, 59, 65, 70, 77, 84])

X = np.column_stack([np.ones(len(hours)), hours, attendance])
coefficients =
predicted =
residuals =
r_squared =

print(coefficients, r_squared)`,
    hint: { zh: "用 `np.linalg.lstsq(X, score, rcond=None)[0]` 求系数；R² 为 `1 - SSE/SST`。", en: "Use `np.linalg.lstsq(X, score, rcond=None)[0]`; compute R-squared as `1 - SSE/SST`." },
    solution: `import numpy as np
hours = np.array([1, 2, 3, 4, 5, 6])
attendance = np.array([70, 72, 75, 79, 82, 86])
score = np.array([55, 59, 65, 70, 77, 84])
X = np.column_stack([np.ones(len(hours)), hours, attendance])
coefficients = np.linalg.lstsq(X, score, rcond=None)[0]
predicted = X @ coefficients
residuals = score - predicted
r_squared = 1 - np.sum(residuals ** 2) / np.sum((score - score.mean()) ** 2)
print(coefficients, r_squared)`,
    checkCode: `'coefficients' in globals() and len(coefficients) == 3 and np.allclose(predicted, X @ coefficients) and np.allclose(residuals, score - predicted) and 0 < r_squared < 1`,
    success: { zh: "完成：多元回归系数、预测值、残差和 R² 均已计算。", en: "Complete: the coefficients, predictions, residuals, and R-squared are calculated." },
  },
  {
    language: "python",
    prerequisites: ["sampling-simulation"],
    id: "time-series-forecasting",
    topicId: "time-series",
    unit: "statistics",
    order: 14,
    eyebrow: { zh: "第十四课 · 时间序列", en: "Lesson 14 · Time series" },
    title: { zh: "计算移动平均并评价误差", en: "Compute a moving average and forecast error" },
    objective: { zh: "使用 pandas rolling 计算三期移动平均，并用 MAE 评价预测误差。", en: "Use pandas rolling for a three-period moving average and evaluate it with MAE." },
    explanation: { zh: "移动平均能平滑短期波动，但会降低对新变化的响应速度；误差指标需要和业务尺度结合。", en: "A moving average smooths short-term variation but reacts more slowly; interpret errors on the original scale." },
    task: { zh: "计算居中的三期移动平均 `moving_average`，并保存非缺失预测的平均绝对误差 `mae`。", en: "Compute a centred three-period moving average and save the MAE for non-missing forecasts." },
    concepts: ["pandas.Series", "rolling()", "MAE"],
    packages: ["numpy", "pandas"],
    starterCode: `import numpy as np
import pandas as pd

sales = pd.Series([20, 22, 25, 24, 28, 31, 30, 34])

moving_average =
valid = moving_average.notna()
mae =

print(mae)`,
    hint: { zh: "使用 `sales.rolling(window=3, center=True).mean()`，再对 `sales[valid] - moving_average[valid]` 取绝对值平均。", en: "Use `sales.rolling(window=3, center=True).mean()` and average absolute errors where the forecast is non-missing." },
    solution: `import numpy as np
import pandas as pd
sales = pd.Series([20, 22, 25, 24, 28, 31, 30, 34])
moving_average = sales.rolling(window=3, center=True).mean()
valid = moving_average.notna()
mae = float(np.abs(sales[valid] - moving_average[valid]).mean())
print(mae)`,
    checkCode: `'moving_average' in globals() and moving_average.notna().sum() == 6 and 'mae' in globals() and mae > 0`,
    success: { zh: "完成：三期移动平均和 MAE 已计算，可继续比较指数平滑。", en: "Complete: the three-period moving average and MAE are ready for comparison." },
  },
  { language: "python", prerequisites: ["lists-and-mean"], id: "environment-and-notebooks", topicId: "statistics-foundations", unit: "foundations", order: 15, eyebrow: { zh: "第十五课 · Python 环境", en: "Lesson 15 · Python environments" }, title: { zh: "记录可复现的分析环境", en: "Record a reproducible analysis environment" }, objective: { zh: "理解 Notebook、脚本和依赖包的作用。", en: "Understand notebooks, scripts, and package dependencies." }, explanation: { zh: "可复现分析需要记录代码、数据处理步骤和运行环境。", en: "Reproducible analysis records code, data steps, and the runtime environment." }, task: { zh: "保存 Python 版本字符串 `python_version`。", en: "Save the Python version string as `python_version`." }, concepts: ["Jupyter", "script", "version"], packages: ["sys"], starterCode: "import sys\\n\\npython_version = ", hint: { zh: "使用 `sys.version`。", en: "Use `sys.version`." }, solution: "import sys\\npython_version = sys.version", checkCode: "isinstance(python_version, str) and len(python_version) > 0", success: { zh: "完成：运行环境已记录。", en: "Complete: the runtime environment is recorded." } },
  { language: "python", prerequisites: ["probability-foundations"], id: "conditional-probability-bayes", topicId: "probability-foundations", unit: "statistics", order: 16, eyebrow: { zh: "第十六课 · 条件概率", en: "Lesson 16 · Conditional probability" }, title: { zh: "用全概率和贝叶斯公式更新概率", en: "Update probabilities with Bayes' rule" }, objective: { zh: "区分联合概率、条件概率和后验概率。", en: "Distinguish joint, conditional, and posterior probabilities." }, explanation: { zh: "贝叶斯公式把先验信息与新证据结合，得到后验概率。", en: "Bayes' rule combines prior information with evidence to obtain a posterior probability." }, task: { zh: "计算检测阳性后的患病概率 `posterior`。", en: "Compute the disease probability after a positive test as `posterior`." }, concepts: ["conditional probability", "Bayes rule"], packages: ["numpy"], starterCode: "prior = 0.01\\nsensitivity = 0.95\\nfalse_positive = 0.05\\nposterior = ", hint: { zh: "使用 `prior * sensitivity / (prior * sensitivity + (1 - prior) * false_positive)`。", en: "Use Bayes' formula with the prior, sensitivity, and false-positive rate." }, solution: "prior = 0.01\\nsensitivity = 0.95\\nfalse_positive = 0.05\\nposterior = prior * sensitivity / (prior * sensitivity + (1 - prior) * false_positive)", checkCode: "0 < posterior < 1 and abs(posterior - 0.16101694915254236) < 1e-12", success: { zh: "完成：后验概率不是单独由灵敏度决定的。", en: "Complete: the posterior depends on prevalence as well as sensitivity." } },
  { language: "python", prerequisites: ["distribution-probabilities"], id: "normal-uniform-exponential", topicId: "probability-distributions", unit: "statistics", order: 17, eyebrow: { zh: "第十七课 · 连续分布", en: "Lesson 17 · Continuous distributions" }, title: { zh: "比较正态、均匀与指数分布", en: "Compare normal, uniform, and exponential distributions" }, objective: { zh: "使用 SciPy 的 CDF 计算不同连续分布下的概率。", en: "Use SciPy CDFs to calculate probabilities under continuous distributions." }, explanation: { zh: "分布选择应由机制和数据形状共同决定。", en: "Distribution choice should reflect both mechanism and observed shape." }, task: { zh: "保存正态左尾概率 `normal_prob` 和指数尾概率 `exponential_tail`。", en: "Save a normal left-tail probability and exponential tail probability." }, concepts: ["norm.cdf", "expon.sf", "continuous distributions"], packages: ["scipy"], starterCode: "from scipy import stats\\n\\nnormal_prob = stats.norm.cdf(1.96)\\nexponential_tail = ", hint: { zh: "使用 `stats.expon.sf(2, scale=1)`。", en: "Use `stats.expon.sf(2, scale=1)`." }, solution: "from scipy import stats\\nnormal_prob = stats.norm.cdf(1.96)\\nexponential_tail = stats.expon.sf(2, scale=1)", checkCode: "0.97 < normal_prob < 0.98 and abs(exponential_tail - 0.1353352832366127) < 1e-12", success: { zh: "完成：CDF 与生存函数分别表达左尾和右尾概率。", en: "Complete: the CDF and survival function express left- and right-tail probabilities." } },
  { language: "python", prerequisites: ["confidence-interval"], id: "sample-size-planning", topicId: "confidence-interval", unit: "statistics", order: 18, eyebrow: { zh: "第十八课 · 样本量", en: "Lesson 18 · Sample size" }, title: { zh: "根据误差界限规划样本量", en: "Plan sample size from a margin of error" }, objective: { zh: "理解置信水平、标准差和误差界限如何影响样本量。", en: "Understand how confidence, spread, and margin of error affect sample size." }, explanation: { zh: "已知总体标准差时，均值区间的近似样本量为 z 临界值平方乘以方差，再除以误差界限平方。", en: "With known population spread, the approximate sample size is z squared times variance divided by margin squared." }, task: { zh: "按 95% 置信水平、σ=12、误差界限 3 保存 `required_n`。", en: "Save `required_n` for 95% confidence, sigma 12, and margin 3." }, concepts: ["sample size", "margin of error", "z critical"], packages: ["scipy"], starterCode: "from scipy import stats\\nimport math\\n\\nz = stats.norm.ppf(0.975)\\nrequired_n = ", hint: { zh: "使用 `math.ceil((z * 12 / 3) ** 2)`。", en: "Use `math.ceil((z * 12 / 3) ** 2)`." }, solution: "from scipy import stats\\nimport math\\nz = stats.norm.ppf(0.975)\\nrequired_n = math.ceil((z * 12 / 3) ** 2)", checkCode: "required_n == 62", success: { zh: "完成：精度要求越高，所需样本量越大。", en: "Complete: tighter precision requires a larger sample." } },
  { language: "python", prerequisites: ["mean-confidence-interval"], id: "proportion-confidence-interval", topicId: "confidence-interval", unit: "statistics", order: 19, eyebrow: { zh: "第十九课 · 比例区间", en: "Lesson 19 · Proportion intervals" }, title: { zh: "构造总体比例的近似区间", en: "Construct an approximate proportion interval" }, objective: { zh: "用正态近似计算样本比例的标准误和置信区间。", en: "Use a normal approximation to calculate a proportion interval." }, explanation: { zh: "比例区间的标准误依赖样本比例和样本量；小样本时应考虑更稳健方法。", en: "The proportion standard error depends on the sample proportion and n; small samples need care." }, task: { zh: "保存 `lower` 和 `upper`。", en: "Save `lower` and `upper`." }, concepts: ["proportion", "standard error", "confidence interval"], packages: ["math", "scipy"], starterCode: "from scipy import stats\\nimport math\\n\\nsuccesses, n = 62, 100\\np_hat = successes / n\\nz = stats.norm.ppf(0.975)\\nse = math.sqrt(p_hat * (1 - p_hat) / n)\\nlower =\\nupper =", hint: { zh: "使用 `p_hat - z * se` 与 `p_hat + z * se`。", en: "Use `p_hat - z * se` and `p_hat + z * se`." }, solution: "from scipy import stats\\nimport math\\nsuccesses, n = 62, 100\\np_hat = successes / n\\nz = stats.norm.ppf(0.975)\\nse = math.sqrt(p_hat * (1 - p_hat) / n)\\nlower = p_hat - z * se\\nupper = p_hat + z * se", checkCode: "0 < lower < p_hat < upper < 1", success: { zh: "完成：比例区间的中心和不确定性均已计算。", en: "Complete: the centre and uncertainty of the proportion are calculated." } },
  { language: "python", prerequisites: ["one-sample-t-test"], id: "z-tests", topicId: "hypothesis-testing", unit: "statistics", order: 20, eyebrow: { zh: "第二十课 · z 检验", en: "Lesson 20 · z tests" }, title: { zh: "完成单样本 z 检验", en: "Run a one-sample z test" }, objective: { zh: "用已知总体标准差计算 z 统计量和双尾 p 值。", en: "Compute a z statistic and two-sided p-value with known population spread." }, explanation: { zh: "z 检验假定总体标准差已知；未知时通常使用 t 检验。", en: "A z test assumes the population standard deviation is known; use a t test when it is estimated." }, task: { zh: "保存 `z_stat` 和 `p_value`。", en: "Save `z_stat` and `p_value`." }, concepts: ["z statistic", "p-value", "known sigma"], packages: ["scipy", "numpy"], starterCode: "import numpy as np\\nfrom scipy import stats\\n\\nsample_mean, mu0, sigma, n = 52, 50, 8, 25\\nz_stat =\\np_value =", hint: { zh: "先算 `(sample_mean - mu0) / (sigma / np.sqrt(n))`，再用 `2 * stats.norm.sf(abs(z_stat))`。", en: "Compute the z statistic, then use `2 * stats.norm.sf(abs(z_stat))`." }, solution: "import numpy as np\\nfrom scipy import stats\\nsample_mean, mu0, sigma, n = 52, 50, 8, 25\\nz_stat = (sample_mean - mu0) / (sigma / np.sqrt(n))\\np_value = 2 * stats.norm.sf(abs(z_stat))", checkCode: "abs(z_stat - 1.25) < 1e-12 and 0.2 < p_value < 0.22", success: { zh: "完成：z 统计量和 p 值已经分开解释。", en: "Complete: the z statistic and p-value are interpreted separately." } },
  { language: "python", prerequisites: ["two-sample-tests"], id: "paired-test", topicId: "hypothesis-testing", unit: "statistics", order: 21, eyebrow: { zh: "第二十一课 · 配对检验", en: "Lesson 21 · Paired tests" }, title: { zh: "检验前后测量的变化", en: "Test change in paired measurements" }, objective: { zh: "用配对 t 检验分析同一对象的前后测量。", en: "Use a paired t test for before-after measurements on the same subjects." }, explanation: { zh: "配对检验首先利用个体内差值，减少基线差异造成的噪声。", en: "Paired tests use within-subject differences to reduce baseline noise." }, task: { zh: "保存 `change` 和检验结果 `test_result`。", en: "Save `change` and the test result." }, concepts: ["paired t-test", "scipy.stats.ttest_rel"], packages: ["numpy", "scipy"], starterCode: "import numpy as np\\nfrom scipy import stats\\n\\nbefore = np.array([68, 72, 75, 70, 66, 74])\\nafter = np.array([72, 75, 79, 73, 70, 78])\\nchange =\\ntest_result =", hint: { zh: "使用 `after - before` 和 `stats.ttest_rel(after, before)`。", en: "Use `after - before` and `stats.ttest_rel(after, before)`." }, solution: "import numpy as np\\nfrom scipy import stats\\nbefore = np.array([68, 72, 75, 70, 66, 74])\\nafter = np.array([72, 75, 79, 73, 70, 78])\\nchange = after - before\\ntest_result = stats.ttest_rel(after, before)", checkCode: "np.all(change > 0) and test_result.pvalue < 0.01", success: { zh: "完成：检验针对每个对象的前后差值。", en: "Complete: the test targets within-subject changes." } },
  { language: "python", prerequisites: ["linear-regression"], id: "polynomial-regression", topicId: "linear-regression", unit: "statistics", order: 22, eyebrow: { zh: "第二十二课 · 多项式回归", en: "Lesson 22 · Polynomial regression" }, title: { zh: "拟合带曲率的回归关系", en: "Fit a curved regression relationship" }, objective: { zh: "用多项式特征表示非线性均值趋势。", en: "Represent a nonlinear mean trend with polynomial features." }, explanation: { zh: "多项式回归仍是线性参数模型，但需要检查外推和过拟合。", en: "Polynomial regression is linear in its parameters but needs checks for extrapolation and overfitting." }, task: { zh: "保存二次模型预测 `predicted` 和均方根误差 `rmse`。", en: "Save quadratic predictions and RMSE." }, concepts: ["polyfit", "polynomial regression", "RMSE"], packages: ["numpy"], starterCode: "import numpy as np\\n\\nx = np.arange(1, 8, dtype=float)\\ny = np.array([3, 5, 9, 15, 23, 33, 45], dtype=float)\\ncoefficients = np.polyfit(x, y, deg=2)\\npredicted =\\nrmse =", hint: { zh: "使用 `np.polyval(coefficients, x)`，再计算平方误差均值的平方根。", en: "Use `np.polyval(coefficients, x)` and take the square root of mean squared error." }, solution: "import numpy as np\\nx = np.arange(1, 8, dtype=float)\\ny = np.array([3, 5, 9, 15, 23, 33, 45], dtype=float)\\ncoefficients = np.polyfit(x, y, deg=2)\\npredicted = np.polyval(coefficients, x)\\nrmse = float(np.sqrt(np.mean((y - predicted) ** 2)))", checkCode: "len(coefficients) == 3 and predicted.shape == y.shape and rmse < 1", success: { zh: "完成：曲率和拟合误差都已量化。", en: "Complete: curvature and fit error are quantified." } },
  { language: "python", prerequisites: ["chi-square-contingency"], id: "nonparametric-tests", topicId: "nonparametric-tests", unit: "statistics", order: 23, eyebrow: { zh: "第二十三课 · 非参数检验", en: "Lesson 23 · Nonparametric tests" }, title: { zh: "使用秩方法比较样本", en: "Compare samples with rank methods" }, objective: { zh: "在分布假设不合适时使用 Mann–Whitney 检验。", en: "Use a Mann–Whitney test when distributional assumptions are unsuitable." }, explanation: { zh: "秩检验比较分布位置或随机优势，不直接等同于均值差。", en: "Rank tests compare distribution location or stochastic dominance, not necessarily means." }, task: { zh: "保存检验结果 `rank_test`。", en: "Save the test result as `rank_test`." }, concepts: ["Mann-Whitney", "rank test", "nonparametric"], packages: ["numpy", "scipy"], starterCode: "import numpy as np\\nfrom scipy import stats\\n\\ngroup_a = np.array([12, 14, 15, 16, 18])\\ngroup_b = np.array([9, 10, 11, 13, 14])\\nrank_test =", hint: { zh: "使用 `stats.mannwhitneyu(group_a, group_b, alternative=\"greater\")`。", en: "Use `stats.mannwhitneyu(group_a, group_b, alternative=\"greater\")`." }, solution: "import numpy as np\\nfrom scipy import stats\\ngroup_a = np.array([12, 14, 15, 16, 18])\\ngroup_b = np.array([9, 10, 11, 13, 14])\\nrank_test = stats.mannwhitneyu(group_a, group_b, alternative=\"greater\")", checkCode: "rank_test.pvalue < 0.05", success: { zh: "完成：秩方法减少了对正态分布形状的依赖。", en: "Complete: the rank method relies less on normality." } },
  { language: "python", prerequisites: ["correlation-test"], id: "spearman-correlation", topicId: "correlation", unit: "statistics", order: 24, eyebrow: { zh: "第二十四课 · Spearman 相关", en: "Lesson 24 · Spearman correlation" }, title: { zh: "用秩相关描述单调关系", en: "Describe a monotonic relationship with rank correlation" }, objective: { zh: "区分 Pearson 线性相关与 Spearman 秩相关。", en: "Distinguish Pearson linear correlation from Spearman rank correlation." }, explanation: { zh: "Spearman 相关衡量单调关系，对异常值和非线性形状的解释方式不同。", en: "Spearman correlation measures monotonic association and differs in sensitivity and interpretation." }, task: { zh: "保存 Spearman 结果 `spearman_result`。", en: "Save the Spearman result." }, concepts: ["spearmanr", "rank correlation", "monotonicity"], packages: ["scipy"], starterCode: "from scipy import stats\\n\\nx = [1, 2, 3, 4, 5, 6]\\ny = [2, 4, 3, 8, 10, 9]\\nspearman_result =", hint: { zh: "使用 `stats.spearmanr(x, y)`。", en: "Use `stats.spearmanr(x, y)`." }, solution: "from scipy import stats\\nx = [1, 2, 3, 4, 5, 6]\\ny = [2, 4, 3, 8, 10, 9]\\nspearman_result = stats.spearmanr(x, y)", checkCode: "0 < spearman_result.statistic <= 1 and spearman_result.pvalue < 0.1", success: { zh: "完成：秩相关与线性相关的含义已区分。", en: "Complete: rank and linear correlation are distinguished." } },
  { language: "python", prerequisites: ["time-series-forecasting"], id: "forecast-error-metrics", topicId: "time-series", unit: "statistics", order: 25, eyebrow: { zh: "第二十五课 · 预测评价", en: "Lesson 25 · Forecast evaluation" }, title: { zh: "比较 MAE、RMSE 与 MAPE", en: "Compare MAE, RMSE, and MAPE" }, objective: { zh: "用多个误差指标评价预测质量，并注意零值问题。", en: "Evaluate forecasts with multiple error metrics and notice the zero-value issue." }, explanation: { zh: "MAE 易解释，RMSE 更惩罚大误差，MAPE 对接近零的真实值不稳定。", en: "MAE is interpretable, RMSE penalizes large errors, and MAPE is unstable near zero." }, task: { zh: "保存 `mae`、`rmse` 和 `mape`。", en: "Save `mae`, `rmse`, and `mape`." }, concepts: ["MAE", "RMSE", "MAPE"], packages: ["numpy"], starterCode: "import numpy as np\\n\\nactual = np.array([100, 110, 90, 120], dtype=float)\\npredicted = np.array([98, 114, 87, 125], dtype=float)\\nmae =\\nrmse =\\nmape =", hint: { zh: "分别计算绝对误差均值、平方误差均值开方和百分比绝对误差均值。", en: "Compute mean absolute error, root mean squared error, and mean absolute percentage error." }, solution: "import numpy as np\\nactual = np.array([100, 110, 90, 120], dtype=float)\\npredicted = np.array([98, 114, 87, 125], dtype=float)\\nmae = float(np.mean(np.abs(actual - predicted)))\\nrmse = float(np.sqrt(np.mean((actual - predicted) ** 2)))\\nmape = float(np.mean(np.abs((actual - predicted) / actual)))", checkCode: "0 < mae < rmse and 0 < mape < 0.1", success: { zh: "完成：不同误差指标的惩罚方式已经比较。", en: "Complete: the penalty patterns of several error metrics are compared." } },
  { language: "python", prerequisites: ["probability-foundations"], id: "probability-events", topicId: "probability-foundations", unit: "statistics", order: 26, eyebrow: { zh: "第二十六课 · 条件概率", en: "Lesson 26 · Conditional probability" }, title: { zh: "用贝叶斯公式更新概率", en: "Update probabilities with Bayes' rule" }, objective: { zh: "区分联合概率、条件概率和后验概率。", en: "Distinguish joint, conditional, and posterior probabilities." }, explanation: { zh: "贝叶斯公式把先验信息与新证据结合。", en: "Bayes' rule combines prior information with evidence." }, task: { zh: "保存阳性检测后的后验概率。", en: "Save the posterior probability after a positive test." }, concepts: ["conditional probability", "Bayes rule"], packages: ["numpy"], starterCode: "prior = 0.01\\nsensitivity = 0.95\\nfalse_positive = 0.05\\nposterior = ", hint: { zh: "使用贝叶斯公式。", en: "Use Bayes' formula." }, solution: "prior = 0.01\\nsensitivity = 0.95\\nfalse_positive = 0.05\\nposterior = prior * sensitivity / (prior * sensitivity + (1 - prior) * false_positive)", checkCode: "0 < posterior < 1", success: { zh: "完成：后验概率同时受到患病率和检测性能影响。", en: "Complete: the posterior depends on prevalence and test performance." } },
  { language: "python", prerequisites: ["probability-distributions"], id: "random-variable-summary", topicId: "random-variables", unit: "statistics", order: 27, eyebrow: { zh: "第二十七课 · 随机变量", en: "Lesson 27 · Random variables" }, title: { zh: "计算离散随机变量的期望与方差", en: "Calculate expectation and variance" }, objective: { zh: "用概率质量函数计算期望和方差。", en: "Calculate expectation and variance from a PMF." }, explanation: { zh: "期望是长期平均，方差衡量围绕期望的波动。", en: "Expectation is a long-run average; variance measures spread." }, task: { zh: "保存期望 `expected_value` 和方差 `variance_value`。", en: "Save expected value and variance." }, concepts: ["PMF", "expectation", "variance"], packages: ["numpy"], starterCode: "import numpy as np\\nvalues = np.array([0, 1, 2, 3])\\nprobabilities = np.array([0.1, 0.2, 0.4, 0.3])\\nexpected_value =\\nvariance_value =", hint: { zh: "使用 `np.sum(values * probabilities)`。", en: "Use weighted sums with NumPy." }, solution: "import numpy as np\\nvalues = np.array([0, 1, 2, 3])\\nprobabilities = np.array([0.1, 0.2, 0.4, 0.3])\\nexpected_value = np.sum(values * probabilities)\\nvariance_value = np.sum((values - expected_value) ** 2 * probabilities)", checkCode: "abs(expected_value - 1.9) < 1e-12 and abs(variance_value - 1.09) < 1e-12", success: { zh: "完成：期望和方差都由 PMF 加权得到。", en: "Complete: expectation and variance are weighted by the PMF." } },
  { language: "python", prerequisites: ["t-distribution"], id: "t-distribution-quantiles", topicId: "t-distribution", unit: "statistics", order: 28, eyebrow: { zh: "第二十八课 · t 分布", en: "Lesson 28 · t distribution" }, title: { zh: "比较不同自由度的临界值", en: "Compare critical values across degrees of freedom" }, objective: { zh: "理解自由度如何影响 t 分布尾部。", en: "Understand how degrees of freedom affect t tails." }, explanation: { zh: "自由度越小，尾部越厚。", en: "Smaller degrees of freedom produce heavier tails." }, task: { zh: "保存两个自由度下的临界值。", en: "Save critical values for two degrees of freedom." }, concepts: ["stats.t.ppf", "degrees of freedom"], packages: ["scipy"], starterCode: "from scipy import stats\\n\\ncritical_df5 =\\ncritical_df50 =", hint: { zh: "使用 `stats.t.ppf(0.975, df)`。", en: "Use `stats.t.ppf(0.975, df)`." }, solution: "from scipy import stats\\ncritical_df5 = stats.t.ppf(0.975, df=5)\\ncritical_df50 = stats.t.ppf(0.975, df=50)", checkCode: "critical_df5 > critical_df50", success: { zh: "完成：自由度越大，t 分布越接近正态分布。", en: "Complete: larger degrees of freedom make t closer to normal." } },
  { language: "python", prerequisites: ["sampling-simulation"], id: "sampling-distribution-sim", topicId: "sampling-distributions", unit: "statistics", order: 29, eyebrow: { zh: "第二十九课 · 抽样分布", en: "Lesson 29 · Sampling distributions" }, title: { zh: "模拟样本均值的标准误", en: "Simulate the standard error of a mean" }, objective: { zh: "区分样本量、重复抽样次数和样本均值的变异。", en: "Distinguish sample size, repetitions, and variation in sample means." }, explanation: { zh: "理论标准误是总体标准差除以样本量平方根。", en: "The theoretical standard error is population spread divided by sqrt(n)." }, task: { zh: "保存样本均值的标准差 `observed_se`。", en: "Save the standard deviation of sample means." }, concepts: ["sampling distribution", "standard error"], packages: ["numpy"], starterCode: "import numpy as np\\nrng = np.random.default_rng(42)\\nmeans = np.array([rng.normal(10, 4, 25).mean() for _ in range(1000)])\\nobserved_se =", hint: { zh: "使用 `means.std(ddof=1)`。", en: "Use `means.std(ddof=1)`." }, solution: "import numpy as np\\nrng = np.random.default_rng(42)\\nmeans = np.array([rng.normal(10, 4, 25).mean() for _ in range(1000)])\\nobserved_se = means.std(ddof=1)", checkCode: "len(means) == 1000 and 0.6 < observed_se < 1", success: { zh: "完成：观察标准误接近理论值 0.8。", en: "Complete: the observed standard error is close to 0.8." } },
  { language: "python", prerequisites: ["one-way-anova"], id: "anova-posthoc", topicId: "anova", unit: "statistics", order: 30, eyebrow: { zh: "第三十课 · 多重比较", en: "Lesson 30 · Multiple comparisons" }, title: { zh: "在 ANOVA 后进行 Tukey 比较", en: "Run Tukey comparisons after ANOVA" }, objective: { zh: "理解整体检验与校正后的两两比较。", en: "Connect an overall test to adjusted pairwise comparisons." }, explanation: { zh: "多重比较需要控制整体错误率。", en: "Multiple comparisons require family-wise error control." }, task: { zh: "保存 Tukey 结果 `posthoc`。", en: "Save Tukey results as `posthoc`." }, concepts: ["Tukey HSD", "multiple comparisons"], packages: ["numpy", "statsmodels"], starterCode: "import numpy as np\\nfrom statsmodels.stats.multicomp import pairwise_tukeyhsd\\n\\nscores = np.array([70, 72, 71, 69, 76, 78, 75, 77, 82, 84, 83, 81])\\ngroups = np.repeat([\"A\", \"B\", \"C\"], 4)\\nposthoc =", hint: { zh: "使用 `pairwise_tukeyhsd(scores, groups)`。", en: "Use `pairwise_tukeyhsd(scores, groups)`." }, solution: "import numpy as np\\nfrom statsmodels.stats.multicomp import pairwise_tukeyhsd\\nscores = np.array([70, 72, 71, 69, 76, 78, 75, 77, 82, 84, 83, 81])\\ngroups = np.repeat([\"A\", \"B\", \"C\"], 4)\\nposthoc = pairwise_tukeyhsd(scores, groups)", checkCode: "hasattr(posthoc, 'summary')", success: { zh: "完成：整体 ANOVA 与校正后的两两比较已经连接。", en: "Complete: ANOVA is connected to adjusted pairwise comparisons." } },
  { language: "python", prerequisites: ["chi-square-contingency"], id: "chi-square-goodness-fit", topicId: "chi-square-test", unit: "statistics", order: 31, eyebrow: { zh: "第三十一课 · 拟合优度", en: "Lesson 31 · Goodness of fit" }, title: { zh: "检验频数是否符合理论比例", en: "Test frequencies against theoretical proportions" }, objective: { zh: "使用卡方拟合优度检验比较观察和期望频数。", en: "Use a chi-square goodness-of-fit test." }, explanation: { zh: "原假设给出各类别的理论比例。", en: "The null hypothesis specifies theoretical category proportions." }, task: { zh: "保存检验结果 `gof_result`。", en: "Save `gof_result`." }, concepts: ["chisquare", "goodness of fit"], packages: ["numpy", "scipy"], starterCode: "import numpy as np\\nfrom scipy import stats\\n\\nobserved = np.array([28, 34, 38])\\nexpected = np.array([1/3, 1/3, 1/3])\\ngof_result =", hint: { zh: "使用 `stats chisquare(f_obs=observed, f_exp=observed.sum() * expected)`。", en: "Use `stats chisquare` with expected counts." }, solution: "import numpy as np\\nfrom scipy import stats\\nobserved = np.array([28, 34, 38])\\nexpected = np.array([1/3, 1/3, 1/3])\\ngof_result = stats.chisquare(f_obs=observed, f_exp=observed.sum() * expected)", checkCode: "gof_result.pvalue > 0", success: { zh: "完成：观察频数已经与理论比例比较。", en: "Complete: observed counts are compared with expected counts." } },
];

export const pythonLessons: PythonLesson[] = rawPythonLessons.map((lesson) => ({
  ...lesson,
  starterCode: normalizeCode(lesson.starterCode),
  solution: normalizeCode(lesson.solution),
}));
