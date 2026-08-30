import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
	CatalogVisualDemo,
	ExperimentVisualDemo,
	PaperVisualDemo,
	PythonVisualDemo,
	RVisualDemo,
} from "../src/visual-demo/WorkspaceDemos";

describe("visual workspace demos", () => {
	it("switches between the two detailed textbook chapters", async () => {
		const user = userEvent.setup();
		render(<CatalogVisualDemo />);

		expect(
			screen.getByRole("heading", { name: "样本的统计推断" }),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /总体均值的比较/ }));
		expect(
			screen.getByRole("heading", { name: "总体均值的比较" }),
		).toBeInTheDocument();
	});

	it("renders the active simulation workbench", () => {
		render(<ExperimentVisualDemo />);

		expect(
			screen.getByRole("heading", {
				name: "每一次抽样，都产生一个不同的区间",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("83.3%")).toBeInTheDocument();
	});

	it("updates the current paper when a question is added", async () => {
		const user = userEvent.setup();
		render(<PaperVisualDemo />);

		expect(screen.getByText("已加入 2 题")).toBeInTheDocument();
		await user.click(screen.getAllByRole("button", { name: "加入试卷" })[0]);
		expect(screen.getByText("已加入 3 题")).toBeInTheDocument();
	});

	it("runs the R lesson example and explains its output", async () => {
		const user = userEvent.setup();
		render(<RVisualDemo />);

		await user.click(screen.getByRole("button", { name: /运行示例/ }));
		expect(screen.getByText("[1] 80.8")).toBeInTheDocument();
		expect(screen.getByText("运行成功")).toBeInTheDocument();
	});

	it("runs the Python lesson example inside the same learning IDE", async () => {
		const user = userEvent.setup();
		render(<PythonVisualDemo />);

		await user.click(screen.getByRole("button", { name: /运行示例/ }));
		expect(screen.getAllByText(/A\s+80\.0/)).toHaveLength(2);
		expect(screen.getByText("运行成功")).toBeInTheDocument();
	});
});
