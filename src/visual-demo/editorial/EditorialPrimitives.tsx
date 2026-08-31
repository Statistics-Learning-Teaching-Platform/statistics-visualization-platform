import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { setLanguage, useLanguage } from "@stats-viz/shared/i18n";
import { ArrowRightIcon, UserRoundIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
	type EditorialPageId,
	type EditorialSiteMode,
	type TextbookChapter,
	getEditorialNavItems,
	journeySteps,
} from "./demo-data";

interface EditorialDemoShellProps {
	current: EditorialPageId | "profile";
	children: ReactNode;
	mode?: "document" | "workspace";
	siteMode?: EditorialSiteMode;
}

export function EditorialDemoShell({
	current,
	children,
	mode = "document",
	siteMode = "demo",
}: EditorialDemoShellProps) {
	const language = useLanguage();
	const navItems = getEditorialNavItems(siteMode);
	const homeHref = siteMode === "product" ? "/" : "/visual-demo";

	return (
		<div
			className="editorial-demo min-h-screen bg-background text-foreground"
			data-mode={mode}
			data-site-mode={siteMode}
		>
			<a className="ed-skip-link" href="#main-content">
				{language === "zh" ? "跳到主要内容" : "Skip to main content"}
			</a>
			<header className="ed-header">
				<a
					className="ed-wordmark"
					href={homeHref}
					aria-label={language === "zh" ? "StatMind 首页" : "StatMind home"}
				>
					<span className="ed-wordmark__seal" aria-hidden="true">
						S
					</span>
					<span className="ed-wordmark__text">
						<strong>StatMind</strong>
						<small>
							{language === "zh"
								? "统计思维教学平台"
								: "Statistical thinking platform"}
						</small>
					</span>
				</a>

				<nav
					className="ed-header__nav"
					aria-label={language === "zh" ? "主要学习空间" : "Learning spaces"}
				>
					{navItems.map((item) => (
						<a
							key={item.id}
							href={item.href}
							data-current={item.id === current || undefined}
							aria-current={item.id === current ? "page" : undefined}
						>
							{language === "zh" ? item.label : item.english}
						</a>
					))}
				</nav>

				<div className="ed-header__utilities">
					{siteMode === "product" ? (
						<a
							className="ed-profile-entry"
							href="/profile"
							data-current={current === "profile" || undefined}
							aria-current={current === "profile" ? "page" : undefined}
						>
							<UserRoundIcon aria-hidden="true" />
							<span>{language === "zh" ? "我的学习" : "My learning"}</span>
						</a>
					) : null}
					<div
						className="ed-language"
						aria-label={language === "zh" ? "语言选择" : "Language"}
					>
						<button
							type="button"
							aria-pressed={language === "zh"}
							onClick={() => setLanguage("zh")}
						>
							中文
						</button>
						<span aria-hidden="true">/</span>
						<button
							type="button"
							aria-pressed={language === "en"}
							onClick={() => setLanguage("en")}
						>
							English
						</button>
					</div>
				</div>
			</header>

			{children}
		</div>
	);
}

interface PageIntroProps {
	index: string;
	eyebrow: string;
	title: string;
	description: string;
	action?: { label: string; href: string };
}

export function PageIntro({
	index,
	eyebrow,
	title,
	description,
	action,
}: PageIntroProps) {
	return (
		<header className="ed-page-intro">
			<div className="ed-page-intro__index" aria-hidden="true">
				{index}
			</div>
			<div className="ed-page-intro__copy">
				<p className="ed-kicker">{eyebrow}</p>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>
			{action ? (
				<a
					href={action.href}
					aria-label={action.label}
					data-slot="button"
					className={buttonVariants({ variant: "outline" })}
				>
					{action.label}
					<ArrowRightIcon data-icon="inline-end" />
				</a>
			) : null}
		</header>
	);
}

interface EditorialSectionProps {
	index?: string;
	eyebrow?: string;
	title: string;
	intro?: string;
	children: ReactNode;
	className?: string;
}

export function EditorialSection({
	index,
	eyebrow,
	title,
	intro,
	children,
	className,
}: EditorialSectionProps) {
	return (
		<section className={cn("ed-section", className)}>
			<div
				className={cn(
					"ed-section__heading",
					!index && "ed-section__heading--plain",
				)}
			>
				{index ? <span className="ed-section__index">{index}</span> : null}
				<div>
					{eyebrow ? <p className="ed-kicker">{eyebrow}</p> : null}
					<h2>{title}</h2>
					{intro ? <p className="ed-section__intro">{intro}</p> : null}
				</div>
			</div>
			<div className="ed-section__body">{children}</div>
		</section>
	);
}

