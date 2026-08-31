import type { CodeLesson } from "../code-learning/types";
import { getTextbookChapterIdForTopic, type TextbookChapterId } from "../course/textbookChapters";

export type LessonUnit = "foundations" | "data" | "statistics";

export type RLesson = CodeLesson<LessonUnit, "r"> & {
  /** Internal textbook binding. The workspace intentionally does not display it yet. */
  textbookChapterId: TextbookChapterId;
};

type RLessonDraft = Omit<RLesson, "textbookChapterId">;

const normalizeCode = (code: string) => code.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

function isolateCheckCode(checkCode: string, requiresPlot: boolean): string {
  const normalizedCheck = normalizeCode(checkCode).replace(/\\"/g, '"');
  return `check_env <- base::new.env(parent = base::baseenv())
    stats_env <- base::getNamespace("stats")
    stats_names <- base::getNamespaceExports("stats")
    base::list2env(base::mget(stats_names, envir = stats_env, inherits = FALSE), envir = check_env)
    user_names <- base::ls(envir = user, all.names = TRUE)
    safe_user_names <- user_names[base::vapply(user_names, function(name) {
      value <- base::get(name, envir = user, inherits = FALSE)
      !base::is.function(value) || !base::exists(name, envir = check_env, inherits = TRUE)
    }, logical(1))]
    base::list2env(base::mget(safe_user_names, envir = user, inherits = FALSE), envir = check_env)
    ${requiresPlot ? ".statmind_had_plot &&" : ""}
      base::isTRUE(base::eval(base::parse(text = ${JSON.stringify(normalizedCheck)}), envir = check_env))`;
}

export const lessonUnits = [
  { id: "foundations", zh: "R 编程基础", en: "R Foundations", number: "01" },
  { id: "data", zh: "数据与图形", en: "Data & Graphics", number: "02" },
  { id: "statistics", zh: "统计分析", en: "Statistical Analysis", number: "03" },
] as const;

const rawRLessons: RLessonDraft[] = [
  {
    language: "r",
    prerequisites: [],
    id: "vectors-and-mean",
    topicId: "descriptive-statistics",
    unit: "foundations",
    order: 1,
    eyebrow: { zh: "第一课 · 对象与向量", en: "Lesson 1 · Objects and vectors" },
    title: { zh: "保存一组成绩并计算均值", en: "Store scores and calculate their mean" },
    objective: {
      zh: "学习使用 `<-` 创建对象、使用 `c()` 建立向量，并把计算结果保存下来。",
      en: "Use `<-` to create objects, build a vector with `c()`, and store a calculated result.",
    },
    explanation: {
      zh: "R 中的对象可以保存数据或计算结果。向量是一组相同类型的值，也是绝大多数 R 分析的起点。",
      en: "R objects store data or results. A vector is a sequence of values of the same type and the starting point for most R analyses.",
    },
    task: {
      zh: "补全最后一行，把 `scores` 的均值保存为 `average_score`，然后运行并检查答案。",
      en: "Complete the last line so that the mean of `scores` is stored in `average_score`, then run and check your work.",
    },
    concepts: ["<-", "c()", "mean()"],
    starterCode: `# Five students' exam scores
scores <- c(72, 81, 76, 90, 85)

# Store the mean in average_score
average_score <- `,
    hint: {
      zh: "`mean()` 接受一个数值向量。把 `scores` 传给它，并将返回值赋给新对象。",
      en: "`mean()` accepts a numeric vector. Pass `scores` to it and assign the returned value to the new object.",
    },
    solution: `scores <- c(72, 81, 76, 90, 85)
average_score <- mean(scores)
average_score`,
    checkCode: `exists("scores") &&
      is.numeric(scores) &&
      identical(as.numeric(scores), c(72, 81, 76, 90, 85)) &&
      exists("average_score") &&
      is.numeric(average_score) && length(average_score) == 1 &&
      abs(average_score - 80.8) < 1e-8`,
    success: {
      zh: "完成：你已经创建了数值向量，并正确保存了它的均值 80.8。",
      en: "Complete: you created a numeric vector and correctly stored its mean, 80.8.",
    },
  },
  {
    language: "r",
    prerequisites: ["vectors-and-mean"],
    id: "data-frame-filter",
    topicId: "data-and-variables",
    unit: "data",
    order: 2,
    eyebrow: { zh: "第二课 · 数据框", en: "Lesson 2 · Data frames" },
    title: { zh: "筛选满足条件的观测", en: "Filter observations by a condition" },
    objective: {
      zh: "认识数据框的行和列，并使用 `subset()` 根据变量条件筛选记录。",
      en: "Work with rows and columns in a data frame and use `subset()` to filter records.",
    },
    explanation: {
      zh: "数据框把多个变量组织成表格。每一行是一条观测，每一列是一个变量。",
      en: "A data frame organises variables as a table. Each row is one observation and each column is one variable.",
    },
    task: {
      zh: "创建 `high_scores`，只保留分数大于或等于 80 的学生；再将这些学生的平均分保存为 `high_score_mean`。",
      en: "Create `high_scores` containing only students with scores of at least 80, then store their mean score in `high_score_mean`.",
    },
    concepts: ["data.frame()", "subset()", "$"],
    starterCode: `students <- data.frame(
  name = c("Ava", "Ben", "Cora", "Dylan"),
  hours = c(3, 5, 7, 4),
  score = c(72, 84, 91, 78)
)

# Keep rows where score is at least 80
high_scores <-

# Calculate the mean score of the filtered rows
high_score_mean <- `,
    hint: {
      zh: "先用 `subset(students, score >= 80)`，然后用 `$score` 取出筛选结果中的分数列。",
      en: "Start with `subset(students, score >= 80)`, then use `$score` to access the score column in the filtered result.",
    },
    solution: `students <- data.frame(
  name = c("Ava", "Ben", "Cora", "Dylan"),
  hours = c(3, 5, 7, 4),
  score = c(72, 84, 91, 78)
)
high_scores <- subset(students, score >= 80)
high_score_mean <- mean(high_scores$score)
high_scores
high_score_mean`,
    checkCode: `exists("students") && is.data.frame(students) &&
      exists("high_scores") && is.data.frame(high_scores) &&
      identical(as.character(high_scores$name), c("Ben", "Cora")) &&
      exists("high_score_mean") && abs(high_score_mean - 87.5) < 1e-8`,
    success: {
      zh: "完成：筛选结果包含 Ben 和 Cora，平均分为 87.5。",
      en: "Complete: the filtered data contains Ben and Cora, with a mean score of 87.5.",
    },
  },
  {
    language: "r",
    prerequisites: ["vectors-and-mean"],
    id: "first-histogram",
    topicId: "histograms",
    unit: "data",
    order: 3,
    eyebrow: { zh: "第三课 · 基础绘图", en: "Lesson 3 · Base graphics" },
    title: { zh: "用直方图观察等待时间", en: "Visualise waiting times with a histogram" },
    objective: {
      zh: "使用 `hist()` 绘制直方图，并理解数据、标题和坐标标签之间的关系。",
      en: "Draw a histogram with `hist()` and connect the data to its title and axis label.",
    },
    explanation: {
      zh: "直方图把数值变量分组后显示频数，可以快速观察分布的中心、离散程度与形状。",
      en: "A histogram groups a numeric variable into bins, revealing its centre, spread, and shape.",
    },
    task: {
      zh: "补全 `hist()`：使用 `waiting_time`，标题设为 `Waiting Time`，横轴标签设为 `Minutes`。",
      en: "Complete `hist()` using `waiting_time`, the title `Waiting Time`, and the x-axis label `Minutes`.",
    },
    concepts: ["hist()", "main", "xlab"],
    starterCode: `waiting_time <- c(4, 6, 7, 8, 8, 9, 10, 12, 13, 15, 18, 21)

# Complete the histogram command
hist(

)

# Keep this marker after your plot
plot_created <- TRUE`,
    hint: {
      zh: '函数形式为 `hist(data, main = "title", xlab = "label")`。还可以加入 `col = "#6f8f7a"`。',
      en: 'Use `hist(data, main = "title", xlab = "label")`. You may also add `col = "#6f8f7a"`.',
    },
    solution: `waiting_time <- c(4, 6, 7, 8, 8, 9, 10, 12, 13, 15, 18, 21)
hist(
  waiting_time,
  main = "Waiting Time",
  xlab = "Minutes",
  col = "#6f8f7a",
  border = "white"
)
plot_created <- TRUE`,
    checkCode: `exists("waiting_time") && length(waiting_time) == 12 &&
      identical(as.numeric(waiting_time), c(4, 6, 7, 8, 8, 9, 10, 12, 13, 15, 18, 21)) &&
      exists("plot_created") && isTRUE(plot_created)`,
    success: {
      zh: "完成：代码成功生成直方图。现在可以在右侧“图形”标签中检查分布。",
      en: "Complete: your code produced a histogram. Inspect the distribution in the Plot tab.",
    },
  },
  {
    language: "r",
    prerequisites: ["vectors-and-mean"],
    id: "one-sample-t-test",
    topicId: "hypothesis-testing",
    unit: "statistics",
    order: 4,
    eyebrow: { zh: "第四课 · 假设检验", en: "Lesson 4 · Hypothesis testing" },
    title: { zh: "完成单样本 t 检验", en: "Run a one-sample t test" },
    objective: {
      zh: "使用 `t.test()` 检验总体均值，并从检验对象中提取 p 值。",
      en: "Use `t.test()` to test a population mean and extract the p-value from the test object.",
    },
    explanation: {
      zh: "当总体标准差未知时，单样本 t 检验比较样本均值与假设均值，同时考虑样本的不确定性。",
      en: "When the population standard deviation is unknown, a one-sample t test compares a sample mean with a hypothesised mean while accounting for uncertainty.",
    },
    task: {
      zh: "检验平均等待时间是否不同于 10 分钟，将完整检验保存为 `test_result`，p 值保存为 `p_value`。",
      en: "Test whether the mean waiting time differs from 10 minutes. Store the test in `test_result` and its p-value in `p_value`.",
    },
    concepts: ["t.test()", "mu", "p.value"],
    starterCode: `wait <- c(8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9)

# Two-sided one-sample t test with hypothesised mean 10
test_result <-

# Extract the p-value
p_value <-

test_result`,
    hint: {
      zh: '使用 `t.test(wait, mu = 10, alternative = "two.sided")`，并通过 `$p.value` 访问结果。',
      en: 'Use `t.test(wait, mu = 10, alternative = "two.sided")`, then access the result with `$p.value`.',
    },
    solution: `wait <- c(8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9)
test_result <- t.test(wait, mu = 10, alternative = "two.sided")
p_value <- test_result$p.value
test_result`,
    checkCode: `exists("test_result") && inherits(test_result, "htest") &&
      identical(as.character(test_result$alternative), "true mean is not equal to 10") &&
      exists("p_value") && is.numeric(p_value) &&
      abs(p_value - t.test(wait, mu = 10)$p.value) < 1e-10`,
    success: {
      zh: "完成：检验方向、假设均值和 p 值均正确。请结合显著性水平解释结论。",
      en: "Complete: the test direction, hypothesised mean, and p-value are correct. Now interpret the result at your chosen significance level.",
    },
  },
  {
    language: "r",
    prerequisites: ["data-frame-filter"],
    id: "linear-regression",
    topicId: "linear-regression",
    unit: "statistics",
    order: 5,
    eyebrow: { zh: "第五课 · 线性回归", en: "Lesson 5 · Linear regression" },
    title: { zh: "拟合学习时间与成绩的关系", en: "Model study time and exam score" },
    objective: {
      zh: "使用公式语法拟合线性模型，并从模型系数中提取斜率。",
      en: "Fit a linear model with formula syntax and extract its slope from the model coefficients.",
    },
    explanation: {
      zh: "`lm(y ~ x, data = ...)` 用直线描述结果变量 y 与解释变量 x 的平均关系。",
      en: "`lm(y ~ x, data = ...)` uses a straight line to describe the average relationship between an outcome y and a predictor x.",
    },
    task: {
      zh: "用 `score` 对 `hours` 拟合模型并保存为 `model`，再把 hours 的系数保存为 `slope`。",
      en: "Regress `score` on `hours`, save the model as `model`, and store the coefficient of hours in `slope`.",
    },
    concepts: ["lm()", "formula", "coef()"],
    starterCode: `study <- data.frame(
  hours = c(1, 2, 3, 4, 5, 6),
  score = c(52, 57, 65, 70, 78, 84)
)

# Fit score as a function of hours
model <-

# Extract the slope as an ordinary number
slope <-

summary(model)`,
    hint: {
      zh: '模型写作 `lm(score ~ hours, data = study)`；斜率可以用 `unname(coef(model)["hours"])` 提取。',
      en: 'Fit `lm(score ~ hours, data = study)` and extract the slope with `unname(coef(model)["hours"])`.',
    },
    solution: `study <- data.frame(
  hours = c(1, 2, 3, 4, 5, 6),
  score = c(52, 57, 65, 70, 78, 84)
)
model <- lm(score ~ hours, data = study)
slope <- unname(coef(model)["hours"])
summary(model)`,
    checkCode: `exists("model") && inherits(model, "lm") &&
      identical(as.character(formula(model)), "score ~ hours") &&
      exists("slope") && is.numeric(slope) && length(slope) == 1 &&
      abs(slope - unname(coef(lm(score ~ hours, data = study))["hours"])) < 1e-10`,
    success: {
      zh: "完成：模型设定和斜率均正确。斜率表示学习时间每增加 1 小时，预测成绩的平均变化。",
      en: "Complete: the model and slope are correct. The slope is the expected score change associated with one additional study hour.",
    },
  },
  {
    language: "r",
    prerequisites: ["vectors-and-mean", "first-histogram"],
    id: "sampling-simulation",
    topicId: "central-limit-theorem",
    unit: "statistics",
    order: 6,
    eyebrow: { zh: "第六课 · 抽样模拟", en: "Lesson 6 · Sampling simulation" },
    title: { zh: "模拟样本均值的抽样分布", en: "Simulate a sampling distribution" },
    objective: {
      zh: "使用 `replicate()` 重复抽样，并观察样本均值如何围绕总体均值变化。",
      en: "Use `replicate()` for repeated sampling and observe how sample means vary around the population mean.",
    },
    explanation: {
      zh: "模拟把一次随机抽样重复很多次，使抽样变异和中心极限定理变得可见。",
      en: "Simulation repeats random sampling many times, making sampling variability and the central limit theorem visible.",
    },
    task: {
      zh: "生成 500 个样本均值，每个样本包含 30 个来自均值 100、标准差 15 的正态观测；将结果保存为 `sample_means`。",
      en: "Generate 500 sample means. Each sample must contain 30 normal observations with mean 100 and standard deviation 15. Store the result in `sample_means`.",
    },
    concepts: ["set.seed()", "replicate()", "rnorm()"],
    starterCode: `set.seed(42)

# Repeat the sampling experiment 500 times
sample_means <- replicate(
  500,
  # Replace the next line
  0
)

mean(sample_means)
sd(sample_means)
hist(sample_means, col = "#8d75b5", border = "white")`,
    hint: {
      zh: "每次重复都应计算 `mean(rnorm(30, mean = 100, sd = 15))`。",
      en: "Each repetition should calculate `mean(rnorm(30, mean = 100, sd = 15))`.",
    },
    solution: `set.seed(42)
sample_means <- replicate(
  500,
  mean(rnorm(30, mean = 100, sd = 15))
)
mean(sample_means)
sd(sample_means)
hist(sample_means, col = "#8d75b5", border = "white")`,
    checkCode: `exists("sample_means") && is.numeric(sample_means) &&
      length(sample_means) == 500 &&
      abs(mean(sample_means) - 100) < 1 &&
      sd(sample_means) > 1.5 && sd(sample_means) < 4`,
    success: {
      zh: "完成：你生成了 500 个有效样本均值，其中心与标准误符合理论预期。",
      en: "Complete: you generated 500 valid sample means whose centre and standard error agree with theory.",
    },
  },
  {
    language: "r",
    prerequisites: ["vectors-and-mean", "sampling-simulation"],
    id: "mean-confidence-interval",
    topicId: "confidence-interval",
    unit: "statistics",
    order: 7,
    eyebrow: { zh: "第七课 · 区间估计", en: "Lesson 7 · Interval estimation" },
    title: { zh: "构造总体均值的 95% 置信区间", en: "Build a 95% confidence interval for a mean" },
    objective: {
      zh: "使用 `t.test()` 构造均值置信区间，并把区间端点与误差界限保存为可复用对象。",
      en: "Use `t.test()` to construct a confidence interval for a mean and store its endpoints and margin of error.",
    },
    explanation: {
      zh: "总体标准差未知时，均值区间使用样本标准误和 t 临界值。95% 置信度描述重复抽样下这种构造方法的长期覆盖率。",
      en: "When the population standard deviation is unknown, a mean interval uses the sample standard error and a t critical value. The 95% level describes the method's long-run coverage under repeated sampling.",
    },
    task: {
      zh: "对等待时间构造 95% 置信区间，将完整结果保存为 `ci_result`、两个端点保存为 `confidence_interval`，并计算 `margin_of_error`。",
      en: "Construct a 95% interval for the waiting times. Save the full result as `ci_result`, the endpoints as `confidence_interval`, and calculate `margin_of_error`.",
    },
    concepts: ["t.test()", "conf.int", "margin of error"],
    starterCode: `wait <- c(8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9)

# Construct a 95% confidence interval for the population mean
ci_result <-

# Extract the two endpoints
confidence_interval <-

# Half of the interval width
margin_of_error <-

confidence_interval`,
    hint: {
      zh: "先运行 `t.test(wait, conf.level = 0.95)`，用 `$conf.int` 取得端点；误差界限等于 `(上限 - 下限) / 2`。",
      en: "Run `t.test(wait, conf.level = 0.95)`, extract `$conf.int`, and compute half of the interval width.",
    },
    solution: `wait <- c(8.2, 9.1, 10.4, 11.2, 9.7, 12.1, 10.8, 8.9)
ci_result <- t.test(wait, conf.level = 0.95)
confidence_interval <- unname(ci_result$conf.int)
margin_of_error <- diff(confidence_interval) / 2
confidence_interval`,
    checkCode: `exists("ci_result") && inherits(ci_result, "htest") &&
      exists("confidence_interval") && is.numeric(confidence_interval) &&
      length(confidence_interval) == 2 &&
      max(abs(confidence_interval - unname(t.test(wait, conf.level = 0.95)$conf.int))) < 1e-10 &&
      exists("margin_of_error") && is.numeric(margin_of_error) &&
      abs(margin_of_error - diff(confidence_interval) / 2) < 1e-10`,
    success: {
      zh: "完成：你已正确构造 95% 均值置信区间，并提取了端点与误差界限。",
      en: "Complete: you correctly constructed the 95% mean confidence interval and extracted its endpoints and margin of error.",
    },
  },
  {
    language: "r",
    prerequisites: ["data-frame-filter"],
    id: "summary-and-boxplot",
    topicId: "descriptive-statistics",
    unit: "data",
    order: 8,
    eyebrow: { zh: "第八课 · 描述统计", en: "Lesson 8 · Descriptive statistics" },
    title: { zh: "用 summary 和箱线图检查离群值", en: "Summarise data and inspect outliers" },
    objective: {
      zh: "使用 `summary()` 和 `boxplot()` 观察中心、四分位数与潜在离群值。",
      en: "Use `summary()` and `boxplot()` to inspect centre, quartiles, and potential outliers.",
    },
    explanation: {
      zh: "箱线图把中位数、四分位距和离群观测放在同一图形中；它比只看均值更能揭示偏斜和极端值。",
      en: "A boxplot shows the median, IQR, and outliers together, often revealing skew and extremes that a mean alone hides.",
    },
    task: {
      zh: "生成五数概括 `summary_stats`，并用 `boxplot()` 保存图形对象 `boxplot_result`。",
      en: "Create a five-number summary as `summary_stats` and save the boxplot object as `boxplot_result`.",
    },
    concepts: ["summary()", "boxplot()", "IQR"],
    starterCode: `wait <- c(8, 9, 9, 10, 10, 11, 12, 13, 28)

summary_stats <-
boxplot_result <-

summary_stats`,
    hint: {
      zh: "`summary(wait)` 返回最小值、四分位数、中位数、均值和最大值；`boxplot(wait, plot = FALSE)` 可保存统计结果。",
      en: "Use `summary(wait)` for the five-number summary and `boxplot(wait, plot = FALSE)` to store boxplot statistics.",
    },
    solution: `wait <- c(8, 9, 9, 10, 10, 11, 12, 13, 28)
summary_stats <- summary(wait)
boxplot_result <- boxplot(wait, plot = FALSE)
summary_stats`,
    checkCode: `exists("summary_stats") && length(summary_stats) == 6 &&
      exists("boxplot_result") && is.list(boxplot_result) &&
      abs(as.numeric(summary_stats[["Median"]]) - median(wait)) < 1e-10 &&
      length(boxplot_result$out) >= 1`,
    success: {
      zh: "完成：你已用五数概括和箱线图识别出极端等待时间。",
      en: "Complete: the five-number summary and boxplot reveal the extreme waiting time.",
    },
  },
  {
    language: "r",
    prerequisites: ["first-histogram"],
    id: "qq-normality",
    topicId: "normal-distribution",
    unit: "data",
    order: 9,
    eyebrow: { zh: "第九课 · 分布诊断", en: "Lesson 9 · Distribution diagnostics" },
    title: { zh: "用 QQ 图检查正态性", en: "Check normality with a QQ plot" },
    objective: {
      zh: "使用 `qqnorm()` 与 `qqline()` 比较样本分位数和正态理论分位数。",
      en: "Use `qqnorm()` and `qqline()` to compare sample and theoretical normal quantiles.",
    },
    explanation: {
      zh: "如果点大致沿直线排列，正态分布是一个合理的近似；尾部弯曲通常提示偏态或重尾。",
      en: "Points close to a straight line support a normal approximation; systematic tail curvature suggests skew or heavy tails.",
    },
    task: {
      zh: "对 `scores` 生成 QQ 图，保存点和参考线的返回对象。",
      en: "Create a QQ plot for `scores` and save the point and reference-line results.",
    },
    concepts: ["qqnorm()", "qqline()", "normal quantiles"],
    starterCode: `scores <- c(72, 76, 78, 81, 83, 84, 86, 89, 94, 101)

qq_points <-
qq_line <-
qq_points`,
    hint: {
      zh: "使用 `qqnorm(scores, plot.it = FALSE)` 得到点，再用 `qqline(scores, plot.it = FALSE)` 得到参考线参数。",
      en: "Use `qqnorm(scores, plot.it = FALSE)` for points and `qqline(scores, plot.it = FALSE)` for the reference line.",
    },
    solution: `scores <- c(72, 76, 78, 81, 83, 84, 86, 89, 94, 101)
qq_points <- qqnorm(scores, plot.it = FALSE)
qq_line <- qqline(scores, plot.it = FALSE)
qq_points`,
    checkCode: `exists("qq_points") && is.list(qq_points) &&
      length(qq_points$x) == length(scores) &&
      exists("qq_line") && is.list(qq_line) &&
      length(qq_line$y) == 2`,
    success: {
      zh: "完成：QQ 图的理论分位数和样本分位数已准备好比较。",
      en: "Complete: the theoretical and sample quantiles are ready to compare.",
    },
  },
  {
    language: "r",
    prerequisites: ["one-sample-t-test"],
    id: "two-sample-t-test",
    topicId: "hypothesis-testing",
    unit: "statistics",
    order: 10,
    eyebrow: { zh: "第十课 · 两组比较", en: "Lesson 10 · Comparing two groups" },
    title: { zh: "比较两组均值", en: "Compare two group means" },
    objective: {
      zh: "使用独立样本 t 检验比较两组均值，并提取差异的置信区间。",
      en: "Use an independent-samples t test and extract the confidence interval for the difference.",
    },
    explanation: {
      zh: "两组 t 检验考察均值差是否足以超出抽样变异；p 值需要结合效应大小和区间解释。",
      en: "A two-sample t test asks whether the mean difference is large relative to sampling variation; interpret p-values with effect size and intervals.",
    },
    task: {
      zh: "比较两种教学方法的成绩，将结果保存为 `test_result`，均值差保存为 `mean_difference`。",
      en: "Compare scores from two teaching methods and save the test as `test_result` and the mean difference as `mean_difference`.",
    },
    concepts: ["t.test()", "two samples", "mean difference"],
    starterCode: `method_a <- c(72, 75, 78, 80, 82, 79)
method_b <- c(78, 81, 83, 85, 87, 84)

test_result <-
mean_difference <-

test_result`,
    hint: {
      zh: "使用 `t.test(method_b, method_a)`；均值差可以用 `mean(method_b) - mean(method_a)`。",
      en: "Use `t.test(method_b, method_a)` and compute `mean(method_b) - mean(method_a)`.",
    },
    solution: `method_a <- c(72, 75, 78, 80, 82, 79)
method_b <- c(78, 81, 83, 85, 87, 84)
test_result <- t.test(method_b, method_a)
mean_difference <- mean(method_b) - mean(method_a)
test_result`,
    checkCode: `exists("test_result") && inherits(test_result, "htest") &&
      exists("mean_difference") && abs(mean_difference - (mean(method_b) - mean(method_a))) < 1e-10 &&
      length(test_result$conf.int) == 2`,
    success: {
      zh: "完成：两组均值差、t 检验和差异区间均已计算。",
      en: "Complete: the mean difference, t test, and interval for the difference are available.",
    },
  },
  {
    language: "r",
    prerequisites: ["two-sample-t-test"],
    id: "one-way-anova",
    topicId: "anova",
    unit: "statistics",
    order: 11,
    eyebrow: { zh: "第十一课 · 方差分析", en: "Lesson 11 · Analysis of variance" },
    title: { zh: "比较三个总体均值", en: "Compare three population means" },
    objective: {
      zh: "使用 `aov()` 和 `summary()` 检查三组均值是否存在整体差异。",
      en: "Use `aov()` and `summary()` to test for an overall difference among three means.",
    },
    explanation: {
      zh: "ANOVA 把总变异拆成组间和组内两部分；显著的 F 检验只说明至少有一组不同，不能直接告诉你是哪一组。",
      en: "ANOVA decomposes total variation into between- and within-group components; a significant F test says at least one group differs, not which one.",
    },
    task: {
      zh: "拟合 `score ~ group` 的模型，将模型保存为 `anova_model`，并提取 p 值 `anova_p`。",
      en: "Fit `score ~ group`, save it as `anova_model`, and extract the p-value as `anova_p`.",
    },
    concepts: ["aov()", "F statistic", "within-group variation"],
    starterCode: `group <- factor(rep(c("A", "B", "C"), each = 5))
score <- c(71, 72, 70, 73, 69, 78, 80, 77, 79, 81, 86, 88, 84, 87, 89)

anova_model <-
anova_p <-

summary(anova_model)`,
    hint: {
      zh: '先用 `aov(score ~ group)`，再从 `summary(anova_model)[[1]][["Pr(>F)"]][1]` 取 p 值。',
      en: 'Fit `aov(score ~ group)` and read the first p-value from `summary(anova_model)[[1]][["Pr(>F)"]][1]`.',
    },
    solution: `group <- factor(rep(c("A", "B", "C"), each = 5))
score <- c(71, 72, 70, 73, 69, 78, 80, 77, 79, 81, 86, 88, 84, 87, 89)
anova_model <- aov(score ~ group)
anova_p <- summary(anova_model)[[1]][["Pr(>F)"]][1]
summary(anova_model)`,
    checkCode: `exists("anova_model") && inherits(anova_model, "aov") &&
      exists("anova_p") && is.numeric(anova_p) && length(anova_p) == 1 && anova_p < 0.05`,
    success: {
      zh: "完成：整体 F 检验显示三组均值并不完全相同。",
      en: "Complete: the overall F test indicates that the three group means are not all equal.",
    },
  },
  {
    language: "r",
    prerequisites: ["linear-regression"],
    id: "correlation-test",
    topicId: "correlation",
    unit: "statistics",
    order: 12,
    eyebrow: { zh: "第十二课 · 相关分析", en: "Lesson 12 · Correlation" },
    title: { zh: "检验两个变量的线性相关", en: "Test a linear correlation" },
    objective: {
      zh: "使用 `cor.test()` 同时获得相关系数和线性相关的 p 值。",
      en: "Use `cor.test()` to obtain a correlation coefficient and a p-value for linear association.",
    },
    explanation: {
      zh: "相关描述线性关联，不等于因果关系；散点图、研究设计和变量单位同样重要。",
      en: "Correlation describes linear association, not causation; inspect the scatterplot, design, and units as well.",
    },
    task: {
      zh: "检验学习时间和成绩的 Pearson 相关，将检验结果保存为 `correlation_result`，相关系数保存为 `r_value`。",
      en: "Test the Pearson correlation between study time and score and save the result and coefficient.",
    },
    concepts: ["cor.test()", "Pearson r", "association"],
    starterCode: `hours <- c(1, 2, 3, 4, 5, 6, 7)
score <- c(54, 58, 63, 68, 72, 79, 83)

correlation_result <-
r_value <-

correlation_result`,
    hint: {
      zh: '使用 `cor.test(hours, score, method = "pearson")`，再读取 `$estimate`。',
      en: 'Use `cor.test(hours, score, method = "pearson")` and read `$estimate`.',
    },
    solution: `hours <- c(1, 2, 3, 4, 5, 6, 7)
score <- c(54, 58, 63, 68, 72, 79, 83)
correlation_result <- cor.test(hours, score, method = "pearson")
r_value <- unname(correlation_result$estimate)
correlation_result`,
    checkCode: `exists("correlation_result") && inherits(correlation_result, "htest") &&
      exists("r_value") && abs(r_value - cor(hours, score)) < 1e-10 && r_value > 0.9`,
    success: {
      zh: "完成：相关系数与相关检验结果一致；请记住这不是因果证明。",
      en: "Complete: the coefficient and test agree; remember that this is not evidence of causation.",
    },
  },
  {
    language: "r",
    prerequisites: ["data-frame-filter"],
    id: "chi-square-contingency",
    topicId: "chi-square-test",
    unit: "statistics",
    order: 13,
    eyebrow: { zh: "第十三课 · 分类数据", en: "Lesson 13 · Categorical data" },
    title: { zh: "检验列联表中的独立性", en: "Test independence in a contingency table" },
    objective: {
      zh: "使用 `chisq.test()` 比较观察频数和独立性假设下的期望频数。",
      en: "Use `chisq.test()` to compare observed counts with expected counts under independence.",
    },
    explanation: {
      zh: "卡方独立性检验针对分类变量之间的关联；小期望频数时需要合并类别或采用精确方法。",
      en: "A chi-square independence test examines association between categorical variables; small expected counts require care.",
    },
    task: {
      zh: "对学习方式和是否通过考试的列联表进行检验，保存结果和期望频数。",
      en: "Test the association between study mode and passing, saving the result and expected counts.",
    },
    concepts: ["chisq.test()", "contingency table", "expected counts"],
    starterCode: `counts <- matrix(c(32, 8, 24, 16), nrow = 2, byrow = TRUE)
dimnames(counts) <- list(
  study = c("group", "self"),
  outcome = c("pass", "fail")
)

chi_result <-
expected_counts <-

chi_result`,
    hint: {
      zh: "运行 `chisq.test(counts, correct = FALSE)`，期望频数在 `$expected`。",
      en: "Run `chisq.test(counts, correct = FALSE)` and read expected counts from `$expected`.",
    },
    solution: `counts <- matrix(c(32, 8, 24, 16), nrow = 2, byrow = TRUE)
dimnames(counts) <- list(study = c("group", "self"), outcome = c("pass", "fail"))
chi_result <- chisq.test(counts, correct = FALSE)
expected_counts <- chi_result$expected
chi_result`,
    checkCode: `exists("chi_result") && inherits(chi_result, "htest") &&
      exists("expected_counts") && all(dim(expected_counts) == dim(counts)) &&
      max(abs(expected_counts - chi_result$expected)) < 1e-10`,
    success: {
      zh: "完成：观察频数、期望频数和独立性检验结果均已得到。",
      en: "Complete: observed counts, expected counts, and the independence test are available.",
    },
  },
  {
    language: "r",
    prerequisites: ["sampling-simulation"],
    id: "time-series-rolling",
    topicId: "time-series",
    unit: "statistics",
    order: 14,
    eyebrow: { zh: "第十四课 · 时间序列", en: "Lesson 14 · Time series" },
    title: { zh: "计算移动平均并评价预测误差", en: "Compute a moving average and forecast error" },
    objective: {
      zh: "用 `filter()` 计算三期移动平均，并用 MAE 比较预测与观测。",
      en: "Use `filter()` for a three-period moving average and evaluate it with MAE.",
    },
    explanation: {
      zh: "移动平均平滑短期波动，但会牺牲响应速度；预测误差应在同一尺度上解释。",
      en: "A moving average smooths short-term noise at the cost of responsiveness; interpret errors on the original scale.",
    },
    task: {
      zh: "计算居中的三期移动平均 `moving_average`，并把非缺失预测与观测的平均绝对误差保存为 `mae`。",
      en: "Compute a centred three-period moving average and save the MAE for non-missing predictions.",
    },
    concepts: ["ts", "filter()", "MAE"],
    starterCode: `sales <- ts(c(20, 22, 25, 24, 28, 31, 30, 34))

moving_average <-
valid <- !is.na(moving_average)
mae <-

mae`,
    hint: {
      zh: "使用 `stats::filter(sales, rep(1/3, 3), sides = 2)`；MAE 是 `mean(abs(sales[valid] - moving_average[valid]))`。",
      en: "Use `stats::filter(sales, rep(1/3, 3), sides = 2)` and average the absolute errors where the forecast is not missing.",
    },
    solution: `sales <- ts(c(20, 22, 25, 24, 28, 31, 30, 34))
moving_average <- stats::filter(sales, rep(1/3, 3), sides = 2)
valid <- !is.na(moving_average)
mae <- mean(abs(sales[valid] - moving_average[valid]))
mae`,
    checkCode: `exists("moving_average") && length(moving_average) == length(sales) &&
      exists("mae") && is.numeric(mae) && length(mae) == 1 && mae > 0`,
    success: {
      zh: "完成：三期移动平均和 MAE 已计算，可继续比较其他预测方法。",
      en: "Complete: the three-period moving average and MAE are ready for comparison.",
    },
  },
  {
    language: "r",
    prerequisites: ["vectors-and-mean"],
    id: "r-ecosystem",
    topicId: "statistics-foundations",
    unit: "foundations",
    order: 15,
    eyebrow: { zh: "第十五课 · R 环境", en: "Lesson 15 · The R ecosystem" },
    title: { zh: "认识 RStudio 与可复现脚本", en: "Work with RStudio and reproducible scripts" },
    objective: {
      zh: "理解脚本、工作区和包的关系，建立可复现的分析习惯。",
      en: "Understand scripts, workspaces, and packages as the basis of reproducible analysis.",
    },
    explanation: {
      zh: "把分析步骤写进脚本，避免只依赖控制台历史。",
      en: "Keep analysis steps in a script instead of relying on console history.",
    },
    task: {
      zh: "记录分析名称和当前 R 版本。",
      en: "Record an analysis name and the current R version.",
    },
    concepts: ["RStudio", "script", "sessionInfo()"],
    starterCode: 'analysis_name <- \\"descriptive statistics\\"\\nr_version <- ',
    hint: { zh: "使用 `R.version.string`。", en: "Use `R.version.string`." },
    solution: 'analysis_name <- \\"descriptive statistics\\"\\nr_version <- R.version.string',
    checkCode:
      'exists(\\"analysis_name\\") && is.character(analysis_name) && exists(\\"r_version\\") && is.character(r_version)',
    success: { zh: "完成：运行环境已记录。", en: "Complete: the runtime environment is recorded." },
  },
  {
    language: "r",
    prerequisites: ["r-ecosystem"],
    id: "r-data-import",
    topicId: "data-and-variables",
    unit: "data",
    order: 16,
    eyebrow: { zh: "第十六课 · 导入数据", en: "Lesson 16 · Import data" },
    title: { zh: "从文本表格建立数据框", en: "Build a data frame from tabular text" },
    objective: {
      zh: "理解列名、分隔符和导入后的数据结构。",
      en: "Understand headers, separators, and the imported structure.",
    },
    explanation: {
      zh: "导入设置会影响列类型、缺失值和后续分析。",
      en: "Import settings affect column types, missing values, and later analyses.",
    },
    task: {
      zh: "把文本读成 `survey`，保存行数和列数。",
      en: "Read the text into `survey` and save row and column counts.",
    },
    concepts: ["read.csv()", "header", "str()"],
    starterCode:
      'raw <- \\"id,group,score\\\\n1,A,82\\\\n2,B,76\\\\n3,A,91\\"\\nsurvey <- \\nn_rows <- \\nn_cols <- ',
    hint: {
      zh: "使用 `read.csv(text = raw, header = TRUE)`。",
      en: "Use `read.csv(text = raw, header = TRUE)`.",
    },
    solution:
      'raw <- \\"id,group,score\\\\n1,A,82\\\\n2,B,76\\\\n3,A,91\\"\\nsurvey <- read.csv(text = raw, header = TRUE)\\nn_rows <- nrow(survey)\\nn_cols <- ncol(survey)',
    checkCode: "is.data.frame(survey) && n_rows == 3 && n_cols == 3",
    success: { zh: "完成：数据结构检查通过。", en: "Complete: the data structure checks out." },
  },
  {
    language: "r",
    prerequisites: ["data-frame-filter"],
    id: "r-stem-leaf",
    topicId: "visual-encoding",
    unit: "data",
    order: 17,
    eyebrow: { zh: "第十七课 · 茎叶图", en: "Lesson 17 · Stem-and-leaf plots" },
    title: { zh: "用茎叶图观察分布", en: "Inspect a distribution with a stem-and-leaf plot" },
    objective: {
      zh: "使用 `stem()` 查看分布形状。",
      en: "Use `stem()` to inspect distribution shape.",
    },
    explanation: {
      zh: "茎叶图保留原始数值，同时提供紧凑的分布概览。",
      en: "A stem-and-leaf plot keeps original values while showing shape compactly.",
    },
    task: { zh: "保存茎叶图输出并计算中位数。", en: "Save the display and calculate the median." },
    concepts: ["stem()", "median()"],
    starterCode:
      "scores <- c(61, 64, 67, 72, 74, 75, 81, 88, 90)\\nstem_display <- \\nmedian_score <- ",
    hint: {
      zh: "使用 `capture.output(stem(scores))` 和 `median(scores)`。",
      en: "Use `capture.output(stem(scores))` and `median(scores)`.",
    },
    solution:
      "scores <- c(61, 64, 67, 72, 74, 75, 81, 88, 90)\\nstem_display <- capture.output(stem(scores))\\nmedian_score <- median(scores)",
    checkCode: "length(stem_display) > 0 && median_score == 74",
    success: {
      zh: "完成：分布输出与中心统计量已保存。",
      en: "Complete: the display and centre statistic are saved.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-stem-leaf"],
    id: "r-barplot-categorical",
    topicId: "visual-encoding",
    unit: "data",
    order: 18,
    eyebrow: { zh: "第十八课 · 分类图形", en: "Lesson 18 · Categorical graphics" },
    title: { zh: "绘制分类频数柱状图", en: "Plot categorical frequencies" },
    objective: {
      zh: "用 `table()` 汇总分类变量，再用 `barplot()` 表达频数。",
      en: "Summarize categories with `table()` and display frequencies with `barplot()`.",
    },
    explanation: {
      zh: "柱高表示类别频数，类别顺序应明确。",
      en: "Bar heights represent category counts and category order should be explicit.",
    },
    task: { zh: "保存频数表和柱高。", en: "Save the frequency table and bar heights." },
    concepts: ["table()", "barplot()"],
    starterCode:
      'device <- c(\\"web\\", \\"mobile\\", \\"web\\", \\"tablet\\", \\"mobile\\", \\"web\\")\\ndevice_counts <- \\nbar_heights <- ',
    hint: {
      zh: "使用 `table(device)` 和 `barplot(..., plot = FALSE)`。",
      en: "Use `table(device)` and `barplot(..., plot = FALSE)`.",
    },
    solution:
      'device <- c(\\"web\\", \\"mobile\\", \\"web\\", \\"tablet\\", \\"mobile\\", \\"web\\")\\ndevice_counts <- table(device)\\nbar_heights <- barplot(device_counts, plot = FALSE)',
    checkCode: "identical(as.integer(device_counts), c(1L, 2L, 3L)) && length(bar_heights) == 3",
    success: {
      zh: "完成：频数汇总与图形编码一致。",
      en: "Complete: the summary and graphical encoding agree.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-barplot-categorical"],
    id: "r-grouped-barplot",
    topicId: "anova",
    unit: "data",
    order: 19,
    eyebrow: { zh: "第十九课 · 分组比较", en: "Lesson 19 · Group comparisons" },
    title: { zh: "比较不同组的平均值", en: "Compare group means" },
    objective: {
      zh: "用 `tapply()` 汇总两因素数据。",
      en: "Summarize two-factor data with `tapply()`.",
    },
    explanation: {
      zh: "分组均值是描述性统计，不等同于显著性检验。",
      en: "Group means are descriptive and are not a significance test.",
    },
    task: {
      zh: "计算教学方式和班级的均值矩阵。",
      en: "Compute a mean matrix for teaching method by class.",
    },
    concepts: ["tapply()", "grouped summary"],
    starterCode:
      'method <- c(\\"video\\", \\"video\\", \\"text\\", \\"text\\", \\"video\\", \\"text\\")\\nclass <- c(\\"A\\", \\"B\\", \\"A\\", \\"B\\", \\"A\\", \\"B\\")\\nscore <- c(78, 84, 72, 76, 81, 79)\\nmean_table <- ',
    hint: {
      zh: "使用 `tapply(score, list(method, class), mean)`。",
      en: "Use `tapply(score, list(method, class), mean)`.",
    },
    solution:
      'method <- c(\\"video\\", \\"video\\", \\"text\\", \\"text\\", \\"video\\", \\"text\\")\\nclass <- c(\\"A\\", \\"B\\", \\"A\\", \\"B\\", \\"A\\", \\"B\\")\\nscore <- c(78, 84, 72, 76, 81, 79)\\nmean_table <- tapply(score, list(method, class), mean)',
    checkCode: "is.matrix(mean_table) && all(dim(mean_table) == c(2, 2))",
    success: { zh: "完成：分组均值矩阵已建立。", en: "Complete: the group-mean matrix is ready." },
  },
  {
    language: "r",
    prerequisites: ["mean-confidence-interval"],
    id: "r-t-interval-manual",
    topicId: "confidence-interval",
    unit: "statistics",
    order: 20,
    eyebrow: { zh: "第二十课 · 手算置信区间", en: "Lesson 20 · Manual confidence intervals" },
    title: {
      zh: "用 t 分布手动构造均值区间",
      en: "Construct a mean interval with the t distribution",
    },
    objective: {
      zh: "把标准误、临界值和误差界限连接起来。",
      en: "Connect the standard error, critical value, and margin of error.",
    },
    explanation: {
      zh: "区间等于样本均值加减临界值乘以标准误。",
      en: "An interval is the sample mean plus or minus a critical value times the standard error.",
    },
    task: {
      zh: "保存下限、上限和自由度。",
      en: "Save the lower bound, upper bound, and degrees of freedom.",
    },
    concepts: ["qt()", "standard error", "margin of error"],
    starterCode:
      "sample <- c(12, 15, 13, 16, 14, 11, 15, 14)\\nconfidence <- 0.95\\nmean_value <- mean(sample)\\nse <- sd(sample) / sqrt(length(sample))\\ndf <- length(sample) - 1\\ncritical <-\\nlower <-\\nupper <-",
    hint: {
      zh: "使用 `qt((1 + confidence) / 2, df)`，再计算上下界。",
      en: "Use `qt((1 + confidence) / 2, df)` and compute both bounds.",
    },
    solution:
      "sample <- c(12, 15, 13, 16, 14, 11, 15, 14)\\nconfidence <- 0.95\\nmean_value <- mean(sample)\\nse <- sd(sample) / sqrt(length(sample))\\ndf <- length(sample) - 1\\ncritical <- qt((1 + confidence) / 2, df)\\nlower <- mean_value - critical * se\\nupper <- mean_value + critical * se",
    checkCode: "df == 7 && lower < mean_value && upper > mean_value",
    success: {
      zh: "完成：t 临界值、标准误和区间边界已经对应起来。",
      en: "Complete: the t critical value, standard error, and bounds are connected.",
    },
  },
  {
    language: "r",
    prerequisites: ["two-sample-t-test"],
    id: "r-paired-t-test",
    topicId: "hypothesis-testing",
    unit: "statistics",
    order: 21,
    eyebrow: { zh: "第二十一课 · 配对检验", en: "Lesson 21 · Paired tests" },
    title: { zh: "检验前后测量的平均变化", en: "Test mean change in paired measurements" },
    objective: {
      zh: "理解配对设计应先计算每一对的差值。",
      en: "Understand that a paired design is analysed through within-pair differences.",
    },
    explanation: {
      zh: "配对 t 检验检验的是差值的平均值。",
      en: "A paired t test targets the mean of within-pair changes.",
    },
    task: {
      zh: "保存差值向量和配对检验结果。",
      en: "Save the change vector and paired test result.",
    },
    concepts: ["paired t-test", "difference scores", "t.test()"],
    starterCode:
      "before <- c(68, 72, 75, 70, 66, 74)\\nafter <- c(72, 75, 79, 73, 70, 78)\\nchange <-\\npaired_result <-",
    hint: {
      zh: "先用 `after - before`，再运行配对 `t.test()`。",
      en: "Compute `after - before`, then run paired `t.test()`.",
    },
    solution:
      "before <- c(68, 72, 75, 70, 66, 74)\\nafter <- c(72, 75, 79, 73, 70, 78)\\nchange <- after - before\\npaired_result <- t.test(after, before, paired = TRUE)",
    checkCode: 'length(change) == 6 && all(change > 0) && inherits(paired_result, \\"htest\\")',
    success: {
      zh: "完成：检验对象是每个个体的前后差值。",
      en: "Complete: the test targets each participant's before-after difference.",
    },
  },
  {
    language: "r",
    prerequisites: ["linear-regression"],
    id: "r-multiple-regression",
    topicId: "linear-regression",
    unit: "statistics",
    order: 22,
    eyebrow: { zh: "第二十二课 · 多元回归", en: "Lesson 22 · Multiple regression" },
    title: {
      zh: "控制另一个变量后解释成绩",
      en: "Explain scores while controlling for another variable",
    },
    objective: {
      zh: "拟合含两个解释变量的线性模型。",
      en: "Fit a linear model with two predictors.",
    },
    explanation: {
      zh: "每个系数表示控制其他变量后的平均关联，不自动意味着因果。",
      en: "Each coefficient is an adjusted association, not automatically causal.",
    },
    task: {
      zh: "提取系数、拟合值和 R²。",
      en: "Extract coefficients, fitted values, and R-squared.",
    },
    concepts: ["lm()", "multiple regression", "R-squared"],
    starterCode:
      "hours <- c(1, 2, 3, 4, 5, 6)\\nattendance <- c(70, 72, 75, 79, 82, 86)\\nscore <- c(55, 59, 65, 70, 77, 84)\\nmodel <- lm(score ~ hours + attendance)\\ncoefficients <-\\nfitted <-\\nr_squared <-",
    hint: {
      zh: "从 `summary(model)` 和 `fitted(model)` 提取。",
      en: "Extract from `summary(model)` and `fitted(model)`.",
    },
    solution:
      "hours <- c(1, 2, 3, 4, 5, 6)\\nattendance <- c(70, 72, 75, 79, 82, 86)\\nscore <- c(55, 59, 65, 70, 77, 84)\\nmodel <- lm(score ~ hours + attendance)\\ncoefficients <- summary(model)$coefficients\\nfitted <- fitted(model)\\nr_squared <- summary(model)$r.squared",
    checkCode:
      'inherits(model, \\"lm\\") && nrow(coefficients) == 3 && length(fitted) == 6 && r_squared > 0.9',
    success: {
      zh: "完成：多元模型的系数、拟合值和解释度已提取。",
      en: "Complete: coefficients, fitted values, and explained variance are extracted.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-multiple-regression"],
    id: "r-regression-anova",
    topicId: "linear-regression",
    unit: "statistics",
    order: 23,
    eyebrow: { zh: "第二十三课 · 回归方差分解", en: "Lesson 23 · Regression ANOVA" },
    title: { zh: "用 ANOVA 表检查回归模型", en: "Inspect a regression model with ANOVA" },
    objective: {
      zh: "理解回归平方和、残差平方和与 F 检验。",
      en: "Understand regression and residual sums of squares and the F test.",
    },
    explanation: {
      zh: "ANOVA 表把总变异分成模型和残差两部分。",
      en: "The ANOVA table partitions total variation into model and residual parts.",
    },
    task: {
      zh: "保存 ANOVA 表和整体模型 p 值。",
      en: "Save the ANOVA table and overall model p-value.",
    },
    concepts: ["anova()", "F statistic", "residual variation"],
    starterCode:
      "x <- c(1, 2, 3, 4, 5, 6, 7)\\ny <- c(52, 56, 60, 63, 69, 73, 78)\\nmodel <- lm(y ~ x)\\nanova_table <-\\nmodel_p <-",
    hint: { zh: "使用 `anova(model)` 和 `pf()`。", en: "Use `anova(model)` and `pf()`." },
    solution:
      "x <- c(1, 2, 3, 4, 5, 6, 7)\\ny <- c(52, 56, 60, 63, 69, 73, 78)\\nmodel <- lm(y ~ x)\\nanova_table <- anova(model)\\nf <- summary(model)$fstatistic\\nmodel_p <- pf(f[1], f[2], f[3], lower.tail = FALSE)",
    checkCode: "is.data.frame(anova_table) && nrow(anova_table) == 2 && model_p < 0.01",
    success: {
      zh: "完成：模型与残差变异已经在 ANOVA 表中分开。",
      en: "Complete: model and residual variation are separated in the ANOVA table.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-regression-anova"],
    id: "r-stepwise-selection",
    topicId: "linear-regression",
    unit: "statistics",
    order: 24,
    eyebrow: { zh: "第二十四课 · 变量选择", en: "Lesson 24 · Variable selection" },
    title: { zh: "比较逐步回归模型", en: "Compare stepwise regression models" },
    objective: {
      zh: "用 AIC 比较嵌套模型，并明确选择不确定性。",
      en: "Compare nested models with AIC while recognising selection uncertainty.",
    },
    explanation: {
      zh: "逐步选择是探索工具，不应替代领域知识或验证。",
      en: "Stepwise selection is exploratory and should not replace subject knowledge or validation.",
    },
    task: {
      zh: "保存完整模型和 AIC 更小的模型。",
      en: "Save a full model and the lower-AIC selected model.",
    },
    concepts: ["AIC", "step()", "model selection"],
    starterCode:
      "data <- data.frame(y = c(52, 56, 60, 63, 69, 73, 78), x1 = 1:7, x2 = c(3, 2, 4, 3, 5, 4, 6))\\nfull_model <- lm(y ~ x1 + x2, data = data)\\nselected_model <-",
    hint: {
      zh: '使用 `step(full_model, direction = "backward", trace = 0)`。',
      en: 'Use `step(full_model, direction = "backward", trace = 0)`.',
    },
    solution:
      'data <- data.frame(y = c(52, 56, 60, 63, 69, 73, 78), x1 = 1:7, x2 = c(3, 2, 4, 3, 5, 4, 6))\\nfull_model <- lm(y ~ x1 + x2, data = data)\\nselected_model <- step(full_model, direction = "backward", trace = 0)',
    checkCode:
      'inherits(full_model, \\"lm\\") && inherits(selected_model, \\"lm\\") && AIC(selected_model) <= AIC(full_model) + 1e-8',
    success: {
      zh: "完成：模型选择结果已记录，但仍需验证。",
      en: "Complete: the selected model is recorded but still needs validation.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-stepwise-selection"],
    id: "r-stepwise-anova",
    topicId: "anova",
    unit: "statistics",
    order: 25,
    eyebrow: { zh: "第二十五课 · 模型比较", en: "Lesson 25 · Model comparison" },
    title: { zh: "用 ANOVA 比较嵌套模型", en: "Compare nested models with ANOVA" },
    objective: {
      zh: "用额外平方和检验判断加入变量是否带来证据。",
      en: "Use an extra-sum-of-squares test to assess evidence for an added predictor.",
    },
    explanation: {
      zh: "嵌套模型比较检验额外变量解释的残差减少，不是因果作用。",
      en: "Nested-model comparison tests residual reduction, not causality.",
    },
    task: {
      zh: "保存简化模型、完整模型和比较结果。",
      en: "Save reduced and full models and their comparison.",
    },
    concepts: ["anova()", "nested models"],
    starterCode:
      "data <- data.frame(y = c(52, 56, 60, 63, 69, 73, 78), x1 = 1:7, x2 = c(3, 2, 4, 3, 5, 4, 6))\\nreduced <- lm(y ~ x1, data = data)\\nfull <- lm(y ~ x1 + x2, data = data)\\ncomparison <-",
    hint: { zh: "使用 `anova(reduced, full)`。", en: "Use `anova(reduced, full)`." },
    solution:
      "data <- data.frame(y = c(52, 56, 60, 63, 69, 73, 78), x1 = 1:7, x2 = c(3, 2, 4, 3, 5, 4, 6))\\nreduced <- lm(y ~ x1, data = data)\\nfull <- lm(y ~ x1 + x2, data = data)\\ncomparison <- anova(reduced, full)",
    checkCode: "is.data.frame(comparison) && nrow(comparison) == 2",
    success: {
      zh: "完成：嵌套模型的额外解释量已经比较。",
      en: "Complete: the added explanatory contribution is compared.",
    },
  },
  {
    language: "r",
    prerequisites: ["probability-foundations"],
    id: "r-probability-events",
    topicId: "probability-foundations",
    unit: "statistics",
    order: 26,
    eyebrow: { zh: "第二十六课 · 条件概率", en: "Lesson 26 · Conditional probability" },
    title: { zh: "用贝叶斯公式更新概率", en: "Update probabilities with Bayes' rule" },
    objective: {
      zh: "区分联合概率、条件概率和后验概率。",
      en: "Distinguish joint, conditional, and posterior probabilities.",
    },
    explanation: {
      zh: "贝叶斯公式把先验信息与新证据结合。",
      en: "Bayes' rule combines prior information with evidence.",
    },
    task: {
      zh: "保存阳性检测后的后验概率 `posterior`。",
      en: "Save the posterior probability as `posterior`.",
    },
    concepts: ["conditional probability", "Bayes rule"],
    starterCode: "prior <- 0.01\\nsensitivity <- 0.95\\nfalse_positive <- 0.05\\nposterior <- ",
    hint: { zh: "使用贝叶斯公式。", en: "Use Bayes' formula." },
    solution:
      "prior <- 0.01\\nsensitivity <- 0.95\\nfalse_positive <- 0.05\\nposterior <- prior * sensitivity / (prior * sensitivity + (1 - prior) * false_positive)",
    checkCode: "posterior > 0 && posterior < 1",
    success: {
      zh: "完成：后验概率同时受到患病率和检测性能影响。",
      en: "Complete: the posterior depends on prevalence and test performance.",
    },
  },
  {
    language: "r",
    prerequisites: ["random-variables"],
    id: "r-random-variable-summary",
    topicId: "random-variables",
    unit: "statistics",
    order: 27,
    eyebrow: { zh: "第二十七课 · 随机变量", en: "Lesson 27 · Random variables" },
    title: { zh: "计算离散随机变量的期望与方差", en: "Calculate expectation and variance" },
    objective: {
      zh: "用概率质量函数计算期望和方差。",
      en: "Calculate expectation and variance from a PMF.",
    },
    explanation: {
      zh: "期望是长期平均，方差衡量围绕期望的波动。",
      en: "Expectation is a long-run average; variance measures spread.",
    },
    task: {
      zh: "保存 `expected_value` 和 `variance_value`。",
      en: "Save `expected_value` and `variance_value`.",
    },
    concepts: ["PMF", "expectation", "variance"],
    starterCode:
      "values <- 0:3\\nprobabilities <- c(0.1, 0.2, 0.4, 0.3)\\nexpected_value <-\\nvariance_value <-",
    hint: { zh: "使用概率加权和。", en: "Use probability-weighted sums." },
    solution:
      "values <- 0:3\\nprobabilities <- c(0.1, 0.2, 0.4, 0.3)\\nexpected_value <- sum(values * probabilities)\\nvariance_value <- sum((values - expected_value)^2 * probabilities)",
    checkCode: "abs(expected_value - 1.9) < 1e-12 && abs(variance_value - 1.09) < 1e-12",
    success: {
      zh: "完成：期望和方差都由 PMF 加权得到。",
      en: "Complete: expectation and variance are weighted by the PMF.",
    },
  },
  {
    language: "r",
    prerequisites: ["t-distribution"],
    id: "r-t-distribution-quantiles",
    topicId: "t-distribution",
    unit: "statistics",
    order: 28,
    eyebrow: { zh: "第二十八课 · t 分布", en: "Lesson 28 · t distribution" },
    title: {
      zh: "比较不同自由度的临界值",
      en: "Compare critical values across degrees of freedom",
    },
    objective: {
      zh: "理解自由度如何影响 t 分布尾部。",
      en: "Understand how degrees of freedom affect t tails.",
    },
    explanation: {
      zh: "自由度越小，尾部越厚。",
      en: "Smaller degrees of freedom produce heavier tails.",
    },
    task: {
      zh: "保存两个自由度下的临界值。",
      en: "Save critical values for two degrees of freedom.",
    },
    concepts: ["qt()", "degrees of freedom"],
    starterCode: "critical_df5 <-\\ncritical_df50 <-",
    hint: { zh: "使用 `qt(0.975, df)`。", en: "Use `qt(0.975, df)`." },
    solution: "critical_df5 <- qt(0.975, df = 5)\\ncritical_df50 <- qt(0.975, df = 50)",
    checkCode: "critical_df5 > critical_df50",
    success: {
      zh: "完成：自由度越大，t 分布越接近正态分布。",
      en: "Complete: larger degrees of freedom make t closer to normal.",
    },
  },
  {
    language: "r",
    prerequisites: ["sampling-distributions"],
    id: "r-sampling-distribution",
    topicId: "sampling-distributions",
    unit: "statistics",
    order: 29,
    eyebrow: { zh: "第二十九课 · 抽样分布", en: "Lesson 29 · Sampling distributions" },
    title: { zh: "模拟样本均值的标准误", en: "Simulate the standard error of a mean" },
    objective: {
      zh: "区分样本量、重复抽样次数和样本均值的变异。",
      en: "Distinguish sample size, repetitions, and variation in sample means.",
    },
    explanation: {
      zh: "理论标准误是总体标准差除以样本量平方根。",
      en: "The theoretical standard error is population spread divided by sqrt(n).",
    },
    task: {
      zh: "保存 1000 个样本均值的标准差 `observed_se`。",
      en: "Save the standard deviation of 1000 sample means.",
    },
    concepts: ["sampling distribution", "standard error"],
    starterCode:
      "set.seed(42)\\npopulation <- rnorm(100000, 10, 4)\\nmeans <- replicate(1000, mean(sample(population, 25)))\\nobserved_se <-",
    hint: { zh: "使用 `sd(means)`。", en: "Use `sd(means)`." },
    solution:
      "set.seed(42)\\npopulation <- rnorm(100000, 10, 4)\\nmeans <- replicate(1000, mean(sample(population, 25)))\\nobserved_se <- sd(means)",
    checkCode: "length(means) == 1000 && observed_se > 0.6 && observed_se < 1",
    success: {
      zh: "完成：观察标准误接近理论值 0.8。",
      en: "Complete: the observed standard error is close to 0.8.",
    },
  },
  {
    language: "r",
    prerequisites: ["anova"],
    id: "r-anova-posthoc",
    topicId: "anova",
    unit: "statistics",
    order: 30,
    eyebrow: { zh: "第三十课 · 多重比较", en: "Lesson 30 · Multiple comparisons" },
    title: { zh: "用 Tukey 方法比较组均值", en: "Compare group means with Tukey's method" },
    objective: {
      zh: "在整体 ANOVA 后控制多重比较错误率。",
      en: "Control family-wise error after an overall ANOVA.",
    },
    explanation: {
      zh: "校正后的两两比较避免反复检验扩大错误率。",
      en: "Adjusted pairwise comparisons avoid inflated error rates.",
    },
    task: { zh: "保存 Tukey 结果 `posthoc`。", en: "Save Tukey results as `posthoc`." },
    concepts: ["aov()", "TukeyHSD()"],
    starterCode:
      'group <- factor(rep(c("A", "B", "C"), each = 4))\\nscore <- c(70, 72, 71, 69, 76, 78, 75, 77, 82, 84, 83, 81)\\nmodel <- aov(score ~ group)\\nposthoc <-',
    hint: { zh: "使用 `TukeyHSD(model)`。", en: "Use `TukeyHSD(model)`." },
    solution:
      'group <- factor(rep(c("A", "B", "C"), each = 4))\\nscore <- c(70, 72, 71, 69, 76, 78, 75, 77, 82, 84, 83, 81)\\nmodel <- aov(score ~ group)\\nposthoc <- TukeyHSD(model)',
    checkCode: 'inherits(model, "aov") && is.list(posthoc)',
    success: {
      zh: "完成：整体 ANOVA 与校正后的两两比较已经连接。",
      en: "Complete: ANOVA is connected to adjusted pairwise comparisons.",
    },
  },
  {
    language: "r",
    prerequisites: ["chi-square-contingency"],
    id: "r-chi-square-goodness-fit",
    topicId: "chi-square-test",
    unit: "statistics",
    order: 31,
    eyebrow: { zh: "第三十一课 · 拟合优度", en: "Lesson 31 · Goodness of fit" },
    title: {
      zh: "检验分类频数是否符合理论比例",
      en: "Test frequencies against theoretical proportions",
    },
    objective: {
      zh: "使用卡方拟合优度检验比较观察和期望频数。",
      en: "Use a chi-square goodness-of-fit test.",
    },
    explanation: {
      zh: "原假设给出各类别的理论比例。",
      en: "The null hypothesis specifies theoretical category proportions.",
    },
    task: { zh: "保存 `gof_result`。", en: "Save `gof_result`." },
    concepts: ["chisq.test()", "goodness of fit"],
    starterCode: "observed <- c(28, 34, 38)\\nexpected_prob <- c(1/3, 1/3, 1/3)\\ngof_result <-",
    hint: {
      zh: "使用 `chisq.test(observed, p = expected_prob)`。",
      en: "Use `chisq.test(observed, p = expected_prob)`.",
    },
    solution:
      "observed <- c(28, 34, 38)\\nexpected_prob <- c(1/3, 1/3, 1/3)\\ngof_result <- chisq.test(observed, p = expected_prob)",
    checkCode: 'inherits(gof_result, "htest")',
    success: {
      zh: "完成：观察频数已经与理论比例比较。",
      en: "Complete: observed counts are compared with expected counts.",
    },
  },
  {
    language: "r",
    prerequisites: ["chi-square-contingency"],
    id: "r-nonparametric-ranks",
    topicId: "nonparametric-tests",
    unit: "statistics",
    order: 32,
    eyebrow: { zh: "第三十二课 · 秩检验", en: "Lesson 32 · Rank tests" },
    title: { zh: "用 Wilcoxon 检验比较两组", en: "Compare two groups with Wilcoxon tests" },
    objective: {
      zh: "在分布假设不合适时使用秩方法。",
      en: "Use rank methods when distributional assumptions are unsuitable.",
    },
    explanation: {
      zh: "Wilcoxon 检验比较秩而不直接等同于均值检验。",
      en: "Wilcoxon tests compare ranks rather than means directly.",
    },
    task: { zh: "保存独立样本检验结果 `rank_result`。", en: "Save the rank test result." },
    concepts: ["wilcox.test()", "rank sum"],
    starterCode:
      "group_a <- c(12, 14, 15, 16, 18)\\ngroup_b <- c(9, 10, 11, 13, 14)\\nrank_result <-",
    hint: {
      zh: '使用 `wilcox.test(group_a, group_b, alternative = "greater")`。',
      en: 'Use `wilcox.test(group_a, group_b, alternative = "greater")`.',
    },
    solution:
      'group_a <- c(12, 14, 15, 16, 18)\\ngroup_b <- c(9, 10, 11, 13, 14)\\nrank_result <- wilcox.test(group_a, group_b, alternative = "greater")',
    checkCode: 'inherits(rank_result, "htest")',
    success: {
      zh: "完成：秩检验减少了对正态分布的依赖。",
      en: "Complete: the rank test relies less on normality.",
    },
  },
  {
    language: "r",
    prerequisites: ["data-frame-filter"],
    id: "r-sampling-designs",
    topicId: "sampling-methods",
    unit: "data",
    order: 33,
    eyebrow: { zh: "第三十三课 · 抽样设计", en: "Lesson 33 · Sampling designs" },
    title: { zh: "实施系统抽样与分层抽样", en: "Implement systematic and stratified samples" },
    objective: {
      zh: "用 R 把抽样设计转化为可复现的样本索引。",
      en: "Turn sampling designs into reproducible sample indices in R.",
    },
    explanation: {
      zh: "系统抽样使用随机起点和固定间隔；分层抽样则从每个层内独立抽取。",
      en: "Systematic sampling uses a random start and fixed interval; stratified sampling samples independently within each stratum.",
    },
    task: {
      zh: "从 40 个单位中每隔 5 个抽取一次，并从两个地区各抽取 3 个单位。",
      en: "Select every fifth unit from 40 units and sample three units from each of two regions.",
    },
    concepts: ["sample()", "seq()", "split()"],
    starterCode: `set.seed(2026)
frame <- data.frame(
  id = 1:40,
  region = rep(c("north", "south"), each = 20)
)

start <- sample(1:5, 1)
systematic_ids <-
stratified_ids <-`,
    hint: {
      zh: "系统抽样可用 `seq(start, 40, by = 5)`；分层后对每组 id 使用 `sample(x, 3)`。",
      en: "Use `seq(start, 40, by = 5)` and sample three IDs inside each split group.",
    },
    solution: `set.seed(2026)
frame <- data.frame(id = 1:40, region = rep(c("north", "south"), each = 20))
start <- sample(1:5, 1)
systematic_ids <- seq(start, 40, by = 5)
stratified_ids <- unlist(lapply(split(frame$id, frame$region), sample, size = 3), use.names = FALSE)`,
    checkCode: `length(systematic_ids) == 8 && all(diff(systematic_ids) == 5) &&
      length(stratified_ids) == 6 &&
      sum(stratified_ids <= 20) == 3 && sum(stratified_ids > 20) == 3`,
    success: {
      zh: "完成：两个抽样设计都形成了可复现的样本索引。",
      en: "Complete: both designs produced reproducible sample indices.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-data-import"],
    id: "r-delimited-import",
    topicId: "data-and-variables",
    unit: "data",
    order: 34,
    eyebrow: { zh: "第三十四课 · 分隔文本", en: "Lesson 34 · Delimited text" },
    title: { zh: "正确读取带表头的制表符数据", en: "Read tab-delimited data with headers" },
    objective: {
      zh: "理解表头与分隔符设置如何决定导入后的数据结构。",
      en: "Understand how header and separator settings determine imported structure.",
    },
    explanation: {
      zh: "导入时应显式确认表头、分隔符和缺失值编码，不能依赖文件扩展名猜测。",
      en: "Confirm headers, delimiters, and missing-value codes explicitly instead of guessing from a file extension.",
    },
    task: {
      zh: "把给定制表符文本读取为 `survey`，并保存变量名。",
      en: "Read the tab-delimited text into `survey` and save its column names.",
    },
    concepts: ["read.table()", "header", "sep"],
    starterCode: `raw_text <- "id\tgroup\tscore\n1\tA\t82\n2\tB\t76\n3\tA\t91"
survey <-
variable_names <-`,
    hint: {
      zh: '使用 `read.table(text = raw_text, header = TRUE, sep = "\\t")`。',
      en: 'Use `read.table(text = raw_text, header = TRUE, sep = "\\t")`.',
    },
    solution: `raw_text <- "id\tgroup\tscore\n1\tA\t82\n2\tB\t76\n3\tA\t91"
survey <- read.table(text = raw_text, header = TRUE, sep = "\t")
variable_names <- names(survey)`,
    checkCode: `is.data.frame(survey) && identical(dim(survey), c(3L, 3L)) &&
      identical(variable_names, c("id", "group", "score"))`,
    success: {
      zh: "完成：表头、分隔符和三列数据均已正确识别。",
      en: "Complete: the header, delimiter, and three columns were recognised correctly.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-grouped-barplot"],
    id: "r-grouped-mean-barplot",
    topicId: "visual-encoding",
    unit: "data",
    order: 35,
    eyebrow: { zh: "第三十五课 · 分组条形图", en: "Lesson 35 · Grouped bar charts" },
    title: { zh: "把双分类均值编码成并列条形图", en: "Encode two-way means as grouped bars" },
    objective: {
      zh: "把 `tapply()` 的均值矩阵转换为可检查的条形图结构。",
      en: "Convert a `tapply()` mean matrix into an inspectable grouped-bar structure.",
    },
    explanation: {
      zh: "并列条形图适合比较离散组别，但图形必须保留清楚的分组与图例语义。",
      en: "Grouped bars compare discrete groups, but grouping and legend semantics must remain explicit.",
    },
    task: {
      zh: "计算方式×班级均值，并在不绘图的情况下保存每根条形的位置。",
      en: "Calculate method-by-class means and save bar positions without drawing the plot.",
    },
    concepts: ["tapply()", "barplot()", "beside"],
    starterCode: `method <- c("video", "video", "text", "text", "video", "text")
class <- c("A", "B", "A", "B", "A", "B")
score <- c(78, 84, 72, 76, 81, 79)

mean_table <-
bar_positions <-`,
    hint: {
      zh: "先用 `tapply()`，再用 `barplot(mean_table, beside = TRUE, plot = FALSE)`。",
      en: "Use `tapply()` followed by `barplot(..., beside = TRUE, plot = FALSE)`.",
    },
    solution: `method <- c("video", "video", "text", "text", "video", "text")
class <- c("A", "B", "A", "B", "A", "B")
score <- c(78, 84, 72, 76, 81, 79)
mean_table <- tapply(score, list(method, class), mean)
bar_positions <- barplot(mean_table, beside = TRUE, plot = FALSE)`,
    checkCode: `is.matrix(mean_table) && identical(dim(mean_table), c(2L, 2L)) &&
      is.matrix(bar_positions) && identical(dim(bar_positions), c(2L, 2L))`,
    success: {
      zh: "完成：双分类均值和四根条形的位置均已生成。",
      en: "Complete: the two-way means and four bar positions are ready.",
    },
  },
  {
    language: "r",
    prerequisites: ["summary-and-boxplot"],
    id: "r-missing-summary",
    topicId: "descriptive-statistics",
    unit: "data",
    order: 36,
    eyebrow: { zh: "第三十六课 · 缺失值", en: "Lesson 36 · Missing values" },
    title: { zh: "汇总含缺失值的数据", en: "Summarise data with missing values" },
    objective: {
      zh: "在描述统计前识别缺失数量，并显式选择缺失值处理方式。",
      en: "Count missing values and choose their treatment explicitly before summarising data.",
    },
    explanation: {
      zh: "直接忽略缺失值可能改变分析对象，因此应同时报告有效样本量。",
      en: "Dropping missing values can change the analysed population, so report the valid sample size as well.",
    },
    task: {
      zh: "保存缺失数、有效样本量以及忽略缺失值后的均值。",
      en: "Save the missing count, valid sample size, and mean after explicit NA removal.",
    },
    concepts: ["is.na()", "complete.cases()", "na.rm"],
    starterCode: `scores <- c(72, 81, NA, 90, 85, NA, 77)
missing_count <-
valid_n <-
mean_score <-`,
    hint: {
      zh: "分别使用 `sum(is.na(scores))`、`sum(!is.na(scores))` 和 `mean(..., na.rm = TRUE)`。",
      en: "Use `sum(is.na(...))`, count non-missing values, and call `mean(..., na.rm = TRUE)`.",
    },
    solution: `scores <- c(72, 81, NA, 90, 85, NA, 77)
missing_count <- sum(is.na(scores))
valid_n <- sum(!is.na(scores))
mean_score <- mean(scores, na.rm = TRUE)`,
    checkCode: `missing_count == 2 && valid_n == 5 && abs(mean_score - 81) < 1e-12`,
    success: {
      zh: "完成：均值与它实际使用的有效样本量已经同时记录。",
      en: "Complete: the mean and its valid sample size are recorded together.",
    },
  },
  {
    language: "r",
    prerequisites: ["summary-and-boxplot"],
    id: "r-boxplot-outliers",
    topicId: "descriptive-statistics",
    unit: "data",
    order: 37,
    eyebrow: { zh: "第三十七课 · 箱线图", en: "Lesson 37 · Box plots" },
    title: { zh: "提取箱线图标记的异常值", en: "Extract outliers flagged by a box plot" },
    objective: {
      zh: "连接四分位距规则与箱线图中的异常值标记。",
      en: "Connect the IQR rule with outlier flags in a box plot.",
    },
    explanation: {
      zh: "箱线图标记的是规则意义上的潜在异常值，不能自动判定为数据错误。",
      en: "Box plots flag potential outliers by a rule; they do not prove that an observation is erroneous.",
    },
    task: {
      zh: "在不绘图的情况下保存箱线图统计量和被标记的观测。",
      en: "Save box-plot statistics and flagged observations without drawing the plot.",
    },
    concepts: ["boxplot()", "IQR", "outliers"],
    starterCode: `values <- c(12, 13, 13, 14, 15, 16, 17, 42)
box_info <-
flagged_values <-`,
    hint: {
      zh: "使用 `boxplot(values, plot = FALSE)`，异常值保存在 `$out`。",
      en: "Use `boxplot(values, plot = FALSE)` and read `$out`.",
    },
    solution: `values <- c(12, 13, 13, 14, 15, 16, 17, 42)
box_info <- boxplot(values, plot = FALSE)
flagged_values <- box_info$out`,
    checkCode: `is.list(box_info) && identical(as.numeric(flagged_values), 42)`,
    success: {
      zh: "完成：42 被 IQR 规则标记，接下来仍需结合情境判断。",
      en: "Complete: 42 is flagged by the IQR rule and still needs contextual review.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-regression-anova"],
    id: "r-regression-anova-manual",
    topicId: "linear-regression",
    unit: "statistics",
    order: 38,
    eyebrow: { zh: "第三十八课 · 手工方差分解", en: "Lesson 38 · Manual variance decomposition" },
    title: { zh: "核对回归中的 SST、SSR 与 SSE", en: "Verify SST, SSR, and SSE in regression" },
    objective: {
      zh: "从拟合值和残差手工验证回归平方和分解。",
      en: "Verify the regression sum-of-squares identity from fitted values and residuals.",
    },
    explanation: {
      zh: "在线性回归含截距时，总平方和等于回归平方和与误差平方和之和。",
      en: "For linear regression with an intercept, total variation splits into regression and error sums of squares.",
    },
    task: {
      zh: "拟合模型并保存 `sst`、`ssr`、`sse` 以及分解误差。",
      en: "Fit the model and save `sst`, `ssr`, `sse`, and the decomposition error.",
    },
    concepts: ["fitted()", "residuals()", "sum of squares"],
    starterCode: `x <- 1:7
y <- c(52, 56, 60, 63, 69, 73, 78)
model <- lm(y ~ x)

sst <-
ssr <-
sse <-
decomposition_error <-`,
    hint: {
      zh: "SST 围绕 `mean(y)`；SSR 使用拟合值；SSE 使用残差。",
      en: "Build SST around `mean(y)`, SSR from fitted values, and SSE from residuals.",
    },
    solution: `x <- 1:7
y <- c(52, 56, 60, 63, 69, 73, 78)
model <- lm(y ~ x)
sst <- sum((y - mean(y))^2)
ssr <- sum((fitted(model) - mean(y))^2)
sse <- sum(residuals(model)^2)
decomposition_error <- abs(sst - ssr - sse)`,
    checkCode: `sst > 0 && ssr > 0 && sse > 0 && decomposition_error < 1e-8`,
    success: {
      zh: "完成：SST = SSR + SSE 已通过数值核验。",
      en: "Complete: SST = SSR + SSE has been verified numerically.",
    },
  },
  {
    language: "r",
    prerequisites: ["r-stepwise-selection"],
    id: "r-stepwise-directions",
    topicId: "linear-regression",
    unit: "statistics",
    order: 39,
    eyebrow: { zh: "第三十九课 · 选择方向", en: "Lesson 39 · Selection directions" },
    title: { zh: "比较向前与向后逐步选择", en: "Compare forward and backward selection" },
    objective: {
      zh: "比较不同起点和方向产生的模型，并记录其 AIC。",
      en: "Compare models produced from different starts and directions and record their AIC values.",
    },
    explanation: {
      zh: "逐步算法可能因起点和候选范围得到不同结果，应把它视为探索而非最终证明。",
      en: "Stepwise algorithms can depend on their starting model and scope, so treat them as exploratory.",
    },
    task: {
      zh: "分别运行向前和向后选择，并保存两个模型的 AIC。",
      en: "Run forward and backward selection and save both AIC values.",
    },
    concepts: ["step()", "scope", "AIC"],
    starterCode: `data <- data.frame(
  y = c(52, 56, 60, 63, 69, 73, 78, 82),
  x1 = 1:8,
  x2 = c(3, 2, 4, 3, 5, 4, 6, 5),
  x3 = c(8, 7, 7, 6, 5, 5, 4, 3)
)
null_model <- lm(y ~ 1, data = data)
full_model <- lm(y ~ x1 + x2 + x3, data = data)
forward_model <-
backward_model <-
aic_values <-`,
    hint: {
      zh: "向前模型需要 `scope = formula(full_model)`；向后模型从完整模型开始。",
      en: "Give the forward model `scope = formula(full_model)` and start backward selection from the full model.",
    },
    solution: `data <- data.frame(
  y = c(52, 56, 60, 63, 69, 73, 78, 82),
  x1 = 1:8,
  x2 = c(3, 2, 4, 3, 5, 4, 6, 5),
  x3 = c(8, 7, 7, 6, 5, 5, 4, 3)
)
null_model <- lm(y ~ 1, data = data)
full_model <- lm(y ~ x1 + x2 + x3, data = data)
forward_model <- step(null_model, scope = formula(full_model), direction = "forward", trace = 0)
backward_model <- step(full_model, direction = "backward", trace = 0)
aic_values <- c(forward = AIC(forward_model), backward = AIC(backward_model))`,
    checkCode: `inherits(forward_model, "lm") && inherits(backward_model, "lm") &&
      length(aic_values) == 2 && all(is.finite(aic_values))`,
    success: {
      zh: "完成：两个方向的选择结果及 AIC 已保存，可继续做独立验证。",
      en: "Complete: both selected models and AIC values are ready for independent validation.",
    },
  },
];

export const rLessons: RLesson[] = rawRLessons.map((lesson) => ({
  ...lesson,
  textbookChapterId: getTextbookChapterIdForTopic(lesson.topicId),
  starterCode: normalizeCode(lesson.starterCode),
  solution: normalizeCode(lesson.solution),
  checkCode: isolateCheckCode(lesson.checkCode, lesson.id === "first-histogram"),
}));
