import type { KeyboardEvent } from "react";
import type { KnowledgeMapNode } from "./knowledgeMapLayout";

type KnowledgeNodeProps = {
  node: KnowledgeMapNode;
  isActive: boolean;
  isRelated: boolean;
  isDimmed: boolean;
  isExpandable: boolean;
  isExpanded: boolean;
  onSelect: (node: KnowledgeMapNode) => void;
  onHover: (nodeId: string | null) => void;
};

function wrapLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return [label];
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const lines: string[] = [];
    let current = "";
    for (const part of parts) {
      if (current && `${current} ${part}`.length > maxLength) {
        lines.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 3);
  }
  return [
    label.slice(0, maxLength),
    `${label.slice(maxLength, maxLength * 2)}${label.length > maxLength * 2 ? "…" : ""}`,
  ].filter(Boolean);
}

export function KnowledgeNode({
  node,
  isActive,
  isRelated,
  isDimmed,
  isExpandable,
  isExpanded,
  onSelect,
  onHover,
}: KnowledgeNodeProps) {
  const variant = node.variant ?? (node.level === 0 ? "root" : "concept");
  const labelLines = wrapLabel(node.label, node.level === 0 ? 10 : node.level === 1 ? 14 : 18);
  const labelStart =
    node.description && variant === "root"
      ? -4
      : labelLines.length > 1
        ? -((labelLines.length - 1) * 9)
        : 4;

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(node);
    }
  };

  return (
    <g
      className="knowledge-map-node"
      data-node-id={node.id}
      data-variant={variant}
      data-active={isActive || undefined}
      data-related={isRelated || undefined}
      data-dimmed={isDimmed || undefined}
      data-level={node.level}
      data-expandable={isExpandable || undefined}
      data-expanded={isExpanded || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-expanded={isExpandable ? isExpanded : undefined}
      aria-label={`${node.label}${node.description ? `: ${node.description}` : ""}`}
      transform={`translate(${node.x} ${node.y})`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node);
      }}
      onKeyDown={handleKeyDown}
      onFocus={() => onHover(node.id)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <title>{node.description ? `${node.label} — ${node.description}` : node.label}</title>
      <rect
        x={-node.width / 2}
        y={-node.height / 2}
        width={node.width}
        height={node.height}
        rx={variant === "root" ? 18 : 10}
        className="knowledge-map-node__surface"
      />
      {variant === "root" && (
        <text
          x={-node.width / 2 + 16}
          y={-node.height / 2 + 20}
          className="knowledge-map-node__eyebrow"
        >
          CHAPTER
        </text>
      )}
      <text x={-node.width / 2 + 16} y={labelStart} className="knowledge-map-node__label">
        {labelLines.map((line, index) => (
          <tspan key={`${node.id}-${index}`} x={-node.width / 2 + 16} dy={index === 0 ? 0 : 18}>
            {line}
          </tspan>
        ))}
      </text>
      {node.description && variant === "root" && (
        <text
          x={-node.width / 2 + 16}
          y={node.height / 2 - 17}
          className="knowledge-map-node__description"
        >
          {wrapLabel(node.description, 28).slice(0, 1)}
        </text>
      )}
      {isExpandable && (
        <text
          x={node.width / 2 - 18}
          y={-node.height / 2 + 22}
          className="knowledge-map-node__toggle"
          aria-hidden="true"
        >
          {isExpanded ? "−" : "+"}
        </text>
      )}
    </g>
  );
}
