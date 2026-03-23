import type { ArchitectureDiagramModel, ArchitectureNode } from '../types';
import { layoutWithGraphviz } from '../graphvizLayoutService';
import type { SizedGraph, SizedNode } from './shapeSizing';
import type { RankedNode } from './types';
import { computeQualityScore, qualityScoreValue } from './qualityScore';

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
  engine: 'elk' | 'graphviz' | 'analytical';
  usedFallback: boolean;
  qualityScore: number;
};

type ElkLayoutEngine = {
  layout(graph: ElkGraphInput): Promise<ElkNodeLike & { children?: ElkNodeLike[] }>;
};

type PositioningEngineOptions = {
  elkFactory?: () => Promise<ElkLayoutEngine | undefined>;
  fallbackLayout?: (model: ArchitectureDiagramModel) => Promise<ArchitectureDiagramModel>;
  qualityEvaluator?: (graph: PositionedGraph) => number;
  minQuality?: number;
};

const DEFAULT_MIN_QUALITY = 0.55;

const ROLE_ORDER: Record<RankedNode['layout']['role'], number> = {
  entry: 0,
  frontend: 1,
  gateway: 2,
  processor: 3,
  worker: 4,
  queue: 5,
  store: 6,
  external: 7,
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

function defaultElkFactory() {
  return new Function(
    'specifier',
    'return import(specifier).then((mod) => mod.default ? new mod.default() : new mod.ELK())'
  )('elkjs/lib/elk.bundled.js') as Promise<ElkLayoutEngine>;
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

export function buildElkGraphInput(graph: SizedGraph): ElkGraphInput {
  const childrenByParent = buildTree(graph);
  const buildChildren = (parentId?: string): ElkNodeLike[] =>
    (childrenByParent.get(parentId) ?? []).map((node) => ({
      id: node.id,
      width: node.size.width,
      height: node.size.height,
      layoutOptions: {
        'org.eclipse.elk.partitioning.partition': String(node.layout.semanticRank),
        'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
      },
      children: buildChildren(node.id),
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
      'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
    },
    children: buildChildren(undefined),
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

function sortCompactNodes(nodes: SizedNode[]) {
  return [...nodes].sort(
    (a, b) =>
      ROLE_ORDER[a.layout.role] - ROLE_ORDER[b.layout.role] ||
      b.layout.outDegree - a.layout.outDegree ||
      a.data.title.localeCompare(b.data.title)
  );
}

function positionCompact(graph: SizedGraph): PositionedGraph {
  const sorted = sortCompactNodes(graph.nodes);
  const maxWidth = Math.max(...sorted.map((node) => node.size.width), 0);
  const maxHeight = Math.max(...sorted.map((node) => node.size.height), 0);
  const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length * 1.5)));
  const cellWidth = maxWidth + graph.strategy.spacing.node;
  const cellHeight = maxHeight + graph.strategy.spacing.node;

  const positioned = sorted.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...cloneNode(node),
      size: node.size,
      position: { x: col * cellWidth, y: row * cellHeight },
      absolutePosition: { x: col * cellWidth, y: row * cellHeight },
    } satisfies PositionedNode;
  });

  const byId = new Map(positioned.map((node) => [node.id, node]));
  const nodes = graph.nodes.map((node) => byId.get(node.id) ?? byId.get(sorted[0]?.id ?? '')) as PositionedNode[];
  const result = {
    ...graph,
    nodes: normalizeBounds(nodes),
    engine: 'analytical',
    usedFallback: false,
    qualityScore: 0,
  } satisfies PositionedGraph;
  result.qualityScore = scorePositionedGraph(result);
  return result;
}

function buildUndirectedAdjacency(graph: SizedGraph) {
  const adjacency = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }
  return adjacency;
}

