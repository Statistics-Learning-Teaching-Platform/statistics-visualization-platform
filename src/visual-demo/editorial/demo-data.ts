export type EditorialPageId =
	| "home"
	| "catalog"
	| "experiment"
	| "paper"
	| "r"
	| "python";

export type EditorialSiteMode = "demo" | "product";

export interface EditorialNavItem {
	id: EditorialPageId;
	label: string;
	english: string;
	href: string;
}

export const editorialNavItems: EditorialNavItem[] = [
	{ id: "home", label: "首页", english: "Home", href: "/visual-demo" },
	{
		id: "catalog",
		label: "教材",
		english: "Textbook",
		href: "/visual-demo/catalog",
	},
	{
		id: "experiment",
		label: "模拟实验",
		english: "Laboratory",
		href: "/visual-demo/experiment",
	},
	{ id: "paper", label: "组卷", english: "Exam", href: "/visual-demo/paper" },
	{ id: "r", label: "R 学习", english: "R Studio", href: "/visual-demo/r" },
	{
		id: "python",
		label: "Python 学习",
		english: "Python Studio",
		href: "/visual-demo/python",
	},
];

const productHrefByPage: Record<EditorialPageId, string> = {
	home: "/",
	catalog: "/catalog",
	experiment: "/teaching-platform",
	paper: "/st-qselector",
	r: "/r-learning?returnTo=%2F",
	python: "/python-learning?returnTo=%2F",
};

export function getEditorialNavItems(
	mode: EditorialSiteMode,
): EditorialNavItem[] {
	if (mode === "demo") return editorialNavItems;
	return editorialNavItems.map((item) => ({
		...item,
		href: productHrefByPage[item.id],
	}));
}

export interface TextbookChapter {
	number: string;
	title: string;
	detail: string;
}

export const textbookChapters: TextbookChapter[] = [
	{ number: "00", title: "什么是统计学", detail: "问题、数据与证据" },
	{ number: "01", title: "抽样调查", detail: "从总体到样本" },
	{ number: "02", title: "图形化描述", detail: "分布与形态" },
	{ number: "03", title: "数值特征", detail: "中心与离散" },
	{ number: "04", title: "概率与随机", detail: "不确定性的语言" },
	{ number: "05", title: "抽样分布", detail: "统计量的波动" },
	{ number: "06", title: "样本的统计推断", detail: "区间估计与精度" },
	{ number: "07", title: "总体均值的比较", detail: "差异与效应" },
	{ number: "08", title: "相关与回归", detail: "关系与预测" },
	{ number: "09", title: "拟合优度与列联", detail: "分类数据推断" },
	{ number: "10", title: "非参数方法", detail: "秩与稳健性" },
	{ number: "11", title: "时间序列", detail: "趋势与周期" },
];

export const journeySteps = [
	{
		number: "01",
		title: "理解概念",
		description: "先辨认问题中的总体、样本与未知量。",
	},
	{
		number: "02",
		title: "模拟实验",
		description: "让抽样波动从公式变成可以观察的证据。",
	},
	{
		number: "03",
		title: "编程实践",
		description: "用 R 或 Python 复现方法与结果。",
	},
	{
		number: "04",
		title: "统计分析",
		description: "解释不确定性，并形成可检验的结论。",
	},
];

export const workspaceEntries = [
	{
		number: "01",
		title: "统计教学平台",
		english: "Statistical Laboratory",
		description: "通过交互模拟观察抽样、估计、检验与回归中的统计规律。",
		meta: "13 个实验模块",
		href: "/visual-demo/experiment",
		action: "进入平台",
	},
	{
		number: "02",
		title: "统计学组卷系统",
		english: "Exam Composition",
		description: "沿教材知识结构筛选题目，组织一份有明确教学目标的试卷。",
		meta: "296 道已审核题目",
		href: "/visual-demo/paper",
		action: "开始组卷",
	},
	{
		number: "03",
		title: "R 语言知识库",
		english: "R Learning Studio",
		description: "从统计问题出发，在解释、代码与输出之间建立联系。",
		meta: "39 项引导式实验",
		href: "/visual-demo/r",
		action: "学习 R",
	},
	{
		number: "04",
		title: "Python 语言知识库",
		english: "Python Learning Studio",
		description: "用 pandas、NumPy 与可视化工具完成可复现的数据分析。",
		meta: "43 项编程实验",
		href: "/visual-demo/python",
		action: "学习 Python",
	},
];

export function getWorkspaceEntries(mode: EditorialSiteMode) {
	if (mode === "demo") return workspaceEntries;
	return workspaceEntries.map((entry) => ({
		...entry,
		href: productHrefByPage[
			entry.number === "01"
				? "experiment"
				: entry.number === "02"
					? "paper"
					: entry.number === "03"
						? "r"
						: "python"
		],
	}));
}

export interface IntervalRow {
	id: number;
	low: number;
	high: number;
	mean: number;
	covered: boolean;
}

