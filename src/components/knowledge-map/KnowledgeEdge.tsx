import type { KnowledgeEdge as KnowledgeEdgeData } from "../../data/knowledgeMaps";
import type { KnowledgeMapNode } from "./knowledgeMapLayout";

type KnowledgeEdgeProps = {
  edge: KnowledgeEdgeData;
  source: KnowledgeMapNode;
  target: KnowledgeMapNode;
  isRelated: boolean;
  isDimmed: boolean;
};

function edgePath(source: KnowledgeMapNode, target: KnowledgeMapNode, offset = 0) {
  const direction = target.x >= source.x ? 1 : -1;
  const startX = source.x + (direction * source.width) / 2;
  const endX = target.x - (direction * target.width) / 2;
  const startY = source.y + offset;
  const endY = target.y + offset;
  const bend = Math.max(54, Math.abs(endX - startX) * 0.42);
  return `M ${startX} ${startY} C ${startX + direction * bend} ${startY}, ${endX - direction * bend} ${endY}, ${endX} ${endY}`;
}
export function KnowledgeEdge({ edge, source, target, isRelated, isDimmed }: KnowledgeEdgeProps) {
  const relation = edge.relation ?? "leadsTo";
  const directional = relation === "leadsTo" || relation === "infer" || relation === "transform";
  const compare = relation === "compare";
  const paths = compare
    ? [edgePath(source, target, -4), edgePath(source, target, 4)]
    : [edgePath(source, target)];
  const labelX = (source.x + target.x) / 2;
  const labelY = (source.y + target.y) / 2 - 8;

  return (
    <g
      className="knowledge-map-edge"
      data-related={isRelated || undefined}
      data-dimmed={isDimmed || undefined}
    >
      {paths.map((path, index) => (
        <path
          key={`${edge.id}-${index}`}
          d={path}
          className="knowledge-map-edge__path"
          data-relation={relation}
          markerEnd={directional ? "url(#knowledge-map-arrow)" : undefined}
          markerStart={compare ? "url(#knowledge-map-arrow-reverse)" : undefined}
        />
      ))}
      {edge.label && (
        <text x={labelX} y={labelY} className="knowledge-map-edge__label">
          {edge.label}
        </text>
      )}
    </g>
  );
}