function positionRadial(graph: SizedGraph): PositionedGraph {
  const adjacency = buildUndirectedAdjacency(graph);
  const topLevelContainer = graph.nodes.find((node) => node.type === 'container' && !node.parentId);
  const center =
    topLevelContainer ??
    [...graph.nodes].sort(
      (a, b) =>
        (adjacency.get(b.id)?.size ?? 0) - (adjacency.get(a.id)?.size ?? 0) ||
        a.data.title.localeCompare(b.data.title)
    )[0];

  const levels = new Map<string, number>();
  const queue = center ? [{ id: center.id, level: 0 }] : [];
  while (queue.length) {
    const current = queue.shift();
    if (!current || levels.has(current.id)) {
      continue;
    }
    levels.set(current.id, current.level);
    for (const neighbor of adjacency.get(current.id) ?? []) {
      if (!levels.has(neighbor)) {
        queue.push({ id: neighbor, level: current.level + 1 });
      }
    }
  }

  const rings = new Map<number, SizedNode[]>();
  for (const node of graph.nodes) {
    const level = levels.get(node.id) ?? 0;
    const ring = rings.get(level) ?? [];
    ring.push(node);
    rings.set(level, ring);
  }

  const positioned: PositionedNode[] = [];
  const baseRadius = Math.max(...graph.nodes.map((node) => node.size.width), 180);
  for (const [level, nodes] of [...rings.entries()].sort((a, b) => a[0] - b[0])) {
    if (level === 0) {
      const node = nodes[0];
      positioned.push({
        ...cloneNode(node),
        size: node.size,
        position: { x: baseRadius, y: baseRadius },
        absolutePosition: { x: baseRadius, y: baseRadius },
      });
      continue;
    }

    const radius = baseRadius + level * (graph.strategy.spacing.layer + baseRadius / 2);
    const ordered = [...nodes].sort(
      (a, b) =>
        Number(b.layout.role === 'entry') - Number(a.layout.role === 'entry') ||
        a.data.title.localeCompare(b.data.title)
    );
    const angleStep = (Math.PI * 2) / Math.max(ordered.length, 1);
    ordered.forEach((node, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const x = baseRadius + Math.cos(angle) * radius;
      const y = baseRadius + Math.sin(angle) * radius;
      positioned.push({
        ...cloneNode(node),
        size: node.size,
        position: { x, y },
        absolutePosition: { x, y },
      });
    });
  }

  const byId = new Map(positioned.map((node) => [node.id, node]));
  const nodes = graph.nodes.map((node) => byId.get(node.id) ?? positioned[0]) as PositionedNode[];
  const result = {
    ...graph,
    nodes: normalizeBounds(nodes),
    engine: 'analytical',
    usedFallback: false,
    qualityScore: 0,
  } satisfies PositionedGraph;
  result.qualityScore = scorePositionedGraph(result);
  return result;
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

async function positionLayeredWithElk(
  graph: SizedGraph,
  elkFactory: () => Promise<ElkLayoutEngine | undefined>
) {
  const elk = await elkFactory();
  if (!elk) {
    return undefined;
  }
  const input = buildElkGraphInput(graph);
  const result = await elk.layout(input);
  const positions = flattenElkPositions(result);
  return {
    input,
    graph: {
      ...graph,
      nodes: mapPositions(graph, positions),
      engine: 'elk',
      usedFallback: false,
      qualityScore: 0,
    } as PositionedGraph,
  };
}

export async function positionNodes(
  graph: SizedGraph,
  options: PositioningEngineOptions = {}
): Promise<PositionedGraph> {
  const qualityEvaluator = options.qualityEvaluator ?? scorePositionedGraph;
  const minQuality = options.minQuality ?? DEFAULT_MIN_QUALITY;
  const fallbackLayout = options.fallbackLayout ?? layoutWithGraphviz;

  if (graph.strategy.type === 'compact') {
    return positionCompact(graph);
  }

  if (graph.strategy.type === 'radial') {
    return positionRadial(graph);
  }

  let elkCandidate: PositionedGraph | undefined;
  try {
    const elkFactory = options.elkFactory ?? defaultElkFactory;
    const positioned = await positionLayeredWithElk(graph, elkFactory);
    elkCandidate = positioned?.graph;
    if (elkCandidate) {
      elkCandidate.qualityScore = qualityEvaluator(elkCandidate);
    }
  } catch {
    elkCandidate = undefined;
  }

  const fallbackCandidate = async () => {
    const laidOut = await fallbackLayout(toGraphvizModel(graph));
    const candidate = fromGraphvizModel(graph, laidOut);
    candidate.qualityScore = qualityEvaluator(candidate);
    return candidate;
  };

  if (!elkCandidate) {
    return fallbackCandidate();
  }

  if (elkCandidate.qualityScore >= minQuality) {
    return elkCandidate;
  }

  const graphvizCandidate = await fallbackCandidate();
  return graphvizCandidate.qualityScore > elkCandidate.qualityScore ? graphvizCandidate : elkCandidate;
}
