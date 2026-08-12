import type { LocalizedText } from "../course/types";

export type LessonUnit = "foundations" | "data" | "statistics";

export type RLesson = {
  id: string;
  topicId: string;
  unit: LessonUnit;
  order: number;
  title: LocalizedText;
  eyebrow: LocalizedText;
  objective: LocalizedText;
  explanation: LocalizedText;
  task: LocalizedText;
  concepts: string[];
  starterCode: string;
  hint: LocalizedText;
  solution: string;
  checkCode: string;
  success: LocalizedText;
};

export const lessonUnits = [
  { id: "foundations", zh: "R 编程基础", en: "R Foundations", number: "01" },
  { id: "data", zh: "数据与图形", en: "Data & Graphics", number: "02" },
  { id: "statistics", zh: "统计分析", en: "Statistical Analysis", number: "03" },
] as const;

export const rLessons: RLesson[] = [
  {
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
      zh: "函数形式为 `hist(data, main = \"title\", xlab = \"label\")`。还可以加入 `col = \"#6f8f7a\"`。",
      en: "Use `hist(data, main = \"title\", xlab = \"label\")`. You may also add `col = \"#6f8f7a\"`.",
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
      zh: "使用 `t.test(wait, mu = 10, alternative = \"two.sided\")`，并通过 `$p.value` 访问结果。",
      en: "Use `t.test(wait, mu = 10, alternative = \"two.sided\")`, then access the result with `$p.value`.",
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
      zh: "模型写作 `lm(score ~ hours, data = study)`；斜率可以用 `unname(coef(model)[\"hours\"])` 提取。",
      en: "Fit `lm(score ~ hours, data = study)` and extract the slope with `unname(coef(model)[\"hours\"])`.",
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
];
