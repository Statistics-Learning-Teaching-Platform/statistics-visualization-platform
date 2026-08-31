import type { Language } from "@stats-viz/shared/i18n";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { TextbookChapterResources } from "../../course/resourceCatalog";
import type { KnowledgeEdge as KnowledgeEdgeData, KnowledgeNode as KnowledgeNodeData } from "../../data/knowledgeMaps";
import { knowledgeMaps, type ChapterKnowledgeMap } from "../../data/knowledgeMaps";
import { ConceptExplanationSection } from "./ConceptDetailPanel";
import { KnowledgeEdge } from "./KnowledgeEdge";
import { KnowledgeMapControls } from "./KnowledgeMapControls";
import { layoutKnowledgeMap, type KnowledgeMapLayout } from "./knowledgeMapLayout";
import { KnowledgeNode } from "./KnowledgeNode";

type KnowledgeMapProps = {
	chapterNumber: string;
	chapter: { title: string; lead?: string };
	entry: TextbookChapterResources;
	language: Language;
};

function getFallbackMap(chapter: KnowledgeMapProps["chapter"]): KnowledgeMapLayout {
	const root = {
		id: "root",
		label: chapter.title,
		level: 0 as const,
		variant: "root" as const,
		description: chapter.lead,
	};
	return layoutKnowledgeMap([root], []);
}

function isTreeEdge(edge: KnowledgeEdgeData, nodesById: Map<string, KnowledgeNodeData>) {
	return Boolean(nodesById.get(edge.source)?.children?.includes(edge.target));
}

function getPrimaryAncestor(nodeId: string, nodesById: Map<string, KnowledgeNodeData>) {
	let current = nodesById.get(nodeId);
	const visited = new Set<string>();
	while (current && current.level > 1 && !visited.has(current.id)) {
		visited.add(current.id);
		const parent = [...nodesById.values()].find((candidate) => candidate.children?.includes(current!.id));
		current = parent;
	}
	return current?.level === 1 ? current.id : null;
}

function getVisibleGraph(
	map: ChapterKnowledgeMap,
	expandedNodeIds: Set<string>,
	selectedNodeId: string | null,
) {
	const nodesById = new Map(map.nodes.map((node) => [node.id, node]));
	const treeEdges = map.edges.filter((edge) => isTreeEdge(edge, nodesById));
	const visibleIds = new Set<string>();
	const root = map.nodes.find((node) => node.level === 0);
	if (root) visibleIds.add(root.id);
	for (const node of map.nodes) {
		if (node.level === 1) visibleIds.add(node.id);
	}

	const revealChildren = (parentId: string) => {
		if (!expandedNodeIds.has(parentId)) return;
		const parent = nodesById.get(parentId);
		for (const childId of parent?.children ?? []) {
			visibleIds.add(childId);
			revealChildren(childId);
		}
	};
	// Expanded branches stay open until their own node is clicked again.
	for (const node of map.nodes) {
		if (node.level === 1 && expandedNodeIds.has(node.id)) revealChildren(node.id);
	}

	const visibleNodes = map.nodes.filter((node) => visibleIds.has(node.id));
	const visibleEdges = treeEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
	if (selectedNodeId) {
		for (const edge of map.edges) {
			if (isTreeEdge(edge, nodesById)) continue;
			if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
			if (edge.source === selectedNodeId || edge.target === selectedNodeId) visibleEdges.push(edge);
		}
	}
	return { visibleNodes, visibleEdges };
}

function directConnections(nodeId: string | null, edges: KnowledgeMapLayout["edges"]) {
	if (!nodeId) return new Set<string>();
	const related = new Set<string>([nodeId]);
	for (const edge of edges) {
		if (edge.source === nodeId) related.add(edge.target);
		if (edge.target === nodeId) related.add(edge.source);
	}
	return related;
}

