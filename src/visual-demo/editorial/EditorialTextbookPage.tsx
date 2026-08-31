import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type Language, useLanguage } from "@stats-viz/shared/i18n";
import {
	ArrowRightIcon,
	BookOpenCheckIcon,
	BookOpenIcon,
	ChartColumnIncreasingIcon,
	ClipboardCheckIcon,
	Code2Icon,
	FlaskConicalIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	type TextbookChapterResources,
	textbookResourceCatalog,
} from "../../course/resourceCatalog";
import { ChapterLearningHub } from "../../course/components/chapter-hub/ChapterLearningHub";
import { reviewedQuestionIndex } from "../../../integrations/st-qselector/Program/src/generated/reviewed-questions";
import {
	ChapterHeader,
	EditorialDemoShell,
	FigureFrame,
} from "./EditorialPrimitives";
import {
	type EditorialSiteMode,
	textbookChapters as demoTextbookChapters,
} from "./demo-data";
import {
	type TextbookDemoChapter,
	type TextbookDemoChapterNumber,
	type TextbookReadingSection,
	type TextbookResource,
	textbookDemoChapters,
} from "./textbook-content";

const SAMPLE_SIZES = [10, 30, 100] as const;

type ChapterOption = {
	number: string;
	title: string;
	detail: string;
};

function getInitialChapter(
	siteMode: EditorialSiteMode,
): TextbookDemoChapterNumber {
	if (typeof window === "undefined") return siteMode === "product" ? "00" : "06";
	const requested = new URLSearchParams(window.location.search).get("chapter");
	if (siteMode === "demo") return requested === "07" ? "07" : "06";
	const fromHash = window.location.hash.match(/mes-ch(\d{2})/)?.[1];
	const candidate = requested ?? fromHash ?? "00";
	return textbookResourceCatalog.some(
		(entry) => String(entry.chapter.number).padStart(2, "0") === candidate,
	)
		? candidate
		: "00";
}

function getSectionId(chapter: TextbookDemoChapterNumber, number: string) {
	return `chapter-${chapter}-section-${number}`;
}

function getChapterOutline(chapter: TextbookDemoChapter) {
	return [
		...chapter.sections.map((section) => ({
			number: section.number,
			label: section.title,
			id: getSectionId(chapter.number, section.number),
		})),
		{
			number: "06",
			label: "交互实验与编程复现",
			id: getSectionId(chapter.number, "06"),
		},
		{
			number: "07",
			label: "检查你的理解",
			id: getSectionId(chapter.number, "07"),
		},
	];
}

function getCatalogEntry(number: string) {
	return textbookResourceCatalog.find(
		(entry) => String(entry.chapter.number).padStart(2, "0") === number,
	);
}

function getCatalogResources(
	entry: TextbookChapterResources,
	language: Language,
): TextbookResource[] {
	const resources: TextbookResource[] = [
		...entry.visualizations.map((resource) => ({
			type: "experiment" as const,
			title: resource.title[language],
			detail: resource.topic.title[language],
			href: resource.href,
		})),
		...entry.rLessons.map((resource) => ({
			type: "r" as const,
			title: resource.title[language],
			detail: resource.topic.title[language],
			href: resource.href,
		})),
		...entry.pythonLessons.map((resource) => ({
			type: "python" as const,
			title: resource.title[language],
			detail: resource.topic.title[language],
			href: resource.href,
		})),
	];

	if (resources.length > 0) return resources;
	return [
		{
			type: "questions",
			title: language === "zh" ? "本章题库" : "Chapter question bank",
			detail:
				language === "zh"
					? "从章节概念检查开始"
					: "Begin with a chapter concept check",
			href: entry.questionBankHref,
		},
	];
}

const chapterThesis: Record<string, string> = {
	"00": "统计学不是一套脱离情境的计算规则，而是把问题、数据与证据连接起来的思考方法。",
	"01": "样本如何产生，决定了我们最终能对总体说多少。好的推断始于好的抽样设计。",
	"02": "图形不只是展示工具，它帮助我们发现分布、异常与比较关系，并对数据质量保持警觉。",
	"03": "中心、离散与位置是描述分布的三组语言，只有将它们一起使用，数字才不会遮蔽数据的形状。",
	"04": "概率为不确定性提供可计算的语言，也为随机试验、模拟和统计推断奠定共同基础。",
	"05": "概率分布把可能结果与它们的发生规律组织在一起，让不确定性可以被比较和建模。",
	"08": "相关描述共变，回归建立可解释的关系模型；两者都需要回到散点、残差与研究设计中检查。",
	"09": "分类数据的证据来自观察频数与期望频数之间的系统偏离，而不是单个格子的大小。",
	"10": "当分布假设过强或数据不适合均值模型时，秩、置换与自助法提供更稳健的证据路径。",
	"11": "时间序列中的观测并不独立，趋势、季节与随机波动需要在同一条时间轴上被区分。",
};

