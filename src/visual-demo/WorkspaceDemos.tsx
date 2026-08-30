import { type ReactNode, useState } from "react";
import { type DemoPageId, DemoTopNav } from "./DemoTopNav";
import "./statmind-home-demo.css";
import "./workspace-demos.css";

function ExternalArrow() {
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true">
			<path d="M5 15 15 5M7 5h8v8" />
		</svg>
	);
}

function Chevron() {
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true">
			<path d="m7 4 6 6-6 6" />
		</svg>
	);
}

function DemoPage({
	current,
	children,
	className = "",
}: { current: DemoPageId; children: ReactNode; className?: string }) {
	return (
		<main className={`sm-demo sm-workspace-demo ${className}`}>
			<DemoTopNav current={current} />
			{children}
		</main>
	);
}

const textbookChapters = [
	{ id: "00", title: "什么是统计学", resources: 6 },
	{ id: "01", title: "抽样调查", resources: 2 },
	{ id: "02", title: "数据的图形化描述", resources: 7 },
	{ id: "03", title: "描述数据分布的数值特征", resources: 8 },
	{ id: "04", title: "随机事件与概率", resources: 9 },
	{ id: "05", title: "随机变量及其分布", resources: 9 },
	{ id: "06", title: "样本的统计推断", resources: 12 },
	{ id: "07", title: "总体均值的比较", resources: 15 },
	{ id: "08", title: "相关与回归分析", resources: 14 },
	{ id: "09", title: "拟合优度与列联表分析", resources: 4 },
	{ id: "10", title: "非参数统计推断", resources: 5 },
	{ id: "11", title: "时间序列分析", resources: 5 },
];

const catalogResources = {
	"06": {
		title: "样本的统计推断",
		section: "6.2 置信区间",
		intro: "从一个样本出发，如何对未知总体参数给出有不确定性边界的估计？",
		visualizations: [
			"中心极限定理实验",
			"置信区间覆盖实验",
			"置信区间案例实验",
		],
		r: ["模拟重复抽样", "构造均值置信区间", "手动计算 t 区间", "比较区间宽度"],
		python: [
			"抽样分布模拟",
			"均值置信区间",
			"样本量规划",
			"比例置信区间",
			"比较置信水平",
		],
	},
	"07": {
		title: "总体均值的比较",
		section: "7.1 假设检验",
		intro: "把样本差异与随机波动放在同一尺度上，判断观察到的证据是否足够强。",
		visualizations: ["两类错误与功效实验", "方差分析实验"],
		r: ["完成单样本 t 检验", "比较两组均值", "配对样本检验", "单因素方差分析"],
		python: [
			"单样本检验",
			"两独立样本检验",
			"配对检验",
			"单因素 ANOVA",
			"事后比较",
		],
	},
} as const;

