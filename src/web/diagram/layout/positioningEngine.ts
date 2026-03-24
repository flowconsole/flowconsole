import type { ArchitectureDiagramModel, ArchitectureNode } from '../types';
import { layoutWithGraphviz } from '../graphvizLayoutService';
import type { SizedGraph, SizedNode } from './shapeSizing';
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
  engine: 'elk' | 'graphviz';
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

async function positionWithElk(
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

export async function positionNodes(
  graph: SizedGraph,
  options: PositioningEngineOptions = {}
): Promise<PositionedGraph> {
  const fallbackLayout = options.fallbackLayout ?? ((model: ArchitectureDiagramModel) => layoutWithGraphviz(model, graph.direction));

  if (options.forceGraphviz) {
    const laidOut = await fallbackLayout(toGraphvizModel(graph));
    return fromGraphvizModel(graph, laidOut);
  }

  // ELK is the primary engine
  try {
    const elkFactory = options.elkFactory ?? defaultElkFactory;
    const elkResult = await positionWithElk(graph, elkFactory);
    if (elkResult) {
      return elkResult;
    }
  } catch (err) {
    console.warn('[layout] ELK positioning failed, falling back to graphviz:', err);
  }

  // Graphviz is the only fallback
  try {
    const laidOut = await fallbackLayout(toGraphvizModel(graph));
    return fromGraphvizModel(graph, laidOut);
  } catch (err) {
    throw new Error(`Layout failed: both ELK and graphviz engines failed. Last error: ${err}`);
  }
}
