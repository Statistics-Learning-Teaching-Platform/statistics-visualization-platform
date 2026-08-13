import type { CodeLesson } from "../code-learning/types";

export type PythonLesson = CodeLesson<"foundations" | "data" | "visualization" | "statistics", "python">;

export const pythonLessonUnits = [
  { id: "foundations", number: "01", zh: "Python 基础", en: "Python foundations" },
  { id: "data", number: "02", zh: "数据处理", en: "Working with data" },
  { id: "visualization", number: "03", zh: "数据可视化", en: "Visualization" },
  { id: "statistics", number: "04", zh: "统计建模", en: "Statistical modelling" },
] as const;

export const pythonLessons: PythonLesson[] = [
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
];