export function CatalogVisualDemo() {
	const [chapterId, setChapterId] = useState<"06" | "07">("06");
	const content = catalogResources[chapterId];

	return (
		<DemoPage current="catalog" className="sm-catalog-demo">
			<div className="sm-catalog-frame">
				<aside className="sm-catalog-sidebar" aria-label="教材章节">
					<div className="sm-panel-title">
						<span>TEXTBOOK</span>
						<strong>《现代基础统计学》</strong>
						<small>12 章 · 数字资源版</small>
					</div>
					<label className="sm-search-field">
						<span className="sr-only">搜索教材</span>
						<svg viewBox="0 0 20 20" aria-hidden="true">
							<circle cx="8.5" cy="8.5" r="5.5" />
							<path d="m13 13 4 4" />
						</svg>
						<input type="search" placeholder="搜索概念、公式或章节" />
					</label>
					<nav className="sm-chapter-list" aria-label="教材目录">
						{textbookChapters.map((chapter) => {
							const isSelectable = chapter.id === "06" || chapter.id === "07";
							const active = chapter.id === chapterId;
							return (
								<button
									key={chapter.id}
									type="button"
									className={active ? "is-active" : undefined}
									onClick={() => {
										if (chapter.id === "06" || chapter.id === "07") {
											setChapterId(chapter.id);
										}
									}}
									aria-pressed={active}
									title={isSelectable ? undefined : "本 Demo 聚焦第 6、7 章"}
								>
									<span>{chapter.id}</span>
									<span>
										<b>{chapter.title}</b>
										<small>{chapter.resources} 项配套资源</small>
									</span>
								</button>
							);
						})}
					</nav>
				</aside>

				<article className="sm-catalog-article">
					<div className="sm-reading-meta">
						<span>教材资源 / 第 {chapterId} 章</span>
						<span>预计阅读 18 分钟 · 阅读进度 36%</span>
					</div>
					<header className="sm-article-header">
						<span className="sm-article-number">{chapterId}</span>
						<div>
							<p>{content.section}</p>
							<h1>{content.title}</h1>
							<p className="sm-article-lead">{content.intro}</p>
						</div>
					</header>

					<section
						className="sm-learning-goals"
						aria-labelledby="catalog-goals"
					>
						<span>LEARNING GOALS</span>
						<div>
							<h2 id="catalog-goals">完成本节后，你能够</h2>
							<ol>
								<li>区分点估计与区间估计</li>
								<li>解释置信水平的重复抽样含义</li>
								<li>判断样本量如何影响区间宽度</li>
							</ol>
						</div>
					</section>

					<section className="sm-reading-section">
						<p className="sm-section-kicker">6.2.1 · 从一个样本开始</p>
						<h2>区间不是答案的装饰，而是不确定性的边界</h2>
						<p>
							假设总体均值未知。我们从总体中抽取一个样本，用样本均值作为估计，同时用标准误描述这次估计可能波动的尺度。
						</p>
						<div
							className="sm-equation-line"
							role="img"
							aria-label="估计值加减临界值乘以标准误"
						>
							<span>估计值</span>
							<b>±</b>
							<span>临界值</span>
							<b>×</b>
							<span>标准误</span>
						</div>
						<div className="sm-textbook-note">
							<span>读图提示</span>
							<p>
								95% 描述的是方法在长期重复抽样中的覆盖表现，不是“这个固定区间有
								95% 概率包含均值”。
							</p>
						</div>
					</section>

					<section
						className="sm-mini-figure"
						aria-labelledby="sampling-figure-title"
					>
						<div className="sm-mini-figure__copy">
							<span>FIGURE 6.2</span>
							<h3 id="sampling-figure-title">同一总体，五次不同的样本</h3>
							<p>
								每一条线都是一次独立抽样得到的区间。蓝色虚线表示未知但固定的总体均值。
							</p>
						</div>
						<svg
							viewBox="0 0 500 210"
							role="img"
							aria-label="五条置信区间，其中一条未覆盖总体均值"
						>
							<path
								className="grid"
								d="M55 185H470M120 34v151M260 34v151M400 34v151"
							/>
							<path className="truth" d="M260 24v161" />
							<text x="270" y="25">
								μ
							</text>
							{[55, 86, 117, 148, 179].map((y, index) => {
								const starts = [120, 180, 70, 215, 150];
								const ends = [350, 420, 235, 455, 390];
								const missed = index === 2;
								return (
									<g key={y} className={missed ? "missed" : "covered"}>
										<text x="25" y={y + 4}>
											{index + 1}
										</text>
										<path d={`M${starts[index]} ${y}H${ends[index]}`} />
										<circle
											cx={(starts[index] + ends[index]) / 2}
											cy={y}
											r="4"
										/>
										{missed ? (
											<text x="78" y={y - 9}>
												未覆盖
											</text>
										) : null}
									</g>
								);
							})}
						</svg>
					</section>

					<footer className="sm-reading-next">
						<button type="button">← 上一节：抽样分布</button>
						<button type="button">下一节：样本量与精度 →</button>
					</footer>
				</article>

				<aside className="sm-catalog-tools" aria-label="本章工具与大纲">
					<section>
						<p className="sm-aside-label">本页大纲</p>
						<nav className="sm-outline-nav">
							<a className="is-active" href="#catalog-goals">
								学习目标
							</a>
							<a href="#sampling-figure-title">区间估计</a>
							<a href="#sampling-figure-title">重复抽样</a>
							<a href="#sampling-figure-title">解释与误区</a>
						</nav>
					</section>
					<section>
						<p className="sm-aside-label">关联实验</p>
						<div className="sm-resource-links">
							{content.visualizations.map((item, index) => (
								<a
									key={item}
									href={
										index === 1 && chapterId === "06"
											? "/visual-demo/experiment"
											: "/teaching-platform"
									}
								>
									<span className="is-viz">VIS</span>
									<span>
										<b>{item}</b>
										<small>交互可视化</small>
									</span>
									<Chevron />
								</a>
							))}
						</div>
					</section>
					<section>
						<p className="sm-aside-label">编程练习</p>
						<div className="sm-resource-links sm-resource-links--compact">
							<a href="/visual-demo/r">
								<span className="is-r">R</span>
								<span>
									<b>{content.r.length} 项 R 实验</b>
									<small>{content.r[0]}</small>
								</span>
								<Chevron />
							</a>
							<a href="/visual-demo/python">
								<span className="is-py">Py</span>
								<span>
									<b>{content.python.length} 项 Python 实验</b>
									<small>{content.python[0]}</small>
								</span>
								<Chevron />
							</a>
							<a href="/visual-demo/paper">
								<span className="is-q">Q</span>
								<span>
									<b>章节练习</b>
									<small>从题库筛选本章题目</small>
								</span>
								<Chevron />
							</a>
						</div>
					</section>
					<section className="sm-note-preview">
						<p className="sm-aside-label">我的笔记</p>
						<p>置信水平与区间宽度之间存在权衡。</p>
						<button type="button">＋ 新增笔记</button>
					</section>
				</aside>
			</div>
		</DemoPage>
	);
}

