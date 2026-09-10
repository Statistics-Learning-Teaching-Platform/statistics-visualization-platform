import { LanguageProvider } from "@stats-viz/shared/i18n";
import { WalsApp } from "@stats-viz/shared/wals/WalsApp";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { moduleConfig } from "../apps/mes-anova/src/module-config";

describe("ANOVA result layout", () => {
	it("places both result tables below the parameter panel in the right rail", () => {
		localStorage.removeItem("statmind-anova-sidebar-width");
		render(
			<LanguageProvider>
				<WalsApp moduleConfig={moduleConfig} />
			</LanguageProvider>,
		);

		const rail = document.querySelector("#lab-parameter-rail") as HTMLElement;
		const parameterPanel = rail.querySelector("[data-parameter-panel='true']") as HTMLElement;
		const results = rail.querySelector(".anova-sidebar-results") as HTMLElement;
		expect(parameterPanel).toBeInTheDocument();
		expect(results).toBeInTheDocument();
		expect(within(parameterPanel).getByRole("heading", { name: "数据生成设置" })).toBeInTheDocument();
		expect(parameterPanel.querySelectorAll(".anova-group-card")).toHaveLength(3);
		expect(within(parameterPanel).getByRole("heading", { name: "公共参数" })).toBeInTheDocument();
		expect(within(parameterPanel).getByRole("button", { name: "运行模拟" })).toBeInTheDocument();
		expect(within(parameterPanel).getByRole("button", { name: "重置参数" })).toBeInTheDocument();
		expect(parameterPanel.querySelectorAll("input[type='range']")).toHaveLength(7);
		const separator = screen.getByRole("separator", { name: "调整右侧参数面板宽度" });
		expect(separator).toHaveAttribute("aria-valuemin", "340");
		expect(separator).toHaveAttribute("aria-valuemax", "720");
		expect(separator).toHaveAttribute("aria-valuenow", "620");
		fireEvent.keyDown(separator, { key: "ArrowLeft" });
		expect(separator).toHaveAttribute("aria-valuenow", "628");
		expect(document.querySelector("[data-visualization-frame='true']")).toHaveStyle({ "--module-sidebar-width": "628px" });
		expect(
			within(results).getByRole("heading", { name: "描述性统计" }).closest("section"),
		).toHaveClass("anova-table-panel--summary");
		expect(
			within(results).getByRole("heading", { name: "方差分析表" }).closest("section"),
		).toHaveClass("anova-table-panel--test");
		expect(
			parameterPanel.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(screen.getByRole("img")).toBeInTheDocument();
	});
});
