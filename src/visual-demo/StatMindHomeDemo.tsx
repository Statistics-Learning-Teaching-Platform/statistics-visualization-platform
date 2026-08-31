import type { ReactNode } from "react";
import { apps } from "../../scripts/apps";
import { DemoTopNav } from "./DemoTopNav";
import "./statmind-home-demo.css";

type WorkspaceCardProps = {
	href: string;
	tone: "green" | "blue" | "violet" | "cyan";
	icon: ReactNode;
	eyebrow: string;
	title: string;
	description: string;
	metric: string;
	metricLabel: string;
	status: string;
	action: string;
};

function VisualizerIcon() {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true">
			<path d="M8 37h32" />
			<path d="M11 30.5 19 23l8 5 10-14" />
			<circle cx="11" cy="30.5" r="2.5" />
			<circle cx="19" cy="23" r="2.5" />
			<circle cx="27" cy="28" r="2.5" />
			<circle cx="37" cy="14" r="2.5" />
		</svg>
	);
}

function PaperIcon() {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true">
			<path d="M14 7h15l7 7v27H14z" />
			<path d="M29 7v8h7M20 22h10M20 28h10M20 34h7" />
			<path d="m8 16 3 3 5-6" />
		</svg>
	);
}

function RCodeIcon() {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true">
			<path d="m18 14-10 10 10 10M30 14l10 10-10 10M27 8l-6 32" />
		</svg>
	);
}

function PythonIcon() {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true">
			<path d="M24 7c-8 0-10 3-10 8v5h12v3H10c-4 0-6 3-6 9s3 9 8 9h5v-7c0-5 4-8 9-8h9c5 0 9-4 9-9v-2c0-5-4-8-10-8z" />
			<path d="M24 41c8 0 10-3 10-8v-5H22v-3h16c4 0 6-3 6-9S41 7 36 7h-5v7c0 5-4 8-9 8h-9c-5 0-9 4-9 9v2c0 5 4 8 10 8z" />
			<circle cx="20" cy="13" r="1.5" />
			<circle cx="28" cy="35" r="1.5" />
		</svg>
	);
}

function ArrowIcon() {
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true">
			<path d="M5 15 15 5M7 5h8v8" />
		</svg>
	);
}

function BookIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
			<path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
		</svg>
	);
}

function EvidencePlot() {
	const intervals = [
		{ y: 45, x1: 82, x2: 282, mean: 178, covered: true },
		{ y: 72, x1: 112, x2: 300, mean: 207, covered: true },
		{ y: 99, x1: 44, x2: 170, mean: 105, covered: false },
		{ y: 126, x1: 95, x2: 252, mean: 168, covered: true },
		{ y: 153, x1: 138, x2: 315, mean: 226, covered: true },
	];

	return (
		<svg
			className="sm-demo-evidence__plot"
			viewBox="0 0 360 185"
			role="img"
			aria-labelledby="evidence-title evidence-desc"
		>
			<title id="evidence-title">五次重复抽样的置信区间</title>
			<desc id="evidence-desc">四个区间覆盖真实均值，第三个区间未覆盖。</desc>
			<path
				className="sm-demo-evidence__grid"
				d="M38 175H330M60 27v148M180 27v148M300 27v148"
			/>
			<path className="sm-demo-evidence__truth" d="M180 21v154" />
			<text x="188" y="19">
				真实均值 μ
			</text>
			{intervals.map((interval, index) => (
				<g
					key={interval.y}
					className={interval.covered ? "is-covered" : "is-missed"}
				>
					<text x="18" y={interval.y + 4}>
						{String(index + 1).padStart(2, "0")}
					</text>
					<path d={`M${interval.x1} ${interval.y}H${interval.x2}`} />
					<path
						d={`M${interval.x1} ${interval.y - 5}v10M${interval.x2} ${interval.y - 5}v10`}
					/>
					<circle cx={interval.mean} cy={interval.y} r="4" />
				</g>
			))}
		</svg>
	);
}

function WorkspaceCard({
	href,
	tone,
	icon,
	eyebrow,
	title,
	description,
	metric,
	metricLabel,
	status,
	action,
}: WorkspaceCardProps) {
	return (
		<a className={`sm-demo-workspace sm-demo-workspace--${tone}`} href={href}>
			<span className="sm-demo-workspace__topline" aria-hidden="true" />
			<span className="sm-demo-workspace__head">
				<span className="sm-demo-workspace__icon">{icon}</span>
				<span className="sm-demo-workspace__eyebrow">{eyebrow}</span>
			</span>
			<span className="sm-demo-workspace__body">
				<strong>{title}</strong>
				<span>{description}</span>
			</span>
			<span className="sm-demo-workspace__evidence">
				<span>
					<b>{metric}</b>
					<small>{metricLabel}</small>
				</span>
				<span className="sm-demo-workspace__status">
					<i />
					{status}
				</span>
			</span>
			<span className="sm-demo-workspace__action">
				{action}
				<ArrowIcon />
			</span>
		</a>
	);
}

const journey = [
	{ number: "01", title: "理解概念", description: "先用问题建立统计直觉" },
	{ number: "02", title: "模拟实验", description: "观察随机性如何形成规律" },
	{ number: "03", title: "编程实践", description: "用 R 与 Python 验证想法" },
	{ number: "04", title: "统计分析", description: "把证据转化为解释" },
];

