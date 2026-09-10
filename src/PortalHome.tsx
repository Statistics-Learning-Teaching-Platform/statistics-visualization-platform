import { useLanguage } from "@stats-viz/shared/i18n";
import {
	ArrowUpRightIcon,
	BracesIcon,
	ChartNoAxesCombinedIcon,
	FileCheck2Icon,
	LineChartIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./visual-demo/editorial-tailwind.css";
import "./visual-demo/editorial/editorial-demo.css";
import "./portal-home.css";
import { EditorialDemoShell } from "./visual-demo/editorial/EditorialPrimitives";
import { getWorkspaceEntries } from "./visual-demo/editorial/demo-data";

type PortalLanguage = "zh" | "en";

interface WorkspacePresentation {
	Icon: LucideIcon;
	eyebrow: string;
	title: Record<PortalLanguage, string>;
	meta: Record<PortalLanguage, string>;
	description: Record<PortalLanguage, string>;
	action: Record<PortalLanguage, string>;
}

const pageCopy = {
	zh: {
		logoAlt: "统计思维 StatMind 标志",
		kicker: "STATMIND · 统计思维教学平台",
		title: "在思考中学习统计",
		lead: "通过思考、探索与互动学习统计学。请选择要进入的学习空间。",
		workspaceLabel: "四个核心产品入口",
	},
	en: {
		logoAlt: "StatMind statistical thinking logo",
		kicker: "STATMIND · STATISTICAL THINKING PLATFORM",
		title: "Learn statistics by thinking",
		lead: "Learn through reflection, exploration, and interaction. Choose a workspace to begin.",
		workspaceLabel: "Four core product workspaces",
	},
} satisfies Record<PortalLanguage, Record<string, string>>;

const workspacePresentation: WorkspacePresentation[] = [
	{
		Icon: ChartNoAxesCombinedIcon,
		eyebrow: "Statistical Laboratory",
		title: { zh: "统计教学平台", en: "Statistics Laboratory" },
		meta: { zh: "13 个可视化模块", en: "13 visualization modules" },
		description: {
			zh: "通过交互式可视化学习置信区间、回归、假设检验与统计模拟。",
			en: "Explore confidence intervals, regression, hypothesis tests, and simulation through interactive visuals.",
		},
		action: { zh: "进入教学平台", en: "Open laboratory" },
	},
	{
		Icon: FileCheck2Icon,
		eyebrow: "Exam Composition",
		title: { zh: "统计学组卷系统", en: "Exam Composer" },
		meta: {
			zh: "296 道已审核题目 · 试卷导出",
			en: "296 reviewed questions · export ready",
		},
		description: {
			zh: "按章节、题型、难度和知识点筛选题目，完成组卷、预览与导出。",
			en: "Filter by chapter, type, difficulty, and topic, then compose, preview, and export an exam.",
		},
		action: { zh: "进入组卷系统", en: "Open exam composer" },
	},
	{
		Icon: BracesIcon,
		eyebrow: "R Learning Studio",
		title: { zh: "R 语言编程工作室", en: "R Programming Studio" },
		meta: { zh: "真实 R 环境 · 39 项引导实验", en: "Live R · 39 guided labs" },
		description: {
			zh: "在浏览器中编写并运行真实 R 代码，通过引导练习连接编程与统计思维。",
			en: "Write and run real R code in the browser with guided exercises that connect code to statistical thinking.",
		},
		action: { zh: "进入 R 编程工作室", en: "Open R studio" },
	},
	{
		Icon: LineChartIcon,
		eyebrow: "Python Learning Studio",
		title: { zh: "Python 语言编程工作室", en: "Python Programming Studio" },
		meta: {
			zh: "真实 Python · 43 项数据实验",
			en: "Live Python · 43 data labs",
		},
		description: {
			zh: "运行真实 Python，通过 NumPy、pandas、Matplotlib 与 SciPy 完成数据分析练习。",
			en: "Run real Python and work through data analysis with NumPy, pandas, Matplotlib, and SciPy.",
		},
		action: { zh: "进入 Python 编程工作室", en: "Open Python studio" },
	},
];

export function PortalHome() {
	const language = useLanguage();
	const copy = pageCopy[language];
	const workspaceRoutes = getWorkspaceEntries("product");

	return (
		<EditorialDemoShell current="home" siteMode="product">
			<main id="main-content" className="portal-home">
				<section
					className="portal-home__hero"
					aria-labelledby="portal-home-title"
				>
					<img
						className="portal-home__logo"
						src="/brand/statmind-logo.png"
						alt={copy.logoAlt}
						width="116"
						height="136"
						decoding="async"
						fetchPriority="high"
					/>
					<p className="portal-home__kicker">{copy.kicker}</p>
					<h1 id="portal-home-title">{copy.title}</h1>
					<p className="portal-home__lead">{copy.lead}</p>
				</section>

				<section
					className="portal-home__workspaces"
					aria-label={copy.workspaceLabel}
				>
					{workspacePresentation.map((workspace, index) => {
						const Icon = workspace.Icon;
						const href = workspaceRoutes[index].href;

						return (
							<article
								className="portal-home__workspace-card"
								key={workspace.eyebrow}
							>
								<div className="portal-home__workspace-heading">
									<span
										className="portal-home__workspace-icon"
										aria-hidden="true"
									>
										<Icon />
									</span>
									<div>
										<p className="portal-home__workspace-meta">
											{workspace.meta[language]}
										</p>
										<h2>{workspace.title[language]}</h2>
									</div>
								</div>
								<p className="portal-home__workspace-description">
									{workspace.description[language]}
								</p>
								<div className="portal-home__workspace-footer">
									<span>{workspace.eyebrow}</span>
									<a href={href} aria-label={workspace.action[language]}>
										{workspace.action[language]}
										<ArrowUpRightIcon aria-hidden="true" />
									</a>
								</div>
							</article>
						);
					})}
				</section>
			</main>
		</EditorialDemoShell>
	);
}

export default PortalHome;
