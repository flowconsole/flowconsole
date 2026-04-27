import type { ArchitectureDiagramModel, ArchitectureEdge, ArchitectureNode, ContainerNodeData, ElementNodeData } from '../types';

/**
 * Build an index of all nodes by ID and parent→children map.
 */
function buildIndex(model: ArchitectureDiagramModel) {
  const byId = new Map<string, ArchitectureNode>();
  const children = new Map<string, ArchitectureNode[]>();

  model.nodes.forEach((node) => {
    byId.set(node.id, node);
    if (!node.parentId) return;
    const bucket = children.get(node.parentId) ?? [];
    bucket.push(node);
    children.set(node.parentId, bucket);
  });

  return { byId, children };
}

/**
 * Get nodes for the current drill-down level.
 *
 * - Root level (scopeId = undefined): nodes without parentId
 * - Drill-down (scopeId = X): nodes with parentId === X
 *
 * All containers on the current level are shown as collapsed.
 * This is a FLAT list — no nesting, no parentId references in the output.
 */
function getNodesForLevel(
  model: ArchitectureDiagramModel,
  scopeId: string | undefined,
  children: Map<string, ArchitectureNode[]>
): ArchitectureNode[] {
  const levelNodes = scopeId
    ? model.nodes.filter((n) => n.parentId === scopeId)
    : model.nodes.filter((n) => !n.parentId);

  return levelNodes.map((node): ArchitectureNode => {
    // Strip parentId — all nodes on this level are flat (no React Flow nesting)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { parentId: _parentId, extent: _extent, expandParent: _expandParent, ...rest } = node;

    if (node.type === 'container') {
      const childCount = children.get(node.id)?.length ?? 0;
      const data: ContainerNodeData = {
        ...node.data,
        childCount,
        expanded: false,
        showOpenButton: childCount > 0,
      };
      return { ...rest, type: 'container' as const, data } as ArchitectureNode;
    }

    return { ...rest } as ArchitectureNode;
  });
}

/**
 * Find the closest container ancestor that holds a node.
 * Returns the container ID or undefined if the node is top-level.
 */
function findContainerAncestor(
  nodeId: string,
  byId: Map<string, ArchitectureNode>
): string | undefined {
  const node = byId.get(nodeId);
  if (!node?.parentId) return undefined;
  return node.parentId;
}

/**
 * Create a ghost node representing an external reference.
 * Ghost nodes are shown with muted styling at the edge of the diagram.
 */
function createGhostNode(
  originalNode: ArchitectureNode,
  byId: Map<string, ArchitectureNode>
): ArchitectureNode {
  const parentId = findContainerAncestor(originalNode.id, byId);
  const parentNode = parentId ? byId.get(parentId) : undefined;
  const subtitle = parentNode ? `← ${parentNode.data.title}` : undefined;

  const ghostType = originalNode.type === 'container' ? 'boundary' : originalNode.type;

  const data: ElementNodeData = {
    title: originalNode.data.title,
    subtitle,
    tone: 'muted',
    ghost: true,
    ghostParentId: parentId,
  };

  return {
    id: `ghost:${originalNode.id}`,
    type: ghostType as ArchitectureNode['type'],
    position: { x: 0, y: 0 },
    data,
  } as ArchitectureNode;
}

/**
 * Resolve edge endpoints and generate ghost nodes for external connections.
 *
 * At root level: edges bubble up to top-level containers (no ghosts needed).
 * At drill-down level: if one endpoint is external (not on this level),
 * a ghost node is created so the connection remains visible.
 */