const intervalRows = [
	{ low: 31, high: 67, mean: 49, covered: true },
	{ low: 37, high: 73, mean: 55, covered: true },
	{ low: 19, high: 46, mean: 32, covered: false },
	{ low: 35, high: 63, mean: 49, covered: true },
	{ low: 43, high: 77, mean: 60, covered: true },
	{ low: 26, high: 61, mean: 44, covered: true },
	{ low: 38, high: 70, mean: 54, covered: true },
	{ low: 24, high: 54, mean: 39, covered: true },
	{ low: 47, high: 79, mean: 63, covered: true },
	{ low: 14, high: 44, mean: 29, covered: false },
	{ low: 35, high: 69, mean: 52, covered: true },
	{ low: 41, high: 74, mean: 58, covered: true },
];

export function ExperimentVisualDemo() {
	const [sampleSize, setSampleSize] = useState(10);
	const [confidence, setConfidence] = useState(95);
	const [generated, setGenerated] = useState(12);
	const visibleRows = intervalRows.slice(
		0,
		Math.min(generated, intervalRows.length),
	);
	const covered = visibleRows.filter((row) => row.covered).length;
	const coverage = visibleRows.length
		? ((covered / visibleRows.length) * 100).toFixed(1)
		: "—";

	return (
		<DemoPage current="experiment" className="sm-experiment-demo">
			<div className="sm-experiment-bar">
				<div>
					<span>统计教学平台 / 参数估计</span>
					<h1>重复抽样中的置信区间</h1>
				</div>
				<div className="sm-experiment-bar__question">
					研究问题：95% 置信区间为什么会覆盖总体均值约 95% 的次数？
				</div>
				<a href="/teaching-platform#confidence-interval">
					进入真实实验 <ExternalArrow />
				</a>
			</div>

			<div className="sm-experiment-frame">
				<aside className="sm-experiment-nav">
					<div className="sm-panel-title">
						<span>EXPERIMENTS</span>
						<strong>实验导航</strong>
						<small>统计基本原理</small>
					</div>
					<nav>
						{[
							["概率分布", "观察分布形态"],
							["抽样", "随机样本生成"],
							["中心极限定理", "中心极限定理"],
							["参数估计", "置信区间"],
							["假设检验", "两类错误与功效"],
							["回归分析", "线性关系"],
						].map(([title, sub], index) => (
							<button
								key={title}
								type="button"
								className={index === 3 ? "is-active" : undefined}
							>
								<span>{String(index + 1).padStart(2, "0")}</span>
								<span>
									<b>{title}</b>
									<small>{sub}</small>
								</span>
							</button>
						))}
					</nav>
					<div className="sm-experiment-steps">
						<p>实验步骤</p>
						{[
							["01", "设置总体与置信水平", true],
							["02", "生成重复样本", true],
							["03", "比较置信区间", true],
							["04", "解释覆盖率", false],
						].map(([number, title, done]) => (
							<div
								key={String(number)}
								className={done ? "is-done" : undefined}
							>
								<span>{number}</span>
								<b>{title}</b>
							</div>
						))}
					</div>
				</aside>

				<section className="sm-experiment-canvas">
					<div className="sm-evidence-line">
						<span>
							<b>总体</b>
							<small>μ = 10, σ = 2</small>
						</span>
						<i />
						<span>
							<b>重复抽样</b>
							<small>n = {sampleSize}</small>
						</span>
						<i />
						<span>
							<b>{confidence}% 区间</b>
							<small>估计 ± 临界值 × 标准误</small>
						</span>
						<i />
						<span>
							<b>覆盖判断</b>
							<small>
								{covered}/{visibleRows.length || 0} 覆盖
							</small>
						</span>
					</div>

					<div className="sm-chart-heading">
						<div>
							<span>VISUALIZATION 01</span>
							<h2>每一次抽样，都产生一个不同的区间</h2>
						</div>
						<div className="sm-chart-legend">
							<span className="covered">覆盖 μ</span>
							<span className="missed">未覆盖</span>
							<span className="truth">真实均值</span>
						</div>
					</div>

					<div className="sm-ci-chart-wrap">
						<svg
							className="sm-ci-chart"
							viewBox="0 0 760 510"
							role="img"
							aria-labelledby="ci-title ci-desc"
						>
							<title id="ci-title">十二次重复抽样产生的置信区间</title>
							<desc id="ci-desc">十个区间覆盖真实均值，两个区间未覆盖。</desc>
							<path className="axis" d="M78 456H720M78 58v398" />
							{[5, 7.5, 10, 12.5, 15].map((tick, index) => {
								const x = 80 + index * 160;
								return (
									<g key={tick}>
										<path className="grid" d={`M${x} 58v398`} />
										<text x={x} y="482" textAnchor="middle">
											{tick}
										</text>
									</g>
								);
							})}
							<path className="true-mean" d="M400 42v414" />
							<text className="true-label" x="410" y="40">
								真实均值 μ = 10
							</text>
							{visibleRows.map((row, index) => {
								const y = 82 + index * 30;
								const x1 = 80 + row.low * 6.4;
								const x2 = 80 + row.high * 6.4;
								const mx = 80 + row.mean * 6.4;
								return (
									<g
										key={`${row.low}-${row.high}`}
										className={row.covered ? "row-covered" : "row-missed"}
									>
										<text x="48" y={y + 4}>
											{String(index + 1).padStart(2, "0")}
										</text>
										<path d={`M${x1} ${y}H${x2}`} />
										<path d={`M${x1} ${y - 5}v10M${x2} ${y - 5}v10`} />
										<circle cx={mx} cy={y} r="4.5" />
										{!row.covered ? (
											<text className="miss-label" x={x2 + 9} y={y + 4}>
												未覆盖
											</text>
										) : null}
									</g>
								);
							})}
							{!visibleRows.length ? (
								<text x="400" y="250" textAnchor="middle">
									生成第一个样本后，区间会显示在这里
								</text>
							) : null}
							<text x="400" y="505" textAnchor="middle">
								总体尺度
							</text>
						</svg>
					</div>

					<div className="sm-experiment-observation">
						<div>
							<span>当前批次</span>
							<b>{visibleRows.length} 个区间</b>
						</div>
						<div>
							<span>覆盖真实均值</span>
							<b>{covered} 次</b>
						</div>
						<div>
							<span>观察覆盖率</span>
							<b>
								{coverage}
								{coverage === "—" ? "" : "%"}
							</b>
						</div>
						<p>样本数量较少时，观察覆盖率会波动；增加重复次数后再比较。</p>
					</div>
				</section>

				<aside className="sm-experiment-controls">
					<div className="sm-panel-title">
						<span>PARAMETERS</span>
						<strong>实验参数</strong>
						<small>调整后重新观察</small>
					</div>
					<div className="sm-control-group">
						<p>总体设定</p>
						<label>
							<span>
								总体均值 μ <b>10</b>
							</span>
							<input type="range" min="7" max="13" value="10" readOnly />
						</label>
						<label>
							<span>
								总体标准差 σ <b>2.0</b>
							</span>
							<input
								type="range"
								min="1"
								max="4"
								step="0.5"
								value="2"
								readOnly
							/>
						</label>
					</div>
					<div className="sm-control-group">
						<p>抽样设定</p>
						<label htmlFor="demo-sample-size">
							<span>
								样本量 n <b>{sampleSize}</b>
							</span>
						</label>
						<input
							id="demo-sample-size"
							type="range"
							min="5"
							max="50"
							value={sampleSize}
							onChange={(event) => setSampleSize(Number(event.target.value))}
						/>
					</div>
					<div className="sm-control-group">
						<p>区间设定</p>
						<label htmlFor="demo-confidence">
							<span>
								置信水平 <b>{confidence}%</b>
							</span>
						</label>
						<select
							id="demo-confidence"
							value={confidence}
							onChange={(event) => setConfidence(Number(event.target.value))}
						>
							<option value="90">90%</option>
							<option value="95">95%</option>
							<option value="99">99%</option>
						</select>
						<label>
							<span>总体 σ 假设</span>
							<select defaultValue="known">
								<option value="known">σ 已知 · Z 区间</option>
								<option value="unknown">σ 未知 · t 区间</option>
							</select>
						</label>
					</div>
					<div className="sm-control-actions">
						<button
							type="button"
							onClick={() => setGenerated((value) => Math.min(value + 1, 12))}
						>
							＋ 生成 1 个样本
						</button>
						<button type="button" onClick={() => setGenerated(12)}>
							连续生成 20 个
						</button>
						<button type="button" onClick={() => setGenerated(0)}>
							重置实验
						</button>
					</div>
					<div className="sm-formula-note">
						<span>核心公式</span>
						<b>估计值 ± 临界值 × 标准误</b>
						<p>{confidence}% 置信水平越高，区间通常越宽。</p>
					</div>
				</aside>
			</div>
		</DemoPage>
	);
}

