import type { LayoutQualityScore } from './types';
import type { RoutedGraph } from './edgeRouter';
import type { PositionedGraph, PositionedNode } from './positioningEngine';

type QualityGraph = PositionedGraph | RoutedGraph;

export const QUALITY_THRESHOLDS = {
  nodeOverlaps: 0,
  containerViolations: 0,
  labelOverlaps: 0,
  gatewayPlacementViolations: 0,
  edgeCrossings: {
    small: 0,
    medium: 3,
    large: 8,
  },
  laneViolations: {
    small: 0,
    medium: 1,
  },
  siblingAlignmentScore: 0.7,
  disconnectedPackingScore: 0.6,
} as const;

function rect(node: PositionedNode) {
  return {
    x1: node.absolutePosition.x,
    y1: node.absolutePosition.y,
    x2: node.absolutePosition.x + node.size.width,
    y2: node.absolutePosition.y + node.size.height,
  };
}

function contains(outer: ReturnType<typeof rect>, inner: ReturnType<typeof rect>) {
  return (
    outer.x1 <= inner.x1 &&
    outer.y1 <= inner.y1 &&
    outer.x2 >= inner.x2 &&
    outer.y2 >= inner.y2
  );
}

function overlaps(a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) {
  return !(a.x2 <= b.x1 || b.x2 <= a.x1 || a.y2 <= b.y1 || b.y2 <= a.y1);
}

function nodeOverlaps(graph: QualityGraph) {
  let count = 0;
  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const a = rect(graph.nodes[i]);
      const b = rect(graph.nodes[j]);
      if (contains(a, b) || contains(b, a)) {
        continue;
      }
      if (overlaps(a, b)) {
        count += 1;
      }
    }
  }
  return count;
}

function containerViolations(graph: QualityGraph) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  let count = 0;

  for (const node of graph.nodes) {
    if (!node.parentId) {
      continue;
    }
    const parent = nodeById.get(node.parentId);
    if (!parent) {
      continue;
    }
    const parentRect = rect(parent);
    const nodeRect = rect(node);
    if (!contains(parentRect, nodeRect)) {
      count += 1;
    }
  }

  return count;
}

function labelOverlaps(graph: QualityGraph) {
  const labels = graph.edges
    .map((edge) => edge.data?.labelPos)
    .filter((label): label is NonNullable<typeof label> => Boolean(label));
  let count = 0;

  for (const label of labels) {
    const labelRect = { x1: label.x - 36, y1: label.y - 10, x2: label.x + 36, y2: label.y + 10 };
    for (const node of graph.nodes) {
      if (overlaps(labelRect, rect(node))) {
        count += 1;
        break;
      }
    }
  }

  return count;
}

function segmentIntersects(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
) {
  const det = (p: typeof a1, q: typeof a1, r: typeof a1) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = det(a1, a2, b1);
  const d2 = det(a1, a2, b2);
  const d3 = det(b1, b2, a1);
  const d4 = det(b1, b2, a2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function edgeCrossings(graph: QualityGraph) {
  const polylines = graph.edges
    .map((edge) => edge.data?.layoutPoints)
    .filter((points): points is NonNullable<typeof points> => Boolean(points && points.length >= 2));
  let count = 0;

  for (let i = 0; i < polylines.length; i++) {
    for (let j = i + 1; j < polylines.length; j++) {
      const first = polylines[i];
      const second = polylines[j];
      for (let a = 0; a < first.length - 1; a++) {
        for (let b = 0; b < second.length - 1; b++) {
          if (segmentIntersects(first[a], first[a + 1], second[b], second[b + 1])) {
            count += 1;
          }
        }
      }
    }
  }

  return count;
}

function edgeLengthVariance(graph: QualityGraph) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const lengths = graph.edges
    .map((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) {
        return 0;
      }
      return Math.hypot(
        target.absolutePosition.x - source.absolutePosition.x,
        target.absolutePosition.y - source.absolutePosition.y
      );
    })
    .filter((length) => length > 0);

  if (!lengths.length) {
    return 0;
  }

  const mean = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
  return (
    lengths.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / lengths.length
  );
}

