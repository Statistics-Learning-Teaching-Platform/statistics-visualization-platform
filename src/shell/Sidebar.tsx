import {
	useLanguage,
	setLanguage,
	getPlatformCopy,
	getVisualizerLabel,
} from "@stats-viz/shared/i18n";
import { apps, type AppRecord } from "../../scripts/apps";

const GROUP_ORDER: AppRecord["group"][] = [
	"Statistical Foundations",
	"Statistical Simulation",
];

interface SidebarProps {
	activeId: string;
	onNavigate: (id: string) => void;
	id?: string;
}

export function Sidebar({ activeId, onNavigate, id }: SidebarProps) {
	const lang = useLanguage();
	const copy = getPlatformCopy(lang);
	let itemIndex = 0;

	return (
		<aside id={id} className="platform-sidebar ed-lab-sidebar">
			<div className="ed-rail-heading">
				<div className="ed-rail-heading__compact">
					<div>
						<p className="ed-kicker">Laboratory Index</p>
						<h2>{lang === "zh" ? "实验目录" : "Experiment Index"}</h2>
					</div>
					<span>{apps.length}</span>
				</div>
			</div>

			<nav className="visualizer-nav" aria-label={copy.navLabel}>
				{GROUP_ORDER.map((groupName) => {
					const groupApps = apps.filter((app) => app.group === groupName);
					return (
						<section
							key={groupName}
							className="visualizer-nav__group"
							data-group-name={groupName}
						>
							<h2 className="visualizer-nav__group-title">
								{copy.groups[groupName]}
							</h2>
							<div className="visualizer-nav__button-row">
								{groupApps.map((app) => {
									itemIndex += 1;
									const isActive = app.id === activeId;
									const [label, detail] = getVisualizerLabel(app.id, lang);
									return (
										<button
											key={app.id}
											className="visualizer-nav__button"
											type="button"
											data-visualizer-id={app.id}
											data-active={isActive}
											aria-pressed={isActive}
											onClick={() => onNavigate(app.id)}
										>
											<span className="visualizer-nav__icon">
												{String(itemIndex).padStart(2, "0")}
											</span>
											<span className="visualizer-nav__copy">
												<span className="visualizer-nav__label">{label}</span>
												<span className="visualizer-nav__detail">{detail}</span>
											</span>
										</button>
									);
								})}
							</div>
						</section>
					);
				})}
			</nav>

			<section className="ed-procedure">
				<p className="ed-kicker">Procedure</p>
				<ol>
					<li data-state="current">
						<span>1</span>
						{lang === "zh" ? "提出问题" : "Frame a question"}
					</li>
					<li>
						<span>2</span>
						{lang === "zh" ? "设置参数" : "Set parameters"}
					</li>
					<li>
						<span>3</span>
						{lang === "zh" ? "运行 / 实时更新" : "Run / update live"}
					</li>
					<li>
						<span>4</span>
						{lang === "zh" ? "观察图形" : "Observe the plot"}
					</li>
					<li>
						<span>5</span>
						{lang === "zh" ? "阅读指标并解释" : "Read metrics and interpret"}
					</li>
				</ol>
			</section>
		</aside>
	);
}

export function LanguageTabs() {
	const lang = useLanguage();
	const copy = getPlatformCopy(lang);

	const tabs: Array<{ language: "zh" | "en"; label: string }> = [
		{ language: "zh", label: "中文" },
		{ language: "en", label: "English" },
	];

	return (
		<div
			className="platform-language-tabs"
			role="group"
			aria-label={copy.languageLabel}
		>
			{tabs.map(({ language, label }) => (
				<button
					key={language}
					className="platform-language-tab"
					type="button"
					data-language={language}
					data-active={lang === language}
					aria-pressed={lang === language}
					onClick={() => setLanguage(language)}
				>
					{label}
				</button>
			))}
		</div>
	);
}