type DemoQuestion = {
	id: string;
	type: string;
	chapter: string;
	difficulty: string;
	minutes: number;
	points: number;
	stem: string;
	topics: string[];
};

const demoQuestions: DemoQuestion[] = [
	{
		id: "ch01_q13",
		type: "计算题",
		chapter: "第 1 章",
		difficulty: "基础",
		minutes: 3,
		points: 8,
		stem: "计算下列总体数据的均值、中位数和众数：17, 23, 19, 20, 25, 18, 22, 15, 21, 20。",
		topics: ["均值", "中位数", "众数"],
	},
	{
		id: "rotel_ch02_boxplot_01",
		type: "填空题",
		chapter: "第 2 章",
		difficulty: "基础",
		minutes: 3,
		points: 5,
		stem: "观察给定箱线图，填写最小值、第一四分位数与中位数。",
		topics: ["箱线图", "五数概括"],
	},
	{
		id: "ch11_q01",
		type: "综合题",
		chapter: "第 11 章",
		difficulty: "中等",
		minutes: 10,
		points: 15,
		stem: "根据五个周一晚班的数据拟合最小二乘回归线，预测 x=5，并计算样本相关系数。",
		topics: ["线性回归", "相关系数"],
	},
	{
		id: "rotel_ch13_causation_01",
		type: "简答题",
		chapter: "第 13 章",
		difficulty: "基础",
		minutes: 3,
		points: 6,
		stem: "啤酒销量与冰淇淋销量呈强正相关。能否据此认为增加啤酒销量会导致冰淇淋销量上升？",
		topics: ["相关", "因果", "潜在变量"],
	},
	{
		id: "rotel_ch01_variables_01",
		type: "选择题",
		chapter: "第 1 章",
		difficulty: "中等",
		minutes: 6,
		points: 5,
		stem: "下列哪些情境收集的是分类数据？选择所有符合条件的选项。",
		topics: ["分类数据", "变量类型"],
	},
];