function siblingAlignmentScore(graph: QualityGraph) {
  const groups = new Map<string, PositionedNode[]>();
  for (const node of graph.nodes) {
    const key = node.parentId ?? '__root__';
    const group = groups.get(key) ?? [];
    group.push(node);
    groups.set(key, group);
  }

  let aligned = 0;
  let total = 0;
  for (const nodes of groups.values()) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        total += 1;
        const delta = graph.direction === 'LR' || graph.direction === 'RL'
          ? Math.abs(nodes[i].absolutePosition.y - nodes[j].absolutePosition.y)
          : Math.abs(nodes[i].absolutePosition.x - nodes[j].absolutePosition.x);
        if (delta <= 8) {
          aligned += 1;
        }
      }
    }
  }

  return total ? aligned / total : 1;
}

function laneViolations(graph: QualityGraph) {
  const axis = graph.direction === 'LR' || graph.direction === 'RL' ? 'x' : 'y';
  const sorted = [...graph.nodes].sort((a, b) => a.layout.semanticRank - b.layout.semanticRank);
  let count = 0;
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    if (axis === 'x' && current.absolutePosition.x < previous.absolutePosition.x - 8) {
      count += 1;
    }
    if (axis === 'y' && current.absolutePosition.y < previous.absolutePosition.y - 8) {
      count += 1;
    }
  }
  return count;
}

function gatewayPlacementViolations(graph: QualityGraph) {
  const axis = graph.direction === 'LR' || graph.direction === 'RL' ? 'x' : 'y';
  const entries = graph.nodes.filter((node) => node.layout.role === 'entry' || node.layout.role === 'frontend');
  const processors = graph.nodes.filter((node) => node.layout.role === 'processor' || node.layout.role === 'store');
  let count = 0;

  for (const gateway of graph.nodes.filter((node) => node.layout.role === 'gateway')) {
    const gatewayCoord = axis === 'x' ? gateway.absolutePosition.x : gateway.absolutePosition.y;
    const before = entries.some((node) => (axis === 'x' ? node.absolutePosition.x : node.absolutePosition.y) <= gatewayCoord);
    const after = processors.some((node) => (axis === 'x' ? node.absolutePosition.x : node.absolutePosition.y) >= gatewayCoord);
    if (!(before && after)) {
      count += 1;
    }
  }

  return count;
}

function disconnectedPackingScore(graph: QualityGraph) {
  const components = graph.profile.disconnectedComponents;
  if (components.length <= 1) {
    return 1;
  }

  let packedPairs = 0;
  let totalPairs = 0;
  const bounds = components.map((component) => {
    const nodes = [...component]
      .map((id) => graph.nodes.find((node) => node.id === id))
      .filter((node): node is PositionedNode => Boolean(node));
    return {
      x1: Math.min(...nodes.map((node) => node.absolutePosition.x)),
      y1: Math.min(...nodes.map((node) => node.absolutePosition.y)),
      x2: Math.max(...nodes.map((node) => node.absolutePosition.x + node.size.width)),
      y2: Math.max(...nodes.map((node) => node.absolutePosition.y + node.size.height)),
    };
  });

  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      totalPairs += 1;
      const gapX = Math.max(bounds[j].x1 - bounds[i].x2, bounds[i].x1 - bounds[j].x2, 0);
      const gapY = Math.max(bounds[j].y1 - bounds[i].y2, bounds[i].y1 - bounds[j].y2, 0);
      if (gapX >= 16 || gapY >= 16) {
        packedPairs += 1;
      }
    }
  }

  return totalPairs ? packedPairs / totalPairs : 1;
}

function edgeBendCount(graph: QualityGraph): number {
  let total = 0;
  for (const edge of graph.edges) {
    const points = edge.data?.layoutPoints;
    if (points && points.length > 2) {
      total += points.length - 2;
    }
  }
  return total;
}

