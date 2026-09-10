import { LanguageProvider, setLanguage } from "@stats-viz/shared/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalHome } from "../src/PortalHome";
import { StatMindHomeDemo } from "../src/visual-demo/StatMindHomeDemo";

describe("portal destination routing", () => {
	it("uses the compact portal home structure with real product routes", () => {
		setLanguage("zh");
		render(
			<LanguageProvider>
				<PortalHome />
			</LanguageProvider>,
		);

		expect(
			screen.getByRole("heading", { name: "在思考中学习统计" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", { name: "统计思维 StatMind 标志" }),
		).toHaveAttribute("src", "/brand/statmind-logo.png");
		expect(screen.queryByText("一条完整的学习证据链")).not.toBeInTheDocument();

		const workspaceIndex = screen.getByLabelText("四个核心产品入口");
		const expectedRoutes = [
			["统计教学平台", "进入教学平台", "/teaching-platform"],
			["统计学组卷系统", "进入组卷系统", "/st-qselector"],
			["R 语言编程工作室", "进入 R 编程工作室", "/r-learning?returnTo=%2F"],
			[
				"Python 语言编程工作室",
				"进入 Python 编程工作室",
				"/python-learning?returnTo=%2F",
			],
		] as const;

		for (const [title, action, href] of expectedRoutes) {
			const card = within(workspaceIndex)
				.getByRole("heading", { name: title })
				.closest("article");
			expect(card).not.toBeNull();
			expect(
				within(card as HTMLElement).getByRole("link", { name: action }),
			).toHaveAttribute("href", href);
		}
	});

	it("keeps all four product workspaces in the visual demo", () => {
		render(<StatMindHomeDemo />);

		expect(
			screen.getByRole("heading", { name: "在思考中 学习统计" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /统计教学平台/ })).toHaveAttribute(
			"href",
			"/teaching-platform",
		);
		expect(
			screen.getByRole("link", { name: /统计学组卷系统/ }),
		).toHaveAttribute("href", "/st-qselector");
		expect(screen.getByRole("link", { name: /R 语言知识库/ })).toHaveAttribute(
			"href",
			"/r-learning?returnTo=%2Fvisual-demo",
		);
		expect(
			screen.getByRole("link", { name: /Python 语言知识库/ }),
		).toHaveAttribute("href", "/python-learning?returnTo=%2Fvisual-demo");
	});
});
