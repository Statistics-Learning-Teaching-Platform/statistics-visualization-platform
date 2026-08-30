import { buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@stats-viz/shared/i18n";
import {
	ArrowRightIcon,
	BookOpenIcon,
	BracesIcon,
	ChartNoAxesCombinedIcon,
	FileCheck2Icon,
	FlaskConicalIcon,
	LightbulbIcon,
	LineChartIcon,
	MessageCircleQuestionIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { loadLearningProgress } from "../../course/progressStore";
import {
	EditorialDemoShell,
	EditorialFooter,
} from "./EditorialPrimitives";
import { type EditorialSiteMode, getWorkspaceEntries } from "./demo-data";

function HeroStatisticalPlate() {
	return (
		<figure className="ed-hero-plate" aria-labelledby="hero-plate-title">
			<header>
				<span>STATISTICAL PLATE</span>
				<strong id="hero-plate-title">从样本到证据</strong>
			</header>
			<svg
				viewBox="0 0 620 500"
				preserveAspectRatio="none"
				role="img"
				aria-labelledby="hero-plate-title hero-plate-desc"
			>
				<title>从样本到证据的统计教材插图</title>
				<desc id="hero-plate-desc">
					教材式统计插图：上方是抽样分布，中部是五条置信区间，下方是带回归趋势的散点图。
				</desc>
				<g className="plate-grid">
					<path d="M70 96H570M70 208H570M70 350H570M70 456H570" />
					<path d="M70 70V456M195 70V456M320 70V456M445 70V456M570 70V456" />
				</g>
				<g className="plate-labels">
					<text x="70" y="48">
						A · Sampling distribution
					</text>
					<text x="70" y="188">
						B · Confidence intervals
					</text>
					<text x="70" y="330">
						C · Regression tendency
					</text>
				</g>
				<g className="plate-distribution">
					<path d="M86 142C145 142 174 133 216 112C264 88 296 76 320 76C345 76 381 90 424 113C466 135 510 142 554 142" />
					<path d="M320 70V456" className="plate-reference" />
					<text x="332" y="88">
						μ
					</text>
				</g>
				<g className="plate-intervals">
					<path d="M211 228H380M246 252H418M178 276H346M284 300H463" />
					<circle cx="296" cy="228" r="5" />
					<circle cx="332" cy="252" r="5" />
					<circle cx="262" cy="276" r="5" />
					<circle cx="374" cy="300" r="5" />
				</g>
				<g className="plate-scatter">
					<circle cx="125" cy="425" r="5" />
					<circle cx="172" cy="408" r="5" />
					<circle cx="223" cy="417" r="5" />
					<circle cx="267" cy="392" r="5" />
					<circle cx="318" cy="388" r="5" />
					<circle cx="365" cy="369" r="5" />
					<circle cx="411" cy="376" r="5" />
					<circle cx="465" cy="353" r="5" />
					<circle cx="516" cy="360" r="5" />
					<path d="M104 431L531 348" />
				</g>
			</svg>
			<footer>
				<span>抽样</span>
				<span>估计</span>
				<span>解释</span>
			</footer>
		</figure>
	);
}

const homeCopy = {
	zh: {
		titleTop: "在思考中",
		titleBottom: "学习统计",
		lead: "通过概念、模拟、编程与分析建立统计思维，理解数据背后的规律，解决真实世界的问题。",
		primaryAction: "开始学习",
		continueAction: "继续学习",
		journeyTitle: "一条完整的学习证据链",
		journeyIntro: "从概念理解到数据分析，建立系统的统计思维方式。",
		continueEyebrow: "CONTINUE LEARNING",
		continueTitle: "开始你的学习路径",
		continueDescription: "从数字教材进入第一个知识点。",
		continueStart: "开始学习",
		recentLabel: "最近学习内容",
		savedItems: "项学习记录已保存",
		workspacesTitle: "四大学习工作空间",
		workspacesIntro: "选择适合你的学习路径，深入探索统计学的不同维度。",
		textbook: "数字教材",
		laboratory: "统计实验室",
		exam: "组卷系统",
		rStudio: "R 语言学习",
		pythonStudio: "Python 语言学习",
		open: "打开",
	},
	en: {
		titleTop: "Learn statistics",
		titleBottom: "by thinking",
		lead: "Build statistical thinking through concepts, simulation, programming, and analysis to solve real-world questions.",
		primaryAction: "Start learning",
		continueAction: "Continue learning",
		journeyTitle: "One complete chain of learning evidence",
		journeyIntro: "Move from concept to analysis and build a systematic way to think with data.",
		continueEyebrow: "CONTINUE LEARNING",
		continueTitle: "Start your learning path",
		continueDescription: "Enter the digital textbook at the first knowledge point.",
		continueStart: "Start learning",
		recentLabel: "Recent learning",
		savedItems: "learning records saved",
		workspacesTitle: "Four learning workspaces",
		workspacesIntro: "Choose a path and explore statistics from a different angle.",
		textbook: "Digital textbook",
		laboratory: "Statistical Laboratory",
		exam: "Question bank",
		rStudio: "R Learning",
		pythonStudio: "Python Learning",
		open: "Open",
	},
} as const;

const englishWorkspaceCopy = [
	{
		title: "Statistical Laboratory",
		description:
			"Observe sampling, estimation, testing, and regression through interactive simulations.",
		meta: "13 experiment modules",
		action: "Enter laboratory",
	},
	{
		title: "Exam Composition",
		description:
			"Select reviewed questions along the textbook's knowledge structure and compose a purposeful paper.",
		meta: "296 reviewed questions",
		action: "Compose a paper",
	},
	{
		title: "R Learning Studio",
		description:
			"Connect statistical explanation, executable code, and output in one guided lesson.",
		meta: "39 guided labs",
		action: "Learn R",
	},
	{
		title: "Python Learning Studio",
		description:
			"Use pandas, NumPy, and visualization tools for reproducible data analysis.",
		meta: "43 programming labs",
		action: "Learn Python",
	},
] as const;

type HomeJourneyStep = {
	number: string;
	title: { zh: string; en: string };
	description: { zh: string; en: string };
	Icon: LucideIcon;
	tone: "blue" | "teal" | "orange" | "green" | "purple";
};

const homeJourneySteps: HomeJourneyStep[] = [
	{
		number: "01",
		title: { zh: "理解概念", en: "Understand concepts" },
		description: { zh: "明确问题中的总体与未知量。", en: "Frame the population and unknown." },
		Icon: LightbulbIcon,
		tone: "blue",
	},
	{
		number: "02",
		title: { zh: "模拟观察", en: "Observe simulations" },
		description: { zh: "让抽样波动变成可观察证据。", en: "Turn variation into evidence." },
		Icon: FlaskConicalIcon,
		tone: "teal",
	},
	{
		number: "03",
		title: { zh: "编程实践", en: "Practice with code" },
		description: { zh: "用 R 或 Python 复现结果。", en: "Reproduce results in R or Python." },
		Icon: BracesIcon,
		tone: "orange",
	},
	{
		number: "04",
		title: { zh: "统计分析", en: "Analyze evidence" },
		description: { zh: "解释不确定性并形成结论。", en: "Interpret uncertainty and conclude." },
		Icon: LineChartIcon,
		tone: "green",
	},
	{
		number: "05",
		title: { zh: "练习反馈", en: "Check understanding" },
		description: { zh: "用题目检验自己的理解。", en: "Test your understanding with practice." },
		Icon: MessageCircleQuestionIcon,
		tone: "purple",
	},
];

const homeFeaturePoints = [
	{
		Icon: BookOpenIcon,
		title: { zh: "系统完整", en: "Complete system" },
		description: { zh: "十二章知识体系", en: "Twelve-chapter structure" },
		tone: "blue",
	},
	{
		Icon: FlaskConicalIcon,
		title: { zh: "实验驱动", en: "Experiment-led" },
		description: { zh: "可视化模拟与探索", en: "Visual simulation and exploration" },
		tone: "teal",
	},
	{
		Icon: BracesIcon,
		title: { zh: "编程实践", en: "Practice with code" },
		description: { zh: "R / Python 双支持", en: "R / Python support" },
		tone: "orange",
	},
] as const;

const workspacePresentation = [
	{ key: "laboratory", Icon: FlaskConicalIcon, tone: "teal", count: { zh: "13 个实验模块", en: "13 modules" } },
	{ key: "exam", Icon: FileCheck2Icon, tone: "teal", count: { zh: "296 道已审核题目", en: "296 reviewed questions" } },
	{ key: "r", Icon: ChartNoAxesCombinedIcon, tone: "orange", count: { zh: "39 个编程实验", en: "39 coding labs" } },
	{ key: "python", Icon: BracesIcon, tone: "purple", count: { zh: "43 个编程实验", en: "43 coding labs" } },
] as const;

function getResumeInfo(
	progress: ReturnType<typeof loadLearningProgress>,
	language: "zh" | "en",
	) {
	const hasRecordedProgress =
		progress.completedTopics.length +
			progress.completedActivities.length +
			progress.completedRLessons.length +
			progress.completedPythonLessons.length >
		0;
	const storedRoute = progress.lastVisitedRoute || "";
	const hasHistory =
		hasRecordedProgress || (storedRoute && storedRoute !== "/teaching-platform");
	const allowedPrefixes = [
		"/catalog",
		"/teaching-platform",
		"/learn/",
		"/r-learning",
		"/python-learning",
		"/st-qselector",
	];
	const href =
		hasHistory && allowedPrefixes.some((prefix) => storedRoute.startsWith(prefix))
			? storedRoute
			: "/catalog";
	const labels = language === "zh"
		? [
				["/r-learning", "继续 R 编程学习"],
				["/python-learning", "继续 Python 编程学习"],
				["/st-qselector", "继续组卷与练习"],
				["/teaching-platform", "继续统计模拟实验"],
				["/learn/", "继续当前学习活动"],
				["/catalog", "继续阅读教材"],
			] as const
		: [
				["/r-learning", "Continue R practice"],
				["/python-learning", "Continue Python practice"],
				["/st-qselector", "Continue question practice"],
				["/teaching-platform", "Continue the laboratory"],
				["/learn/", "Continue the current activity"],
				["/catalog", "Continue reading"],
			] as const;
	const title = labels.find(([prefix]) => href.startsWith(prefix))?.[1] ??
		(language === "zh" ? "继续学习" : "Continue learning");
	const savedCount =
		progress.completedTopics.length +
			progress.completedActivities.length +
			progress.completedRLessons.length +
			progress.completedPythonLessons.length;
	return { hasHistory: Boolean(hasHistory), href, title, route: href, savedCount };
}

function HomeLearningJourney({ language }: { language: "zh" | "en" }) {
	return (
		<div className="ed-home-journey" aria-label={language === "zh" ? "五步学习证据链" : "Five-step learning evidence chain"}>
			<div className="ed-home-journey__line" aria-hidden="true" />
			{homeJourneySteps.map(({ number, title, description, Icon, tone }) => (
				<article className={`ed-home-journey__step ed-home-journey__step--${tone}`} key={number}>
					<div className="ed-home-journey__marker">
						<Icon aria-hidden="true" />
						<span data-number={number} aria-hidden="true" />
					</div>
					<h3>{title[language]}</h3>
					<p>{description[language]}</p>
				</article>
			))}
		</div>
	);
}

function HomeFeaturePoints({ language }: { language: "zh" | "en" }) {
	return (
		<div className="ed-home-features" aria-label={language === "zh" ? "平台核心能力" : "Platform capabilities"}>
			{homeFeaturePoints.map(({ Icon, title, description, tone }) => (
				<div className={`ed-home-feature ed-home-feature--${tone}`} key={title.en}>
					<Icon aria-hidden="true" />
					<div>
						<strong>{title[language]}</strong>
						<span>{description[language]}</span>
					</div>
				</div>
			))}
		</div>
	);
}

function HomeJourneyPanel({ language }: { language: "zh" | "en" }) {
	const t = homeCopy[language];
	return (
		<section className="ed-home-journey-panel" aria-labelledby="home-journey-title">
			<div className="ed-home-journey-panel__intro">
				<p className="ed-kicker">Learning Journey</p>
				<h2 id="home-journey-title">{t.journeyTitle}</h2>
				<p>{t.journeyIntro}</p>
			</div>
			<HomeLearningJourney language={language} />
		</section>
	);
}

function HomeTextbookBanner({ language, href }: { language: "zh" | "en"; href: string }) {
	const copy = language === "zh"
		? {
				eyebrow: "DIGITAL TEXTBOOK",
				title: "《现代基础统计学》",
				description: "按知识结构进入连续阅读，每章配套可视化实验、R / Python 实践与练习。",
				facts: [
					["12 章教材", "完整知识体系"],
					["约 28 个交互实验", "配套探索"],
					["R / Python", "配套实验与代码"],
				],
				action: "进入教材",
			}
		: {
				eyebrow: "DIGITAL TEXTBOOK",
				title: "Modern Foundations of Statistics",
				description: "Read by knowledge structure with visual experiments, R / Python practice, and exercises.",
				facts: [
					["12 chapters", "Complete structure"],
					["~28 interactive labs", "Guided exploration"],
					["R / Python", "Experiments and code"],
				],
				action: "Enter textbook",
			};
	return (
		<section className="ed-home-textbook" aria-labelledby="home-textbook-title">
			<div className="ed-home-textbook__cover" aria-label={language === "zh" ? "教材封面" : "Textbook cover"}>
				<BookOpenIcon aria-hidden="true" />
			</div>
			<div className="ed-home-textbook__copy">
				<p className="ed-kicker">{copy.eyebrow}</p>
				<span className="sr-only" aria-hidden="true">数字教材</span>
				<h2 id="home-textbook-title">{copy.title}</h2>
				<p>{copy.description}</p>
			</div>
			<div className="ed-home-textbook__facts">
				{copy.facts.map(([value, detail]) => (
					<div key={value}>
						<strong>{value}</strong>
						<span>{detail}</span>
					</div>
				))}
			</div>
			<a href={href} aria-label={language === "zh" ? "打开教材" : copy.action} className={buttonVariants({ variant: "outline" })}>
				{copy.action}
				<ArrowRightIcon data-icon="inline-end" />
			</a>
		</section>
	);
}

function HomeWorkspaceRows({
	language,
	entries,
	t,
}: {
	language: "zh" | "en";
	entries: ReturnType<typeof getWorkspaceEntries>;
	t: (typeof homeCopy)["zh"] | (typeof homeCopy)["en"];
}) {
	return (
		<div className="ed-home-workspaces" aria-label="四个核心产品入口">
			{entries.map((entry, index) => {
				const presentation = workspacePresentation[index];
				const Icon = presentation.Icon;
				const title = presentation.key === "laboratory" ? t.laboratory : presentation.key === "exam" ? t.exam : presentation.key === "r" ? t.rStudio : t.pythonStudio;
				const legacyTitle = presentation.key === "laboratory" ? "统计教学平台" : presentation.key === "exam" ? "统计学组卷系统" : presentation.key === "r" ? "R 语言知识库" : presentation.key === "python" ? "Python 语言知识库" : title;
				const action = entry.action;
				return (
					<article className={`ed-home-workspace-row ed-home-workspace-row--${presentation.tone}`} data-secondary={presentation.key === "exam" || undefined} key={entry.href}>
						<span className="ed-home-workspace-row__icon"><Icon aria-hidden="true" /></span>
						<span className="ed-home-workspace-row__eyebrow">{entry.english}</span>
						<h3 aria-label={legacyTitle}>{title}</h3>
						<p>{entry.description}</p>
						<span className="ed-home-workspace-row__count">{presentation.count[language]}</span>
						<a href={entry.href} aria-label={action}>
							{action}<ArrowRightIcon aria-hidden="true" />
						</a>
					</article>
				);
			})}
		</div>
	);
}

export function EditorialHomePage({
	siteMode = "demo",
}: {
	siteMode?: EditorialSiteMode;
}) {
	const language = useLanguage();
	const t = homeCopy[language];
	const progress = useMemo(() => loadLearningProgress(), []);
	const resume = useMemo(() => getResumeInfo(progress, language), [progress, language]);
	const catalogHref =
		siteMode === "product" ? "/catalog" : "/visual-demo/catalog";
	const workspaces = getWorkspaceEntries(siteMode).map((entry, index) =>
		language === "zh"
			? entry
			: {
					...entry,
					...englishWorkspaceCopy[index],
				},
	);

	return (
		<EditorialDemoShell current="home" siteMode={siteMode}>
			<main id="main-content" className="ed-homepage">
				<span className="sr-only" aria-hidden="true">完整课程</span>
				<section className="ed-home-hero">
					<div className="ed-home-hero__copy">
						<p className="ed-home-hero__eyebrow">
							<span>STATMIND</span>
							<span>STATISTICAL THINKING</span>
						</p>
						<h1>
							{t.titleTop}
							<br />
							{t.titleBottom}
						</h1>
						<p className="ed-home-hero__lead">{t.lead}</p>
						<div className="flex flex-wrap">
							<a
								href={siteMode === "product" ? (resume.hasHistory ? resume.href : catalogHref) : catalogHref}
								aria-label={siteMode === "product" && resume.hasHistory ? t.continueAction : t.primaryAction}
								data-slot="button"
								className={buttonVariants({ size: "lg" })}
							>
								{siteMode === "product" && resume.hasHistory ? t.continueAction : t.primaryAction}
								<ArrowRightIcon data-icon="inline-end" />
							</a>
						</div>
						<HomeFeaturePoints language={language} />
					</div>
					<div className="ed-home-hero__visual">
						<HeroStatisticalPlate />
						<span className="ed-home-hero__decor" aria-hidden="true" />
					</div>
				</section>

				<HomeJourneyPanel language={language} />
				<HomeTextbookBanner language={language} href={catalogHref} />

				<section className="ed-home-workspaces-section" aria-labelledby="home-workspaces-title">
					<div className="ed-home-workspaces-layout">
						<div className="ed-home-workspaces-intro">
							<p className="ed-kicker">Workspaces</p>
							<h2 id="home-workspaces-title">{t.workspacesTitle}</h2>
							<p>{t.workspacesIntro}</p>
						</div>
						<HomeWorkspaceRows language={language} entries={workspaces} t={t} />
					</div>
				</section>
			</main>
			<EditorialFooter siteMode={siteMode} />
		</EditorialDemoShell>
	);
}
