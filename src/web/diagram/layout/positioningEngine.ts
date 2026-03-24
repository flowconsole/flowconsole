import type { ArchitectureDiagramModel, ArchitectureNode } from '../types';
import { fallbackLayoutWithGraphviz } from './fallback';
import type { SizedGraph, SizedNode } from './shapeSizing';
import { computeQualityScore, qualityScoreValue } from './qualityScore';
import type { SemanticConstraints } from './types';

type ElkNodeLike = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkNodeLike[];
  layoutOptions?: Record<string, string>;
};

type ElkEdgeLike = {
  id: string;
  sources: string[];
  targets: string[];
};

export type ElkGraphInput = {
  id: string;
  layoutOptions: Record<string, string>;
  children: ElkNodeLike[];
  edges: ElkEdgeLike[];
};

export type PositionedNode = SizedNode & {
  position: { x: number; y: number };
  absolutePosition: { x: number; y: number };
};

export type PositionedGraph = Omit<SizedGraph, 'nodes'> & {
  nodes: PositionedNode[];
  engine: 'elk' | 'graphviz' | 'radial';
  usedFallback: boolean;
  qualityScore: number;
};

type ElkLayoutResult = ElkNodeLike & { children?: ElkNodeLike[] };

type ElkLayoutEngine = {
  layout(graph: ElkGraphInput): Promise<ElkLayoutResult>;
};

type PositioningEngineOptions = {
  elkFactory?: () => Promise<ElkLayoutEngine | undefined>;
  fallbackLayout?: (model: ArchitectureDiagramModel) => Promise<ArchitectureDiagramModel>;
  forceGraphviz?: boolean;
  constraints?: SemanticConstraints;
};

function directionToElk(direction: SizedGraph['direction']) {
  switch (direction) {
    case 'RL':
      return 'LEFT';
    case 'TB':
      return 'DOWN';
    case 'BT':
      return 'UP';
    default:
      return 'RIGHT';
  }
}

async function defaultElkFactory(): Promise<ElkLayoutEngine> {
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
  return new ELK();
}

function cloneNode<T extends ArchitectureNode>(node: T) {
  return {
    ...node,
    position: { ...node.position },
    data: { ...node.data },
    style: { ...node.style },
  };
}

function normalizeBounds(nodes: PositionedNode[]) {
  if (nodes.length === 0) {
    return nodes;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    minX = Math.min(minX, node.absolutePosition.x);
    minY = Math.min(minY, node.absolutePosition.y);
  }

  return nodes.map((node) => {
    const absolutePosition = {
      x: node.absolutePosition.x - minX,
      y: node.absolutePosition.y - minY,
    };
    return {
      ...node,
      absolutePosition,
      position: node.parentId
        ? node.position
        : { x: absolutePosition.x, y: absolutePosition.y },
    };
  });
}

function withAbsolutePositions(nodes: SizedNode[]) {
  const nodeById = new Map<string, PositionedNode>();
  const ordered: PositionedNode[] = [];

  for (const node of nodes) {
    const positioned = {
      ...cloneNode(node),
      size: node.size,
      absolutePosition: { ...node.position },
    } as PositionedNode;
    nodeById.set(node.id, positioned);
    ordered.push(positioned);
  }

  for (const node of ordered) {
    if (!node.parentId) {
      continue;
    }
    const parent = nodeById.get(node.parentId);
    if (!parent) {
      continue;
    }
    node.absolutePosition = {
      x: parent.absolutePosition.x + node.position.x,
      y: parent.absolutePosition.y + node.position.y,
    };
  }

  return normalizeBounds(ordered);
}

function scorePositionedGraph(graph: PositionedGraph) {
  return qualityScoreValue(computeQualityScore(graph), graph.nodes.length);
}

function buildTree(graph: SizedGraph) {
  const childrenByParent = new Map<string | undefined, SizedNode[]>();
  for (const node of graph.nodes) {
    const bucket = childrenByParent.get(node.parentId) ?? [];
    bucket.push(node);
    childrenByParent.set(node.parentId, bucket);
  }
  return childrenByParent;
}