function buildCatalogChapter(
	entry: TextbookChapterResources,
	language: Language,
): TextbookDemoChapter {
	const number = String(entry.chapter.number).padStart(2, "0");
	const title = language === "zh" ? entry.chapter.title : entry.chapter.titleEn;
	const topicNames = entry.topics.map((topic) => topic.title[language]);
	const topicText = topicNames.length
		? topicNames.join(language === "zh" ? "、" : ", ")
		: language === "zh"
			? "本章的核心概念"
			: "the chapter's core concepts";
	const resources = getCatalogResources(entry, language);
	const thesis =
		(language === "zh" ? chapterThesis[number] : undefined) ??
		(language === "zh"
			? `本章从真实统计问题出发，建立理解“${title}”所需的概念、证据与表达方法。`
			: `This chapter begins with a real statistical question and connects the concepts, evidence, and language needed to understand ${title}.`);

	return {
		number,
		title,
		subtitleLines:
			language === "zh"
				? ["从一个可观察的问题出发，", "把概念、方法与解释连成证据。"]
				: [
						"Begin with an observable question,",
						"then connect concept, method, and explanation.",
					],
		lead: thesis,
		meta: [
			language === "zh" ? "预计阅读 20 分钟" : "20 min reading",
			language === "zh"
				? `${entry.topics.length} 个知识点`
				: `${entry.topics.length} topics`,
			language === "zh"
				? `${resources.length} 项配套资源`
				: `${resources.length} resources`,
		],
		objectives:
			language === "zh"
				? [
						`用自己的语言说明“${title}”要回答的核心问题。`,
						`区分${topicText}在数据分析中承担的不同角色。`,
						"将结论限定在数据来源、模型条件与不确定性允许的范围内。",
					]
				: [
						`Explain the central question of ${title} in your own words.`,
						`Distinguish the roles of ${topicText} in an analysis.`,
						"Limit each conclusion to what the data source, model conditions, and uncertainty support.",
					],
		sections: [
			{
				slug: "question-first",
				number: "01",
				kicker: "Question before method",
				title:
					language === "zh"
						? "先说清问题，再选择方法"
						: "State the question before choosing a method",
				paragraphs: [
					thesis,
					language === "zh"
						? "统计方法的名称不是起点。先识别研究对象、可观察数据与希望支持的判断，才能知道什么是合适的证据。"
						: "A method name is not the starting point. Identify the study units, observable data, and intended claim before deciding what counts as evidence.",
				],
				callout: {
					label: language === "zh" ? "阅读线索" : "Reading cue",
					title:
						language === "zh"
							? "把计算对象放回情境中"
							: "Return every quantity to its context",
					body:
						language === "zh"
							? "每看到一个统计量，都问三件事：它由什么数据得到？会如何变动？最终支持什么判断？"
							: "For every statistic, ask where it came from, how it could vary, and what claim it can support.",
				},
			},
			{
				slug: "concept-map",
				number: "02",
				kicker: "Concept map",
				title:
					language === "zh"
						? "把本章概念组织成一张方法地图"
						: "Organize the chapter as a method map",
				paragraphs: [
					language === "zh"
						? `本章的关键节点包括：${topicText}。它们并不是互不相干的定义，而是对同一问题的不同层次回答。`
						: `The key nodes are ${topicText}. They are not isolated definitions; each answers a different layer of the same statistical question.`,
					language === "zh"
						? "阅读时将每个概念标记为“描述”、“比较”、“推断”或“检查”，可以减少只记住公式而忘记目的的情况。"
						: "Label each concept as description, comparison, inference, or checking to retain purpose rather than formulas alone.",
				],
			},
			{
				slug: "evidence-scale",
				number: "03",
				kicker: "Evidence and scale",
				title:
					language === "zh"
						? "从数据尺度走向可比较的证据"
						: "Move from data scale to comparable evidence",
				paragraphs: [
					language === "zh"
						? "原始数据保留了情境，统计量则压缩了模式。一个可靠分析需要在两者之间往返，而不是用单个数字取代数据。"
						: "Raw data preserve context while statistics compress patterns. Reliable analysis moves between them instead of replacing data with one number.",
					language === "zh"
						? "比较前要确认单位、取值范围和数据生成方式。只有在同一尺度上，差异的大小才有明确含义。"
						: "Confirm units, ranges, and the data-generating process before comparing values on a shared scale.",
				],
			},
			{
				slug: "conditions",
				number: "04",
				kicker: "Conditions and diagnostics",
				title:
					language === "zh"
						? "方法的条件，也是结论的边界"
						: "Method conditions define the boundary of a claim",
				paragraphs: [
					language === "zh"
						? "每个模型都对数据如何产生、观测是否独立、分布是否稳定作出了某些假设。检查条件不是附加步骤，而是分析本身。"
						: "Every model assumes something about data generation, independence, and stability. Checking conditions is part of the analysis, not an appendix.",
					language === "zh"
						? "当条件不满足时，应该优先改变问题、重新表达数据或选择更稳健的方法，而不是继续解释一个不适用的结果。"
						: "When conditions fail, revise the question, representation, or method rather than over-explaining an unsuitable result.",
				],
				callout: {
					label: language === "zh" ? "科学表达" : "Scientific reporting",
					title:
						language === "zh" ? "报告检查过什么" : "Report what was checked",
					body:
						language === "zh"
							? "把诊断结果与限制条件写进结论，比只给出一个最终数字更能传达证据强度。"
							: "Include diagnostics and limitations in the conclusion so the strength of evidence remains visible.",
				},
			},
			{
				slug: "interpretation",
				number: "05",
				kicker: "Interpretation",
				title:
					language === "zh"
						? "让结论回答原来的问题"
						: "Make the conclusion answer the original question",
				paragraphs: [
					language === "zh"
						? "最终表达需要同时包含方向、大小、不确定性和适用范围。不要让“显著”、“相关”或“预测”这些术语代替实际含义。"
						: "A conclusion should state direction, magnitude, uncertainty, and scope. Terms such as significant, correlated, or predicted cannot replace practical meaning.",
					language === "zh"
						? "先写出一句不带公式的结论，再检查数据和方法是否真的支持这句话，是完成本章学习的最后一步。"
						: "Write a formula-free conclusion first, then verify that the data and method truly support it.",
				],
			},
		],
		lab: {
			title:
				language === "zh"
					? "改变样本量，观察证据如何稳定"
					: "Change sample size and observe stability",
			question:
				language === "zh"
					? "数据量增加时，随机波动的可见范围如何变化？"
					: "How does the visible range of random variation change with more data?",
			explanation:
				language === "zh"
					? "固定估计中心，只改变 n。这个小实验展示精度与数据量的关系，不代替本章完整模型。"
					: "Hold the center fixed and vary n. This note shows the relation between precision and information, not the chapter's complete model.",
			center: 0,
			sigma: 2,
			axisMin: -2,
			axisMax: 2,
			axisLabel: language === "zh" ? "证据尺度" : "Evidence scale",
			valueLabel: language === "zh" ? "估计中心" : "Estimate center",
		},
		resources,
		exercises: [
			{
				number: "01",
				question:
					language === "zh"
						? `用一句话说明“${title}”想解决的核心问题。`
						: `In one sentence, state the central question of ${title}.`,
				hint:
					language === "zh"
						? "先说研究对象，再说需要形成的判断。"
						: "Name the study unit, then the claim to be supported.",
				answer:
					language === "zh"
						? "一个完整回答应同时指出数据来源、关键统计对象与结论边界。"
						: "A complete answer identifies the data source, statistical object, and the boundary of the claim.",
			},
			{
				number: "02",
				question:
					language === "zh"
						? `在${topicText}中，哪一个概念最接近“证据的尺度”？`
						: `Among ${topicText}, which concept is closest to an evidence scale?`,
				hint:
					language === "zh"
						? "查找用来比较差异、波动或偏离的概念。"
						: "Look for the concept used to compare difference, variation, or departure.",
				answer:
					language === "zh"
						? "答案需要结合本章的数据对象说明；重点是解释它如何帮助比较，而不只是写名称。"
						: "The answer depends on the chapter data object; explain how the concept enables comparison, not just its name.",
			},
			{
				number: "03",
				question:
					language === "zh"
						? "为什么增加数据量不能自动修复偏差或错误的研究设计？"
						: "Why can more data not automatically repair bias or a flawed study design?",
				hint:
					language === "zh"
						? "区分随机波动和系统偏差。"
						: "Separate random variation from systematic bias.",
				answer:
					language === "zh"
						? "更多数据通常减少随机误差，但不会改变数据产生过程中已经存在的系统性问题。"
						: "More data often reduce random error but do not change a systematic problem in the data-generating process.",
			},
			{
				number: "04",
				question:
					language === "zh"
						? "一个可靠的本章结论至少应包含哪四类信息？"
						: "Which four kinds of information belong in a reliable chapter conclusion?",
				hint:
					language === "zh"
						? "回顾方向、大小、不确定性和适用范围。"
						: "Review direction, magnitude, uncertainty, and scope.",
				answer:
					language === "zh"
						? "说明结果的方向与大小，报告不确定性，并将结论限定在抽样、测量和模型条件允许的范围内。"
						: "State direction and magnitude, report uncertainty, and bound the claim by sampling, measurement, and model conditions.",
			},
		],
	};
}

