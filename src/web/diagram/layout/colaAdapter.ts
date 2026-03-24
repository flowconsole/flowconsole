import type { PositionedGraph, PositionedNode } from './positioningEngine';
import type { SemanticConstraints } from './types';

export type ColaNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fixed?: boolean;
  isPhantom?: boolean;
};

export type ColaLink = {
  source: number;
  target: number;
  idealLength: number;
};

export type ColaGroup = {
  leaves: number[];
  padding: number;
};

export type ColaConstraint =
  | { type: 'alignment'; axis: 'x' | 'y'; offsets: Array<{ node: number; offset: number }> }
  | { type: 'separation'; axis: 'x' | 'y'; left: number; right: number; gap: number; equality?: boolean };

export type ColaInput = {
  nodes: ColaNode[];
  links: ColaLink[];
  groups: ColaGroup[];
  constraints: ColaConstraint[];
};

export function toColaInput(
  graph: PositionedGraph,
  constraints?: SemanticConstraints
): ColaInput {
  const nodeIndex = new Map<string, number>();
  const colaNodes: ColaNode[] = [];

  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    nodeIndex.set(node.id, i);
    colaNodes.push({
      id: node.id,
      x: node.absolutePosition.x + node.size.width / 2,
      y: node.absolutePosition.y + node.size.height / 2,
      width: node.size.width,
      height: node.size.height,
    });
  }

  const colaLinks: ColaLink[] = [];
  for (const edge of graph.edges) {
    const si = nodeIndex.get(edge.source);
    const ti = nodeIndex.get(edge.target);
    if (si === undefined || ti === undefined) continue;
    const src = graph.nodes[si];
    const tgt = graph.nodes[ti];
    const dx = tgt.absolutePosition.x - src.absolutePosition.x;
    const dy = tgt.absolutePosition.y - src.absolutePosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    colaLinks.push({
      source: si,
      target: ti,
      idealLength: Math.max(100, dist * 0.9),
    });
  }

  const colaGroups: ColaGroup[] = [];
  const colaConstraints: ColaConstraint[] = [];

  if (constraints) {
    // Containment → groups
    for (const containment of constraints.containments) {
      const leaves: number[] = [];
      for (const childId of containment.children) {
        const idx = nodeIndex.get(childId);
        if (idx !== undefined) leaves.push(idx);
      }
      if (leaves.length > 0) {
        colaGroups.push({ leaves, padding: containment.padding });
      }
    }

    // Lane ordering → separation constraints
    for (const ordering of constraints.laneOrdering) {
      const li = nodeIndex.get(ordering.left);
      const ri = nodeIndex.get(ordering.right);
      if (li !== undefined && ri !== undefined) {
        colaConstraints.push({
          type: 'separation',
          axis: ordering.axis,
          left: li,
          right: ri,
          gap: ordering.gap,
        });
      }
    }

    // Alignments → alignment constraints
    for (const alignment of constraints.alignments) {
      const offsets: Array<{ node: number; offset: number }> = [];
      for (const nodeId of alignment.nodes) {
        const idx = nodeIndex.get(nodeId);
        if (idx !== undefined) {
          offsets.push({ node: idx, offset: 0 });
        }
      }
      if (offsets.length >= 2) {
        colaConstraints.push({
          type: 'alignment',
          axis: alignment.axis,
          offsets,
        });
      }
    }
  }

  return {
    nodes: colaNodes,
    links: colaLinks,
    groups: colaGroups,
    constraints: colaConstraints,
  };
}

export function fromColaOutput(
  colaNodes: ColaNode[],
  originalNodes: readonly PositionedNode[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  for (let i = 0; i < colaNodes.length; i++) {
    const cn = colaNodes[i];
    if (cn.isPhantom) continue;
    const orig = originalNodes[i];
    if (!orig) continue;
    positions.set(cn.id, {
      x: cn.x - cn.width / 2,
      y: cn.y - cn.height / 2,
    });
  }

  return positions;
}