function flowDirectionConsistency(graph: QualityGraph): number {
  if (graph.edges.length === 0) {
    return 1;
  }
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const isHorizontal = graph.direction === 'LR' || graph.direction === 'RL';
  const isReversed = graph.direction === 'RL' || graph.direction === 'BT';
  let consistent = 0;
  for (const edge of graph.edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) {
      continue;
    }
    const srcPos = isHorizontal ? src.absolutePosition.x : src.absolutePosition.y;
    const tgtPos = isHorizontal ? tgt.absolutePosition.x : tgt.absolutePosition.y;
    if (isReversed ? srcPos >= tgtPos : srcPos <= tgtPos) {
      consistent += 1;
    }
  }
  return consistent / graph.edges.length;
}

export function computeQualityScore(graph: QualityGraph): LayoutQualityScore {
  return {
    edgeCrossings: edgeCrossings(graph),
    nodeOverlaps: nodeOverlaps(graph),
    containerViolations: containerViolations(graph),
    labelOverlaps: labelOverlaps(graph),
    edgeLengthVariance: edgeLengthVariance(graph),
    edgeBendCount: edgeBendCount(graph),
    siblingAlignmentScore: siblingAlignmentScore(graph),
    laneViolations: laneViolations(graph),
    gatewayPlacementViolations: gatewayPlacementViolations(graph),
    disconnectedPackingScore: disconnectedPackingScore(graph),
    flowDirectionConsistency: flowDirectionConsistency(graph),
  };
}

export function qualityScoreValue(score: LayoutQualityScore, nodeCount: number) {
  const crossingBudget =
    nodeCount <= 8
      ? QUALITY_THRESHOLDS.edgeCrossings.small
      : nodeCount <= 20
        ? QUALITY_THRESHOLDS.edgeCrossings.medium
        : QUALITY_THRESHOLDS.edgeCrossings.large;
  const laneBudget = nodeCount <= 8 ? QUALITY_THRESHOLDS.laneViolations.small : QUALITY_THRESHOLDS.laneViolations.medium;
  const hardPenalty =
    score.nodeOverlaps * 0.3 +
    score.containerViolations * 0.2 +
    score.labelOverlaps * 0.1 +
    score.gatewayPlacementViolations * 0.2;
  const softPenalty =
    Math.max(0, score.edgeCrossings - crossingBudget) * 0.04 +
    Math.max(0, score.laneViolations - laneBudget) * 0.08 +
    Math.min(0.15, score.edgeLengthVariance / 1_000_000);
  const bonuses =
    Math.min(0.2, score.siblingAlignmentScore * 0.2) +
    Math.min(0.15, score.disconnectedPackingScore * 0.15);

  return Math.max(0, Math.min(1, 0.8 + bonuses - hardPenalty - softPenalty));
}

export function isQualityAcceptable(score: LayoutQualityScore, nodeCount: number) {
  const crossingBudget =
    nodeCount <= 8
      ? QUALITY_THRESHOLDS.edgeCrossings.small
      : nodeCount <= 20
        ? QUALITY_THRESHOLDS.edgeCrossings.medium
        : QUALITY_THRESHOLDS.edgeCrossings.large;
  const laneBudget = nodeCount <= 8 ? QUALITY_THRESHOLDS.laneViolations.small : QUALITY_THRESHOLDS.laneViolations.medium;

  return (
    score.nodeOverlaps <= QUALITY_THRESHOLDS.nodeOverlaps &&
    score.containerViolations <= QUALITY_THRESHOLDS.containerViolations &&
    score.labelOverlaps <= QUALITY_THRESHOLDS.labelOverlaps &&
    score.gatewayPlacementViolations <= QUALITY_THRESHOLDS.gatewayPlacementViolations &&
    score.edgeCrossings <= crossingBudget &&
    score.laneViolations <= laneBudget &&
    score.siblingAlignmentScore >= QUALITY_THRESHOLDS.siblingAlignmentScore &&
    score.disconnectedPackingScore >= QUALITY_THRESHOLDS.disconnectedPackingScore
  );
}