function resolveChapter(
	number: string,
	siteMode: EditorialSiteMode,
	language: Language,
): TextbookDemoChapter {
	const featured = textbookDemoChapters[number];
	if (siteMode === "demo") return featured ?? textbookDemoChapters["06"];
	const entry = getCatalogEntry(number) ?? textbookResourceCatalog[6];
	const catalogChapter = buildCatalogChapter(entry, language);
	if (!featured) return catalogChapter;
	return {
		...featured,
		title: language === "zh" ? entry.chapter.title : entry.chapter.titleEn,
		resources: getCatalogResources(entry, language),
		meta: [
			...featured.meta.slice(0, 2),
			language === "zh"
				? `${getCatalogResources(entry, language).length} 项配套资源`
				: `${getCatalogResources(entry, language).length} companion resources`,
		],
	};
}

function SamplingDistributionFigure() {
	return (
		<svg
			viewBox="0 0 760 360"
			role="img"
			aria-labelledby="sampling-figure-title sampling-figure-desc"
		>
			<title id="sampling-figure-title">样本均值的抽样分布</title>
			<desc id="sampling-figure-desc">
				三个不同样本量的抽样分布均以总体均值为中心，样本量越大，分布越集中。
			</desc>
			<g className="textbook-figure__grid">
				<path d="M70 286H710" />
				<path d="M390 62V286" className="textbook-figure__reference" />
				<path d="M150 286V294M270 286V294M390 286V294M510 286V294M630 286V294" />
			</g>
			<g className="textbook-figure__curves">
				<path d="M90 286C178 286 218 254 270 196C318 143 350 122 390 122C430 122 462 143 510 196C562 254 602 286 690 286" />
				<path d="M150 286C248 286 292 244 330 154C350 107 370 82 390 82C410 82 430 107 450 154C488 244 532 286 630 286" />
				<path d="M230 286C315 286 344 225 368 125C377 88 384 68 390 68C396 68 403 88 412 125C436 225 465 286 550 286" />
			</g>
			<g className="textbook-figure__labels">
				<text x="642" y="206">
					n = 10
				</text>
				<text x="544" y="132">
					n = 30
				</text>
				<text x="458" y="78">
					n = 100
				</text>
				<text x="397" y="58">
					μ
				</text>
				<text x="370" y="322">
					样本均值
				</text>
			</g>
		</svg>
	);
}

function MeanDifferenceFigure() {
	return (
		<svg
			viewBox="0 0 760 360"
			role="img"
			aria-labelledby="difference-figure-title difference-figure-desc"
		>
			<title id="difference-figure-title">均值差的抽样分布</title>
			<desc id="difference-figure-desc">
				均值差的抽样分布以总体差异为中心，零差异作为判断参照。
			</desc>
			<g className="textbook-figure__grid">
				<path d="M70 286H710" />
				<path d="M255 62V286" className="textbook-figure__zero" />
				<path d="M480 62V286" className="textbook-figure__reference" />
				<path d="M110 286V294M255 286V294M480 286V294M650 286V294" />
			</g>
			<g className="textbook-figure__curves">
				<path d="M120 286C244 286 316 265 382 176C420 124 450 102 480 102C510 102 540 124 578 176C644 265 674 286 706 286" />
			</g>
			<g className="textbook-figure__interval">
				<path d="M362 222H598M362 212V232M598 212V232" />
				<circle cx="480" cy="222" r="5" />
			</g>
			<g className="textbook-figure__labels">
				<text x="238" y="55">
					0 差异
				</text>
				<text x="488" y="55">
					观察差异
				</text>
				<text x="333" y="322">
					总体均值差
				</text>
			</g>
		</svg>
	);
}

