import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { EditorialExperimentPage } from "../src/visual-demo/editorial/EditorialExperimentPage";
import { EditorialHomePage } from "../src/visual-demo/editorial/EditorialHomePage";
import {
	EditorialPythonPage,
	EditorialRPage,
} from "../src/visual-demo/editorial/EditorialLearningIdePage";
import { EditorialPaperPage } from "../src/visual-demo/editorial/EditorialPaperPage";
import { EditorialTextbookPage } from "../src/visual-demo/editorial/EditorialTextbookPage";

describe("warm editorial StatMind demo", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "/");
	});

	it("keeps all four product workspaces in the 2 by 2 editorial index", () => {
		render(<EditorialHomePage />);

		const index = screen.getByLabelText("四个核心产品入口");
		for (const title of [
			"统计教学平台",
			"统计学组卷系统",
			"R 语言知识库",
			"Python 语言知识库",
		]) {
			expect(
				within(index).getByRole("heading", { name: title }),
			).toBeInTheDocument();
		}
	});

	it("uses one unambiguous hero action for entering the textbook", () => {
		render(<EditorialHomePage siteMode="product" />);

		expect(screen.getByRole("link", { name: "开始学习" })).toHaveAttribute(
			"href",
			"/catalog",
		);
		expect(screen.queryByRole("link", { name: "浏览教材" })).not.toBeInTheDocument();
	});

	it("uses named sections instead of decorative homepage numbering", () => {
		render(<EditorialHomePage />);

		expect(screen.getByText("数字教材")).toBeInTheDocument();
		expect(screen.getByText("完整课程")).toBeInTheDocument();
		expect(screen.queryAllByText(/^(?:I|II|0[1-4]|12)$/)).toHaveLength(0);
	});

	it("switches the readable textbook chapter without leaving the page", async () => {
		const user = userEvent.setup();
		render(<EditorialTextbookPage />);

		expect(
			screen.getByRole("heading", { name: "样本的统计推断" }),
		).toBeInTheDocument();
		await user.click(
			within(screen.getByLabelText("可预览章节")).getByRole("button", {
				name: /总体均值的比较/,
			}),
		);
		expect(
			screen.getByRole("heading", { name: "总体均值的比较" }),
		).toBeInTheDocument();
	});

	it("keeps the three-column textbook tools around a rich reading chapter", async () => {
		const user = userEvent.setup();
		render(<EditorialTextbookPage />);

		const textbookLayout = document.getElementById("main-content");
		expect(textbookLayout?.children).toHaveLength(3);
		expect(screen.getByLabelText("教材章节目录")).toBeInTheDocument();
		expect(screen.getByLabelText("本章学习工具")).toBeInTheDocument();
		expect(
			within(screen.getByRole("navigation", { name: "本章内容导航" })).getAllByRole(
				"link",
			),
		).toHaveLength(7);
		expect(screen.queryByText("学习路线")).not.toBeInTheDocument();
		expect(screen.getByLabelText("样本均值标准误公式")).toHaveTextContent(
			"SE( x̄ )",
		);

		const labHeading = screen.getByRole("heading", {
			name: "改变样本量，观察区间如何收窄",
		});
		const lab = labHeading.closest(".ed-inline-evidence-lab");
		expect(lab).not.toBeNull();
		await user.click(
			within(lab as HTMLElement).getByRole("button", { name: "n = 100" }),
		);
		expect(within(lab as HTMLElement).getByText("0.20")).toBeInTheDocument();

		const exerciseSummary = screen
			.getByText("样本量从 25 增加到 100，标准误大约变为原来的多少？")
			.closest("summary");
		expect(exerciseSummary).not.toBeNull();
		expect(exerciseSummary?.parentElement).not.toHaveAttribute("open");
		await user.click(exerciseSummary as HTMLElement);
		expect(exerciseSummary?.parentElement).toHaveAttribute("open");
	});

	it("opens a complete chapter from its query parameter", () => {
		window.history.replaceState(null, "", "/visual-demo/catalog?chapter=07");
		render(<EditorialTextbookPage />);

		expect(
			screen.getByRole("heading", { name: "总体均值的比较" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", {
				name: "看见差异，不等于证明总体不同",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("独立样本均值差标准误公式"),
		).toBeInTheDocument();
	});

	it("shows a meaningful empty laboratory state after reset", async () => {
		const user = userEvent.setup();
		render(<EditorialExperimentPage />);

		expect(screen.getByText(/当前 8 个 95% 区间中/)).toBeInTheDocument();
		await user.selectOptions(screen.getByLabelText("置信水平"), "99");
		expect(screen.getByText(/当前 8 个 99% 区间中/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "重置实验" }));
		expect(screen.getByText("尚未生成样本。")).toBeInTheDocument();
		expect(
			screen.getByText(/生成第一个样本后，区间会沿这条总体参照线出现/),
		).toBeInTheDocument();
	});

	it("filters and composes the current examination manuscript", async () => {
		const user = userEvent.setup();
		render(<EditorialPaperPage />);

		const questionList = screen.getByRole("heading", { name: "已审核题目" })
			.parentElement?.parentElement;
		expect(questionList).not.toBeNull();
		await user.type(
			screen.getByRole("textbox", { name: "检索题目" }),
			"置信区间",
		);
		expect(screen.getByText(/当前显示 1 道样例/)).toBeInTheDocument();
		await user.clear(screen.getByRole("textbox", { name: "检索题目" }));
		await user.click(screen.getByRole("checkbox", { name: /07 总体均值/ }));
		expect(screen.getByText(/当前显示 2 道样例/)).toBeInTheDocument();
		await user.click(screen.getByRole("checkbox", { name: /07 总体均值/ }));
		await user.click(screen.getAllByRole("button", { name: "加入试卷" })[0]);
		expect(
			screen.getByText("3", { selector: ".ed-paper-folio__summary strong" }),
		).toBeInTheDocument();
	});

	it.each([
		["R", EditorialRPage, "[1] 80.8"],
		["Python", EditorialPythonPage, /A\s+82\.4/],
	])(
		"runs the %s notebook lesson and reveals its explanation",
		async (_, Page, output) => {
			const user = userEvent.setup();
			render(<Page />);

			await user.click(screen.getByRole("button", { name: "运行示例" }));
			expect(screen.getByText("运行成功")).toBeInTheDocument();
			expect(screen.getAllByText(output).length).toBeGreaterThan(0);
			expect(screen.getByText("自动检查通过")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /本课演示已完成/ }),
			).toBeDisabled();
		},
	);
});
