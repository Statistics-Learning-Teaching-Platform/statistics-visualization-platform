import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	ArrowRightIcon,
	FileDownIcon,
	MinusIcon,
	PlusIcon,
	SearchIcon,
} from "lucide-react";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useState,
} from "react";
import { EditorialDemoShell, PageIntro } from "./EditorialPrimitives";
import { demoQuestions } from "./demo-data";

export function EditorialPaperPage() {
	useEffect(() => {
		// The paper workspace is a new page context. When it is opened from a
		// lower section of the home/textbook, start at its intro instead of
		// preserving the previous document scroll position.
		const resetScroll = () => {
			(document.scrollingElement ?? document.documentElement).scrollTop = 0;
		};
		if (typeof window.requestAnimationFrame === "function") {
			const frame = window.requestAnimationFrame(resetScroll);
			return () => window.cancelAnimationFrame(frame);
		}
		resetScroll();
	}, []);

	const [selected, setSelected] = useState<string[]>([
		demoQuestions[0].id,
		demoQuestions[1].id,
	]);
	const [query, setQuery] = useState("");
	const [selectedChapters, setSelectedChapters] = useState(["06", "07"]);
	const [selectedTypes, setSelectedTypes] = useState([
		"选择题",
		"计算题",
		"分析与简答",
	]);
	const visibleQuestions = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return demoQuestions.filter((question) => {
			const chapterMatches = selectedChapters.some((chapter) =>
				question.chapter.startsWith(chapter),
			);
			const typeGroup =
				question.type === "选择题" || question.type === "计算题"
					? question.type
					: "分析与简答";
			const typeMatches = selectedTypes.includes(typeGroup);
			const queryMatches =
				!normalized ||
				[question.id, question.stem, question.chapter, ...question.topics]
					.join(" ")
					.toLowerCase()
					.includes(normalized);
			return chapterMatches && typeMatches && queryMatches;
		});
	}, [query, selectedChapters, selectedTypes]);
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

	function toggleQuestion(id: string) {
		setSelected((current) =>
			current.includes(id)
				? current.filter((questionId) => questionId !== id)
				: [...current, id],
		);
	}

	function toggleFilter(
		value: string,
		setValues: Dispatch<SetStateAction<string[]>>,
	) {
		setValues((current) =>
			current.includes(value)
				? current.filter((item) => item !== value)
				: [...current, value],
		);
	}

	function clearFilters() {
		setQuery("");
		setSelectedChapters(["06", "07", "08"]);
		setSelectedTypes(["选择题", "计算题", "分析与简答"]);
	}

	return (
		<EditorialDemoShell current="paper" mode="workspace">
			<main id="main-content" className="ed-paper-page">
				<header className="ed-paper-page__intro">
					<PageIntro
						index="02"
						eyebrow="Exam Composition · Reviewed Question Bank"
						title="统计学组卷编辑台"
						description="沿教材章节与教学目标组织题目，像编辑一份学术试卷，而不是堆叠题库指标。"
						action={{ label: "打开真实组卷系统", href: "/st-qselector" }}
					/>
				</header>

				<aside className="ed-paper-filters">
					<div className="ed-rail-heading">
						<p className="ed-kicker">Blueprint</p>
						<h2>试卷蓝图</h2>
					</div>
					<label className="ed-search-field">
						<span>检索题目</span>
						<div>
							<SearchIcon aria-hidden="true" />
							<input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="题干、知识点或编号"
							/>
						</div>
					</label>
					<Separator />
					<fieldset>
						<legend>章节范围</legend>
						<label>
							<input
								type="checkbox"
								checked={selectedChapters.includes("06")}
								onChange={() => toggleFilter("06", setSelectedChapters)}
							/>
							<span>06 样本的统计推断</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={selectedChapters.includes("07")}
								onChange={() => toggleFilter("07", setSelectedChapters)}
							/>
							<span>07 总体均值的比较</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={selectedChapters.includes("08")}
								onChange={() => toggleFilter("08", setSelectedChapters)}
							/>
							<span>08 相关与回归</span>
						</label>
					</fieldset>
					<Separator />
					<fieldset>
						<legend>题目类型</legend>
						<label>
							<input
								type="checkbox"
								checked={selectedTypes.includes("选择题")}
								onChange={() => toggleFilter("选择题", setSelectedTypes)}
							/>
							<span>选择题</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={selectedTypes.includes("计算题")}
								onChange={() => toggleFilter("计算题", setSelectedTypes)}
							/>
							<span>计算题</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={selectedTypes.includes("分析与简答")}
								onChange={() => toggleFilter("分析与简答", setSelectedTypes)}
							/>
							<span>分析与简答</span>
						</label>
					</fieldset>
					<div className="ed-blueprint-note">
						<span>Target</span>
						<strong>100 分 · 90 分钟</strong>
						<p>当前蓝图偏重统计推断与方法解释。</p>
					</div>
				</aside>

				<section className="ed-question-manuscript">
					<header>
						<div>
							<p className="ed-kicker">Reviewed Questions</p>
							<h2>已审核题目</h2>
						</div>
						<p>296 道题 · 当前显示 {visibleQuestions.length} 道样例</p>
					</header>
					<div className="ed-question-list">
						{visibleQuestions.map((question, index) => {
							const isSelected = selected.includes(question.id);
							return (
								<article
									key={question.id}
									data-selected={isSelected || undefined}
								>
									<div className="ed-question-list__number">
										{String(index + 1).padStart(2, "0")}
									</div>
									<div className="ed-question-list__body">
										<header>
											<span>{question.id}</span>
											<span>{question.type}</span>
											<span>{question.difficulty}</span>
										</header>
										<h3>{question.stem}</h3>
										<footer>
											<span>{question.chapter}</span>
											<span>{question.topics.join(" / ")}</span>
											<span>
												{question.points} 分 · {question.minutes} 分钟
											</span>
										</footer>
									</div>
									<Button
										variant={isSelected ? "outline" : "default"}
										size="sm"
										aria-pressed={isSelected}
										onClick={() => toggleQuestion(question.id)}
									>
										{isSelected ? (
											<MinusIcon data-icon="inline-start" />
										) : (
											<PlusIcon data-icon="inline-start" />
										)}
										{isSelected ? "移出试卷" : "加入试卷"}
									</Button>
								</article>
							);
						})}
						{visibleQuestions.length === 0 ? (
							<div className="ed-question-empty">
								<p className="ed-kicker">No matching question</p>
								<h3>当前条件下没有样例题目</h3>
								<p>放宽章节或题型范围，再继续编排试卷。</p>
								<Button variant="outline" onClick={clearFilters}>
									清除筛选
								</Button>
							</div>
						) : null}
					</div>
				</section>

				<aside className="ed-paper-folio">
					<header>
						<p className="ed-kicker">Current Manuscript</p>
						<h2>统计学基础</h2>
						<p>期中考试卷 A · 草稿</p>
					</header>
					<div className="ed-paper-folio__summary">
						<div>
							<strong>{selectedQuestions.length}</strong>
							<span>题</span>
						</div>
						<div>
							<strong>{totalPoints}</strong>
							<span>分</span>
						</div>
						<div>
							<strong>{totalMinutes}</strong>
							<span>分钟</span>
						</div>
					</div>
					<ol className="ed-paper-folio__items">
						{selectedQuestions.map((question, index) => (
							<li key={question.id}>
								<span>{String(index + 1).padStart(2, "0")}</span>
								<div>
									<strong>{question.type}</strong>
									<p>{question.stem}</p>
								</div>
								<small>{question.points} 分</small>
							</li>
						))}
					</ol>
					<div className="ed-paper-progress">
						<div>
							<span>目标进度</span>
							<strong>{totalPoints} / 100 分</strong>
						</div>
						<div className="ed-paper-progress__track" aria-hidden="true">
							<span style={{ width: `${Math.min(totalPoints, 100)}%` }} />
						</div>
						<p>还需 {Math.max(100 - totalPoints, 0)} 分达到试卷目标。</p>
					</div>
					<div className="ed-paper-folio__actions">
						<Button disabled={!selectedQuestions.length}>
							<FileDownIcon data-icon="inline-start" />
							预览并导出
						</Button>
						<Button variant="outline">保存草稿</Button>
					</div>
					<a className="ed-inline-link" href="/visual-demo/catalog">
						查看教材章节
						<ArrowRightIcon aria-hidden="true" />
					</a>
				</aside>
			</main>
		</EditorialDemoShell>
	);
}