function TextbookReadingRail({
	chapter,
	chapterOptions,
	siteMode,
	onChapterChange,
	onBackToCatalog,
}: {
	chapter: TextbookDemoChapter;
	chapterOptions: ChapterOption[];
	siteMode: EditorialSiteMode;
	onChapterChange: (chapter: TextbookDemoChapterNumber) => void;
	onBackToCatalog?: () => void;
}) {
	const language = useLanguage();
	const availableChapters =
		siteMode === "product"
			? chapterOptions
			: chapterOptions.filter(
					(item) => item.number === "06" || item.number === "07",
				);
	const chapterGroups =
		siteMode === "product"
			? [
					{
						title: language === "zh" ? "基础、描述与概率" : "Foundations and probability",
						chapters: availableChapters.slice(0, 6),
					},
					{
						title: language === "zh" ? "推断、关系与建模" : "Inference and modeling",
						chapters: availableChapters.slice(6),
					},
				]
			: [{ title: language === "zh" ? "可预览章节" : "Preview chapters", chapters: availableChapters }];
	return (
		<aside
			className="ed-textbook-sidebar ed-textbook-reading-rail"
			aria-label="教材章节目录"
		>
			<header className="ed-textbook-reading-rail__heading">
				<div>
					<p className="ed-kicker">Textbook Index</p>
					<h2>{language === "zh" ? "教材目录" : "Textbook index"}</h2>
				</div>
				<span aria-label={language === "zh" ? `${availableChapters.length} 章` : `${availableChapters.length} chapters`}>
					{availableChapters.length}
				</span>
			</header>
			{siteMode === "product" && onBackToCatalog ? (
				<button
					className="ed-textbook-reading-rail__back"
					type="button"
					onClick={onBackToCatalog}
				>
					<span aria-hidden="true">←</span>
					完整教材目录
				</button>
			) : null}
			<div
				className="ed-textbook-chapter-switcher"
				aria-label={siteMode === "product" ? "全部教材章节" : "可预览章节"}
			>
				{chapterGroups.map((group) => (
					<section className="ed-textbook-chapter-group" key={group.title}>
						<h3>{group.title}</h3>
						<div>
							{group.chapters.map((item) => {
								const number = item.number;
								const active = number === chapter.number;
								return (
									<button
										key={number}
										type="button"
										data-active={active || undefined}
										aria-current={active ? "page" : undefined}
										onClick={() => onChapterChange(number)}
									>
										<span>{number}</span>
										<strong>{item.title}</strong>
										<small>{item.detail}</small>
									</button>
								);
							})}
						</div>
					</section>
				))}
			</div>

		</aside>
	);
}

function CatalogStatisticalFigure() {
	return (
		<figure
			className="ed-catalog-hero__figure"
			aria-labelledby="catalog-figure-title"
		>
			<figcaption>
				<span>STATISTICS / DISTRIBUTION</span>
				<strong id="catalog-figure-title">从数据到证据</strong>
			</figcaption>
			<svg
				viewBox="0 0 620 330"
				role="img"
				aria-labelledby="catalog-figure-title catalog-figure-desc"
			>
				<title>统计分布与数据证据示意图</title>
				<desc id="catalog-figure-desc">
					淡色柱状图、正态分布曲线、均值参照线与散点共同表示从数据到证据的统计过程。
				</desc>
				<g className="ed-catalog-figure__grid" aria-hidden="true">
					<path d="M56 264H570" />
					<path d="M56 198H570M56 132H570M56 66H570" />
					<path d="M150 46V264M250 46V264M350 46V264M450 46V264" />
				</g>
				<g className="ed-catalog-figure__bars" aria-hidden="true">
					<rect x="78" y="212" width="38" height="52" rx="3" />
					<rect x="128" y="176" width="38" height="88" rx="3" />
					<rect x="178" y="136" width="38" height="128" rx="3" />
					<rect x="228" y="104" width="38" height="160" rx="3" />
					<rect x="278" y="126" width="38" height="138" rx="3" />
					<rect x="328" y="158" width="38" height="106" rx="3" />
					<rect x="378" y="190" width="38" height="74" rx="3" />
					<rect x="428" y="218" width="38" height="46" rx="3" />
				</g>
				<path
					className="ed-catalog-figure__curve"
					d="M68 250C128 250 162 222 204 144C239 80 276 56 316 56C356 56 393 80 428 144C470 222 504 250 568 250"
				/>
				<path className="ed-catalog-figure__mean" d="M316 40V270" />
				<g className="ed-catalog-figure__points" aria-hidden="true">
					<circle cx="90" cy="232" r="5" />
					<circle cx="152" cy="215" r="5" />
					<circle cx="210" cy="226" r="5" />
					<circle cx="266" cy="186" r="5" />
					<circle cx="328" cy="202" r="5" />
					<circle cx="394" cy="162" r="5" />
					<circle cx="466" cy="174" r="5" />
					<circle cx="526" cy="128" r="5" />
				</g>
				<g className="ed-catalog-figure__labels" aria-hidden="true">
					<text x="58" y="292">观察值</text>
					<text x="296" y="34">μ</text>
					<text x="474" y="292">证据尺度</text>
				</g>
			</svg>
		</figure>
	);
}

type CatalogResourceNavItem = {
	label: string;
	href: string;
	tone: string;
	Icon: LucideIcon;
};

function CatalogResourceNavigation({ language }: { language: Language }) {
	const items: CatalogResourceNavItem[] = [
		{
			label: language === "zh" ? "阅读教材" : "Read textbook",
			href: "/catalog",
			tone: "blue",
			Icon: BookOpenIcon,
		},
		{
			label: language === "zh" ? "可视化实验" : "Visual experiments",
			href: "/teaching-platform",
			tone: "teal",
			Icon: FlaskConicalIcon,
		},
		{
			label: language === "zh" ? "R 实践" : "R practice",
			href: "/r-learning",
			tone: "orange",
			Icon: Code2Icon,
		},
		{
			label: language === "zh" ? "Python 实践" : "Python practice",
			href: "/python-learning",
			tone: "purple",
			Icon: Code2Icon,
		},
		{
			label: language === "zh" ? "练习题库" : "Question bank",
			href: "/st-qselector",
			tone: "blue",
			Icon: ClipboardCheckIcon,
		},
	];

	return (
		<nav
			className="ed-catalog-resource-nav"
			aria-label={language === "zh" ? "教材学习资源" : "Textbook learning resources"}
		>
			{items.map(({ label, href, tone, Icon }) => (
				<a className={`ed-catalog-resource-nav__item ed-catalog-resource-nav__item--${tone}`} href={href} key={href}>
					<Icon aria-hidden="true" />
					<span>{label}</span>
					<ArrowRightIcon aria-hidden="true" />
				</a>
			))}
		</nav>
	);
}

type CatalogResourceSummaryValues = {
	chapters: number;
	experiments: number;
	coding: number;
	questions: number;
};

