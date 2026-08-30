import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ArrowRightIcon,
	CheckIcon,
	PlayIcon,
	RotateCcwIcon,
} from "lucide-react";
import { useState } from "react";
import { EditorialDemoShell } from "./EditorialPrimitives";
import { type IdeConfig, pythonIdeConfig, rIdeConfig } from "./demo-data";

const courseLessons = [
	["01", "对象与向量"],
	["02", "数据框与字段"],
	["03", "条件筛选"],
	["04", "分组汇总"],
	["05", "分布可视化"],
	["06", "抽样与估计"],
	["07", "模型与解释"],
];

function EditorialLearningIdePage({ config }: { config: IdeConfig }) {
	const [code, setCode] = useState(config.starterCode);
	const [hasRun, setHasRun] = useState(false);

	function runExample() {
		setCode(config.solutionCode);
		setHasRun(true);
	}

	function resetCode() {
		setCode(config.starterCode);
		setHasRun(false);
	}

	return (
		<EditorialDemoShell current={config.pageId} mode="workspace">
			<main id="main-content" className="ed-ide-page">
				<aside className="ed-course-folio">
					<div className="ed-course-folio__title">
						<span>{config.mark}</span>
						<div>
							<p className="ed-kicker">{config.english}</p>
							<h1>{config.title}</h1>
						</div>
					</div>
					<div className="ed-course-progress">
						<span>
							{Number(config.lessonNumber)} / {config.totalLessons}
						</span>
						<div aria-hidden="true">
							<i
								style={{
									width: `${(Number(config.lessonNumber) / config.totalLessons) * 100}%`,
								}}
							/>
						</div>
					</div>
					<nav aria-label={`${config.title}课程目录`}>
						{courseLessons.map(([number, title]) => {
							const active = number === config.lessonNumber;
							return (
								<a
									key={number}
									href="#lesson-title"
									data-current={active || undefined}
								>
									<span>{number}</span>
									<div>
										<strong>{active ? config.lesson : title}</strong>
										<small>{active ? "当前课 · 约 12 分钟" : "课程单元"}</small>
									</div>
								</a>
							);
						})}
					</nav>
					<div className="ed-course-folio__runtime">
						<span aria-hidden="true" />
						{config.runtime}
					</div>
				</aside>

				<section className="ed-notebook">
					<header className="ed-notebook__header">
						<div>
							<p className="ed-kicker">
								Lesson {config.lessonNumber} · {config.english}
							</p>
							<h1 id="lesson-title">{config.lesson}</h1>
						</div>
						<div>
							<span>{hasRun ? "刚刚运行" : "草稿已保存"}</span>
							<span>{config.runtime}</span>
						</div>
					</header>

					<section className="ed-lesson-brief" aria-label="本课任务">
						<div>
							<span>01</span>
							<p>
								<small>目标</small>
								<strong>{config.goal}</strong>
							</p>
						</div>
						<div>
							<span>02</span>
							<p>
								<small>任务</small>
								<strong>{config.task}</strong>
							</p>
						</div>
					</section>

					<details className="ed-example-disclosure">
						<summary>
							<span>03</span>
							<strong>查看参考示例</strong>
							<small>按需展开</small>
						</summary>
						<div>
							<code>{config.example}</code>
						</div>
					</details>

					<section className="ed-code-cell">
						<header>
							<div>
								<span aria-hidden="true" />
								<span aria-hidden="true" />
								<span aria-hidden="true" />
								<strong>
									{config.kind === "r" ? "lesson-01.R" : "lesson-06.py"}
								</strong>
							</div>
							<small>{config.runtime}</small>
						</header>
						<label htmlFor={`${config.kind}-editor`}>代码编辑器</label>
						<textarea
							id={`${config.kind}-editor`}
							value={code}
							onChange={(event) => {
								setCode(event.target.value);
								setHasRun(false);
							}}
							spellCheck="false"
						/>
						<footer>
							<Button onClick={runExample}>
								<PlayIcon data-icon="inline-start" />
								运行示例
							</Button>
							<Button variant="ghost" onClick={resetCode}>
								<RotateCcwIcon data-icon="inline-start" />
								重置代码
							</Button>
							<span>Ctrl / Cmd + Enter</span>
						</footer>
					</section>

					<section className="ed-notebook-output" aria-live="polite">
						<header>
							<span>04</span>
							<p className="ed-kicker">Output</p>
							{hasRun ? <strong>运行成功</strong> : null}
						</header>
						{hasRun ? (
							<pre>{config.output}</pre>
						) : (
							<p>运行代码后，结果会在这里出现，并与解释保持相邻。</p>
						)}
					</section>

					<section className="ed-notebook-cell ed-notebook-cell--explanation">
						<header>
							<span>05</span>
							<p className="ed-kicker">Explanation</p>
						</header>
						<h2>从代码回到统计含义</h2>
						<p>{config.explanation}</p>
					</section>

					<section className="ed-check-cell" data-passed={hasRun || undefined}>
						<div>
							<CheckIcon aria-hidden="true" />
							<span>
								<strong>{hasRun ? "自动检查通过" : "等待检查"}</strong>
								<small>
									{hasRun
										? "对象与结果均符合本课目标。"
										: "运行代码后检查对象与结果。"}
								</small>
							</span>
						</div>
						<Button variant="outline" disabled>
							{hasRun ? "本课演示已完成" : "进入下一课"}
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</section>
				</section>

				<aside className="ed-tutor-rail">
					<div className="ed-tutor-rail__intro">
						<span>AI</span>
						<div>
							<p className="ed-kicker">Learning Assistant</p>
							<h2>统计助教</h2>
						</div>
					</div>
					<p className="ed-tutor-rail__prompt">
						先说出你预计会得到什么，再运行代码。预测是把操作变成学习证据的第一步。
					</p>
					<Tabs defaultValue="tutor">
						<TabsList variant="line" aria-label="学习工具">
							<TabsTrigger value="tutor">助教</TabsTrigger>
							<TabsTrigger value="console">Console</TabsTrigger>
							<TabsTrigger value="variables">变量</TabsTrigger>
						</TabsList>
						<TabsContent value="tutor">
							<div className="ed-tutor-note">
								<span>Hint 01</span>
								<strong>先找到“输入 → 方法 → 输出”</strong>
								<p>{config.task}</p>
							</div>
						</TabsContent>
						<TabsContent value="console">
							<pre className="ed-console">
								{hasRun
									? `> ${config.kind === "r" ? "source('lesson-01.R')" : "run lesson-06.py"}\n${config.output}`
									: "> waiting for a cell to run"}
							</pre>
						</TabsContent>
						<TabsContent value="variables">
							<dl className="ed-variable-list">
								{config.variables.map((variable) => (
									<div key={variable}>
										<dt>{variable.split(" · ")[0]}</dt>
										<dd>{hasRun ? variable.split(" · ")[1] : "not created"}</dd>
									</div>
								))}
							</dl>
						</TabsContent>
					</Tabs>
					<Separator />
					<section className="ed-review-note">
						<p className="ed-kicker">Review</p>
						<h3>哪个对象保存了最终结果？</h3>
						<label>
							<span>你的回答</span>
							<input
								placeholder={config.kind === "r" ? "average_score" : "summary"}
							/>
						</label>
					</section>
					<Button
						render={
							// biome-ignore lint/a11y/useAnchorContent: Base UI injects the Button children into this anchor.
							<a
								href={config.realHref}
								aria-label={`打开真实${config.title}`}
							/>
						}
						nativeButton={false}
						variant="outline"
					>
						打开真实学习环境
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
				</aside>
			</main>
		</EditorialDemoShell>
	);
}

export function EditorialRPage() {
	return <EditorialLearningIdePage config={rIdeConfig} />;
}

export function EditorialPythonPage() {
	return <EditorialLearningIdePage config={pythonIdeConfig} />;
}