export function LearningJourney() {
	const language = useLanguage();
	const englishSteps = [
		{
			title: "Understand concepts",
			description: "Identify the population, sample, and unknown quantity.",
		},
		{
			title: "Run simulations",
			description: "Turn sampling variation into observable evidence.",
		},
		{
			title: "Practice with code",
			description: "Reproduce each method and result in R or Python.",
		},
		{
			title: "Interpret evidence",
			description: "Explain uncertainty and form a testable conclusion.",
		},
	] as const;
	return (
		<div
			className="ed-journey"
			aria-label={
				language === "zh"
					? "四步学习证据链"
					: "Four-step learning evidence chain"
			}
		>
			<div className="ed-journey__rule" aria-hidden="true" />
			{journeySteps.map((step, index) => (
				<article key={step.title} className="ed-journey__step">
					<h3>{language === "zh" ? step.title : englishSteps[index].title}</h3>
					<p>
						{language === "zh"
							? step.description
							: englishSteps[index].description}
					</p>
				</article>
			))}
		</div>
	);
}

interface AcademicCardProps {
	number: string;
	title: string;
	english: string;
	description: string;
	meta: string;
	href: string;
	action: string;
}

export function AcademicCard({
	title,
	english,
	description,
	meta,
	href,
	action,
}: AcademicCardProps) {
	return (
		<article className="ed-academic-card">
			<header>
				<p>{english}</p>
			</header>
			<h3>{title}</h3>
			<p className="ed-academic-card__description">{description}</p>
			<footer>
				<span>{meta}</span>
				<a href={href}>
					{action}
					<ArrowRightIcon aria-hidden="true" />
				</a>
			</footer>
		</article>
	);
}

interface TextbookSidebarProps {
	chapters: TextbookChapter[];
	current: string;
	onSelect?: (chapter: TextbookChapter) => void;
	available?: string[];
}

export function TextbookSidebar({
	chapters,
	current,
	onSelect,
	available,
}: TextbookSidebarProps) {
	return (
		<aside className="ed-textbook-sidebar" aria-label="教材章节目录">
			<div className="ed-rail-heading">
				<p className="ed-kicker">Contents</p>
				<h2>现代基础统计学</h2>
			</div>
			<nav>
				{chapters.map((chapter) => {
					const active = chapter.number === current;
					const enabled = !available || available.includes(chapter.number);
					return (
						<button
							key={chapter.number}
							type="button"
							data-active={active || undefined}
							aria-current={active ? "page" : undefined}
							disabled={!enabled}
							onClick={() => onSelect?.(chapter)}
						>
							<span>{chapter.number}</span>
							<strong>{chapter.title}</strong>
							<small>{chapter.detail}</small>
						</button>
					);
				})}
			</nav>
		</aside>
	);
}

interface ChapterHeaderProps {
	number: string;
	title: string;
	subtitle: ReactNode;
}

export function ChapterHeader({ number, title, subtitle }: ChapterHeaderProps) {
	return (
		<header className="ed-chapter-header">
			<div className="ed-chapter-header__title">
				<span>{number}</span>
				<h1>{title}</h1>
			</div>
			<p className="ed-chapter-header__subtitle">{subtitle}</p>
		</header>
	);
}

interface FigureFrameProps {
	number: string;
	title: string;
	description: string;
	children: ReactNode;
}

export function FigureFrame({
	number,
	title,
	description,
	children,
}: FigureFrameProps) {
	return (
		<figure className="ed-figure-frame">
			<div className="ed-figure-frame__canvas">{children}</div>
			<figcaption>
				<span>Fig. {number}</span>
				<div>
					<strong>{title}</strong>
					<p>{description}</p>
				</div>
			</figcaption>
		</figure>
	);
}

interface ExperimentPanelProps {
	number: string;
	label: string;
	title: string;
	children: ReactNode;
}

export function ExperimentPanel({
	number,
	label,
	title,
	children,
}: ExperimentPanelProps) {
	return (
		<section className="ed-experiment-panel">
			<header>
				<span>{number}</span>
				<div>
					<p className="ed-kicker">{label}</p>
					<h2>{title}</h2>
				</div>
			</header>
			<Separator />
			<div className="ed-experiment-panel__body">{children}</div>
		</section>
	);
}

export function EditorialFooter({
	siteMode = "demo",
}: {
	siteMode?: EditorialSiteMode;
}) {
	const language = useLanguage();
	return (
		<footer className="ed-footer">
			<span>StatMind · Statistical Thinking</span>
			<span>
				{language === "zh"
					? "数字教材 / 交互实验 / 可复现分析"
					: "Digital textbook / experiments / reproducible analysis"}
			</span>
			<a href={siteMode === "product" ? "/catalog" : "/"}>
				{siteMode === "product"
					? language === "zh"
						? "继续阅读教材"
						: "Continue to the textbook"
					: language === "zh"
						? "返回当前产品"
						: "Return to the product"}
			</a>
		</footer>
	);
}