function CatalogResourceSummary({
	language,
	values,
}: {
	language: Language;
	values: CatalogResourceSummaryValues;
}) {
	const items = [
		{
			value: String(values.chapters),
			label: language === "zh" ? "教材章节" : "textbook chapters",
			detail: language === "zh" ? "按结构连续阅读" : "A continuous reading path",
			tone: "blue",
			Icon: BookOpenIcon,
		},
		{
			value: `≈${values.experiments}`,
			label: language === "zh" ? "交互实验" : "interactive experiments",
			detail: language === "zh" ? "可视化观察统计规律" : "Observe statistical patterns",
			tone: "teal",
			Icon: ChartColumnIncreasingIcon,
		},
		{
			value: String(values.coding),
			label: language === "zh" ? "R / Python 编程实验" : "R / Python coding labs",
			detail: language === "zh" ? "复现分析与代码" : "Reproduce analysis in code",
			tone: "purple",
			Icon: Code2Icon,
		},
		{
			value: String(values.questions),
			label: language === "zh" ? "已审核题目" : "reviewed questions",
			detail: language === "zh" ? "用练习检验理解" : "Check understanding with practice",
			tone: "orange",
			Icon: ClipboardCheckIcon,
		},
	];

	return (
		<section
			className="ed-catalog-resource-summary"
			aria-label={language === "zh" ? "教材资源规模" : "Textbook resource summary"}
		>
			{items.map(({ value, label, detail, tone, Icon }) => (
				<div className={`ed-catalog-resource-summary__item ed-catalog-resource-summary__item--${tone}`} key={label}>
					<Icon aria-hidden="true" />
					<div>
						<strong>{value}</strong>
						<span>{label}</span>
						<small>{detail}</small>
					</div>
				</div>
			))}
		</section>
	);
}

