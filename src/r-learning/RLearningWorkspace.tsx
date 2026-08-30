import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@stats-viz/shared/i18n";
import { rLessons } from "./lessons";
import { checkRCode, resetRSession, runRCode } from "./webrRuntime";
import {
	createMessageId,
	resolveCodeLearningContext,
} from "../code-learning/context";
import {
	loadLearningProgress,
	saveCodeLessonProgress,
} from "../course/progressStore";
import { EditorialLearningWorkspace } from "../code-learning/EditorialLearningWorkspace";

type EngineStatus = "idle" | "loading" | "ready" | "running" | "error";
type ReviewState = { kind: "idle" | "success" | "failure"; message: string };
type TutorMessage = { id: string; role: "user" | "assistant"; content: string };
type TutorStatus = "idle" | "asking" | "error";

const uiCopy = {
	zh: {
		brand: "R 语言编程工作室",
		subtitle: "在浏览器中真实编写、运行与理解 R",
		back: "返回主界面",
		progress: "学习进度",
		lessons: "课程",
		objective: "学习目标",
		task: "你的任务",
		editor: "R 代码编辑器",
		run: "运行代码",
		check: "检查答案",
		reset: "重置代码",
		session: "清空 R 会话",
		hint: "提示",
		solution: "参考解法",
		hide: "收起",
		console: "控制台",
		plot: "图形",
		environment: "环境",
		review: "检查结果",
		noOutput: "运行代码后，输出会显示在这里。",
		noPlot: "当前代码还没有生成图形。",
		noObjects: "运行代码后，这里会列出当前 R 对象。",
		notChecked: "点击“检查答案”，系统会运行代码并验证创建的对象和计算结果。",
		loading: "正在加载浏览器 R 环境，第一次需要一点时间…",
		ready: "R 环境已就绪",
		running: "正在运行…",
		idle: "点击运行时加载 R",
		failed: "代码已运行，但还没有满足本课全部要求。可以查看提示后再试一次。",
		runtimeError: "R 运行失败。请根据控制台中的错误信息修改代码。",
		cleared: "R 会话已清空。",
		next: "下一课",
		complete: "已完成",
		lines: "行",
		tutor: "AI R 助教",
		tutorIntro: "我会结合当前题目、你的代码和最近一次运行结果回答。",
		tutorPlaceholder: "问报错原因、语法用法或下一步怎么改…",
		tutorSend: "发送",
		tutorThinking: "正在分析当前代码…",
		tutorError: "AI 助教暂时无法连接，请稍后再试。",
		contextAttached: "已附带：题目 · 当前代码 · 运行结果",
		explainError: "解释这个报错",
		nextStep: "给我下一步提示",
		explainConcept: "讲清本课概念",
		runtime: "运行结果",
	},
	en: {
		brand: "R Coding Studio",
		subtitle: "Write, run, and understand real R in your browser",
		back: "Back to home",
		progress: "Learning progress",
		lessons: "Lessons",
		objective: "Learning objective",
		task: "Your task",
		editor: "R code editor",
		run: "Run code",
		check: "Check answer",
		reset: "Reset code",
		session: "Clear R session",
		hint: "Hint",
		solution: "Reference solution",
		hide: "Hide",
		console: "Console",
		plot: "Plot",
		environment: "Environment",
		review: "Check result",
		noOutput: "Run your code and its output will appear here.",
		noPlot: "The current code has not produced a plot yet.",
		noObjects: "Run code to see the objects in the current R environment.",
		notChecked:
			"Select Check answer to run the code and verify its objects and results.",
		loading: "Loading R in your browser. The first run takes a moment…",
		ready: "R is ready",
		running: "Running…",
		idle: "R loads on first run",
		failed:
			"The code ran, but it does not meet every requirement yet. Open the hint and try again.",
		runtimeError:
			"R could not run the code. Use the Console message to correct it.",
		cleared: "The R session has been cleared.",
		next: "Next lesson",
		complete: "Complete",
		lines: "lines",
		tutor: "AI R Tutor",
		tutorIntro:
			"I answer with the current task, your code, and the latest run attached.",
		tutorPlaceholder: "Ask about an error, syntax, or your next step…",
		tutorSend: "Send",
		tutorThinking: "Analyzing your current code…",
		tutorError: "The AI tutor is temporarily unavailable. Please try again.",
		contextAttached: "Attached: task · current code · run result",
		explainError: "Explain this error",
		nextStep: "Give me the next hint",
		explainConcept: "Explain this concept",
		runtime: "Run output",
	},
} as const;