export const intervalRows: IntervalRow[] = [
	{ id: 1, low: 8.72, high: 11.19, mean: 9.96, covered: true },
	{ id: 2, low: 9.08, high: 11.56, mean: 10.32, covered: true },
	{ id: 3, low: 7.91, high: 10.39, mean: 9.15, covered: true },
	{ id: 4, low: 10.18, high: 12.66, mean: 11.42, covered: false },
	{ id: 5, low: 8.43, high: 10.91, mean: 9.67, covered: true },
	{ id: 6, low: 9.61, high: 12.09, mean: 10.85, covered: true },
	{ id: 7, low: 8.95, high: 11.43, mean: 10.19, covered: true },
	{ id: 8, low: 7.68, high: 10.16, mean: 8.92, covered: true },
	{ id: 9, low: 8.81, high: 11.29, mean: 10.05, covered: true },
	{ id: 10, low: 10.24, high: 12.72, mean: 11.48, covered: false },
	{ id: 11, low: 9.24, high: 11.72, mean: 10.48, covered: true },
	{ id: 12, low: 8.39, high: 10.87, mean: 9.63, covered: true },
];

export interface DemoQuestion {
	id: string;
	type: string;
	chapter: string;
	difficulty: string;
	points: number;
	minutes: number;
	stem: string;
	topics: string[];
}

export const demoQuestions: DemoQuestion[] = [
	{
		id: "STAT-0612",
		type: "计算题",
		chapter: "06 样本的统计推断",
		difficulty: "中等",
		points: 8,
		minutes: 8,
		stem: "某总体标准差已知。根据容量为 25 的样本，构造总体均值的 95% 置信区间。",
		topics: ["置信区间", "标准误"],
	},
	{
		id: "STAT-0608",
		type: "选择题",
		chapter: "06 样本的统计推断",
		difficulty: "基础",
		points: 4,
		minutes: 3,
		stem: "保持其他条件不变，将置信水平从 95% 提高到 99%，区间宽度将如何变化？",
		topics: ["置信水平", "区间宽度"],
	},
	{
		id: "STAT-0715",
		type: "简答题",
		chapter: "07 总体均值的比较",
		difficulty: "中等",
		points: 10,
		minutes: 10,
		stem: "说明独立样本比较与配对样本比较的研究设计差异，并各举一个例子。",
		topics: ["研究设计", "均值比较"],
	},
	{
		id: "STAT-0821",
		type: "分析题",
		chapter: "08 相关与回归",
		difficulty: "进阶",
		points: 12,
		minutes: 12,
		stem: "根据残差图判断线性模型的适用性，并说明异常点对斜率估计的可能影响。",
		topics: ["残差", "回归诊断"],
	},
];

export interface IdeConfig {
	kind: "r" | "python";
	pageId: "r" | "python";
	mark: string;
	title: string;
	english: string;
	lesson: string;
	lessonNumber: string;
	totalLessons: number;
	runtime: string;
	goal: string;
	task: string;
	example: string;
	starterCode: string;
	solutionCode: string;
	output: string;
	explanation: string;
	variables: string[];
	realHref: string;
}

export const rIdeConfig: IdeConfig = {
	kind: "r",
	pageId: "r",
	mark: "R",
	title: "R 语言学习工房",
	english: "R Learning Studio",
	lesson: "保存一组成绩并计算均值",
	lessonNumber: "01",
	totalLessons: 39,
	runtime: "R 4.3 · WebR ready",
	goal: "创建一个成绩向量，并把它的平均值保存为可复用对象。",
	task: "将 scores 的均值保存为 average_score，然后输出结果。",
	example: "scores <- c(72, 81, 76, 90, 85)",
	starterCode: `# Five students' exam scores\nscores <- c(72, 81, 76, 90, 85)\n\n# Store the mean\naverage_score <-`,
	solutionCode: `# Five students' exam scores\nscores <- c(72, 81, 76, 90, 85)\n\n# Store the mean\naverage_score <- mean(scores)\naverage_score`,
	output: "[1] 80.8",
	explanation:
		"mean() 汇总向量中的五个观测值；对象 average_score 让结果可以在后续分析中继续使用。",
	variables: ["scores · num [1:5]", "average_score · num 80.8"],
	realHref: "/r-learning?lessonId=vectors-and-mean&returnTo=%2Fvisual-demo%2Fr",
};

export const pythonIdeConfig: IdeConfig = {
	kind: "python",
	pageId: "python",
	mark: "Py",
	title: "Python 数据学习工房",
	english: "Python Learning Studio",
	lesson: "筛选数据并汇总分组",
	lessonNumber: "06",
	totalLessons: 43,
	runtime: "Python 3.12 · Pyodide ready",
	goal: "筛选及格学生，并比较不同班级的平均成绩。",
	task: "使用 groupby('class_name')['score'].mean() 生成班级均值。",
	example: "passed_df = df[df['passed']]",
	starterCode: `import pandas as pd\n\ndf = pd.read_csv("scores.csv")\npassed_df = df[df["passed"]]\n\n# Compare class means\nsummary =`,
	solutionCode: `import pandas as pd\n\ndf = pd.read_csv("scores.csv")\npassed_df = df[df["passed"]]\n\n# Compare class means\nsummary = passed_df.groupby("class_name")["score"].mean()\nsummary`,
	output:
		"class_name\nA    82.4\nB    78.9\nC    85.1\nName: score, dtype: float64",
	explanation:
		"先用布尔条件保留及格记录，再按班级分组。均值需要和每组样本量、分布形态一起解释。",
	variables: [
		"df · DataFrame 30 × 4",
		"passed_df · DataFrame 24 × 4",
		"summary · Series 3",
	],
	realHref:
		"/python-learning?topicId=data-and-variables&lessonId=pandas-filter-summary&returnTo=%2Fvisual-demo%2Fpython",
};
