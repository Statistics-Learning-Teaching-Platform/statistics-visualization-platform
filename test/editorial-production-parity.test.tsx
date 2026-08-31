import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { beforeEach, describe, expect, it } from "vitest";
import { PythonLearningWorkspace } from "../src/python-learning/PythonLearningWorkspace";
import { RLearningWorkspace } from "../src/r-learning/RLearningWorkspace";
import { AppShell } from "../src/shell/AppShell";

function renderWithLanguage(ui: React.ReactElement) {
	return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function expectDemoNotebookStructure(container: HTMLElement) {
	const page = container.querySelector(".ed-live-ide-page");
	expect(page).not.toBeNull();
	expect(page?.children).toHaveLength(3);
	expect(page?.children[0]).toHaveClass("ed-course-folio");
	expect(page?.children[1]).toHaveClass("ed-notebook");
	expect(page?.children[2]).toHaveClass("ed-tutor-rail");

	const notebook = page?.children[1] as HTMLElement;
	expect(
		Array.from(notebook.children).map((element) =>
			Array.from(element.classList).find((name) =>
				[
					"ed-notebook__header",
					"ed-lesson-brief",
					"ed-example-disclosure",
					"ed-code-cell",
					"ed-notebook-output",
					"ed-notebook-cell--explanation",
					"ed-check-cell",
				].includes(name),
			),
		),
	).toEqual([
		"ed-notebook__header",
		"ed-lesson-brief",
		"ed-example-disclosure",
		"ed-code-cell",
		"ed-notebook-output",
		"ed-notebook-cell--explanation",
		"ed-check-cell",
	]);
}

describe("production pages keep the approved editorial demo format", () => {
	beforeEach(() => {
		localStorage.clear();
		window.history.replaceState(null, "", "/");
	});

	it("uses the exact three-column notebook grammar for the real R workspace", () => {
		window.history.replaceState(null, "", "/r-learning");
		const view = renderWithLanguage(<RLearningWorkspace />);

		expectDemoNotebookStructure(view.container);
		expect(screen.getByText("R 语言编程工作室")).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "助教" })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "Console" })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "变量" })).toBeInTheDocument();
	});

	it("uses the same notebook grammar for the real Python workspace", () => {
		window.history.replaceState(null, "", "/python-learning");
		const view = renderWithLanguage(<PythonLearningWorkspace />);

		expectDemoNotebookStructure(view.container);
		expect(screen.getByText("Python 语言编程工作室")).toBeInTheDocument();
	});

	it("wraps the live visualizer in the demo laboratory sidebar-stage-parameter format", async () => {
		window.history.replaceState(
			null,
			"",
			"/teaching-platform#confidence-interval",
		);
		const view = renderWithLanguage(<AppShell />);

		expect(
			await screen.findByRole("heading", { name: "置信区间", level: 1 }),
		).toBeInTheDocument();
		expect(
			view.container.querySelector(".editorial-demo[data-site-mode='product']"),
		).toBeInTheDocument();
		expect(
			view.container.querySelector(".ed-live-lab-shell"),
		).toBeInTheDocument();
		expect(
			view.container.querySelector(".platform-sidebar.ed-lab-sidebar"),
		).toBeInTheDocument();
		expect(
			view.container.querySelector(".experiment-board.ed-lab-stage"),
		).toBeInTheDocument();
		expect(
			view.container.querySelector(".teaching-area.ed-parameter-rail"),
		).toBeInTheDocument();
	});
});