export function KnowledgeMap({ chapterNumber, chapter, entry, language }: KnowledgeMapProps) {
	const map = knowledgeMaps[chapterNumber];
	const [activePrimaryBranch, setActivePrimaryBranch] = useState<string | null>(null);
	const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
	const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
	const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
	const [showCanvasHint, setShowCanvasHint] = useState(true);
	const nodesById = useMemo(() => new Map((map?.nodes ?? []).map((node) => [node.id, node])), [map]);
	const visibleGraph = useMemo(
		() => (map ? getVisibleGraph(map, expandedNodeIds, activeNodeId) : { visibleNodes: [], visibleEdges: [] }),
		[activeNodeId, expandedNodeIds, map],
	);
	const layout = useMemo(
		() => (map ? layoutKnowledgeMap(visibleGraph.visibleNodes, visibleGraph.visibleEdges) : getFallbackMap(chapter)),
		[chapter, map, visibleGraph],
	);
	const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 768 ? 1.2 : 1));
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [dragging, setDragging] = useState(false);
	const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
	const svgRef = useRef<SVGSVGElement | null>(null);
	const activeNode = layout.nodes.find((node) => node.id === activeNodeId) ?? null;
	const focusId = activeNodeId ?? hoverNodeId;
	const relatedNodes = useMemo(() => directConnections(focusId, layout.edges), [focusId, layout.edges]);

	const selectNode = (node: KnowledgeMapLayout["nodes"][number]) => {
		setActiveNodeId(node.id);
		if (node.level === 1) {
			const isExpanded = expandedNodeIds.has(node.id);
			setActivePrimaryBranch(node.id);
			setExpandedNodeIds((current) => {
				const next = new Set(current);
				if (isExpanded) next.delete(node.id);
				else next.add(node.id);
				return next;
			});
			return;
		}
		const primary = getPrimaryAncestor(node.id, nodesById);
		if (primary && activePrimaryBranch !== primary) {
			setActivePrimaryBranch(primary);
			setExpandedNodeIds((current) => new Set(current).add(primary));
		}
		if (node.children?.length) {
			setExpandedNodeIds((current) => {
				const next = new Set(current);
				if (next.has(node.id)) next.delete(node.id);
				else next.add(node.id);
				return next;
			});
		}
	};

	const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
		if (event.button !== 0) return;
		const target = event.target as Element;
		if (target.closest(".knowledge-map-node")) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		const rect = event.currentTarget.getBoundingClientRect();
		dragOrigin.current = {
			x: event.clientX / rect.width,
			y: event.clientY / rect.height,
			panX: pan.x,
			panY: pan.y,
		};
		setDragging(true);
	};

	const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
		if (!dragging) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const dx = (event.clientX / rect.width - dragOrigin.current.x) * layout.width / zoom;
		const dy = (event.clientY / rect.height - dragOrigin.current.y) * layout.height / zoom;
		setPan({ x: dragOrigin.current.panX + dx, y: dragOrigin.current.panY + dy });
	};

	const stopDragging = (event: PointerEvent<SVGSVGElement>) => {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		setDragging(false);
	};

	const clearSelection = () => setActiveNodeId(null);
	const resetView = () => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
		setActiveNodeId(null);
		setHoverNodeId(null);
		setActivePrimaryBranch(null);
		setExpandedNodeIds(new Set());
	};
	useEffect(() => {
		const timeoutId = window.setTimeout(() => setShowCanvasHint(false), 5200);
		return () => window.clearTimeout(timeoutId);
	}, []);
	return (
		<section className="chapter-hub-section chapter-hub-knowledge" aria-labelledby="chapter-hub-knowledge-title">
			<div className="chapter-hub-section__heading">
				<p className="chapter-hub-eyebrow">01 · KNOWLEDGE MAP</p>
				<h2 id="chapter-hub-knowledge-title">{language === "zh" ? "本章知识地图" : "Chapter knowledge map"}</h2>
				<p>{map?.subtitle ?? (language === "zh" ? "先看章节骨架，再选择一个知识模块逐步展开。" : "Start with the chapter skeleton, then open one knowledge branch at a time.")}</p>
			</div>
			<div className="knowledge-map-workspace">
				<div className={`knowledge-map-canvas-shell${dragging ? " is-dragging" : ""}`}>
					<svg
						ref={svgRef}
						className="knowledge-map-canvas"
						viewBox={`0 0 ${layout.width} ${layout.height}`}
						preserveAspectRatio="xMidYMid meet"
						aria-label={language === "zh" ? "可拖动、可缩放的本章知识关系图" : "Draggable and zoomable chapter knowledge relationship map"}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={stopDragging}
						onPointerCancel={stopDragging}
						onClick={clearSelection}
						onWheel={(event) => {
							// A normal trackpad/mouse wheel should scroll the textbook page.
							// Require an explicit modifier so zoom never happens by accident.
							if (!event.ctrlKey && !event.metaKey) return;
							event.preventDefault();
							setZoom((current) => Math.min(1.65, Math.max(0.55, Number((current + (event.deltaY < 0 ? 0.1 : -0.1)).toFixed(2)))));
						}}
					>
						<defs>
							<marker id="knowledge-map-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
								<path className="knowledge-map-marker" d="M 0 0 L 8 4 L 0 8 z" />
							</marker>
							<marker id="knowledge-map-arrow-reverse" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto-start-reverse" markerUnits="strokeWidth">
								<path className="knowledge-map-marker" d="M 8 0 L 0 4 L 8 8 z" />
							</marker>
						</defs>
						<rect className="knowledge-map-canvas__background" x="0" y="0" width={layout.width} height={layout.height} />
						<g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
							{layout.edges.map((edge) => {
								const source = layout.nodes.find((node) => node.id === edge.source);
								const target = layout.nodes.find((node) => node.id === edge.target);
								if (!source || !target) return null;
								const related = Boolean(focusId && (edge.source === focusId || edge.target === focusId));
								return <KnowledgeEdge key={edge.id} edge={edge} source={source} target={target} isRelated={related} isDimmed={Boolean(focusId && !related)} />;
							})}
							{layout.nodes.map((node) => {
								const related = relatedNodes.has(node.id);
								return <KnowledgeNode key={node.id} node={node} isActive={node.id === activeNodeId} isRelated={related} isDimmed={Boolean(focusId && !related)} isExpandable={node.level > 0 && Boolean(node.children?.length)} isExpanded={expandedNodeIds.has(node.id)} onSelect={selectNode} onHover={setHoverNodeId} />;
							})}
						</g>
					</svg>
					<KnowledgeMapControls
						language={language}
						onZoomIn={() => setZoom((current) => Math.min(1.65, Number((current + 0.1).toFixed(2))))}
						onZoomOut={() => setZoom((current) => Math.max(0.55, Number((current - 0.1).toFixed(2))))}
						onFitView={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
						onReset={resetView}
					/>
					<p className={`knowledge-map-canvas__hint${showCanvasHint ? "" : " is-faded"}`} aria-hidden={!showCanvasHint}>
						{language === "zh" ? "拖动探索 · Ctrl/⌘ + 滚轮缩放 · 点击空白清除" : "Drag to explore · Ctrl/⌘ + scroll to zoom · click blank space to clear"}
					</p>
				</div>
				<ConceptExplanationSection node={activeNode} entry={entry} chapter={chapter} chapterNumber={chapterNumber} language={language} />
			</div>
		</section>
	);
}
