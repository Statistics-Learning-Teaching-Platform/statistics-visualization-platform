import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  canonicalVisualizationAlt,
  deriveQuestionVisualizations,
  resolveQuestionVisualizations,
  validateMermaidSource,
  validateQuestionVisualizations,
  visualizationsMatchQuestionContent,
} from "../src/lib/question-visualizations.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const xyChart = `xychart-beta
  title "Weekly orders"
  x-axis "Week" ["W1", "W2", "W3"]
  y-axis "Orders" 0 --> 40
  bar [12, 25, 31]`;

const pieChart = `pie showData
  title "Survey response"
  "Yes" : 62
  "No" : 38`;
const normalizedXyChart = xyChart.split("\n").map((line) => line.trim()).join("\n");
const normalizedPieChart = pieChart.split("\n").map((line) => line.trim()).join("\n");

test("the statistical Mermaid subset accepts bounded XY and pie charts", () => {
  assert.deepEqual(validateMermaidSource(xyChart), { kind: "xychart", source: normalizedXyChart });
  assert.deepEqual(validateMermaidSource(pieChart), { kind: "pie", source: normalizedPieChart });
  assert.deepEqual(validateQuestionVisualizations([{
    kind: "mermaid",
    title: "Weekly orders",
    alt: "Orders are 12, 25, and 31 in weeks one through three.",
    source: xyChart,
  }]), [{
    kind: "mermaid",
    title: "Weekly orders",
    alt: "Orders are 12, 25, and 31 in weeks one through three.",
    source: normalizedXyChart,
  }]);
});

test("unsupported or misleading statistical chart grammars are rejected", () => {
  for (const source of [
    "scatterplot\n  (1, 2)\n  (2, 4)",
    "quadrantChart\n  x-axis Low --> High\n  A: [0.2, 0.3]",
    "boxplot\n  1, 2, 3, 4, 5",
    "xychart-beta\n  x-axis [\"A\", \"B\"]\n  bar [1]",
    "xychart-beta\n  x-axis [\"A\", \"B\"]\n  y-axis 0 --> 2\n  bar [1, 2, 3]",
    "xychart-beta\n  x-axis [\"A\", \"A\"]\n  y-axis 0 --> 2\n  bar [1, 2]",
    "xychart-beta\n  x-axis [\"A\", \"B\"]\n  y-axis 0 --> 2\n  bar [1, 20]",
    "pie\n  \"A\" : -1\n  \"B\" : 2",
    "xychart-beta\n  x-axis [\"A\", \"B\"]\n  y-axis 0 --> 4\n  bar [1, 2]\n  bar [3, 4]",
    "xychart-beta\n  x-axis [\"A\", \"B\"]\n  y-axis 0 --> 4\n  bar \"Same\" [1, 2]\n  line \"same\" [3, 4]",
  ]) {
    assert.equal(validateMermaidSource(source), null, source);
  }
});

test("directives, HTML, scripts, links, callbacks, and styling cannot cross the Mermaid gate", () => {
  for (const source of [
    "%%{init: {\"securityLevel\": \"loose\"}}%%\npie\n\"A\": 1\n\"B\": 2",
    "pie\n  \"<img src=x onerror=alert(1)>\" : 1\n  \"B\" : 2",
    "pie\n  \"javascript:alert(1)\" : 1\n  \"B\" : 2",
    "xychart-beta\n  x-axis [\"A\", \"B\"]\n  y-axis 0 --> 2\n  bar [1, 2]\n  click A callback",
    "xychart-beta\n  x-axis [\"A\", \"B\"]\n  y-axis 0 --> 2\n  bar [1, 2]\n  style A fill:red",
    "pie\n  \"A\" : 1; click A href \"https://example.test\"\n  \"B\" : 2",
  ]) {
    assert.equal(validateMermaidSource(source), null, source);
  }
});

test("the full visualization object contract rejects extra fields and excessive complexity", () => {
  assert.equal(validateQuestionVisualizations({ source: pieChart }), null);
  assert.equal(validateQuestionVisualizations([{ kind: "mermaid", title: "T", alt: "A", source: pieChart, href: "https://example.test" }]), null);
  assert.equal(validateQuestionVisualizations([{ kind: "mermaid", title: "T", alt: "A", source: "x".repeat(4_001) }]), null);
  assert.equal(validateQuestionVisualizations(new Array(3).fill({ kind: "mermaid", title: "T", alt: "A", source: pieChart })), null);
});

test("all question-stem views render structured visualizations and failures expose source", () => {
  const questionContent = fs.readFileSync(path.join(root, "src/components/QuestionContent.tsx"), "utf8");
  const mermaid = fs.readFileSync(path.join(root, "src/components/MermaidDiagram.tsx"), "utf8");
  const svgGate = fs.readFileSync(path.join(root, "src/lib/mermaid-svg.ts"), "utf8");
  const bank = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
  const candidate = fs.readFileSync(path.join(root, "src/components/AiPaperWorkspace.tsx"), "utf8");
  const paper = fs.readFileSync(path.join(root, "src/app/paper/page.tsx"), "utf8");
  assert.match(questionContent, /(?:visualizations|renderedVisualizations)\.map/);
  for (const source of [bank, candidate, paper]) {
    assert.match(source, /visualizations=\{(?:question|q)\.visualizations\}/);
  }
  assert.match(mermaid, /securityLevel:\s*"strict"/);
  assert.match(mermaid, /htmlLabels:\s*false/);
  assert.match(mermaid, /sanitizeMermaidSvg\(DOMPurify, rendered\.svg\)/);
  assert.match(mermaid, /图表无法渲染，查看 Mermaid 源码/);
  assert.match(svgGate, /FORBID_TAGS:[\s\S]*?foreignObject/);
  assert.match(svgGate, /FORBID_ATTR:[\s\S]*?href/);
});

test("AI generation and persisted drafts cannot bypass the structured gate", () => {
  const route = fs.readFileSync(path.join(root, "src/app/api/ai/paper/route.ts"), "utf8");
  const drafts = fs.readFileSync(path.join(root, "src/lib/ai-drafts.ts"), "utf8");
  assert.match(route, /validateQuestionVisualizations\(draft\.visualizations\)/);
  assert.match(route, /```\\s\*mermaid/);
  assert.match(route, /scatterplots, histograms, dotplots, stem-and-leaf displays, or boxplots/);
  assert.match(drafts, /validateQuestionVisualizations\(question\.visualizations\)/);
  assert.match(drafts, /visualizations:\s*question\.visualizations \?\? \[\]/);
});

