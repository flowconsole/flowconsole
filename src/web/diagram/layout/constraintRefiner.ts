import { Layout, type InputNode, type Group, type Link } from 'webcola';
import type { PositionedGraph, PositionedNode } from './positioningEngine';
import type { SemanticConstraints } from './types';

const GRID_SIZE = 10;
const CONTAINER_PADDING = 32;
const COMPONENT_GAP = 48;
const COLA_UNCONSTRAINED_ITERATIONS = 10;
const COLA_USER_CONSTRAINT_ITERATIONS = 15;
const COLA_ALL_CONSTRAINTS_ITERATIONS = 20;

function snap(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function cloneGraph(graph: PositionedGraph): PositionedGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      absolutePosition: { ...node.absolutePosition },
      size: { ...node.size },
      data: { ...node.data },
      style: { ...node.style },
      layout: { ...node.layout },
    })) as PositionedNode[],
    edges: graph.edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        layoutPoints: edge.data?.layoutPoints?.map((point) => ({ ...point })),
        labelPos: edge.data?.labelPos ? { ...edge.data.labelPos } : undefined,
      },
    })),
  };
}

type ColaConstraint =
  | { type: 'alignment'; axis: 'x' | 'y'; offsets: Array<{ node: number; offset: number }> }
  | { type: 'separation'; axis: 'x' | 'y'; left: number; right: number; gap: number; equality?: boolean };

function buildColaNodes(graph: PositionedGraph): InputNode[] {
  return graph.nodes.map((node) => ({
    x: node.absolutePosition.x + node.size.width / 2,
    y: node.absolutePosition.y + node.size.height / 2,
    width: node.size.width,
    height: node.size.height,
    fixed: 0,
  }));
}

function buildColaLinks(graph: PositionedGraph): Link<number>[] {
  const nodeIndex = new Map<string, number>();
  graph.nodes.forEach((node, i) => nodeIndex.set(node.id, i));

  return graph.edges
    .map((edge) => {
      const si = nodeIndex.get(edge.source);
      const ti = nodeIndex.get(edge.target);
      if (si === undefined || ti === undefined) return undefined;
      const src = graph.nodes[si];
      const tgt = graph.nodes[ti];
      const dx = tgt.absolutePosition.x - src.absolutePosition.x;
      const dy = tgt.absolutePosition.y - src.absolutePosition.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return {
        source: si,
        target: ti,
        length: Math.max(100, dist * 0.9),
      };
    })
    .filter((link): link is NonNullable<typeof link> => link !== undefined);
}

function buildColaGroups(
  colaNodes: InputNode[],
  graph: PositionedGraph,
  constraints?: SemanticConstraints
): Group[] {
  if (!constraints) return [];
  const nodeIndex = new Map<string, number>();
  graph.nodes.forEach((node, i) => nodeIndex.set(node.id, i));

  const groups: Group[] = [];
  for (const containment of constraints.containments) {
    const leaves: InputNode[] = [];
    for (const childId of containment.children) {
      const idx = nodeIndex.get(childId);
      if (idx !== undefined) leaves.push(colaNodes[idx]);
    }
    if (leaves.length > 0) {
      groups.push({ leaves: leaves as Group['leaves'], padding: containment.padding });
    }
  }
  return groups;
}

function buildColaConstraints(
  graph: PositionedGraph,
  constraints?: SemanticConstraints
): ColaConstraint[] {
  if (!constraints) return [];
  const nodeIndex = new Map<string, number>();
  graph.nodes.forEach((node, i) => nodeIndex.set(node.id, i));

  const colaConstraints: ColaConstraint[] = [];

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

  return colaConstraints;
}

function addPhantomLabelNodes(
  colaNodes: InputNode[],
  graph: PositionedGraph
): { phantomCount: number } {
  let phantomCount = 0;
  for (const edge of graph.edges) {
    const labelPos = edge.data?.labelPos;
    const label = edge.data?.label;
    if (!labelPos || !label) continue;

    const labelWidth = Math.min(label.length * 7 + 20, 120);
    const labelHeight = 20;

    colaNodes.push({
      x: labelPos.x,
      y: labelPos.y,
      width: labelWidth,
      height: labelHeight,
      fixed: 1 as unknown as number, // phantom labels are fixed — they don't move
    });
    phantomCount++;
  }
  return { phantomCount };
}

function runCola(
  colaNodes: InputNode[],
  colaLinks: Link<number>[],
  groups: Group[],
  constraints: ColaConstraint[],
  flowAxis: 'x' | 'y'
): InputNode[] {
  const layout = new Layout();

  layout.nodes(colaNodes);
  layout.links(colaLinks);
  layout.avoidOverlaps(true);
  layout.flowLayout(flowAxis, 60);

  if (groups.length > 0) {
    layout.groups(groups);
  }

  if (constraints.length > 0) {
    layout.constraints(constraints);
  }

  layout.start(
    COLA_UNCONSTRAINED_ITERATIONS,
    COLA_USER_CONSTRAINT_ITERATIONS,
    COLA_ALL_CONSTRAINTS_ITERATIONS,
    0,
    false
  );

  return colaNodes;
}