function TextbookCatalogOverview({
	chapterOptions,
	language,
	onChapterChange,
}: {
	chapterOptions: ChapterOption[];
	language: Language;
	onChapterChange: (chapter: TextbookDemoChapterNumber) => void;
}) {
	const groups = [
		{
			title: language === "zh" ? "基础、描述与概率" : "Foundations, description, and probability",
			detail: language === "zh" ? "建立统计语言，学会描述数据与理解随机性。" : "Build statistical language, describe data, and understand randomness.",
			chapters: chapterOptions.slice(0, 6),
		},
		{
			title: language === "zh" ? "推断、关系与建模" : "Inference, relationships, and modeling",
			detail: language === "zh" ? "从样本走向总体，进入比较、回归、检验与时间序列。" : "Move from samples to populations through comparison, regression, testing, and time series.",
			chapters: chapterOptions.slice(6),
		},
	] as const;
	const summaryValues = useMemo<CatalogResourceSummaryValues>(() => {
		const experiments = textbookResourceCatalog.reduce(
			(total, entry) => total + entry.visualizations.length,
			0,
		);
		const rCount = textbookResourceCatalog.reduce(
			(total, entry) => total + entry.rLessons.length,
			0,
		);
		const pythonCount = textbookResourceCatalog.reduce(
			(total, entry) => total + entry.pythonLessons.length,
			0,
		);
		return {
			chapters: chapterOptions.length,
			experiments,
			coding: rCount + pythonCount,
			questions:
				reviewedQuestionIndex.totalCount ??
				reviewedQuestionIndex.questions.filter((question: { isReviewed?: boolean }) => question.isReviewed).length,
		};
	}, [chapterOptions.length]);

	return (
		<main id="main-content" className="sm-page-container ed-catalog-overview">
			<section className="ed-catalog-hero" aria-labelledby="catalog-title">
				<div className="ed-catalog-hero__copy">
					<p className="ed-kicker">Digital Textbook</p>
					<h1 id="catalog-title">
						{language === "zh" ? "《现代基础统计学》" : "Modern Foundations of Statistics"}
					</h1>
					<p>
						{language === "zh"
							? "系统介绍统计学的核心概念、方法与应用，并将教材阅读、可视化实验、R / Python 编程实践与练习评价连接起来，帮助学习者从理解概念逐步走向统计分析与实践应用。"
							: "A structured introduction to statistical concepts, methods, and applications that connects textbook reading, visual experiments, R / Python practice, and assessment as one path from concepts to analysis."}
					</p>
				</div>
				<CatalogStatisticalFigure />
			</section>

			<CatalogResourceNavigation language={language} />
			<CatalogResourceSummary language={language} values={summaryValues} />

			<div className="ed-catalog-overview__groups" aria-label={language === "zh" ? "完整教材章节目录" : "Complete textbook chapter index"}>
				{groups.map((group) => (
					<section className="ed-catalog-group" key={group.title}>
						<header>
							<h2>{group.title}</h2>
							<p>{group.detail}</p>
						</header>
						<div className="ed-catalog-group__chapters">
							{group.chapters.map((item) => {
								const entry = getCatalogEntry(item.number);
								const resourceCount = entry
									? entry.visualizations.length + entry.rLessons.length + entry.pythonLessons.length + 1
									: 1;
								return (
									<button
										key={item.number}
										type="button"
										onClick={() => onChapterChange(item.number)}
									>
										<span className="ed-catalog-chapter__number">{item.number}</span>
										<span className="ed-catalog-chapter__copy">
											<strong>{item.title}</strong>
											<small>{item.detail}</small>
										</span>
										<span className="ed-catalog-chapter__meta">
											{language === "zh" ? `${resourceCount} 项配套资源` : `${resourceCount} companion resources`}
										</span>
										<ArrowRightIcon aria-hidden="true" />
									</button>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</main>
	);
}

function ReadingSection({
	chapterNumber,
	section,
}: {
	chapterNumber: TextbookDemoChapterNumber;
	section: TextbookReadingSection;
}) {
	const sectionId = getSectionId(chapterNumber, section.number);
	const headingId = `${sectionId}-title`;

	return (
		<section
			id={sectionId}
			className="ed-reading-section ed-textbook-reading-section"
			aria-labelledby={headingId}
		>
			<div className="ed-reading-section__number" aria-hidden="true">
				<span>{section.number}</span>
				<small>
					{chapterNumber}.{section.number}
				</small>
			</div>
			<div>
				<p className="ed-kicker">{section.kicker}</p>
				<h2 id={headingId}>{section.title}</h2>
				{section.paragraphs.map((paragraph) => (
					<p key={paragraph}>{paragraph}</p>
				))}

				{section.callout ? (
					<aside
						className="ed-textbook-key-idea"
						aria-label={section.callout.label}
					>
						<span>{section.callout.label}</span>
						<strong>{section.callout.title}</strong>
						<p>{section.callout.body}</p>
					</aside>
				) : null}

				{section.equation ? (
					<div className="ed-equation" aria-label={section.equation.label}>
						<span>{section.equation.left}</span>
						<strong>{section.equation.operator}</strong>
						<span>{section.equation.right}</span>
						<small>{section.equation.note}</small>
					</div>
				) : null}

				{section.figure ? (
					<FigureFrame
						number={`${chapterNumber}.${section.number}`}
						title={
							section.figure === "sampling"
								? "样本量改变抽样分布的宽度"
								: "差值分布需要零差异作为参照"
						}
						description={
							section.figure === "sampling"
								? "三条曲线都以 μ 为中心；样本量从 10 增加到 100 时，样本均值更集中，但中心位置没有改变。"
								: "分布以观察差异为中心；零差异线帮助我们判断当前区间是否仍与“总体无差异”相容。"
						}
					>
						{section.figure === "sampling" ? (
							<SamplingDistributionFigure />
						) : (
							<MeanDifferenceFigure />
						)}
					</FigureFrame>
				) : null}
			</div>
		</section>
	);
}

function MiniEvidenceLab({ chapter }: { chapter: TextbookDemoChapter }) {
	const [sampleSize, setSampleSize] =
		useState<(typeof SAMPLE_SIZES)[number]>(30);
	const margin = (1.96 * chapter.lab.sigma) / Math.sqrt(sampleSize);
	const low = chapter.lab.center - margin;
	const high = chapter.lab.center + margin;
	const scale = (value: number) =>
		80 +
		((value - chapter.lab.axisMin) /
			(chapter.lab.axisMax - chapter.lab.axisMin)) *
			560;
	const clampedLow = Math.max(80, Math.min(640, scale(low)));
	const clampedHigh = Math.max(80, Math.min(640, scale(high)));
	const center = scale(chapter.lab.center);
	const zero = scale(0);
	const labTitleId = `chapter-${chapter.number}-lab-title`;

	return (
		<div className="ed-inline-evidence-lab" aria-labelledby={labTitleId}>
			<header>
				<div>
					<p className="ed-kicker">Live statistical note</p>
					<h3 id={labTitleId}>{chapter.lab.title}</h3>
				</div>
				<span>可交互</span>
			</header>
			<p className="ed-inline-evidence-lab__question">{chapter.lab.question}</p>
			<p className="ed-inline-evidence-lab__explanation">
				{chapter.lab.explanation}
			</p>

			<fieldset className="ed-inline-evidence-lab__controls">
				<legend>选择样本量 n</legend>
				<div>
					{SAMPLE_SIZES.map((size) => (
						<Button
							key={size}
							type="button"
							variant="outline"
							size="sm"
							aria-pressed={sampleSize === size}
							data-active={sampleSize === size || undefined}
							onClick={() => setSampleSize(size)}
						>
							n = {size}
						</Button>
					))}
				</div>
			</fieldset>

			<div className="ed-inline-evidence-lab__plot">
				<svg
					viewBox="0 0 720 230"
					role="img"
					aria-label={`${chapter.lab.axisLabel}上的 95% 区间，从 ${low.toFixed(2)} 到 ${high.toFixed(2)}`}
				>
					<path d="M80 160H640" className="ed-inline-lab-axis" />
					<path
						d="M80 154V166M360 154V166M640 154V166"
						className="ed-inline-lab-axis"
					/>
					{chapter.lab.axisMin < 0 && chapter.lab.axisMax > 0 ? (
						<path d={`M${zero} 52V160`} className="ed-inline-lab-zero" />
					) : null}
					<path
						d={`M${clampedLow} 104H${clampedHigh}M${clampedLow} 94V114M${clampedHigh} 94V114`}
						className="ed-inline-lab-interval"
					/>
					<circle cx={center} cy="104" r="6" className="ed-inline-lab-point" />
					<text x="80" y="190" textAnchor="middle">
						{chapter.lab.axisMin}
					</text>
					<text x="360" y="190" textAnchor="middle">
						{((chapter.lab.axisMin + chapter.lab.axisMax) / 2).toFixed(1)}
					</text>
					<text x="640" y="190" textAnchor="middle">
						{chapter.lab.axisMax}
					</text>
					<text
						x={center}
						y="78"
						textAnchor="middle"
						className="ed-inline-lab-label"
					>
						{chapter.lab.valueLabel} {chapter.lab.center}
					</text>
					<text x="360" y="222" textAnchor="middle">
						{chapter.lab.axisLabel}
					</text>
				</svg>
			</div>

			<dl className="ed-inline-evidence-lab__results" aria-live="polite">
				<div>
					<dt>标准误</dt>
					<dd>{(chapter.lab.sigma / Math.sqrt(sampleSize)).toFixed(2)}</dd>
				</div>
				<div>
					<dt>95% 误差界</dt>
					<dd>± {margin.toFixed(2)}</dd>
				</div>
				<div>
					<dt>当前区间</dt>
					<dd>
						[{low.toFixed(2)}, {high.toFixed(2)}]
					</dd>
				</div>
			</dl>
		</div>
	);
}

function ResourceIcon({ type }: { type: TextbookResource["type"] }) {
	if (type === "experiment") return <FlaskConicalIcon aria-hidden="true" />;
	if (type === "questions") return <BookOpenCheckIcon aria-hidden="true" />;
	return <Code2Icon aria-hidden="true" />;
}

function PracticeResources({ chapter }: { chapter: TextbookDemoChapter }) {
	return (
		<div className="ed-textbook-practice-resources">
			<header>
				<p className="ed-kicker">Continue with evidence</p>
				<h3>把这一节变成可以重复的分析</h3>
			</header>
			<div>
				{chapter.resources.map((resource) => (
					<a
						key={`${resource.type}-${resource.href}-${resource.title}`}
						href={resource.href}
					>
						<ResourceIcon type={resource.type} />
						<span>
							<strong>{resource.title}</strong>
							<small>{resource.detail}</small>
						</span>
						<ArrowRightIcon aria-hidden="true" />
					</a>
				))}
			</div>
		</div>
	);
}

function ExerciseSet({ chapter }: { chapter: TextbookDemoChapter }) {
	return (
		<div className="ed-textbook-exercises">
			{chapter.exercises.map((exercise) => (
				<details key={exercise.number}>
					<summary>
						<span>{exercise.number}</span>
						<strong>{exercise.question}</strong>
						<small>查看思路</small>
					</summary>
					<div>
						<p>
							<span>提示</span>
							{exercise.hint}
						</p>
						<p>
							<span>解释</span>
							{exercise.answer}
						</p>
					</div>
				</details>
			))}
		</div>
	);
}

function TextbookChapterTools({
	chapter,
	outline,
	activeSection,
	questionBankHref,
	siteMode,
	onSectionChange,
}: {
	chapter: TextbookDemoChapter;
	outline: ReturnType<typeof getChapterOutline>;
	activeSection: string;
	questionBankHref: string;
	siteMode: EditorialSiteMode;
	onSectionChange: (sectionId: string) => void;
}) {
	const [note, setNote] = useState("");
	const [saved, setSaved] = useState(false);

	return (
		<aside className="ed-chapter-tools" aria-label="本章学习工具">
			<div className="ed-rail-heading">
				<p className="ed-kicker">Chapter tools</p>
				<h2>本章工具</h2>
			</div>

			<section>
				<h3>本章内容</h3>
				<nav className="ed-outline-nav" aria-label="本章内容导航">
					{outline.map((item) => (
						<a
							key={item.id}
							href={`#${item.id}`}
							data-current={activeSection === item.id || undefined}
							onClick={() => onSectionChange(item.id)}
						>
							<span>{item.number}</span>
							<strong>{item.label}</strong>
						</a>
					))}
				</nav>
			</section>

			<Separator />

			<section className="ed-tool-links">
				<h3>关联学习</h3>
				{chapter.resources
					.filter((resource) => resource.type !== "questions")
					.map((resource) => (
						<a
							key={`${resource.type}-${resource.href}-${resource.title}`}
							href={resource.href}
						>
							<ResourceIcon type={resource.type} />
							<span>
								<strong>{resource.title}</strong>
								<small>{resource.detail}</small>
							</span>
							<ArrowRightIcon aria-hidden="true" />
						</a>
					))}
				<a href={questionBankHref}>
					<BookOpenCheckIcon aria-hidden="true" />
					<span>
						<strong>本章题库</strong>
						<small>{chapter.exercises.length} 道概念检查题</small>
					</span>
					<ArrowRightIcon aria-hidden="true" />
				</a>
			</section>

			<Separator />

			<section className="ed-textbook-margin-note">
				<h3>阅读边注</h3>
				<label htmlFor={`chapter-${chapter.number}-note`}>
					写下尚未解释清楚的问题
				</label>
				<textarea
					id={`chapter-${chapter.number}-note`}
					value={note}
					placeholder="例如：为什么样本量扩大四倍，标准误才减半？"
					onChange={(event) => {
						setNote(event.target.value);
						setSaved(false);
					}}
				/>
				<Button
					type="button"
					variant="outline"
					disabled={!note.trim()}
					onClick={() => setSaved(true)}
				>
					保存本章笔记
				</Button>
				<p aria-live="polite">
					{saved
						? siteMode === "product"
							? "已保存在当前阅读会话中。"
							: "已保存在当前 Demo 会话中。"
						: ""}
				</p>
			</section>
		</aside>
	);
}

export function EditorialTextbookPage({
	siteMode = "demo",
}: {
	siteMode?: EditorialSiteMode;
}) {
	const language = useLanguage();
	const [chapterNumber, setChapterNumber] = useState<TextbookDemoChapterNumber>(
		() => getInitialChapter(siteMode),
	);
	const [readerOpen, setReaderOpen] = useState(() => {
		if (siteMode === "demo" || typeof window === "undefined") return siteMode === "demo";
		return Boolean(
			new URLSearchParams(window.location.search).get("chapter") ||
				window.location.hash.match(/mes-ch\d{2}/),
		);
	});
	const chapterOptions = useMemo<ChapterOption[]>(
		() =>
			siteMode === "product"
				? textbookResourceCatalog.map((entry) => ({
						number: String(entry.chapter.number).padStart(2, "0"),
						title:
							language === "zh" ? entry.chapter.title : entry.chapter.titleEn,
						detail:
							entry.topics
								.slice(0, 2)
								.map((topic) => topic.title[language])
								.join(language === "zh" ? " · " : " / ") ||
							(language === "zh" ? "章节导论" : "Chapter introduction"),
					}))
				: demoTextbookChapters.filter(
						(option) => option.number === "06" || option.number === "07",
					),
		[language, siteMode],
	);
	const chapter = useMemo(
		() => resolveChapter(chapterNumber, siteMode, language),
		[chapterNumber, language, siteMode],
	);
	const chapterOutline = useMemo(() => getChapterOutline(chapter), [chapter]);
	const catalogEntry = getCatalogEntry(chapterNumber);
	const questionBankHref =
		siteMode === "product" && catalogEntry
			? catalogEntry.questionBankHref
			: "/visual-demo/paper";
	const firstSectionId = getSectionId(chapterNumber, "01");
	const [activeSection, setActiveSection] = useState(firstSectionId);
	const outlineIds = useMemo(
		() =>
			Array.from({ length: 7 }, (_, index) =>
				getSectionId(chapterNumber, String(index + 1).padStart(2, "0")),
			),
		[chapterNumber],
	);

	useEffect(() => {
		if (typeof IntersectionObserver === "undefined") return;
		const sections = outlineIds
			.map((id) => document.getElementById(id))
			.filter((section): section is HTMLElement => Boolean(section));
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort(
						(a, b) =>
							a.target.getBoundingClientRect().top -
							b.target.getBoundingClientRect().top,
					);
				if (visible[0]) setActiveSection(visible[0].target.id);
			},
			{ rootMargin: "-12% 0px -68% 0px", threshold: 0 },
		);
		for (const section of sections) observer.observe(section);
		return () => observer.disconnect();
	}, [outlineIds]);

	useEffect(() => {
		if (siteMode !== "product" || typeof window === "undefined") return;
		const syncFromLocation = () => {
			const hasChapter = Boolean(
				new URLSearchParams(window.location.search).get("chapter") ||
					window.location.hash.match(/mes-ch\d{2}/),
			);
			setReaderOpen(hasChapter);
			if (hasChapter) setChapterNumber(getInitialChapter(siteMode));
		};
		window.addEventListener("popstate", syncFromLocation);
		return () => window.removeEventListener("popstate", syncFromLocation);
	}, [siteMode]);

	const changeChapter = (
		next: TextbookDemoChapterNumber,
		historyMode: "push" | "replace" = "replace",
	) => {
		setChapterNumber(next);
		setReaderOpen(true);
		setActiveSection(getSectionId(next, "01"));
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.set("chapter", next);
			url.hash = "";
			window.history[historyMode === "push" ? "pushState" : "replaceState"](null, "", url);
			// Chapter navigation is a new reading context. Reset the document
			// scroll after the new chapter has rendered instead of leaving the
			// reader at the pagination footer that triggered the navigation.
			const resetScroll = () => {
				(document.scrollingElement ?? document.documentElement).scrollTop = 0;
			};
			if (typeof window.requestAnimationFrame === "function") {
				window.requestAnimationFrame(resetScroll);
			} else {
				resetScroll();
			}
		}
	};
	const openChapterFromCatalog = (next: TextbookDemoChapterNumber) => {
		changeChapter(next, "push");
	};
	const returnToCatalog = () => {
		setReaderOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("chapter");
			url.hash = "";
			window.history.pushState(null, "", url);
			(document.scrollingElement ?? document.documentElement).scrollTop = 0;
		}
	};
	const chapterIndex = chapterOptions.findIndex(
		(option) => option.number === chapterNumber,
	);
	const previousChapter = chapterOptions[chapterIndex - 1];
	const nextChapter = chapterOptions[chapterIndex + 1];

	const showCatalogOverview = siteMode === "product" && !readerOpen;

	return (
		<EditorialDemoShell current="catalog" mode={showCatalogOverview ? "document" : "workspace"} siteMode={siteMode}>
			{showCatalogOverview ? (
				<TextbookCatalogOverview
					chapterOptions={chapterOptions}
					language={language}
					onChapterChange={openChapterFromCatalog}
				/>
			) : siteMode === "product" ? (
				<ChapterLearningHub
					chapterNumber={chapterNumber}
					chapter={chapter}
					entry={catalogEntry ?? textbookResourceCatalog[0]}
					chapterOptions={chapterOptions}
					language={language}
					previousChapter={previousChapter}
					nextChapter={nextChapter}
					onChapterChange={changeChapter}
					onBackToCatalog={returnToCatalog}
				/>
			) : (
			<main id="main-content" className="ed-textbook-layout">
				<TextbookReadingRail
					chapter={chapter}
					chapterOptions={chapterOptions}
					siteMode={siteMode}
					onChapterChange={changeChapter}
					onBackToCatalog={returnToCatalog}
				/>

				<article className="ed-reading-sheet" id="chapter-start">
					<ChapterHeader
						number={chapter.number}
						title={chapter.title}
						subtitle={chapter.lead}
					/>

					<section
						className="ed-learning-objectives"
						aria-labelledby="learning-goals-title"
					>
						<p className="ed-kicker">Learning objectives</p>
						<h2 id="learning-goals-title">完成本章后，你能够</h2>
						<ol>
							{chapter.objectives.map((objective, index) => (
								<li key={objective}>
									<span>{String(index + 1).padStart(2, "0")}</span>
									{objective}
								</li>
							))}
						</ol>
					</section>

					{chapter.sections.map((section) => (
						<ReadingSection
							key={section.slug}
							chapterNumber={chapter.number}
							section={section}
						/>
					))}

					<section
						id={getSectionId(chapter.number, "06")}
						className="ed-reading-section ed-textbook-reading-section ed-textbook-reading-section--practice"
						aria-labelledby={`chapter-${chapter.number}-practice-title`}
					>
						<div className="ed-reading-section__number" aria-hidden="true">
							<span>06</span>
							<small>{chapter.number}.06</small>
						</div>
						<div>
							<p className="ed-kicker">Experiment and code</p>
							<h2 id={`chapter-${chapter.number}-practice-title`}>
								让公式变成可以观察的证据
							</h2>
							<p>
								先在页内改变一个关键参数，再进入完整实验或编程环境复现同一个统计关系。阅读、观察与代码使用同一条证据链。
							</p>
							<MiniEvidenceLab key={chapter.number} chapter={chapter} />
							<PracticeResources chapter={chapter} />
						</div>
					</section>

					<section
						id={getSectionId(chapter.number, "07")}
						className="ed-reading-section ed-textbook-reading-section ed-textbook-reading-section--exercises"
						aria-labelledby={`chapter-${chapter.number}-exercise-title`}
					>
						<div className="ed-reading-section__number" aria-hidden="true">
							<span>07</span>
							<small>{chapter.number}.07</small>
						</div>
						<div>
							<p className="ed-kicker">Check your understanding</p>
							<h2 id={`chapter-${chapter.number}-exercise-title`}>
								检查你的理解
							</h2>
							<p>
								先给出自己的解释，再展开提示与答案。每道题都对应本章的一条核心判断，而不是只检查公式记忆。
							</p>
							<ExerciseSet chapter={chapter} />
							<a
								className="ed-textbook-question-bank-link"
								href={questionBankHref}
							>
								<BookOpenCheckIcon aria-hidden="true" />
								<span>
									<strong>继续进入本章题库</strong>
									<small>按知识点与难度完成更多练习</small>
								</span>
								<ArrowRightIcon aria-hidden="true" />
							</a>
						</div>
					</section>

						<nav className="ed-reading-pagination" aria-label="章节翻页">
							<a href="/visual-demo">
								← 返回完整教材目录
						</a>
						<div className="ed-reading-pagination__chapters">
							<Button
								type="button"
								variant="outline"
								disabled={!previousChapter}
								onClick={() =>
									previousChapter && changeChapter(previousChapter.number)
								}
							>
								{previousChapter
									? `上一章：${previousChapter.title}`
									: "已是第一章"}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={!nextChapter}
								onClick={() => nextChapter && changeChapter(nextChapter.number)}
							>
								{nextChapter ? `下一章：${nextChapter.title}` : "已是最后一章"}
								<ArrowRightIcon aria-hidden="true" />
							</Button>
						</div>
					</nav>
				</article>

				<TextbookChapterTools
					key={chapter.number}
					chapter={chapter}
					outline={chapterOutline}
					activeSection={activeSection}
					questionBankHref={questionBankHref}
					siteMode={siteMode}
					onSectionChange={setActiveSection}
				/>
			</main>
			)}
		</EditorialDemoShell>
	);
}