export function StatMindHomeDemo() {
	return (
		<main className="sm-demo">
			<DemoTopNav current="home" />

			<div className="sm-demo-shell">
				<section className="sm-demo-hero" aria-labelledby="sm-demo-title">
					<div className="sm-demo-hero__copy">
						<p className="sm-demo-eyebrow">
							<span aria-hidden="true" /> STATMIND · STATISTICAL THINKING
						</p>
						<h1 id="sm-demo-title">
							在思考中
							<br />
							学习统计
						</h1>
						<p className="sm-demo-hero__lead">
							把概念、模拟、代码与分析放在同一条证据链上。不是记住一个答案，而是理解答案如何产生。
						</p>
						<div className="sm-demo-hero__actions">
							<a
								className="sm-demo-button sm-demo-button--primary"
								href="/teaching-platform#confidence-interval"
							>
								从置信区间开始
								<ArrowIcon />
							</a>
							<a
								className="sm-demo-button sm-demo-button--quiet"
								href="/catalog"
							>
								浏览教材目录
							</a>
						</div>
					</div>

					<figure className="sm-demo-evidence">
						<div className="sm-demo-evidence__head">
							<span>
								<i /> 本周观察
							</span>
							<small>重复抽样 · 95% 置信区间</small>
						</div>
						<EvidencePlot />
						<figcaption>
							<span>
								<b>4 / 5</b> 区间覆盖真实均值
							</span>
							<span>一次结果会波动，规律来自重复。</span>
						</figcaption>
					</figure>
				</section>

				<section className="sm-demo-journey" aria-labelledby="journey-title">
					<div className="sm-demo-section-label">
						<span>LEARNING JOURNEY</span>
						<h2 id="journey-title">一条完整的学习证据链</h2>
					</div>
					<ol>
						{journey.map((step) => (
							<li key={step.number}>
								<span className="sm-demo-journey__number">{step.number}</span>
								<span>
									<b>{step.title}</b>
									<small>{step.description}</small>
								</span>
							</li>
						))}
					</ol>
				</section>

				<a className="sm-demo-catalog" href="/catalog">
					<span className="sm-demo-catalog__icon">
						<BookIcon />
					</span>
					<span className="sm-demo-catalog__copy">
						<small>《现代基础统计学》数字资源目录</small>
						<strong>12 章教材 · 14 个可视化 · R / Python 配套实验</strong>
					</span>
					<span className="sm-demo-catalog__action">
						查看完整目录 <ArrowIcon />
					</span>
				</a>

				<section
					className="sm-demo-workspaces"
					aria-labelledby="workspaces-title"
				>
					<div className="sm-demo-workspaces__heading">
						<div className="sm-demo-section-label">
							<span>WORKSPACES</span>
							<h2 id="workspaces-title">选择你的学习空间</h2>
						</div>
						<p>四个入口共享同一套教材结构与学习记录。</p>
					</div>

					<div className="sm-demo-workspaces__grid">
						<WorkspaceCard
							href="/teaching-platform"
							tone="green"
							icon={<VisualizerIcon />}
							eyebrow="VISUAL EXPERIMENTS"
							title="统计教学平台"
							description="通过置信区间、回归、假设检验与统计模拟，观察概念如何变成证据。"
							metric={String(apps.length).padStart(2, "0")}
							metricLabel="个可视化模块"
							status="实验服务可用"
							action="进入教学平台"
						/>
						<WorkspaceCard
							href="/st-qselector"
							tone="blue"
							icon={<PaperIcon />}
							eyebrow="QUESTION BANK + EXPORT"
							title="统计学组卷系统"
							description="按教材章节、题型与难度筛选审校题目，组织并导出一份可用试卷。"
							metric="296"
							metricLabel="道审校题目"
							status="题库已同步"
							action="进入组卷系统"
						/>
						<WorkspaceCard
							href="/r-learning?returnTo=%2Fvisual-demo"
							tone="violet"
							icon={<RCodeIcon />}
							eyebrow="R LAB · GUIDED PRACTICE"
							title="R 语言知识库"
							description="在真实 R 会话中完成目标、示例、代码、输出与解释相连的引导课程。"
							metric="39"
							metricLabel="项引导实验"
							status="R 环境可用"
							action="进入 R 学习"
						/>
						<WorkspaceCard
							href="/python-learning?returnTo=%2Fvisual-demo"
							tone="cyan"
							icon={<PythonIcon />}
							eyebrow="PY LAB · DATA SCIENCE"
							title="Python 语言知识库"
							description="使用 NumPy、pandas 与 SciPy，把数据处理、统计计算和结果解释放在一起。"
							metric="43"
							metricLabel="项数据实验"
							status="Python 环境可用"
							action="进入 Python 学习"
						/>
					</div>
				</section>

				<footer className="sm-demo-footer">
					<span>STATMIND / 统计学习 × 数据思维 × 科学探索</span>
					<span>视觉方向 Demo · 仅用于设计评审</span>
				</footer>
			</div>
		</main>
	);
}

export default StatMindHomeDemo;