export function PaperVisualDemo() {
	const [selected, setSelected] = useState<string[]>(["ch01_q13", "ch11_q01"]);
	const selectedQuestions = demoQuestions.filter((question) =>
		selected.includes(question.id),
	);
	const totalPoints = selectedQuestions.reduce(
		(sum, question) => sum + question.points,
		0,
	);
	const totalMinutes = selectedQuestions.reduce(
		(sum, question) => sum + question.minutes,
		0,
	);
	const toggleQuestion = (id: string) =>
		setSelected((value) =>
			value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
		);

	return (
		<DemoPage current="paper" className="sm-paper-demo">
			<div className="sm-paper-toolbar">
				<div>
					<span>现代基础统计学 / 2026 春季</span>
					<h1>统计学组卷工作台</h1>
				</div>
				<label className="sm-paper-search">
					<span className="sr-only">搜索题库</span>
					<input type="search" placeholder="搜索题干、知识点或题目编号" />
					<kbd>⌘ K</kbd>
				</label>
				<div>
					<span className="sm-saved-state">
						<i /> 草稿已自动保存
					</span>
					<a href="/st-qselector">
						进入真实系统 <ExternalArrow />
					</a>
				</div>
			</div>

			<div className="sm-paper-frame">
				<aside className="sm-paper-filters">
					<div className="sm-panel-title">
						<span>FILTERS</span>
						<strong>筛选题目</strong>
						<small>296 道已审核</small>
					</div>
					<fieldset>
						<legend>教材章节</legend>
						<label>
							<input type="checkbox" defaultChecked /> 第 6 章 · 样本推断{" "}
							<span>34</span>
						</label>
						<label>
							<input type="checkbox" /> 第 7 章 · 均值比较 <span>27</span>
						</label>
						<label>
							<input type="checkbox" /> 第 8 章 · 回归分析 <span>33</span>
						</label>
						<button type="button">查看全部章节</button>
					</fieldset>
					<fieldset>
						<legend>题型</legend>
						{["计算题 142", "综合题 98", "简答题 39", "选择题 7"].map(
							(item, index) => (
								<label key={item}>
									<input type="checkbox" defaultChecked={index < 2} /> {item}
								</label>
							),
						)}
					</fieldset>
					<fieldset>
						<legend>难度</legend>
						<div className="sm-filter-segments">
							<button type="button">基础</button>
							<button type="button" className="is-active">
								中等
							</button>
							<button type="button">进阶</button>
						</div>
					</fieldset>
					<fieldset>
						<legend>使用状态</legend>
						<label>
							<input type="radio" name="usage" defaultChecked /> 全部题目
						</label>
						<label>
							<input type="radio" name="usage" /> 本学期未使用
						</label>
					</fieldset>
					<button className="sm-reset-filter" type="button">
						重置所有筛选
					</button>
				</aside>

				<section className="sm-question-bank">
					<header>
						<div>
							<span>QUESTION BANK</span>
							<h2>题库</h2>
						</div>
						<div>
							<span>匹配 36 道题</span>
							<select aria-label="题库排序" defaultValue="relevance">
								<option value="relevance">相关度排序</option>
								<option value="difficulty">难度排序</option>
							</select>
						</div>
					</header>
					<div className="sm-active-filters">
						<span>
							第 6 章{" "}
							<button type="button" aria-label="移除第 6 章筛选">
								×
							</button>
						</span>
						<span>
							计算题{" "}
							<button type="button" aria-label="移除计算题筛选">
								×
							</button>
						</span>
						<span>
							中等{" "}
							<button type="button" aria-label="移除中等难度筛选">
								×
							</button>
						</span>
						<button type="button">清除全部</button>
					</div>
					<div className="sm-bulk-bar">
						<label>
							<input type="checkbox" /> 选择当前页
						</label>
						<span>已加入 {selected.length} 题</span>
						<button type="button">批量加入试卷</button>
					</div>
					<div className="sm-question-list">
						{demoQuestions.map((question, index) => {
							const isSelected = selected.includes(question.id);
							return (
								<article
									key={question.id}
									className={isSelected ? "is-selected" : undefined}
								>
									<label className="sm-question-check">
										<input
											type="checkbox"
											checked={isSelected}
											onChange={() => toggleQuestion(question.id)}
										/>
										<span>{String(index + 1).padStart(2, "0")}</span>
									</label>
									<div className="sm-question-content">
										<div className="sm-question-meta">
											<span>{question.type}</span>
											<span>{question.chapter}</span>
											<span>{question.difficulty}</span>
											<span>{question.points} 分</span>
											<small>{question.id}</small>
										</div>
										<p>{question.stem}</p>
										<div className="sm-question-topics">
											{question.topics.map((topic) => (
												<span key={topic}>{topic}</span>
											))}
											<small>预计 {question.minutes} 分钟</small>
										</div>
									</div>
									<button
										className="sm-add-question"
										type="button"
										onClick={() => toggleQuestion(question.id)}
										aria-pressed={isSelected}
									>
										{isSelected ? "已加入" : "加入试卷"}
									</button>
								</article>
							);
						})}
					</div>
				</section>

				<aside className="sm-current-paper">
					<div className="sm-current-paper__head">
						<span>CURRENT PAPER</span>
						<input
							aria-label="试卷名称"
							defaultValue="统计学基础 · 期中考试卷 A"
						/>
					</div>
					<div className="sm-paper-summary">
						<div>
							<b>{selectedQuestions.length}</b>
							<span>题目</span>
						</div>
						<div>
							<b>{totalPoints}</b>
							<span>总分</span>
						</div>
						<div>
							<b>{totalMinutes}</b>
							<span>分钟</span>
						</div>
					</div>
					<div className="sm-paper-progress">
						<span>
							<b>目标总分</b>
							<small>{totalPoints} / 100</small>
						</span>
						<i>
							<span style={{ width: `${Math.min(totalPoints, 100)}%` }} />
						</i>
						<p>还需 {100 - totalPoints} 分达到目标</p>
					</div>
					<div className="sm-paper-structure">
						<div>
							<span>试卷结构</span>
							<button type="button">按题型整理</button>
						</div>
						{selectedQuestions.length ? (
							selectedQuestions.map((question, index) => (
								<div className="sm-paper-item" key={question.id}>
									<span className="sm-drag">⋮⋮</span>
									<span>
										<b>
											{index + 1}. {question.type}
										</b>
										<small>{question.id}</small>
									</span>
									<strong>{question.points} 分</strong>
									<button
										type="button"
										onClick={() => toggleQuestion(question.id)}
										aria-label={`移除 ${question.id}`}
									>
										×
									</button>
								</div>
							))
						) : (
							<div className="sm-paper-empty">
								<p>从题库加入题目后，试卷结构会显示在这里。</p>
								<button type="button">浏览全部题目</button>
							</div>
						)}
					</div>
					<div className="sm-paper-actions">
						<button type="button" disabled={!selectedQuestions.length}>
							预览试卷
						</button>
						<button type="button" disabled={!selectedQuestions.length}>
							导出试卷
						</button>
					</div>
				</aside>
			</div>
		</DemoPage>
	);
}

