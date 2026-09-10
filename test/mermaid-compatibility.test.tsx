import DOMPurify from "dompurify";
import mermaid from "mermaid";
import { render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { MermaidDiagram, sanitizeMermaidSvg } from "../src/code-learning/MermaidDiagram";
import { validateMermaidSource as tutorValidator } from "../src/code-learning/mermaid";
import { sanitizeMermaidSvg as questionSvgGate } from "../integrations/st-qselector/Program/src/lib/mermaid-svg";
import {
  resolveQuestionVisualizations,
  validateMermaidSource as questionValidator,
} from "../integrations/st-qselector/Program/src/lib/question-visualizations";
import { reviewedQuestionIndex } from "../integrations/st-qselector/Program/src/generated/reviewed-questions";

const xy = 'xychart-beta\ntitle "Orders"\nx-axis ["A", "B"]\ny-axis -1 --> 10\nbar "Series" [1, 2]';
const pie = 'pie showData\ntitle "Results"\n"Yes": 62\n"No": 38';

beforeAll(() => {
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", htmlLabels: false, suppressErrorRendering: true });
  // jsdom has no SVG layout engine; only geometry is stubbed, not the parser,
  // renderer or sanitizer whose integration this test exercises.
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value() { return { x: 0, y: 0, width: 100, height: 20 }; },
  });
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value() { return 100; },
  });
});

describe("installed Mermaid compatibility", () => {
  it("both validators produce sources the real parser accepts", async () => {
    for (const source of [xy, pie, xy.toUpperCase(), pie.toUpperCase(), xy.replace('[1, 2]', '[-0.5, 2.75]')]) {
      const tutor = tutorValidator(source);
      expect(questionValidator(source)).toEqual(tutor);
      expect(tutor).not.toBeNull();
      await expect(mermaid.parse(tutor!.source)).resolves.toBeTruthy();
    }
    for (const source of [xy.replace('[1, 2]', '[1e0, 2]'), xy.replace('"A"', '"A\\"quoted"')]) {
      expect(tutorValidator(source)).toBeNull();
      expect(questionValidator(source)).toBeNull();
    }
  });

  it("keeps both validators in lockstep for named multi-series charts", () => {
    const chart = (plots: string) =>
      `xychart-beta\nx-axis ["A", "B"]\ny-axis 0 --> 4\n${plots}`;
    const cases = [
      chart('bar "First" [1, 2]\nline "Second" [3, 4]'),
      chart("bar [1, 2]\nline [3, 4]"),
      chart('bar "First" [1, 2]\nline [3, 4]'),
      chart('bar "Same" [1, 2]\nline "same" [3, 4]'),
      chart('bar "   " [1, 2]\nline "Second" [3, 4]'),
    ];

    expect(tutorValidator(cases[0])).not.toBeNull();
    for (const source of cases) {
      expect(tutorValidator(source)).toEqual(questionValidator(source));
    }
    for (const source of cases.slice(1)) {
      expect(tutorValidator(source)).toBeNull();
    }
  });

  it("every derived reviewed-bank chart parses and explicit empty charts stay empty", async () => {
    const derivedIds: string[] = [];
    for (const question of reviewedQuestionIndex.questions) {
      const charts = resolveQuestionVisualizations(question.content, question.visualizations);
      if (charts.length) derivedIds.push(question.id);
      for (const chart of charts) {
        expect(tutorValidator(chart.source)).toEqual(questionValidator(chart.source));
        await expect(mermaid.parse(chart.source)).resolves.toBeTruthy();
      }
      expect(resolveQuestionVisualizations(question.content, [])).toEqual([]);
    }
    expect(derivedIds).toEqual(["ch02_q02", "ch02_q08", "ch02_q10", "ch02_q24", "ch02_q25"]);
  });

  it("real rendered XY and pie SVG survive both sanitizers", async () => {
    for (const [index, source] of [xy, pie].entries()) {
      const { svg } = await mermaid.render(`compat-chart-${index}`, source);
      for (const sanitize of [sanitizeMermaidSvg, questionSvgGate]) {
        expect(sanitize(DOMPurify, svg)).toMatch(/^<svg\b/);
      }
    }
  });

  it("repeated diagrams have distinct actual SVG ids", async () => {
    const { container } = render(<><MermaidDiagram source={pie} /><MermaidDiagram source={pie} /></>);
    await waitFor(() => expect(container.querySelectorAll("svg")).toHaveLength(2), { timeout: 10_000 });
    const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("SVG defense in depth", () => {
  it("removes executable markup and rejects external or escaped CSS resources", () => {
    for (const sanitize of [sanitizeMermaidSvg, questionSvgGate]) {
      const clean = sanitize(DOMPurify, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><div>HTML</div></foreignObject><image href="https://example.test/i"/><rect onload="alert(1)" width="20"/></svg>');
      expect(clean).toContain("<rect");
      expect(clean).not.toMatch(/script|foreignObject|image|onload|href/);
      for (const css of [
        'fill:url(//example.test/paint)',
        'fill:url(/external-paint)',
        'fill:url(https://example.test/paint)',
        '@import "//example.test/theme.css"',
        'fill:u\\72l(//example.test/paint)',
      ]) {
        expect(sanitize(DOMPurify, `<svg xmlns="http://www.w3.org/2000/svg"><style>rect{${css}}</style><rect/></svg>`)).toBeNull();
      }
      expect(sanitize(DOMPurify, '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(#local-paint)"/></svg>')).toContain("url(#local-paint)");
    }
  });
});
