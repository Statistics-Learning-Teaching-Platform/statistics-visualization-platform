import { Button, buttonVariants } from "@/components/ui/button";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CheckIcon,
	LightbulbIcon,
	PanelLeftCloseIcon,
	PanelLeftOpenIcon,
	PlayIcon,
	RotateCcwIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import type { CodeLesson } from "./types";
import { EditorialDemoShell } from "../visual-demo/editorial/EditorialPrimitives";
import "../visual-demo/editorial-tailwind.css";
import "../visual-demo/editorial/editorial-demo.css";
import "./editorial-learning-workspace.css";

type Language = "zh" | "en";
type EngineStatus = "idle" | "loading" | "ready" | "running" | "error";
type TutorStatus = "idle" | "asking" | "error";

export type EditorialTutorMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
};

export type EditorialReviewState = {
	kind: "idle" | "success" | "failure";
	message: string;
};

type LearningCopy = {
	brand: string;
	subtitle: string;
	back: string;
	progress: string;
	lessons: string;
	task: string;
	editor: string;
	run: string;
	check: string;
	reset: string;
	session: string;
	hint: string;
	solution: string;
	complete: string;
	lines: string;
	tutor: string;
	tutorIntro: string;
	tutorPlaceholder: string;
	tutorSend: string;
	tutorThinking: string;
	contextAttached: string;
	explainError: string;
	nextStep: string;
	explainConcept: string;
	runtime: string;
	noOutput: string;
	noObjects: string;
	notChecked: string;
};

export type EditorialEnvironmentItem = {
	name: string;
	detail?: string;
};

type Props<Unit extends string> = {
	kind: "r" | "python";
	language: Language;
	copy: LearningCopy;
	lessons: readonly CodeLesson<Unit>[];
	activeLesson: CodeLesson<Unit>;
	completedLessonIds: readonly string[];
	progress: number;
	runtimeName: string;
	returnTo: string;
	code: string;
	engineStatus: EngineStatus;
	engineLabel: string;
	isBusy: boolean;
	consoleLines: readonly string[];
	plotNode: ReactNode;
	environmentItems: readonly EditorialEnvironmentItem[];
	review: EditorialReviewState;
	showHint: boolean;
	showSolution: boolean;
	tutorPrompt: string;
	tutorMessages: readonly EditorialTutorMessage[];
	tutorStatus: TutorStatus;
	tutorMessagesRef: RefObject<HTMLDivElement | null>;
	/** When provided, the tutor drawer shows this node instead of the composer. */
	tutorGate?: ReactNode;
	onSelectLesson: (lessonId: string) => void;
	onCodeChange: (code: string) => void;
	onRun: () => void;
	onCheck: () => void;
	onResetCode: () => void;
	onClearSession: () => void;
	onToggleHint: () => void;
	onToggleSolution: () => void;
	onTutorPromptChange: (prompt: string) => void;
	onAskTutor: (suggestedQuestion?: string) => void;
};

function TutorAnswer({ content }: { content: string }) {
	const parts = content.split(/```(?:r|python|py)?\s*([\s\S]*?)```/gi);
	return (
		<div className="ed-live-tutor-answer">
			{parts.map((part, index) =>
				index % 2 === 1 ? (
					<pre key={`${index}-${part.slice(0, 12)}`}>
						<code>{part.trim()}</code>
					</pre>
				) : part.trim() ? (
					<p key={`${index}-${part.slice(0, 12)}`}>
						{part.replace(/\*\*/g, "").trim()}
					</p>
				) : null,
			)}
		</div>
	);
}

function compactTask(text: string) {
	return text
		.replace(/，然后运行并检查答案。?$/u, "。")
		.replace(/, then run and check (?:your work|the answer)\.?$/i, ".")
		.replace(/^补全最后一行，把 /u, "把 ")
		.replace(/^Complete the last line so that the mean of `scores` is stored in `average_score`\.$/i, "Store the mean of `scores` in `average_score`.")
		.replace("把 `scores` 的均值保存为 `average_score`。", "把 `scores` 的平均值保存到 `average_score`。");
}