export function buildElkGraphInput(
  graph: SizedGraph,
  constraints?: SemanticConstraints
): ElkGraphInput {
  const childrenByParent = buildTree(graph);

  const nodeLayoutOptions = (node: SizedNode, isTopLevel: boolean): Record<string, string> => {
    const opts: Record<string, string> = {
      'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
    };

    if (isTopLevel && constraints) {
      const partition = constraints.elkPartitions.get(node.id);
      if (partition !== undefined) {
        opts['org.eclipse.elk.partitioning.partition'] = String(partition);
      }
      const layerConstraint = constraints.elkLayerConstraints.find((c) => c.node === node.id);
      if (layerConstraint) {
        opts['org.eclipse.elk.layered.layering.layerConstraint'] = layerConstraint.constraint;
      }
    } else if (isTopLevel) {
      opts['org.eclipse.elk.partitioning.partition'] = String(node.layout.semanticRank);
    }

    return opts;
  };

  const buildChildren = (parentId: string | undefined, isTopLevel: boolean): ElkNodeLike[] =>
    (childrenByParent.get(parentId) ?? []).map((node) => ({
      id: node.id,
      width: node.size.width,
      height: node.size.height,
      layoutOptions: nodeLayoutOptions(node, isTopLevel),
      children: buildChildren(node.id, false),
    }));

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': directionToElk(graph.direction),
      'org.eclipse.elk.partitioning.activate': 'true',
      'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'org.eclipse.elk.spacing.nodeNode': String(graph.strategy.spacing.node),
      'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': String(graph.strategy.spacing.layer),
      'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'org.eclipse.elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
      'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'org.eclipse.elk.layered.compaction.postCompaction.strategy': 'LEFT',
      'org.eclipse.elk.layered.cycleBreaking.strategy': 'GREEDY_MODEL_ORDER',
      'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
      'org.eclipse.elk.padding': '[top=30,left=30,bottom=30,right=30]',
      'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
    },
    children: buildChildren(undefined, true),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
}

function flattenElkPositions(root: ElkNodeLike & { children?: ElkNodeLike[] }) {
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();

  const walk = (node: ElkNodeLike, offsetX = 0, offsetY = 0) => {
    if (node.id !== 'root') {
      positions.set(node.id, {
        x: offsetX + (node.x ?? 0),
        y: offsetY + (node.y ?? 0),
        width: node.width ?? 0,
        height: node.height ?? 0,
      });
    }
    for (const child of node.children ?? []) {
      walk(child, offsetX + (node.x ?? 0), offsetY + (node.y ?? 0));
    }
  };

  walk(root);
  return positions;
}

function mapPositions(graph: SizedGraph, positions: Map<string, { x: number; y: number; width: number; height: number }>) {
  const nodes = graph.nodes.map((node) => {
    const positioned = positions.get(node.id);
    return {
      ...cloneNode(node),
      size: node.size,
      position: positioned ? { x: positioned.x, y: positioned.y } : { ...node.position },
      absolutePosition: positioned ? { x: positioned.x, y: positioned.y } : { ...node.position },
    } satisfies PositionedNode;
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }
    const parent = byId.get(node.parentId);
    if (!parent) {
      continue;
    }
    node.absolutePosition = { ...node.position };
    node.position = {
      x: node.absolutePosition.x - parent.absolutePosition.x,
      y: node.absolutePosition.y - parent.absolutePosition.y,
    };
  }

  return normalizeBounds(nodes);
}

function toGraphvizModel(graph: SizedGraph): ArchitectureDiagramModel {
  return {
    nodes: graph.nodes.map((node) => ({
      ...cloneNode(node),
      width: node.size.width,
      height: node.size.height,
      style: {
        ...node.style,
        width: node.size.width,
        height: node.size.height,
      },
    })),
    edges: graph.edges.map((edge) => ({ ...edge, data: { ...edge.data } })),
  };
}

