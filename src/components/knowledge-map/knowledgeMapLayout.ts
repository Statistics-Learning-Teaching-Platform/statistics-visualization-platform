import type { KnowledgeEdge, KnowledgeNode } from "../../data/knowledgeMaps";

export type KnowledgeMapNode = KnowledgeNode & {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type KnowledgeMapLayout = {
	nodes: KnowledgeMapNode[];
	edges: KnowledgeEdge[];
	width: number;
	height: number;
};

const NODE_DIMENSIONS: Record<0 | 1 | 2 | 3, { width: number; height: number }> = {
	0: { width: 248, height: 102 },
	1: { width: 202, height: 82 },
	2: { width: 178, height: 68 },
	3: { width: 166, height: 58 },
};

const X_GAP = 96;
const Y_GAP = 20;
const PADDING = 72;

function dimensions(node: KnowledgeNode) {
	const base = NODE_DIMENSIONS[node.level];
	if (node.variant === "formula" && node.level < 3) {
		return { width: base.width + 18, height: base.height };
	}
	return base;
}

function childrenFor(
	nodeId: string,
	nodesById: Map<string, KnowledgeNode>,
	edgesBySource: Map<string, KnowledgeEdge[]>,
) {
	const source = nodesById.get(nodeId);
	if (!source) return [];
	const seen = new Set<string>();
	return (edgesBySource.get(nodeId) ?? [])
		.map((edge) => nodesById.get(edge.target))
		.filter((target): target is KnowledgeNode => {
			if (!target || seen.has(target.id) || target.level <= source.level) return false;
			// Only explicit parent/child links participate in the tree layout.
			// Secondary relations are rendered as context, never as structural children.
			if (!source.children?.includes(target.id)) return false;
			seen.add(target.id);
			return true;
		});
}

function subtreeHeight(
	node: KnowledgeNode,
	nodesById: Map<string, KnowledgeNode>,
	edgesBySource: Map<string, KnowledgeEdge[]>,
	stack = new Set<string>(),
): number {
	if (stack.has(node.id)) return dimensions(node).height;
	const nextStack = new Set(stack).add(node.id);
	const children = childrenFor(node.id, nodesById, edgesBySource);
	if (children.length === 0) return dimensions(node).height;
	return Math.max(
		dimensions(node).height,
		children.reduce((total, child) => total + subtreeHeight(child, nodesById, edgesBySource, nextStack), 0) +
			Y_GAP * (children.length - 1),
	);
}

/**
 * Computes a readable radial/tree hybrid layout from graph structure only.
 * Coordinates are intentionally absent from the chapter data file.
 */
export function layoutKnowledgeMap(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): KnowledgeMapLayout {
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const edgesBySource = new Map<string, KnowledgeEdge[]>();
	for (const edge of edges) {
		const list = edgesBySource.get(edge.source) ?? [];
		list.push(edge);
		edgesBySource.set(edge.source, list);
	}

	const root = nodes.find((node) => node.level === 0) ?? nodes[0];
	const positions = new Map<string, { x: number; y: number }>();
	const placed = new Set<string>();

	const placeSubtree = (node: KnowledgeNode, depth: number, side: -1 | 1, centerY: number) => {
		if (placed.has(node.id)) return;
		placed.add(node.id);
		positions.set(node.id, {
			x: depth === 0 ? 0 : side * (depth * 286 + X_GAP),
			y: centerY,
		});

		const children = childrenFor(node.id, nodesById, edgesBySource).filter((child) => !placed.has(child.id));
		if (children.length === 0) return;
		const heights = children.map((child) => subtreeHeight(child, nodesById, edgesBySource));
		const totalHeight = heights.reduce((sum, height) => sum + height, 0) + Y_GAP * (children.length - 1);
		let cursor = centerY - totalHeight / 2;
		children.forEach((child, index) => {
			const childHeight = heights[index];
			placeSubtree(child, depth + 1, side, cursor + childHeight / 2);
			cursor += childHeight + Y_GAP;
		});
	};

	if (root) {
		positions.set(root.id, { x: 0, y: 0 });
		placed.add(root.id);
		const rootChildren = childrenFor(root.id, nodesById, edgesBySource).filter((child) => child.level === 1);
		const left = rootChildren.filter((_, index) => index % 2 === 0);
		const right = rootChildren.filter((_, index) => index % 2 === 1);
		const placeSide = (sideNodes: KnowledgeNode[], side: -1 | 1) => {
			const heights = sideNodes.map((child) => subtreeHeight(child, nodesById, edgesBySource));
			const total = heights.reduce((sum, height) => sum + height, 0) + Y_GAP * Math.max(0, sideNodes.length - 1);
			let cursor = -total / 2;
			sideNodes.forEach((child, index) => {
				const height = heights[index];
				placeSubtree(child, 1, side, cursor + height / 2);
				cursor += height + Y_GAP;
			});
		};
		placeSide(left, -1);
		placeSide(right, 1);
	}

	// Cross-links and intentionally detached notes still receive deterministic slots.
	const unplaced = nodes.filter((node) => !placed.has(node.id));
	for (const [index, node] of unplaced.entries()) {
		const side: -1 | 1 = index % 2 === 0 ? -1 : 1;
		positions.set(node.id, { x: side * (node.level * 286 + X_GAP), y: (index + 1) * 96 });
	}

	const positioned = nodes.map((node) => {
		const point = positions.get(node.id) ?? { x: 0, y: 0 };
		const size = dimensions(node);
		return { ...node, ...point, ...size };
	});
	const minX = Math.min(...positioned.map((node) => node.x - node.width / 2));
	const maxX = Math.max(...positioned.map((node) => node.x + node.width / 2));
	const minY = Math.min(...positioned.map((node) => node.y - node.height / 2));
	const maxY = Math.max(...positioned.map((node) => node.y + node.height / 2));
	const width = maxX - minX + PADDING * 2;
	const height = maxY - minY + PADDING * 2;

	return {
		nodes: positioned.map((node) => ({ ...node, x: node.x - minX + PADDING, y: node.y - minY + PADDING })),
		edges,
		width,
		height,
	};
}