function fitContainers(graph: PositionedGraph) {
  for (const parent of graph.nodes.filter((node) => node.type === 'container')) {
    const children = graph.nodes.filter((node) => node.parentId === parent.id);
    if (!children.length) continue;

    const minX = Math.min(...children.map((node) => node.absolutePosition.x));
    const minY = Math.min(...children.map((node) => node.absolutePosition.y));
    const maxX = Math.max(...children.map((node) => node.absolutePosition.x + node.size.width));
    const maxY = Math.max(...children.map((node) => node.absolutePosition.y + node.size.height));

    parent.absolutePosition.x = Math.min(parent.absolutePosition.x, minX - CONTAINER_PADDING);
    parent.absolutePosition.y = Math.min(parent.absolutePosition.y, minY - CONTAINER_PADDING);
    if (!parent.parentId) {
      parent.position = { ...parent.absolutePosition };
    }
    parent.size = {
      ...parent.size,
      width: Math.max(parent.size.width, maxX - parent.absolutePosition.x + CONTAINER_PADDING),
      height: Math.max(parent.size.height, maxY - parent.absolutePosition.y + CONTAINER_PADDING),
    };
    parent.style = {
      ...parent.style,
      width: parent.size.width,
      height: parent.size.height,
    };
  }
}

function packDisconnectedComponents(graph: PositionedGraph) {
  const components = graph.profile.disconnectedComponents;
  if (components.length <= 1) return;

  let cursorX = 0;
  for (const component of components) {
    const nodes = graph.nodes.filter((node) => component.has(node.id));
    if (!nodes.length) continue;

    const minX = Math.min(...nodes.map((node) => node.absolutePosition.x));
    const maxX = Math.max(...nodes.map((node) => node.absolutePosition.x + node.size.width));
    const shiftX = cursorX - minX;
    for (const node of nodes) {
      node.absolutePosition.x += shiftX;
      if (!node.parentId) {
        node.position.x = node.absolutePosition.x;
      }
    }
    cursorX += maxX - minX + COMPONENT_GAP;
  }
}

function snapToGrid(graph: PositionedGraph) {
  for (const node of graph.nodes) {
    node.absolutePosition.x = snap(node.absolutePosition.x);
    node.absolutePosition.y = snap(node.absolutePosition.y);
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
    }
  }
}

function recalcRelativePositions(graph: PositionedGraph) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) {
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
      continue;
    }
    const parent = byId.get(node.parentId);
    if (!parent) continue;
    node.position = {
      x: node.absolutePosition.x - parent.absolutePosition.x,
      y: node.absolutePosition.y - parent.absolutePosition.y,
    };
  }
}

function normalizeBounds(graph: PositionedGraph) {
  if (graph.nodes.length === 0) return;
  const minX = Math.min(...graph.nodes.map((node) => node.absolutePosition.x));
  const minY = Math.min(...graph.nodes.map((node) => node.absolutePosition.y));
  for (const node of graph.nodes) {
    node.absolutePosition.x -= minX;
    node.absolutePosition.y -= minY;
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
    }
  }
}

/**
 * Constraint-based layout refinement using webcola.
 *
 * Uses ELK positions as starting point and applies:
 * 1. Cola stress-majorization with avoidOverlaps + flowLayout
 * 2. Semantic constraints (lane ordering, alignment, containment)
 * 3. Phantom label nodes for label overlap avoidance
 * 4. Container fitting
 * 5. Disconnected component packing
 * 6. Grid snapping (10px)
 * 7. Bounds normalization
 */
export function refineWithConstraints(
  graph: PositionedGraph,
  constraints?: SemanticConstraints
): PositionedGraph {
  const refined = cloneGraph(graph);

  // Build cola input
  const colaNodes = buildColaNodes(refined);
  const colaLinks = buildColaLinks(refined);
  const colaConstraints = buildColaConstraints(refined, constraints);

  // Add phantom label nodes
  addPhantomLabelNodes(colaNodes, refined);

  // Build groups after nodes are finalized (needs node references)
  const colaGroups = buildColaGroups(colaNodes, refined, constraints);

  // Determine flow axis
  const flowAxis: 'x' | 'y' =
    refined.direction === 'LR' || refined.direction === 'RL' ? 'x' : 'y';

  // Run cola
  const result = runCola(colaNodes, colaLinks, colaGroups, colaConstraints, flowAxis);

  // Apply refined positions (skip phantom nodes)
  const realNodeCount = refined.nodes.length;
  for (let i = 0; i < realNodeCount; i++) {
    const colaNode = result[i];
    const node = refined.nodes[i];
    node.absolutePosition = {
      x: (colaNode.x ?? 0) - node.size.width / 2,
      y: (colaNode.y ?? 0) - node.size.height / 2,
    };
  }

  // Update label positions from phantom nodes
  let phantomIdx = realNodeCount;
  for (const edge of refined.edges) {
    const labelPos = edge.data?.labelPos;
    const label = edge.data?.label;
    if (!labelPos || !label) continue;
    if (phantomIdx < result.length) {
      const phantomNode = result[phantomIdx];
      edge.data = {
        ...edge.data,
        labelPos: { x: phantomNode.x ?? labelPos.x, y: phantomNode.y ?? labelPos.y },
      };
      phantomIdx++;
    }
  }

  // Post-processing
  fitContainers(refined);
  packDisconnectedComponents(refined);
  snapToGrid(refined);
  recalcRelativePositions(refined);
  normalizeBounds(refined);
  recalcRelativePositions(refined);

  refined.qualityScore = graph.qualityScore;
  return refined;
}
