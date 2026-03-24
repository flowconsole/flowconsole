import type { ArchitectureDiagramModel, AutoLayoutConfig } from '../types';
import type { NotationAdapter } from './notation/types';
import type {
  GraphProfile,
  LaneAxis,
  LayoutDirection,
  LayoutStrategy,
  RankedEdge,
  RankedGraph,
  RankedNode,
  SemanticLane,
  SemanticNode,
} from './types';

const NATURAL_LANE_ORDER: readonly SemanticLane[] = [
  'leading',
  'central-early',
  'central',
  'central-late',
  'supporting',
  'trailing',
];

function axisForDirection(direction: LayoutDirection): LaneAxis {
  return direction === 'LR' || direction === 'RL' ? 'x' : 'y';
}

function orderForDirection(direction: LayoutDirection) {
  return direction === 'RL' || direction === 'BT'
    ? [...NATURAL_LANE_ORDER].reverse()
    : [...NATURAL_LANE_ORDER];
}

function normalizeLane(lane: string): SemanticLane {
  switch (lane) {
    case 'leading':
    case 'central-early':
    case 'central':
    case 'central-late':
    case 'supporting':
    case 'trailing':
      return lane;
    default:
      return 'central';
  }
}

function laneForNode(
  node: SemanticNode,
  role: GraphProfile['nodeRoles'] extends ReadonlyMap<string, infer R> ? R : never,
  profile: GraphProfile,
  notation: NotationAdapter
) {
  if (role === 'frontend' && (profile.inDegree.get(node.id) ?? 0) === 0) {
    return 'leading' as const;
  }
  return normalizeLane(notation.lanePolicy(node, role));
}

function rankNodes(
  model: ArchitectureDiagramModel,
  profile: GraphProfile,
  strategy: LayoutStrategy,
  notation: NotationAdapter
) {
  const axis = axisForDirection(strategy.direction);
  const laneOrder = orderForDirection(strategy.direction);
  const laneIndexByName = new Map(laneOrder.map((lane, idx) => [lane, idx]));
  const semanticIndexByName = new Map(NATURAL_LANE_ORDER.map((lane, idx) => [lane, idx]));

  const nodes: RankedNode[] = model.nodes.map((node) => {
    const semanticNode = node as SemanticNode;
    const role = profile.nodeRoles.get(node.id) ?? notation.classifyNode(semanticNode);
    const lane = laneForNode(semanticNode, role, profile, notation);

    return {
      ...semanticNode,
      layout: {
        role,
        lane,
        laneIndex: laneIndexByName.get(lane) ?? 0,
        semanticRank: semanticIndexByName.get(lane) ?? 0,
        axis,
        direction: strategy.direction,
        inDegree: profile.inDegree.get(node.id) ?? 0,
        outDegree: profile.outDegree.get(node.id) ?? 0,
        order: 0,
      },
    };
  });

  const grouped = new Map<SemanticLane, RankedNode[]>();
  for (const node of nodes) {
    const bucket = grouped.get(node.layout.lane) ?? [];
    bucket.push(node);
    grouped.set(node.layout.lane, bucket);
  }

  for (const bucket of grouped.values()) {
    bucket
      .sort(
        (a, b) =>
          b.layout.outDegree - a.layout.outDegree ||
          a.layout.inDegree - b.layout.inDegree ||
          (a.data.title ?? '').localeCompare(b.data.title ?? '')
      )
      .forEach((node, index) => {
        node.layout.order = index;
      });
  }

  return { nodes, axis, laneOrder };
}

function rankEdges(
  model: ArchitectureDiagramModel,
  rankedNodes: RankedNode[]
) {
  const nodeById = new Map(rankedNodes.map((node) => [node.id, node]));

  return model.edges.map((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    const sourceLane = sourceNode?.layout.lane ?? 'central';
    const targetLane = targetNode?.layout.lane ?? 'central';
    const semanticPriority = Math.max(
      0,
      10 - Math.abs((sourceNode?.layout.semanticRank ?? 0) - (targetNode?.layout.semanticRank ?? 0))
    );

    return {
      ...(edge as RankedEdge),
      layout: {
        sourceLane,
        targetLane,
        semanticPriority,
        isBackEdge:
          (targetNode?.layout.semanticRank ?? 0) < (sourceNode?.layout.semanticRank ?? 0),
      },
    } satisfies RankedEdge;
  });
}

export function rankSemantically(
  model: ArchitectureDiagramModel,
  profile: GraphProfile,
  strategy: LayoutStrategy,
  notation: NotationAdapter,
  config: AutoLayoutConfig = {}
): RankedGraph {
  const { nodes, axis, laneOrder } = rankNodes(model, profile, strategy, notation);
  const edges = rankEdges(model, nodes);

  return {
    nodes,
    edges,
    profile,
    strategy,
    notation: config.notation ?? notation.notationId,
    preset: config.preset ?? notation.defaultPreset,
    direction: strategy.direction,
    laneAxis: axis,
    laneOrder,
  };
}
