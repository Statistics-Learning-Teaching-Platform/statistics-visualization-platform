import { LanguageProvider } from "@stats-viz/shared/i18n";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PythonLearningWorkspace } from "../src/python-learning/PythonLearningWorkspace";
import { RLearningWorkspace } from "../src/r-learning/RLearningWorkspace";
import { AppShell } from "../src/shell/AppShell";

function renderWithLanguage(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

// The production workspace follows the approved editorial notebook grammar:
// a course folio rail plus a notebook column; the AI tutor lives behind a
// floating launcher (on-demand drawer) instead of a third persistent rail.
function expectDemoNotebookStructure(container: HTMLElement) {
  const page = container.querySelector(".ed-live-ide-page");
  expect(page).not.toBeNull();
  expect(page?.children).toHaveLength(2);
  expect(page?.children[0]).toHaveClass("ed-course-folio");
  expect(page?.children[1]).toHaveClass("ed-notebook");

  const notebook = page?.children[1] as HTMLElement;
  expect(
    Array.from(notebook.children).map((element) =>
      Array.from(element.classList).find((name) =>
        [
          "ed-notebook__header",
          "ed-code-cell",
          "ed-notebook-output",
          "ed-help-disclosure",
        ].includes(name),
      ),
    ),
  ).toEqual(["ed-notebook__header", "ed-code-cell", "ed-notebook-output", "ed-help-disclosure"]);

  expect(container.querySelector(".ed-ai-launcher")).not.toBeNull();
}

describe("production pages keep the approved editorial demo format", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("uses the exact notebook grammar for the real R workspace", () => {
    window.history.replaceState(null, "", "/r-learning");
    const view = renderWithLanguage(<RLearningWorkspace />);

    expectDemoNotebookStructure(view.container);
    expect(screen.getByText("R 练习")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI R 助教/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "R 代码编辑器" })).toBeInTheDocument();
  });

  it("uses the same notebook grammar for the real Python workspace", () => {
    window.history.replaceState(null, "", "/python-learning");
    const view = renderWithLanguage(<PythonLearningWorkspace />);

    expectDemoNotebookStructure(view.container);
    expect(screen.getByText("Python 练习")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI Python 助教/ })).toBeInTheDocument();
  });

  it("wraps the live visualizer in the demo laboratory sidebar-stage-parameter format", async () => {
    window.history.replaceState(null, "", "/teaching-platform#confidence-interval");
    const view = renderWithLanguage(<AppShell />);

    expect(
      await screen.findByRole("heading", { name: "置信区间", level: 1 }, { timeout: 8_000 }),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(".editorial-demo[data-site-mode='product']"),
    ).toBeInTheDocument();
    expect(view.container.querySelector(".ed-live-lab-shell")).toBeInTheDocument();
    expect(view.container.querySelector(".platform-sidebar.ed-lab-sidebar")).toBeInTheDocument();
    expect(view.container.querySelector(".experiment-board.ed-lab-stage")).toBeInTheDocument();
    expect(view.container.querySelector(".teaching-area.ed-parameter-rail")).toBeInTheDocument();
  });
});
