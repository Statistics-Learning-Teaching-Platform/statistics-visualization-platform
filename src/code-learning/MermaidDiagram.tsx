"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { validateMermaidSource } from "./mermaid";

export type MermaidDiagramProps = {
  /** A complete Mermaid source string (without the Markdown fence). */
  source: string;
  /** Accessible description shown to screen readers. */
  ariaLabel?: string;
  /** Optional callback used by the tutor drawer to keep its log pinned. */
  onProgress?: () => void;
};

type RenderState =
  | { status: "loading"; source: string }
  | { status: "ready"; source: string; svg: string }
  | { status: "error"; source: string };

type MermaidModule = typeof import("mermaid");
type MermaidApi = MermaidModule["default"];
type DomPurifyModule = typeof import("dompurify");
type DomPurifyApi = DomPurifyModule["default"];

let mermaidPromise: Promise<MermaidApi> | null = null;
let purifyPromise: Promise<DomPurifyApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        // HTML labels and all interactive features are unnecessary for the
        // small statistical subset and widen the parser/output surface.
        htmlLabels: false,
        suppressErrorRendering: true,
        maxTextSize: 4_000,
        theme: "neutral",
        flowchart: { htmlLabels: false },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

function loadPurifier(): Promise<DomPurifyApi> {
  if (!purifyPromise) {
    purifyPromise = import("dompurify").then(({ default: purifier }) => purifier);
  }
  return purifyPromise;
}

/**
 * Mermaid returns SVG markup.  Treat it as untrusted even in strict mode:
 * Mermaid's security setting protects its parser, while this second pass
 * protects the actual markup inserted into the document.
 */
export function sanitizeMermaidSvg(purifier: DomPurifyApi, value: string): string | null {
  const sanitized = purifier.sanitize(value, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [
      "a",
      "animate",
      "animateMotion",
      "animateTransform",
      "embed",
      "foreignObject",
      "iframe",
      "image",
      "object",
      "script",
      "set",
    ],
    FORBID_ATTR: ["href", "xlink:href", "formaction"],
    RETURN_TRUSTED_TYPE: false,
  });
  if (
    typeof sanitized !== "string" ||
    !/^\s*<svg\b/i.test(sanitized) ||
    /<(?:script|foreignObject|iframe|object|embed|a)\b|\son[a-z]+\s*=|(?:href|xlink:href)\s*=/i.test(
      sanitized,
    ) ||
    // DOMPurify does not filter CSS imports/URLs. This small chart subset
    // needs neither CSS escapes nor imports; only local SVG paint references.
    /\\|@import\b/i.test(sanitized) ||
    [...sanitized.matchAll(/url\(([^)]*)\)/gi)].some((match) =>
      !/^(["']?)#[a-z_][\w:.-]*\1$/i.test(match[1].trim()))
  ) {
    return null;
  }
  return sanitized;
}

function stableId(source: string, reactId: string): string {
  // Mermaid uses the supplied id as a prefix for internal SVG ids.  A source
  // derived only id would collide whenever two answers contain the same
  // chart (and would also produce unwieldy ids for a 4 KB source).  Include
  // React's per-instance id and a tiny deterministic source hash instead.
  let hash = 2166136261;
  for (const character of source) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  const instance = reactId.replace(/[^a-z0-9_-]/gi, "") || "diagram";
  return `statmind-mermaid-${instance}-${(hash >>> 0).toString(36)}`;
}

/**
 * Render a validated statistical Mermaid diagram on the client.  Invalid
 * sources and render/sanitisation failures intentionally remain escaped text
 * so a model can never make the tutor drawer blank or inject arbitrary HTML.
 */
export function MermaidDiagram({ source, ariaLabel = "Mermaid diagram", onProgress }: MermaidDiagramProps) {
  const reactId = useId();
  const validated = useMemo(() => validateMermaidSource(source), [source]);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const [state, setState] = useState<RenderState>(() =>
    validated
      ? { status: "loading", source: validated.source }
      : { status: "error", source },
  );

  useEffect(() => {
    let active = true;
    if (!validated) {
      setState({ status: "error", source });
      progressRef.current?.();
      return () => {
        active = false;
      };
    }

    setState({ status: "loading", source: validated.source });
    void (async () => {
      try {
        const [mermaid, purifier] = await Promise.all([loadMermaid(), loadPurifier()]);
        if (!active) return;
        const rendered = await mermaid.render(stableId(validated.source, reactId), validated.source);
        const svg = sanitizeMermaidSvg(purifier, rendered.svg);
        if (!svg) throw new Error("Mermaid returned unsafe SVG");
        if (active) {
          setState({ status: "ready", source: validated.source, svg });
          progressRef.current?.();
        }
      } catch {
        if (active) {
          setState({ status: "error", source: validated.source });
          progressRef.current?.();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [reactId, source, validated]);

  const visibleState: RenderState = !validated
    ? { status: "error", source }
    : state.source === validated.source
      ? state
      : { status: "loading", source: validated.source };

  return (
    <figure className="ed-tutor-mermaid" aria-label={ariaLabel} data-kind={validated?.kind}>
      <figcaption className="ed-tutor-mermaid__caption">{ariaLabel}</figcaption>
      {visibleState.status === "loading" ? (
        <div className="ed-tutor-mermaid__loading" role="status">
          正在绘制图表…
        </div>
      ) : visibleState.status === "ready" ? (
        <div
          className="ed-tutor-mermaid__canvas"
          role="img"
          aria-label={ariaLabel}
          // Mermaid is strict and the resulting SVG has passed the SVG-only
          // DOMPurify pass above before it reaches the DOM.
          dangerouslySetInnerHTML={{ __html: visibleState.svg }}
        />
      ) : (
        <details className="ed-tutor-mermaid__fallback" open>
          <summary>图表无法渲染，显示 Mermaid 源码</summary>
          <pre>
            <code>{visibleState.source.slice(0, 4_000)}</code>
          </pre>
        </details>
      )}
    </figure>
  );
}

export { validateMermaidSource } from "./mermaid";
export type { ValidatedMermaidSource } from "./mermaid";
export default MermaidDiagram;