test("DOCX export has a bounded, readable fallback instead of silently dropping diagrams", () => {
  const route = fs.readFileSync(path.join(root, "src/app/api/export/docx/route.ts"), "utf8");
  assert.match(route, /for \(const visualization of question\.visualizations \?\? \[\]\)/);
  assert.match(route, /visualization\.alt/);
  assert.match(route, /Mermaid 源码（网页\/PDF 中显示为图表）/);
  assert.match(route, /visualization\.source\.length/);
  assert.match(route, /visualizations:\s*resolveQuestionVisualizations\(question\.content, question\.visualizations\)/);
});

test("legacy chart stems get presentation-only previews without rewriting reviewed data", () => {
  const stems = [
    `The results were: very familiar $7\\%$, somewhat familiar $19\\%$, not too familiar $18\\%$, and not at all familiar $56\\%$. Give the bar heights and sector angles for a percentage bar chart and a pie chart.`,
    `| Manufacturer group | Market share |\n|---|---:|\n| Ford | $18.3\\%$ |\n| GM | $26.3\\%$ |\n| Other | $55.4\\%$ |\nGive the bar heights and sector angles for a percentage bar chart and a pie chart.`,
    `The following observations require a histogram and a scatterplot; do not substitute a bar chart.`,
  ];
  const [prose, table, unsupported] = stems.map(deriveQuestionVisualizations);
  assert.equal(prose.length, 2);
  assert.equal(table.length, 2);
  assert.equal(unsupported.length, 0);
  for (const visualization of [...prose, ...table]) {
    assert.equal(validateMermaidSource(visualization.source)?.kind !== undefined, true);
  }
});

test("an explicit empty visualization list disables legacy inference", () => {
  const source = `bar chart and pie chart data: A (50%), B (50%)`;
  assert.deepEqual(validateQuestionVisualizations([]), []);
  assert.equal(deriveQuestionVisualizations(source).length, 2);
  assert.equal(resolveQuestionVisualizations(source).length, 2);
  assert.deepEqual(resolveQuestionVisualizations(source, []), []);
  assert.deepEqual(resolveQuestionVisualizations(source, [{ kind: "mermaid", title: "Invalid", alt: "Invalid", source: "flowchart LR" }]), []);
});

test("legacy inference does not silently discard ambiguous categories or data series", () => {
  for (const source of [
    "The results were: A (50%), A (30%), B (50%). Draw a pie chart.",
    "Compare a bar chart.\n| Group | 2020 | 2021 |\n|---|---:|---:|\n| A | 4 | 8 |\n| B | 5 | 9 |",
    "Compare a bar chart.\n| Year | A | B |\n|---|---:|---:|\n| 2020 | 4 | 5 |\n| 2021 | 8 | 9 |",
    "Draw a bar chart.\n| Group | Count |\n|---|---:|\n| A | 4 |\n| B | 5 |\n\n| Group | Count |\n|---|---:|\n| C | 8 |\n| D | 9 |",
  ]) {
    assert.deepEqual(deriveQuestionVisualizations(source), [], source);
  }
});