type IdeConfig = {
	page: "r" | "python";
	lab: string;
	title: string;
	lesson: string;
	lessonMeta: string;
	progress: string;
	total: number;
	groups: Array<{ name: string; lessons: string[] }>;
	goal: string;
	task: string;
	concepts: string[];
	starterCode: string;
	solutionCode: string;
	output: string;
	explanation: string;
	variables: Array<[string, string]>;
	runtime: string;
	realHref: string;
};

const rIde: IdeConfig = {
	page: "r",
	lab: "R LAB",
	title: "R 语言编程工作室",
	lesson: "保存一组成绩并计算均值",
	lessonMeta: "第一课 · 对象与向量",
	progress: "1 / 39",
	total: 39,
	groups: [
		{
			name: "01 · R 编程基础",
			lessons: [
				"保存一组成绩并计算均值",
				"认识 RStudio 与可复现脚本",
				"筛选满足条件的观测",
			],
		},
		{
			name: "02 · 数据与图形",
			lessons: ["从文本表格建立数据框", "绘制分组频数柱状图"],
		},
		{
			name: "03 · 统计分析",
			lessons: ["完成单样本 t 检验", "比较两个总体均值"],
		},
	],
	goal: "使用 <- 创建对象、使用 c() 建立向量，并把计算结果保存下来。",
	task: "补全最后一行，把 scores 的均值保存为 average_score，然后运行并检查答案。",
	concepts: ["<-", "c()", "mean()"],
	starterCode: `# Five students' exam scores\nscores <- c(72, 81, 76, 90, 85)\n\n# Store the mean in average_score\naverage_score <-`,
	solutionCode: `# Five students' exam scores\nscores <- c(72, 81, 76, 90, 85)\n\n# Store the mean in average_score\naverage_score <- mean(scores)\naverage_score`,
	output: "[1] 80.8",
	explanation:
		"mean() 对五个观测求和并除以观测数；average_score 保存了结果 80.8。",
	variables: [
		["scores", "num [1:5] 72 81 76 90 85"],
		["average_score", "num 80.8"],
	],
	runtime: "R 4.3 · WebR",
	realHref: "/r-learning?lessonId=vectors-and-mean&returnTo=%2Fvisual-demo%2Fr",
};

