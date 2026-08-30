export type DemoPageId =
	| "home"
	| "catalog"
	| "experiment"
	| "paper"
	| "r"
	| "python";

const demoPages: Array<{ id: DemoPageId; label: string; href: string }> = [
	{ id: "home", label: "首页", href: "/visual-demo" },
	{ id: "catalog", label: "教材", href: "/visual-demo/catalog" },
	{ id: "experiment", label: "模拟实验", href: "/visual-demo/experiment" },
	{ id: "paper", label: "组卷", href: "/visual-demo/paper" },
	{ id: "r", label: "R 学习", href: "/visual-demo/r" },
	{ id: "python", label: "Python 学习", href: "/visual-demo/python" },
];

function DemoBrandMark() {
	return (
		<svg viewBox="0 0 42 42" aria-hidden="true">
			<rect x="1" y="1" width="40" height="40" rx="10" />
			<path d="M9 29.5h24" />
			<path d="M12 26V18M18 26V12M24 26v-9M30 26V8" />
			<path d="M9 15.5c5.8 0 7.8-5 12.1-5 4.6 0 5.6 7.2 11.9 7.2" />
		</svg>
	);
}

export function DemoTopNav({ current }: { current: DemoPageId }) {
	return (
		<header className="sm-demo-nav">
			<a
				className="sm-demo-brand"
				href="/visual-demo"
				aria-label="StatMind 视觉 Demo 首页"
			>
				<span className="sm-demo-brand__mark">
					<DemoBrandMark />
				</span>
				<span>
					<b>StatMind</b>
					<small>统计思维教学平台</small>
				</span>
			</a>

			<nav className="sm-demo-nav__links" aria-label="视觉 Demo 页面">
				{demoPages.map((page) => (
					<a
						key={page.id}
						className={page.id === current ? "is-active" : undefined}
						href={page.href}
						aria-current={page.id === current ? "page" : undefined}
					>
						{page.label}
					</a>
				))}
			</nav>

			<div className="sm-demo-nav__actions">
				<span className="sm-demo-nav__badge">6 页视觉 Demo</span>
				<a className="sm-demo-nav__back" href="/">
					返回当前产品
				</a>
			</div>
		</header>
	);
}
