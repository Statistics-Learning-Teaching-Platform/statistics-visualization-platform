import { readFileSync } from "node:fs";
import { syntaxTree } from "@codemirror/language";
import { EditorView, keymap } from "@codemirror/view";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeMirrorEditor } from "../src/code-learning/CodeMirrorEditor";

type LanguageCase = {
  language: "r" | "python";
  label: string;
  source: string;
  expectedTree: RegExp;
  highlightedToken: string;
};

const languages: LanguageCase[] = [
  {
    language: "python",
    label: "Python test editor",
    source: "def greet(name):\n    return True",
    expectedTree: /FunctionDefinition\(def,.+ReturnStatement\(return,Boolean\)/,
    highlightedToken: "def",
  },
  {
    language: "r",
    label: "R test editor",
    source: "greet <- function(name) {\n  return(TRUE)\n}",
    expectedTree: /VariableAssignment\(.+FunctionDeclaration\(function,.+True\(TRUE\)/,
    highlightedToken: "function",
  },
];

function findView(label: string) {
  const content = screen.getByRole("textbox", { name: label });
  const view = EditorView.findFromDOM(content);
  expect(view).not.toBeNull();
  return view as EditorView;
}

describe("CodeMirrorEditor", () => {
  it.each(languages)(
    "mounts the $language parser and syntax highlighting",
    ({ language, label, source, expectedTree, highlightedToken }) => {
      const view = render(
        <CodeMirrorEditor
          id={`${language}-editor`}
          language={language}
          label={label}
          minHeight={280}
          value={source}
          onChange={vi.fn()}
          onRun={vi.fn()}
        />,
      );

      const editor = findView(label);
      expect(syntaxTree(editor.state).toString()).toMatch(expectedTree);
      expect(
        Array.from(view.container.querySelectorAll(".cm-content span")).some(
          (token) => token.textContent === highlightedToken,
        ),
      ).toBe(true);
      expect(view.container.querySelector(".ed-code-editor")).toHaveAttribute(
        "data-language",
        language,
      );
      expect(view.container.querySelector(".cm-gutters")).toBeInTheDocument();
    },
  );

  it("keeps external values controlled without echoing them through onChange", () => {
    const onChange = vi.fn();
    const commonProps = {
      id: "controlled-python-editor",
      language: "python" as const,
      label: "Controlled Python editor",
      minHeight: 280,
      onChange,
      onRun: vi.fn(),
    };
    const { rerender } = render(<CodeMirrorEditor {...commonProps} value="answer = 1" />);
    const editor = findView(commonProps.label);

    act(() => {
      editor.dispatch({
        changes: { from: editor.state.doc.length, insert: "\nprint(answer)" },
      });
    });
    expect(onChange).toHaveBeenLastCalledWith("answer = 1\nprint(answer)");

    onChange.mockClear();
    rerender(<CodeMirrorEditor {...commonProps} value="answer = 42" />);
    expect(editor.state.doc.toString()).toBe("answer = 42");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reconfigures localized attributes without losing the view, selection, or undo history", () => {
    const source = "answer = 1";
    const editedSource = `${source}\nprint(answer)`;
    const commonProps = {
      language: "python" as const,
      minHeight: 280,
      onChange: vi.fn(),
      onRun: vi.fn(),
    };
    const { rerender } = render(
      <CodeMirrorEditor
        {...commonProps}
        id="localized-editor"
        label="Python editor"
        value={source}
      />,
    );
    const editor = findView("Python editor");

    act(() => {
      editor.dispatch({
        changes: { from: source.length, insert: "\nprint(answer)" },
        selection: { anchor: 0, head: 6 },
      });
    });

    rerender(
      <CodeMirrorEditor
        {...commonProps}
        id="localized-editor-zh"
        label="Python 代码编辑器"
        value={editedSource}
      />,
    );

    const localizedContent = screen.getByRole("textbox", { name: "Python 代码编辑器" });
    expect(EditorView.findFromDOM(localizedContent)).toBe(editor);
    expect(localizedContent).toHaveAttribute("id", "localized-editor-zh");
    expect(editor.state.selection.main).toMatchObject({ anchor: 0, head: 6 });

    fireEvent.keyDown(localizedContent, {
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
    });
    expect(editor.state.doc.toString()).toBe(source);
  });

  it("runs on Mod-Enter at higher precedence without inserting a blank line", () => {
    const onRun = vi.fn();
    render(
      <CodeMirrorEditor
        id="shortcut-r-editor"
        language="r"
        label="Shortcut R editor"
        minHeight={280}
        value="answer <- 42"
        onChange={vi.fn()}
        onRun={onRun}
      />,
    );
    const editor = findView("Shortcut R editor");
    const before = editor.state.doc.toString();
    const modEnterBindings = editor.state
      .facet(keymap)
      .flatMap((bindings) => bindings)
      .filter((binding) => binding.key === "Mod-Enter");

    // Our handler must be ordered before basicSetup's insertBlankLine binding.
    expect(modEnterBindings).toHaveLength(2);
    expect(modEnterBindings[0]).toMatchObject({ preventDefault: true });

    fireEvent.keyDown(editor.contentDOM, {
      key: "Enter",
      code: "Enter",
      ctrlKey: true,
    });

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(editor.state.doc.toString()).toBe(before);
  });

  it("declares and applies the JetBrains Mono editor font", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
    };
    const globalStyles = readFileSync("src/visual-demo/editorial-tailwind.css", "utf8");
    const editorStyles = readFileSync("src/code-learning/code-mirror-editor.css", "utf8");

    expect(packageJson.dependencies?.["@fontsource-variable/jetbrains-mono"]).toBeTruthy();
    expect(globalStyles).toContain('@import "@fontsource-variable/jetbrains-mono";');
    expect(editorStyles).toMatch(
      /\.ed-code-editor \.cm-editor[\s\S]*font-family:\s*"JetBrains Mono Variable"/,
    );
  });

  it("can be named by and focused from the visible editor label", () => {
    render(
      <>
        <label
          id="visible-editor-label"
          onClick={() => document.getElementById("labelled-editor")?.focus()}
        >
          Labelled code editor
        </label>
        <CodeMirrorEditor
          id="labelled-editor"
          labelId="visible-editor-label"
          language="python"
          label="Fallback editor name"
          minHeight={280}
          value="answer = 42"
          onChange={vi.fn()}
          onRun={vi.fn()}
        />
      </>,
    );

    const editor = screen.getByRole("textbox", { name: "Labelled code editor" });
    fireEvent.click(screen.getByText("Labelled code editor"));
    expect(editor).toHaveFocus();
  });
});
