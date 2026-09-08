"use client";

import DOMPurify from "dompurify";
import { useEffect, useId, useMemo, useState } from "react";
import { validateMermaidSource } from "@/lib/question-visualizations";
import { sanitizeMermaidSvg } from "@/lib/mermaid-svg";

interface MermaidDiagramProps {
  source: string;
  title: string;
  alt: string;
}

type RenderState =
  | { status: "loading"; source: string }
  | { status: "ready"; source: string; svg: string }
  | { status: "error"; source: string };

let mermaidInitialized = false;

export default function MermaidDiagram({ source, title, alt }: MermaidDiagramProps) {
  const reactId = useId();
  const validated = useMemo(() => validateMermaidSource(source), [source]);
  const [state, setState] = useState<RenderState>({ status: "loading", source });

  useEffect(() => {
    let active = true;
    if (!validated) {
      return () => { active = false; };
    }

    void (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            htmlLabels: false,
            suppressErrorRendering: true,
            maxTextSize: 4_000,
            theme: "neutral",
            flowchart: { htmlLabels: false },
          });
          mermaidInitialized = true;
        }
        const id = `statmind-mermaid-${reactId.replace(/[^a-z0-9_-]/gi, "")}`;
        const rendered = await mermaid.render(id, validated.source);
        const svg = sanitizeMermaidSvg(DOMPurify, rendered.svg);
        if (!svg) throw new Error("Mermaid returned unsafe SVG");
        if (active) setState({ status: "ready", source: validated.source, svg });
      } catch {
        if (active) setState({ status: "error", source: validated.source });
      }
    })();

    return () => { active = false; };
  }, [reactId, validated]);

  const visibleState: RenderState = !validated
    ? { status: "error", source }
    : state.source === validated.source
      ? state
      : { status: "loading", source: validated.source };

  return (
    <figure className="qb-mermaid" aria-label={alt}>
      <figcaption>{title}</figcaption>
      {visibleState.status === "loading" && (
        <div className="qb-mermaid__loading" role="status">正在绘制图表…</div>
      )}
      {visibleState.status === "ready" && (
        <div
          className="qb-mermaid__canvas"
          role="img"
          aria-label={alt}
          // Mermaid runs in strict mode and the resulting SVG passes a second
          // SVG-only DOMPurify pass before insertion.
          dangerouslySetInnerHTML={{ __html: visibleState.svg }}
        />
      )}
      {visibleState.status === "error" && (
        <details className="qb-mermaid__fallback">
          <summary>图表无法渲染，查看 Mermaid 源码</summary>
          <pre><code>{source.slice(0, 4_000)}</code></pre>
        </details>
      )}
    </figure>
  );
}