function CanvasPlot({ image }: { image: ImageBitmap | null }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !image) return;
		canvas.width = image.width;
		canvas.height = image.height;
		canvas.getContext("2d")?.drawImage(image, 0, 0);
	}, [image]);

	if (!image) return null;
	return (
		<canvas
			ref={canvasRef}
			className="r-output-plot"
			aria-label="R plot output"
		/>
	);
}

export function RLearningWorkspace() {
	const language = useLanguage();
	const t = uiCopy[language];
	const [learningContext] = useState(() =>
		resolveCodeLearningContext(window.location.search, rLessons),
	);
	const [activeId, setActiveId] = useState(learningContext.lessonId);
	const [codes, setCodes] = useState<Record<string, string>>(() =>
		Object.fromEntries(
			rLessons.map((lesson) => [lesson.id, lesson.starterCode]),
		),
	);
	const [completed, setCompleted] = useState<string[]>(() => {
		const validIds = new Set(rLessons.map(({ id }) => id));
		return loadLearningProgress().completedRLessons.filter((id) =>
			validIds.has(id),
		);
	});
	const [engineStatus, setEngineStatus] = useState<EngineStatus>("idle");
	const [consoleLines, setConsoleLines] = useState<string[]>([]);
	const [plot, setPlot] = useState<ImageBitmap | null>(null);
	const [environment, setEnvironment] = useState<string[]>([]);
	const [review, setReview] = useState<ReviewState>({
		kind: "idle",
		message: "",
	});
	const [showHint, setShowHint] = useState(false);
	const [showSolution, setShowSolution] = useState(false);
	const [tutorPrompt, setTutorPrompt] = useState("");
	const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
	const [tutorStatus, setTutorStatus] = useState<TutorStatus>("idle");
	const tutorMessagesRef = useRef<HTMLDivElement>(null);

	const activeLesson = useMemo(
		() => rLessons.find((lesson) => lesson.id === activeId) ?? rLessons[0],
		[activeId],
	);
	const code = codes[activeLesson.id] ?? activeLesson.starterCode;
	const isBusy = engineStatus === "loading" || engineStatus === "running";
	const progress = Math.round((completed.length / rLessons.length) * 100);

	useEffect(() => {
		saveCodeLessonProgress(
			"r",
			completed,
			completed.includes(activeLesson.id) ? activeLesson.topicId : undefined,
			window.location.pathname + window.location.search,
		);
	}, [activeLesson.topicId, completed]);

	useEffect(() => {
		const messages = tutorMessagesRef.current;
		if (messages) messages.scrollTop = messages.scrollHeight;
	}, [tutorMessages, tutorStatus]);

	function selectLesson(id: string) {
		setActiveId(id);
		setShowHint(false);
		setShowSolution(false);
		setReview({ kind: "idle", message: "" });
		setConsoleLines([]);
		setPlot(null);
		setEnvironment([]);
		setTutorPrompt("");
		setTutorMessages([]);
		setTutorStatus("idle");
	}

	async function execute(shouldCheck: boolean) {
		setEngineStatus(engineStatus === "idle" ? "loading" : "running");
		setReview({ kind: "idle", message: "" });
		setConsoleLines([]);

		try {
			const result = await runRCode(code);
			setEngineStatus("ready");
			setConsoleLines(
				result.console.length
					? result.console
					: ["Code completed without printed output."],
			);
			setPlot(result.image);
			setEnvironment(result.environment);

			if (shouldCheck) {
				const passed = await checkRCode(activeLesson.checkCode);
				if (passed) {
					setCompleted((current) =>
						current.includes(activeLesson.id)
							? current
							: [...current, activeLesson.id],
					);
					setReview({
						kind: "success",
						message: activeLesson.success[language],
					});
				} else {
					setReview({ kind: "failure", message: t.failed });
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			setEngineStatus("error");
			setConsoleLines([message]);
			setReview({ kind: "failure", message: t.runtimeError });
		}
	}

	async function clearSession() {
		setEngineStatus(engineStatus === "idle" ? "loading" : "running");
		try {
			await resetRSession();
			setEngineStatus("ready");
			setConsoleLines([t.cleared]);
			setPlot(null);
			setEnvironment([]);
			setReview({ kind: "idle", message: "" });
		} catch (error) {
			setEngineStatus("error");
			setConsoleLines([error instanceof Error ? error.message : String(error)]);
		}
	}

	async function askTutor(suggestedQuestion?: string) {
		const question = (suggestedQuestion ?? tutorPrompt).trim();
		if (!question || tutorStatus === "asking") return;

		const userMessage: TutorMessage = {
			id: createMessageId(),
			role: "user",
			content: question,
		};
		const history = tutorMessages.map(({ role, content }) => ({
			role,
			content,
		}));
		setTutorMessages((current) => [...current, userMessage]);
		setTutorPrompt("");
		setTutorStatus("asking");

		try {
			const response = await fetch("/st-qselector/api/ai/r-tutor", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					topicId: activeLesson.topicId,
					lessonId: activeLesson.id,
					learningObjective: activeLesson.objective[language],
					currentParameters: learningContext.currentParameters,
					currentCode: code,
					consoleOutput: consoleLines,
					chartSummary: plot
						? "The latest run produced an R plot."
						: "No plot has been produced.",
					language,
					question,
					lesson: {
						title: activeLesson.title[language],
						objective: activeLesson.objective[language],
						task: activeLesson.task[language],
						concepts: activeLesson.concepts,
					},
					code,
					console: consoleLines,
					review: review.message,
					history,
				}),
			});
			const payload = (await response.json()) as {
				answer?: string;
				error?: string;
			};
			if (!response.ok || !payload.answer)
				throw new Error(payload.error || "AI request failed");
			setTutorMessages((current) => [
				...current,
				{
					id: createMessageId(),
					role: "assistant",
					content: payload.answer as string,
				},
			]);
			setTutorStatus("idle");
		} catch {
			setTutorMessages((current) => [
				...current,
				{ id: createMessageId(), role: "assistant", content: t.tutorError },
			]);
			setTutorStatus("error");
		}
	}

	const engineLabel =
		engineStatus === "loading"
			? t.loading
			: engineStatus === "running"
				? t.running
				: engineStatus === "ready"
					? t.ready
					: engineStatus === "error"
						? t.runtimeError
						: t.idle;

	return (
		<EditorialLearningWorkspace
			kind="r"
			language={language}
			copy={t}
			lessons={rLessons}
			activeLesson={activeLesson}
			completedLessonIds={completed}
			progress={progress}
			runtimeName="WebR · local"
			returnTo={learningContext.returnTo}
			code={code}
			engineStatus={engineStatus}
			engineLabel={engineLabel}
			isBusy={isBusy}
			consoleLines={consoleLines}
			plotNode={plot ? <CanvasPlot image={plot} /> : null}
			environmentItems={environment.map((name) => ({ name }))}
			review={review}
			showHint={showHint}
			showSolution={showSolution}
			tutorPrompt={tutorPrompt}
			tutorMessages={tutorMessages}
			tutorStatus={tutorStatus}
			tutorMessagesRef={tutorMessagesRef}
			onSelectLesson={selectLesson}
			onCodeChange={(nextCode) =>
				setCodes((current) => ({ ...current, [activeLesson.id]: nextCode }))
			}
			onRun={() => void execute(false)}
			onCheck={() => void execute(true)}
			onResetCode={() =>
				setCodes((current) => ({
					...current,
					[activeLesson.id]: activeLesson.starterCode,
				}))
			}
			onClearSession={() => void clearSession()}
			onToggleHint={() => setShowHint((value) => !value)}
			onToggleSolution={() => setShowSolution((value) => !value)}
			onTutorPromptChange={setTutorPrompt}
			onAskTutor={(question) => void askTutor(question)}
		/>
	);
}

export default RLearningWorkspace;