function fromGraphvizModel(graph: SizedGraph, model: ArchitectureDiagramModel): PositionedGraph {
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const positioned = graph.nodes.map((node) => {
    const laidOut = nodeById.get(node.id);
    const position = laidOut?.position ?? node.position;
    return {
      ...cloneNode(node),
      size: node.size,
      position,
      absolutePosition: position,
      style: { ...node.style, ...laidOut?.style },
    } satisfies PositionedNode;
  });

  const nodes = withAbsolutePositions(positioned);
  const result = {
    ...graph,
    nodes,
    engine: 'graphviz',
    usedFallback: true,
    qualityScore: 0,
  } satisfies PositionedGraph;
  result.qualityScore = scorePositionedGraph(result);
  return result;
}

export function buildCompactElkInput(graph: SizedGraph): ElkGraphInput {
  const COMPACT_SPACING = 30;

  const rolePriority: Record<string, number> = {
    entry: 0,
    frontend: 1,
    gateway: 2,
    processor: 3,
    worker: 4,
    queue: 5,
    store: 6,
    external: 7,
  };

  const sorted = [...graph.nodes]
    .filter((n) => !n.parentId)
    .sort((a, b) => {
      const pa = rolePriority[a.layout.role] ?? 3;
      const pb = rolePriority[b.layout.role] ?? 3;
      if (pa !== pb) return pa - pb;
      const da = a.layout.outDegree ?? 0;
      const db = b.layout.outDegree ?? 0;
      if (da !== db) return db - da;
      return a.id.localeCompare(b.id);
    });

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'rectpacking',
      'org.eclipse.elk.spacing.nodeNode': String(COMPACT_SPACING),
      'org.eclipse.elk.padding': '[top=20,left=20,bottom=20,right=20]',
    },
    children: sorted.map((node) => ({
      id: node.id,
      width: node.size.width,
      height: node.size.height,
    })),
    edges: graph.edges
      .filter((e) => !graph.nodes.find((n) => n.id === e.source)?.parentId)
      .map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
  };
}

export function positionRadial(graph: SizedGraph): Map<string, { x: number; y: number }> {
  const topLevel = graph.nodes.filter((n) => !n.parentId);
  if (topLevel.length === 0) return new Map();

  const adjacency = new Map<string, string[]>();
  for (const node of topLevel) {
    adjacency.set(node.id, []);
  }
  const topLevelIds = new Set(topLevel.map((n) => n.id));
  for (const edge of graph.edges) {
    if (!topLevelIds.has(edge.source) || !topLevelIds.has(edge.target)) continue;
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  // Find center = max degree node
  let center = topLevel[0];
  let maxDeg = 0;
  for (const node of topLevel) {
    const deg = (adjacency.get(node.id) ?? []).length;
    if (deg > maxDeg) {
      maxDeg = deg;
      center = node;
    }
  }

  // BFS from center
  const dist = new Map<string, number>();
  dist.set(center.id, 0);
  const queue = [center.id];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    const d = dist.get(cur)!;
    for (const neighbor of adjacency.get(cur) ?? []) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, d + 1);
        queue.push(neighbor);
      }
    }
  }
  // Any disconnected nodes go to ring 1
  for (const node of topLevel) {
    if (!dist.has(node.id)) {
      dist.set(node.id, 1);
    }
  }

  // Group by ring
  const rings = new Map<number, SizedNode[]>();
  for (const node of topLevel) {
    const ring = dist.get(node.id) ?? 1;
    const bucket = rings.get(ring) ?? [];
    bucket.push(node);
    rings.set(ring, bucket);
  }

  // Compute max node diagonal
  let maxDiag = 0;
  for (const node of topLevel) {
    const diag = Math.sqrt(node.size.width ** 2 + node.size.height ** 2);
    maxDiag = Math.max(maxDiag, diag);
  }

  const GAP = 40;
  // Minimum radius must clear the center node diagonal plus gap
  const centerDiag = Math.sqrt(center.size.width ** 2 + center.size.height ** 2);
  const MIN_RADIUS = Math.ceil((centerDiag + maxDiag) / 2 + GAP);
  const positions = new Map<string, { x: number; y: number }>();

  // Ring 0 = center (offset so node center is at origin)
  positions.set(center.id, {
    x: Math.round(-center.size.width / 2),
    y: Math.round(-center.size.height / 2),
  });

  const maxRing = Math.max(...rings.keys());
  for (let r = 1; r <= maxRing; r++) {
    const nodesOnRing = rings.get(r) ?? [];
    if (nodesOnRing.length === 0) continue;

    const arcPerNode = maxDiag + GAP;
    const circumference = nodesOnRing.length * arcPerNode;
    const radius = Math.max(MIN_RADIUS * r, circumference / (2 * Math.PI));

    // Sort entry nodes first (angle offset = top)
    const sorted = [...nodesOnRing].sort((a, b) => {
      const aEntry = a.layout.role === 'entry' ? 0 : 1;
      const bEntry = b.layout.role === 'entry' ? 0 : 1;
      return aEntry - bEntry || a.id.localeCompare(b.id);
    });

    const angleStep = (2 * Math.PI) / sorted.length;
    const startAngle = -Math.PI / 2; // top

    for (let i = 0; i < sorted.length; i++) {
      const angle = startAngle + i * angleStep;
      positions.set(sorted[i].id, {
        x: Math.round(radius * Math.cos(angle) - sorted[i].size.width / 2),
        y: Math.round(radius * Math.sin(angle) - sorted[i].size.height / 2),
      });
    }
  }

  return positions;
}