const pythonIde: IdeConfig = {
	page: "python",
	lab: "PY LAB",
	title: "Python 数据科学工作室",
	lesson: "筛选数据并汇总分组",
	lessonMeta: "第三课 · pandas 数据处理",
	progress: "3 / 43",
	total: 43,
	groups: [
		{
			name: "01 · Python 基础",
			lessons: ["用列表计算样本均值", "标准化一组观测值"],
		},
		{
			name: "02 · 数据处理",
			lessons: ["筛选数据并汇总分组", "合并两张数据表", "处理缺失值"],
		},
		{ name: "03 · 数据可视化", lessons: ["绘制分组柱状图", "比较两个分布"] },
		{ name: "04 · 统计建模", lessons: ["拟合线性回归模型"] },
	],
	goal: "使用 DataFrame、布尔筛选和 groupby() 比较不同组的平均成绩。",
	task: "保留 score >= 80 的记录为 high_scores，并计算各组平均值 group_means。",
	concepts: ["DataFrame", "boolean filter", "groupby()"],
	starterCode: `import pandas as pd\n\nscores = pd.DataFrame({\n    "group": ["A", "A", "B", "B", "B"],\n    "score": [72, 88, 79, 91, 85]\n})\n\n# Keep scores of at least 80\nhigh_scores =\n\n# Mean score by group\ngroup_means =`,
	solutionCode: `import pandas as pd\n\nscores = pd.DataFrame({\n    "group": ["A", "A", "B", "B", "B"],\n    "score": [72, 88, 79, 91, 85]\n})\n\nhigh_scores = scores[scores["score"] >= 80]\ngroup_means = scores.groupby("group")["score"].mean()\nprint(group_means)`,
	output: "group\nA    80.0\nB    85.0\nName: score, dtype: float64",
	explanation:
		"布尔筛选保留 88、91、85；groupby() 按 A/B 分组后计算均值。B 组样本均值更高。",
	variables: [
		["scores", "DataFrame · 5 rows × 2 cols"],
		["high_scores", "DataFrame · 3 rows × 2 cols"],
		["group_means", "Series · 2 values"],
	],
	runtime: "Python 3.12 · Pyodide",
	realHref:
		"/python-learning?topicId=data-and-variables&lessonId=pandas-filter-summary&returnTo=%2Fvisual-demo%2Fpython",
};