test("derived plots retain the full precision of source observations", () => {
  const source = "Draw a bar chart.\n| Group | Value |\n|---|---:|\n| A | 0.0001 |\n| B | 0.123456 |";
  assert.match(resolveQuestionVisualizations(source)[0].source, /bar \[0\.0001, 0\.123456\]/);
});

test("AI charts preserve label-value pairing instead of matching loose tokens", () => {
  const content = "A has 10 orders and B has 20 orders. Interpret the bar chart below.";
  const base = {
    kind: "mermaid",
    title: "Orders by group",
    alt: "A has 10 orders and B has 20 orders.",
  };
  const correct = validateQuestionVisualizations([{
    ...base,
    source: "xychart-beta\nx-axis [\"A\", \"B\"]\ny-axis 0 --> 20\nbar [10, 20]",
  }]);
  const swapped = validateQuestionVisualizations([{
    ...base,
    source: "xychart-beta\nx-axis [\"A\", \"B\"]\ny-axis 0 --> 20\nbar [20, 10]",
  }]);
  assert.ok(correct);
  assert.ok(swapped);
  assert.equal(visualizationsMatchQuestionContent(content, correct), true);
  assert.equal(visualizationsMatchQuestionContent(content, swapped), false);
});

test("chart-dependent generic figure wording cannot omit a visualization", () => {
  for (const content of [
    "Use the figure below to compare the two groups.",
    "According to the chart, which category is largest?",
    "Interpret the graph shown above.",
  ]) {
    assert.equal(visualizationsMatchQuestionContent(content, []), false, content);
  }
  assert.equal(
    visualizationsMatchQuestionContent("The sample has 20 observations; calculate its mean.", []),
    true,
  );
});

test("named multiple series remain bound to their table headers", () => {
  const content = `Interpret the bar chart below.
| Group | Men | Women |
|---|---:|---:|
| A | 10 | 20 |
| B | 30 | 40 |`;
  const correct = validateQuestionVisualizations([{
    kind: "mermaid",
    title: "Orders by group and sex",
    alt: "Orders by group and sex",
    source: "xychart-beta\nx-axis [\"A\", \"B\"]\ny-axis 0 --> 40\nbar \"Men\" [10, 30]\nbar \"Women\" [20, 40]",
  }]);
  const swappedNames = validateQuestionVisualizations([{
    kind: "mermaid",
    title: "Orders by group and sex",
    alt: "Orders by group and sex",
    source: "xychart-beta\nx-axis [\"A\", \"B\"]\ny-axis 0 --> 40\nbar \"Women\" [10, 30]\nbar \"Men\" [20, 40]",
  }]);
  assert.ok(correct);
  assert.ok(swappedNames);
  assert.equal(visualizationsMatchQuestionContent(content, correct), true);
  assert.equal(visualizationsMatchQuestionContent(content, swappedNames), false);
  assert.equal(
    canonicalVisualizationAlt(correct[0]),
    "Orders by group and sex；A：Men 10 / Women 20；B：Men 30 / Women 40",
  );
});

test("named multiple series remain bound in prose, not just as an unordered value set", () => {
  const content = "For A, men are 10 and women are 20; for B, men are 30 and women are 40. Interpret the chart below.";
  const build = (men, women) => validateQuestionVisualizations([{
    kind: "mermaid",
    title: "Two series",
    alt: "Two series",
    source: `xychart-beta\nx-axis ["A", "B"]\ny-axis 0 --> 40\nbar "Men" [${men.join(", ")}]\nbar "Women" [${women.join(", ")}]`,
  }]);
  const correct = build([10, 30], [20, 40]);
  const swapped = build([20, 40], [10, 30]);
  assert.ok(correct);
  assert.ok(swapped);
  assert.equal(visualizationsMatchQuestionContent(content, correct), true);
  assert.equal(visualizationsMatchQuestionContent(content, swapped), false);
});

test("persisted AI alt text is derived from validated chart pairs", () => {
  const visualization = validateQuestionVisualizations([{
    kind: "mermaid",
    title: "Orders by group",
    alt: "Incorrect model-authored description",
    source: "pie showData\n\"A\" : 10\n\"B\" : 20",
  }])?.[0];
  assert.ok(visualization);
  assert.equal(canonicalVisualizationAlt(visualization), "Orders by group；A：10；B：20");
});

test("computed legacy axes do not expose floating-point noise", () => {
  const source = `Draw two bar charts, one whose vertical axis starts at 0 and one that starts at 13.0.
| Name | Isabella | Sophia | Emma | Olivia | Ava | Emily | Abigail |
|---|---:|---:|---:|---:|---:|---:|---:|
| Frequency | 22.7 | 20.5 | 17.2 | 16.9 | 15.3 | 14.2 | 14.1 |`;
  const visualizations = deriveQuestionVisualizations(source);
  assert.equal(visualizations.length, 2);
  assert.match(visualizations[0].source, /y-axis "Frequency" 0 --> 24\.97/);
  assert.doesNotMatch(visualizations[0].source, /24\.970000000000002/);
});