async function positionWithElk(
  graph: SizedGraph,
  elkFactory: () => Promise<ElkLayoutEngine | undefined>,
  constraints?: SemanticConstraints
) {
  const elk = await elkFactory();
  if (!elk) {
    return undefined;
  }
  const input = buildElkGraphInput(graph, constraints);
  const result = await elk.layout(input);
  const positions = flattenElkPositions(result);

  const positioned: PositionedGraph = {
    ...graph,
    nodes: mapPositions(graph, positions),
    engine: 'elk',
    usedFallback: false,
    qualityScore: 0,
  };
  positioned.qualityScore = scorePositionedGraph(positioned);
  return positioned;
}

async function positionWithCompact(
  graph: SizedGraph,
  elkFactory: () => Promise<ElkLayoutEngine | undefined>
) {
  const elk = await elkFactory();
  if (!elk) {
    return undefined;
  }
  const input = buildCompactElkInput(graph);
  const result = await elk.layout(input);
  const positions = flattenElkPositions(result);

  const positioned: PositionedGraph = {
    ...graph,
    nodes: mapPositions(graph, positions),
    engine: 'elk',
    usedFallback: false,
    qualityScore: 0,
  };
  positioned.qualityScore = scorePositionedGraph(positioned);
  return positioned;
}

function positionWithRadial(graph: SizedGraph): PositionedGraph {
  const radialPositions = positionRadial(graph);
  const fullPositions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const node of graph.nodes) {
    const pos = radialPositions.get(node.id) ?? { x: 0, y: 0 };
    fullPositions.set(node.id, { ...pos, width: node.size.width, height: node.size.height });
  }

  const positioned: PositionedGraph = {
    ...graph,
    nodes: mapPositions(graph, fullPositions),
    engine: 'radial',
    usedFallback: false,
    qualityScore: 0,
  };
  positioned.qualityScore = scorePositionedGraph(positioned);
  return positioned;
}

export async function positionNodes(
  graph: SizedGraph,
  options: PositioningEngineOptions = {}
): Promise<PositionedGraph> {
  const fallbackLayout = options.fallbackLayout ?? ((model: ArchitectureDiagramModel) => fallbackLayoutWithGraphviz(model, graph.direction));

  if (options.forceGraphviz) {
    const laidOut = await fallbackLayout(toGraphvizModel(graph));
    return fromGraphvizModel(graph, laidOut);
  }

  // Strategy-based positioning (ELK only, no graphviz fallback)
  const elkFactory = options.elkFactory ?? defaultElkFactory;
  const strategyType = graph.strategy.type;

  if (strategyType === 'radial') {
    return positionWithRadial(graph);
  }

  const result = strategyType === 'compact'
    ? await positionWithCompact(graph, elkFactory)
    : await positionWithElk(graph, elkFactory, options.constraints);

  if (result) {
    return result;
  }

  throw new Error(`Layout failed: ELK returned no result for strategy '${strategyType}'`);
}