function getEdgesAndGhosts(
  model: ArchitectureDiagramModel,
  visibleIds: Set<string>,
  byId: Map<string, ArchitectureNode>,
  scopeId: string | undefined
): { edges: ArchitectureEdge[]; ghostNodes: ArchitectureNode[] } {
  const ghostNodeMap = new Map<string, ArchitectureNode>();

  /**
   * Resolve a node ID to its representative on the current level.
   * If the node itself is visible, return it.
   * If the node is a descendant of a visible container, return the container.
   * Otherwise, return undefined (not visible on this level).
   */
  function resolveToLevel(nodeId: string): string | undefined {
    if (visibleIds.has(nodeId)) return nodeId;

    // Walk up the parent chain to find a visible ancestor on this level
    let current = byId.get(nodeId);
    while (current?.parentId) {
      if (visibleIds.has(current.parentId)) return current.parentId;
      current = byId.get(current.parentId);
    }

    // For root level: if the node is nested deep, bubble up to top-level ancestor
    if (!scopeId) {
      let top = byId.get(nodeId);
      while (top?.parentId && byId.has(top.parentId)) {
        top = byId.get(top.parentId);
      }
      if (top && visibleIds.has(top.id)) return top.id;
    }

    return undefined;
  }

  /**
   * Resolve a node ID, creating a ghost node if external and in scoped view.
   */
  function resolveOrGhost(nodeId: string): string | undefined {
    const resolved = resolveToLevel(nodeId);
    if (resolved) return resolved;

    // Only create ghosts in drill-down mode (not at root level)
    if (!scopeId) return undefined;

    const originalNode = byId.get(nodeId);
    if (!originalNode) return undefined;

    // Ghost ID is stable per original node
    const ghostId = `ghost:${originalNode.id}`;
    if (!ghostNodeMap.has(ghostId)) {
      ghostNodeMap.set(ghostId, createGhostNode(originalNode, byId));
    }
    return ghostId;
  }

  const edgesMap = new Map<string, { edge: ArchitectureEdge; count: number }>();

  model.edges.forEach((edge) => {
    const source = resolveOrGhost(edge.source);
    const target = resolveOrGhost(edge.target);
    if (!source || !target || source === target) return;

    const key = `${source}|${target}|${edge.data?.kind ?? ''}`;
    const existing = edgesMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.edge.data!.originalEdgeIds =
        existing.edge.data?.originalEdgeIds?.concat(edge.id) ?? [edge.id];
    } else {
      edgesMap.set(key, {
        edge: {
          ...edge,
          id: `agg:${key}`,
          source,
          target,
          data: { ...edge.data, originalEdgeIds: [edge.id] },
        },
        count: 1,
      });
    }
  });

  const edges = Array.from(edgesMap.values()).map(({ edge, count }) => {
    if (count <= 1) return edge;
    const detail = [edge.data?.detail, `${count} links`].filter(Boolean).join(' · ');
    return { ...edge, data: { ...edge.data, detail } };
  });

  return { edges, ghostNodes: Array.from(ghostNodeMap.values()) };
}

/**
 * Build a scoped model showing one level of the diagram at a time.
 *
 * - Root level: top-level nodes (no parentId), containers collapsed
 * - Drill-down: direct children of scopeId, containers collapsed
 * - Edges re-routed to visible nodes, aggregated when needed
 * - External connections create ghost nodes (muted, semi-transparent)
 * - Output is always FLAT — no parentId references, no nesting
 */
export function buildScopedModel(
  model: ArchitectureDiagramModel,
  scopeId?: string
): ArchitectureDiagramModel {
  const { byId, children } = buildIndex(model);

  const nodes = getNodesForLevel(model, scopeId, children);
  const visibleIds = new Set(nodes.map((n) => n.id));
  const { edges, ghostNodes } = getEdgesAndGhosts(model, visibleIds, byId, scopeId);

  return { nodes: [...nodes, ...ghostNodes], edges, flows: model.flows };
}

/**
 * Check whether a node can be drilled into (has children).
 */
export function canDrillDown(nodeId: string, allNodes: ReadonlyArray<ArchitectureNode>): boolean {
  return allNodes.some((n) => n.parentId === nodeId);
}

/**
 * Build breadcrumb trail from root to the current scope.
 */
export function scopeTrail(
  model: ArchitectureDiagramModel,
  scopeId?: string
): Array<{ id: string; title: string }> {
  if (!scopeId) return [];
  const { byId } = buildIndex(model);
  const trail: Array<{ id: string; title: string }> = [];
  let current = byId.get(scopeId);

  while (current) {
    trail.unshift({ id: current.id, title: current.data.title });
    if (!current.parentId) break;
    current = byId.get(current.parentId);
  }

  return trail;
}