function LearningIdeVisualDemo({ config }: { config: IdeConfig }) {
	const [code, setCode] = useState(config.starterCode);
	const [hasRun, setHasRun] = useState(false);
	const [tool, setTool] = useState<
		"Tutor" | "Console" | "Variables" | "Review"
	>("Tutor");
	const lines = code.split("\n");
	const lineNumbers = Array.from(
		{ length: lines.length },
		(_, index) => index + 1,
	);
	const runExample = () => {
		setCode(config.solutionCode);
		setHasRun(true);
		setTool("Console");
	};

	return (
		<DemoPage
			current={config.page}
			className={`sm-ide-demo sm-ide-demo--${config.page}`}
		>
			<div className="sm-ide-toolbar">
				<div>
					<span>{config.lab} · STATMIND</span>
					<h1>{config.title}</h1>
				</div>
				<div className="sm-ide-progress">
					<span>
						<b>{config.progress}</b> 课程完成
					</span>
					<i>
						<span style={{ width: `${config.page === "r" ? 3 : 7}%` }} />
					</i>
				</div>
				<div>
					<span className="sm-runtime-state">
						<i /> {config.runtime} · Ready
					</span>
					<a href={config.realHref}>
						进入真实课程 <ExternalArrow />
					</a>
				</div>
			</div>

			<div className="sm-ide-frame">
				<aside className="sm-ide-syllabus">
					<div className="sm-panel-title">
						<span>COURSE</span>
						<strong>课程目录</strong>
						<small>{config.total} 项引导实验</small>
					</div>
					{config.groups.map((group) => (
						<section key={group.name}>
							<h2>{group.name}</h2>
							{group.lessons.map((lesson, index) => {
								const active = lesson === config.lesson;
								return (
									<button
										key={lesson}
										type="button"
										className={active ? "is-active" : undefined}
									>
										<span>{active ? "●" : index < 1 ? "✓" : "○"}</span>
										<span>
											<b>{lesson}</b>
											<small>
												{active ? "当前课程" : index < 1 ? "已完成" : "未开始"}
											</small>
										</span>
									</button>
								);
							})}
						</section>
					))}
					<div className="sm-syllabus-footer">
						<span>{config.progress} 已完成</span>
						<button type="button">查看完整课程</button>
					</div>
				</aside>

				<section className="sm-notebook">
					<header className="sm-lesson-header">
						<div>
							<span>{config.lessonMeta}</span>
							<h2>{config.lesson}</h2>
						</div>
						<div>
							{config.concepts.map((concept) => (
								<span key={concept}>{concept}</span>
							))}
						</div>
					</header>
					<div className="sm-lesson-evidence">
						<div>
							<span>01</span>
							<b>目标</b>
						</div>
						<i />
						<div>
							<span>02</span>
							<b>示例</b>
						</div>
						<i />
						<div className="is-active">
							<span>03</span>
							<b>代码</b>
						</div>
						<i />
						<div>
							<span>04</span>
							<b>解释</b>
						</div>
					</div>

					<section className="sm-notebook-block sm-notebook-goal">
						<span className="sm-block-label">LESSON GOAL</span>
						<div>
							<h3>学习目标</h3>
							<p>{config.goal}</p>
						</div>
					</section>
					<section className="sm-notebook-block sm-notebook-task">
						<span className="sm-block-label">YOUR TASK</span>
						<div>
							<h3>你的任务</h3>
							<p>{config.task}</p>
							<button type="button">只给我一个提示</button>
						</div>
					</section>

					<section className="sm-code-cell">
						<header>
							<span>
								<i className="is-red" />
								<i className="is-yellow" />
								<i className="is-green" />{" "}
								{config.page === "r" ? "R" : "Python"} 代码单元
							</span>
							<span>{lines.length} 行 · 已自动保存</span>
						</header>
						<div className="sm-code-editor">
							<div className="sm-line-numbers" aria-hidden="true">
								{lineNumbers.map((lineNumber) => (
									<span key={lineNumber}>{lineNumber}</span>
								))}
							</div>
							<textarea
								aria-label={`${config.page === "r" ? "R" : "Python"} 代码编辑器`}
								value={code}
								onChange={(event) => {
									setCode(event.target.value);
									setHasRun(false);
								}}
								spellCheck={false}
							/>
						</div>
						<footer>
							<button type="button" onClick={runExample}>
								▶ 运行示例
							</button>
							<button
								type="button"
								onClick={() => {
									setCode(config.starterCode);
									setHasRun(false);
								}}
							>
								重置代码
							</button>
							<span>{hasRun ? "运行完成 · 0.8s" : "等待运行"}</span>
						</footer>
					</section>

					<section className={`sm-output-cell ${hasRun ? "has-output" : ""}`}>
						<header>
							<span>OUTPUT</span>
							<b>{hasRun ? "运行成功" : "尚无输出"}</b>
						</header>
						{hasRun ? (
							<pre>{config.output}</pre>
						) : (
							<p>运行代码后，结果会显示在这里。</p>
						)}
					</section>

					<section className="sm-notebook-block sm-notebook-explanation">
						<span className="sm-block-label">EXPLANATION</span>
						<div>
							<h3>结果解释</h3>
							<p>
								{hasRun
									? config.explanation
									: "先运行代码，再把输出与统计概念联系起来。"}
							</p>
						</div>
					</section>
					<section className={`sm-check-cell ${hasRun ? "is-passed" : ""}`}>
						<span>{hasRun ? "✓" : "?"}</span>
						<div>
							<b>{hasRun ? "自动检查通过" : "检查你的答案"}</b>
							<small>
								{hasRun ? "对象、数值与任务要求一致" : "完成代码后运行自动检查"}
							</small>
						</div>
						<button type="button" onClick={runExample}>
							{hasRun ? "进入下一课" : "检查答案"}
						</button>
					</section>
				</section>

				<aside className="sm-ide-tools">
					<div className="sm-tool-tabs" role="tablist" aria-label="学习工具">
						{(["Tutor", "Console", "Variables", "Review"] as const).map(
							(item) => (
								<button
									key={item}
									type="button"
									role="tab"
									aria-selected={tool === item}
									onClick={() => setTool(item)}
								>
									{item}
								</button>
							),
						)}
					</div>
					{tool === "Tutor" ? (
						<div className="sm-tutor-panel">
							<div className="sm-tutor-avatar">AI</div>
							<span>STATMIND TUTOR</span>
							<h2>需要一起拆解这一步吗？</h2>
							<p>我会根据当前课程和代码给出下一步提示，不直接替你完成。</p>
							<button type="button">解释 {config.concepts.at(-1)}</button>
							<button type="button">给我一个相似例子</button>
							<label>
								<span className="sr-only">向 AI 助教提问</span>
								<textarea placeholder="询问本课概念或代码…" />
							</label>
							<button className="sm-send-question" type="button">
								发送问题
							</button>
						</div>
					) : null}
					{tool === "Console" ? (
						<div className="sm-console-panel">
							<span>{config.runtime}</span>
							<pre>
								{hasRun
									? `> Run lesson\n${config.output}\n\nCompleted in 0.8s`
									: "> Session ready\n> Waiting for code…"}
							</pre>
						</div>
					) : null}
					{tool === "Variables" ? (
						<div className="sm-variables-panel">
							<span>ENVIRONMENT</span>
							<h2>当前对象</h2>
							{hasRun ? (
								config.variables.map(([name, value]) => (
									<div key={name}>
										<b>{name}</b>
										<small>{value}</small>
									</div>
								))
							) : (
								<p>运行代码后，这里会显示对象名称、类型和尺寸。</p>
							)}
						</div>
					) : null}
					{tool === "Review" ? (
						<div className="sm-review-panel">
							<span>CHECK RESULT</span>
							<h2>{hasRun ? "2 / 2 条件通过" : "等待检查"}</h2>
							<div>
								<i className={hasRun ? "is-done" : undefined} /> 对象名称正确
							</div>
							<div>
								<i className={hasRun ? "is-done" : undefined} /> 计算结果正确
							</div>
							<p>
								{hasRun
									? "本课证据已保存到学习记录。"
									: "运行代码并检查后显示详细结果。"}
							</p>
						</div>
					) : null}
				</aside>
			</div>
		</DemoPage>
	);
}

export function RVisualDemo() {
	return <LearningIdeVisualDemo config={rIde} />;
}

export function PythonVisualDemo() {
	return <LearningIdeVisualDemo config={pythonIde} />;
}
