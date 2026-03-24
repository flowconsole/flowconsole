import type { GraphProfile, RankedGraph, SemanticConstraints } from './types';

const DEFAULT_LANE_GAP = 100;
const DEFAULT_CONTAINER_PADDING = 40;

function buildElkPartitions(graph: RankedGraph): ReadonlyMap<string, number> {
  const partitions = new Map<string, number>();

  for (const node of graph.nodes) {
    partitions.set(node.id, node.layout.laneIndex);
  }

  return partitions;
}

function buildElkLayerConstraints(
  graph: RankedGraph,
  profile: GraphProfile
): ReadonlyArray<{ node: string; constraint: 'FIRST' | 'LAST' }> {
  const constraints: { node: string; constraint: 'FIRST' | 'LAST' }[] = [];

  for (const source of profile.sourceSinks.sources) {
    constraints.push({ node: source, constraint: 'FIRST' });
  }

  for (const sink of profile.sourceSinks.sinks) {
    const role = graph.nodes.find((n) => n.id === sink)?.layout.role;
    if (role === 'external' || role === 'store') {
      constraints.push({ node: sink, constraint: 'LAST' });
    }
  }

  return constraints;
}

function buildLaneOrdering(graph: RankedGraph): ReadonlyArray<{
  left: string;
  right: string;
  axis: 'x' | 'y';
  gap: number;
}> {
  const ordering: { left: string; right: string; axis: 'x' | 'y'; gap: number }[] = [];
  const backEdgeNodes = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.layout.isBackEdge) {
      backEdgeNodes.add(edge.source);
    }
  }

  const sorted = [...graph.nodes]
    .filter((n) => !backEdgeNodes.has(n.id))
    .sort((a, b) => a.layout.laneIndex - b.layout.laneIndex);

  for (let i = 0; i < sorted.length - 1; i++) {
    const left = sorted[i];
    const right = sorted[i + 1];

    if (left.layout.laneIndex < right.layout.laneIndex) {
      ordering.push({
        left: left.id,
        right: right.id,
        axis: graph.laneAxis,
        gap: DEFAULT_LANE_GAP,
      });
    }
  }

  return ordering;
}

function buildAlignments(graph: RankedGraph): ReadonlyArray<{
  nodes: readonly string[];
  axis: 'x' | 'y';
}> {
  const alignments: { nodes: readonly string[]; axis: 'x' | 'y' }[] = [];
  const perpAxis: 'x' | 'y' = graph.laneAxis === 'x' ? 'y' : 'x';

  const groups = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (!node.parentId) {
      continue;
    }
    const key = `${node.parentId}:${node.layout.role}`;
    const group = groups.get(key) ?? [];
    group.push(node.id);
    groups.set(key, group);
  }

  for (const nodeIds of groups.values()) {
    if (nodeIds.length >= 2) {
      alignments.push({ nodes: nodeIds, axis: perpAxis });
    }
  }

  return alignments;
}

function buildContainments(graph: RankedGraph): ReadonlyArray<{
  parent: string;
  children: readonly string[];
  padding: number;
}> {
  const childrenByParent = new Map<string, string[]>();

  for (const node of graph.nodes) {
    if (!node.parentId) {
      continue;
    }
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parentId, children);
  }

  return Array.from(childrenByParent.entries()).map(([parent, children]) => ({
    parent,
    children,
    padding: DEFAULT_CONTAINER_PADDING,
  }));
}

function collectBackEdges(graph: RankedGraph): ReadonlySet<string> {
  const backEdges = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.layout.isBackEdge) {
      backEdges.add(edge.id);
    }
  }

  return backEdges;
}

export function buildConstraints(
  graph: RankedGraph,
  profile: GraphProfile
): SemanticConstraints {
  return {
    elkPartitions: buildElkPartitions(graph),
    elkLayerConstraints: buildElkLayerConstraints(graph, profile),
    laneOrdering: buildLaneOrdering(graph),
    alignments: buildAlignments(graph),
    containments: buildContainments(graph),
    backEdges: collectBackEdges(graph),
  };
}