function functionFromHint(lesson: CodeLesson<string>, language: Language) {
	const fromHint = lesson.hint[language].match(/`([^`]+\(\))`/)?.[1];
	return fromHint ?? lesson.concepts.find((concept) => /\(\)$/.test(concept));
}

function derivedEnvironmentDetail(
	item: EditorialEnvironmentItem,
	code: string,
	consoleLines: readonly string[],
	fallback: string,
) {
	if (item.detail) return item.detail;
	if (item.name === "scores") {
		const vectorMatch = code.match(/scores\s*<-\s*c\(([^)]*)\)/);
		const values = vectorMatch?.[1]
			?.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
		if (values?.length) return `numeric[${values.length}]`;
	}
	if (item.name === "average_score") {
		const printed = consoleLines.find((line) => /^\[1\]\s*/.test(line));
		if (printed) return printed.replace(/^\[1\]\s*/, "").trim();
		const vectorMatch = code.match(/scores\s*<-\s*c\(([^)]*)\)/);
		const values = vectorMatch?.[1]
			?.split(",")
			.map((value) => Number(value.trim()))
			.filter((value) => Number.isFinite(value));
		if (values?.length && /average_score\s*<-\s*mean\(scores\)/.test(code)) {
			return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
		}
	}
	return fallback;
}

export function EditorialLearningWorkspace<Unit extends string>({
	kind,
	language,
	copy,
	lessons,
	activeLesson,
	completedLessonIds,
	progress,
	runtimeName,
	returnTo,
	code,
	engineStatus,
	engineLabel,
	isBusy,
	consoleLines,
	plotNode,
	environmentItems,
	review,
	showHint,
	showSolution,
	tutorPrompt,
	tutorMessages,
	tutorStatus,
	tutorMessagesRef,
	tutorGate,
	onSelectLesson,
	onCodeChange,
	onRun,
	onCheck,
	onResetCode,
	onClearSession,
	onToggleHint,
	onToggleSolution,
	onTutorPromptChange,
	onAskTutor,
}: Props<Unit>) {
	const [navCollapsed, setNavCollapsed] = useState(false);
	const [tutorOpen, setTutorOpen] = useState(false);
	const [showVariables, setShowVariables] = useState(false);
	const [hintStage, setHintStage] = useState(0);
	const [reviewChoice, setReviewChoice] = useState<number | null>(null);
	const tutorLauncherRef = useRef<HTMLButtonElement>(null);
	const tutorCloseRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		setHintStage(0);
		setShowVariables(false);
		setReviewChoice(null);
		setTutorOpen(false);
	}, [activeLesson.id]);

	useEffect(() => {
		if (!tutorOpen) return;
		tutorCloseRef.current?.focus();
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setTutorOpen(false);
				requestAnimationFrame(() => tutorLauncherRef.current?.focus());
			}
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [tutorOpen]);

	const lessonIndex = Math.max(
		0,
		lessons.findIndex((lesson) => lesson.id === activeLesson.id),
	);
	const pageId = kind === "r" ? "r" : "python";
	const practiceLabel = kind === "r"
		? language === "zh" ? "R 练习" : "R PRACTICE"
		: language === "zh" ? "Python 练习" : "PYTHON PRACTICE";
	const englishTitle = kind === "r" ? "R Learning Studio" : "Python Learning Studio";
	const aiDrawerId = `${kind}-learning-ai-drawer`;
	const aiTitleId = `${kind}-learning-ai-title`;
	const outputReady = consoleLines.length > 0 || Boolean(plotNode);
	const runState =
		engineStatus === "error"
			? "error"
			: engineStatus === "loading" || engineStatus === "running"
				? "running"
				: outputReady
					? "success"
					: "idle";
	const hintFunction = functionFromHint(activeLesson as CodeLesson<string>, language);
	const nextLesson = lessons[lessonIndex + 1];
	const reviewOptions =
		language === "zh"
			? ["比较对象", "保存右侧结果到左侧对象", "打印对象"]
			: ["Compare objects", "Save the right-hand result to the left object", "Print an object"];
	const editorMinHeight = Math.min(360, Math.max(280, code.split("\n").length * 30 + 80));

	function revealHint() {
		if (hintStage >= 3) return;
		const nextStage = hintStage + 1;
		setHintStage(nextStage);
		if (nextStage === 1 && !showHint) onToggleHint();
		if (nextStage === 3 && !showSolution) onToggleSolution();
	}

	return (
		<EditorialDemoShell current={pageId} mode="workspace" siteMode="product">
			<main
				id="main-content"
				className={`ed-ide-page ed-live-ide-page${navCollapsed ? " is-nav-collapsed" : ""}`}
			>
				<aside className="ed-course-folio" aria-label={practiceLabel}>
					<div className="ed-course-folio__topline">
						<p className="ed-kicker">{practiceLabel}</p>
						<button
							type="button"
							className="ed-nav-collapse"
							aria-label={navCollapsed ? "展开课程导航" : "收起课程导航"}
							aria-expanded={!navCollapsed}
							onClick={() => setNavCollapsed((value) => !value)}
						>
							{navCollapsed ? <PanelLeftOpenIcon aria-hidden="true" /> : <PanelLeftCloseIcon aria-hidden="true" />}
						</button>
					</div>
					<div className="ed-course-progress" aria-label={`${copy.progress}: ${progress}%`}>
						<span>{completedLessonIds.length} / {lessons.length}</span>
						<div aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
					</div>
					<nav className="ed-live-course-nav" aria-label={practiceLabel}>
						{lessons.map((lesson) => {
							const active = lesson.id === activeLesson.id;
							const complete = completedLessonIds.includes(lesson.id);
							return (
								<button
									key={lesson.id}
									type="button"
									data-current={active || undefined}
									data-complete={complete || undefined}
									aria-current={active ? "page" : undefined}
									aria-label={`${String(lesson.order).padStart(2, "0")} ${lesson.title[language]}`}
									onClick={() => onSelectLesson(lesson.id)}
								>
									<span>{String(lesson.order).padStart(2, "0")}</span>
									<div>
										<strong>{lesson.title[language]}</strong>
										{complete ? <CheckIcon aria-label={copy.complete} /> : null}
									</div>
								</button>
							);
						})}
					</nav>
					<div className="ed-course-folio__footer">
						<div className="ed-course-folio__runtime"><span aria-hidden="true" />{runtimeName}</div>
						<button type="button" className="ed-session-link" onClick={onClearSession} disabled={isBusy}>{copy.session}</button>
						<a href={returnTo} data-slot="button" className={buttonVariants({ variant: "outline" })}><ArrowLeftIcon data-icon="inline-start" />{copy.back}</a>
					</div>
				</aside>

				<section className="ed-notebook">
					<header className="ed-notebook__header ed-lesson-hero">
						<div className="ed-lesson-meta"><span>{practiceLabel} {String(activeLesson.order).padStart(2, "0")}</span><span>{language === "zh" ? `第 ${lessonIndex + 1} / ${lessons.length} 题` : `${lessonIndex + 1} / ${lessons.length}`}</span></div>
						<h1 id="lesson-title">{activeLesson.title[language]}</h1>
						<p className="ed-lesson-task"><span className="ed-task-label">{language === "zh" ? "任务" : "Task"}</span><span>{compactTask(activeLesson.task[language])}</span></p>
					</header>

					<section className="ed-code-cell" data-engine-status={engineStatus}>
						<header>
							<div><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /><strong>lesson-{String(activeLesson.order).padStart(2, "0")}.{kind === "r" ? "R" : "py"}</strong></div>
							<small>{code.split("\n").length} {copy.lines} · {engineLabel}</small>
						</header>
						<label htmlFor={`${kind}-editor`}>{copy.editor}</label>
						<textarea
							id={`${kind}-editor`}
							value={code}
							onChange={(event) => onCodeChange(event.target.value)}
							onKeyDown={(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									event.preventDefault();
									onRun();
								}
							}}
							spellCheck={false}
							wrap="soft"
							style={{ minHeight: editorMinHeight }}
							aria-label={copy.editor}
						/>
						<footer>
							<Button disabled={isBusy} onClick={onRun}><PlayIcon data-icon="inline-start" />{copy.run}</Button>
							<Button variant="ghost" disabled={isBusy} onClick={onResetCode}><RotateCcwIcon data-icon="inline-start" />{copy.reset}</Button>
							<span>Ctrl / Cmd + Enter</span>
						</footer>
					</section>

					<section className="ed-notebook-output ed-run-result" aria-live="polite" aria-label={copy.runtime}>
						<header>
							<div><span>02</span><p className="ed-kicker">Run Result</p></div>
							<div className="ed-run-result__actions">
								<strong data-state={runState}>
									{runState === "success" ? "✓ " : ""}{runState === "error" ? (language === "zh" ? "运行失败" : "Run failed") : runState === "running" ? engineLabel : runState === "success" ? (language === "zh" ? "运行成功" : "Run successful") : (language === "zh" ? "尚未运行代码" : "Not run yet")}
								</strong>
								{outputReady && review.kind !== "success" ? <Button variant="outline" disabled={isBusy} onClick={onCheck}>{copy.check}</Button> : null}
							</div>
						</header>
						{runState === "idle" ? <p>{language === "zh" ? "尚未运行代码" : "Run your code to see the result."}</p> : null}
						{runState === "error" ? <pre className="ed-run-result__error">{consoleLines.join("\n")}</pre> : null}
						{runState === "success" ? <div className="ed-live-output-stack">{plotNode}{consoleLines.length ? <pre>{consoleLines.join("\n")}</pre> : null}</div> : null}
						{environmentItems.length ? (
							<div className="ed-variable-disclosure">
								<button type="button" onClick={() => setShowVariables((value) => !value)} aria-expanded={showVariables}><span aria-hidden="true">{showVariables ? "▾" : "▸"}</span>{language === "zh" ? "查看变量" : "View variables"} {environmentItems.length}</button>
								{showVariables ? <dl className="ed-variable-list">{environmentItems.map((item) => <div key={`${item.name}-${item.detail ?? ""}`}><dt>{item.name}</dt><dd>{derivedEnvironmentDetail(item, code, consoleLines, copy.runtime)}</dd></div>)}</dl> : null}
							</div>
						) : null}
						{review.kind === "failure" ? <p className="ed-run-result__message ed-run-result__message--error">{review.message}</p> : null}
					</section>

					<section className="ed-help-disclosure">
						<button type="button" onClick={revealHint} disabled={hintStage >= 3}><LightbulbIcon aria-hidden="true" /><strong>{hintStage === 0 ? (language === "zh" ? "卡住了？给我一个提示" : "Stuck? Give me a hint") : hintStage >= 3 ? (language === "zh" ? "参考写法已显示" : "Reference shown") : (language === "zh" ? "再给我一个提示" : "Give me another hint")}</strong><span>{hintStage}/3</span></button>
						{hintStage === 1 ? <p>{language === "zh" ? "先确认要保存的是一个计算结果：左侧对象名已经给出，想想右侧应该得到什么。" : "First identify the value to save: the object name is already on the left, so focus on the result the right side should produce."}</p> : null}
						{hintStage === 2 ? <p>{language === "zh" ? `可以使用 ${hintFunction ?? "对应的统计函数"}，把它应用到题目中的数据。` : `Try ${hintFunction ?? "the relevant function"} on the data from the task.`}</p> : null}
						{hintStage === 3 ? <pre>{activeLesson.solution}</pre> : null}
					</section>

					{review.kind === "success" ? (
						<section className="ed-quick-review" aria-label={language === "zh" ? "快速检查" : "Quick review"}>
							<header><div><CheckIcon aria-hidden="true" /><span><strong>{language === "zh" ? "完成本题" : "Lesson complete"}</strong><small>Success feedback</small></span></div></header>
							<p className="ed-quick-review__result">{review.message}</p>
							{environmentItems.some((item) => item.name === "average_score") ? <p className="ed-quick-review__value"><code>average_score</code> = {derivedEnvironmentDetail(environmentItems.find((item) => item.name === "average_score") as EditorialEnvironmentItem, code, consoleLines, "—")}</p> : null}
							<div className="ed-quick-review__question">
								<p className="ed-kicker">{language === "zh" ? "快速检查" : "Quick review"}</p>
								<h2>{language === "zh" ? "`<-` 的作用是什么？" : "What does `<-` do?"}</h2>
								<div className="ed-review-options" role="radiogroup" aria-label={language === "zh" ? "选择一个答案" : "Choose an answer"}>{reviewOptions.map((option, index) => <button key={option} type="button" role="radio" data-selected={reviewChoice === index || undefined} aria-checked={reviewChoice === index} onClick={() => setReviewChoice(index)}>{option}</button>)}</div>
								{reviewChoice !== null ? <p className="ed-review-response" aria-live="polite">{reviewChoice === 1 ? (language === "zh" ? "正确。赋值会把右侧结果保存到左侧对象。" : "Correct. Assignment saves the right-hand result in the left object.") : (language === "zh" ? "再想想：`<-` 会把结果保存到一个对象中。" : "Think again: `<-` saves a result in an object.")}</p> : null}
							</div>
							{reviewChoice === 1 && nextLesson ? <Button className="ed-next-lesson" onClick={() => onSelectLesson(nextLesson.id)}>{language === "zh" ? "下一课" : "Next lesson"}<ArrowRightIcon data-icon="inline-end" /></Button> : null}
						</section>
					) : null}
				</section>
			</main>

			<button ref={tutorLauncherRef} type="button" className="ed-ai-launcher" onClick={() => setTutorOpen(true)} aria-expanded={tutorOpen} aria-controls={aiDrawerId}><span aria-hidden="true">AI</span>{copy.tutor}</button>
			{tutorOpen ? <button type="button" tabIndex={-1} className="ed-ai-drawer-backdrop" aria-label={language === "zh" ? "关闭 AI 助教" : "Close AI tutor"} onClick={() => { setTutorOpen(false); requestAnimationFrame(() => tutorLauncherRef.current?.focus()); }} /> : null}
				{tutorOpen ? (
					<aside id={aiDrawerId} className="ed-ai-drawer" role="dialog" aria-modal="false" aria-labelledby={aiTitleId}>
						<header className="ed-ai-drawer__header"><div><span aria-hidden="true">AI</span><div><p className="ed-kicker">{englishTitle}</p><h2 id={aiTitleId}>{copy.tutor}</h2></div></div><button ref={tutorCloseRef} type="button" onClick={() => { setTutorOpen(false); requestAnimationFrame(() => tutorLauncherRef.current?.focus()); }} aria-label={language === "zh" ? "关闭 AI 助教" : "Close AI tutor"}><XIcon aria-hidden="true" /></button></header>
						<p className="ed-ai-drawer__intro">{copy.tutorIntro}</p>
						{tutorGate ? (
							<div className="ed-tutor-note">{tutorGate}</div>
						) : (
							<>
						<div ref={tutorMessagesRef} className="ed-live-ai-messages" aria-live="polite">
						{!tutorMessages.length ? (
							<div className="ed-tutor-note"><strong>{activeLesson.title[language]}</strong><p>{language === "zh" ? "结合当前题目、代码和运行结果提问。" : "Ask about the current task, code, or run result."}</p><div className="ed-live-suggestions"><button type="button" onClick={() => onAskTutor(language === "zh" ? "为什么这里使用 mean()？" : "Why use mean() here?")}>{language === "zh" ? "为什么这里使用 mean()？" : "Why use mean() here?"}</button><button type="button" onClick={() => onAskTutor(language === "zh" ? "<- 是什么意思？" : "What does <- mean?")}>{language === "zh" ? "<- 是什么意思？" : "What does <- mean?"}</button><button type="button" onClick={() => onAskTutor(copy.explainError)}>{copy.explainError}</button></div></div>
						) : tutorMessages.map((message) => <article key={message.id} data-role={message.role}><small>{message.role === "user" ? (language === "zh" ? "你" : "You") : "AI"}</small>{message.role === "assistant" ? <TutorAnswer content={message.content} /> : <p>{message.content}</p>}</article>)}
						{tutorStatus === "asking" ? <p className="ed-live-tutor-thinking">{copy.tutorThinking}</p> : null}
					</div>
						<form className="ed-live-tutor-composer" onSubmit={(event) => { event.preventDefault(); onAskTutor(); }}><textarea value={tutorPrompt} onChange={(event) => onTutorPromptChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onAskTutor(); } }} rows={2} placeholder={copy.tutorPlaceholder} aria-label={copy.tutorPlaceholder} /><button type="submit" disabled={!tutorPrompt.trim() || tutorStatus === "asking"} aria-label={copy.tutorSend}>↑</button></form>
						<p className="ed-ai-drawer__context">{copy.contextAttached}</p>
							</>
						)}
					</aside>
				) : null}
		</EditorialDemoShell>
	);
}
