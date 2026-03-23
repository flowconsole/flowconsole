import { Position } from '@xyflow/react';
import { anchorFromPoint, type LayoutEntry } from '../graphvizLayoutService';
import type { PositionedGraph, PositionedNode } from './positioningEngine';

export type RoutingStyle = 'orthogonal' | 'bezier' | 'polyline';

export type RoutedEdge = PositionedGraph['edges'][number] & {
  routing: {
    priority: number;
    style: RoutingStyle;
  };
};

export type RoutedGraph = Omit<PositionedGraph, 'edges'> & {
  edges: RoutedEdge[];
};

type Side = Position.Left | Position.Right | Position.Top | Position.Bottom;

function nodeBounds(node: PositionedNode): LayoutEntry {
  return {
    x: node.absolutePosition.x,
    y: node.absolutePosition.y,
    width: node.size.width,
    height: node.size.height,
  };
}

function centerOf(node: PositionedNode) {
  return {
    x: node.absolutePosition.x + node.size.width / 2,
    y: node.absolutePosition.y + node.size.height / 2,
  };
}

function sideOffset(bounds: LayoutEntry, side: Side, toward: { x: number; y: number }) {
  switch (side) {
    case Position.Left:
      return {
        x: bounds.x,
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, toward.y)),
      };
    case Position.Right:
      return {
        x: bounds.x + bounds.width,
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, toward.y)),
      };
    case Position.Top:
      return {
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, toward.x)),
        y: bounds.y,
      };
    case Position.Bottom:
      return {
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, toward.x)),
        y: bounds.y + bounds.height,
      };
    default:
      return { x: bounds.x, y: bounds.y };
  }
}

export function edgePriority(
  edge: PositionedGraph['edges'][number]
) {
  if (edge.data?.flowCurrent || edge.data?.activeFlow) {
    return 120;
  }
  switch (edge.data?.kind) {
    case 'sync':
      return 100;
    case 'async':
      return 70;
    case 'event':
      return 55;
    case 'dependency':
      return 30;
    default:
      return 50;
  }
}

export function selectPortSides(
  source: PositionedNode,
  target: PositionedNode,
  direction: PositionedGraph['direction'],
  edge: PositionedGraph['edges'][number]
) {
  const sourceBounds = nodeBounds(source);
  const targetBounds = nodeBounds(target);
  const sourceCenter = centerOf(source);
  const targetCenter = centerOf(target);
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaY = targetCenter.y - sourceCenter.y;
  const horizontal = direction === 'LR' || direction === 'RL';

  let sourceSide: Side = horizontal
    ? direction === 'RL'
      ? Position.Left
      : Position.Right
    : direction === 'BT'
      ? Position.Top
      : Position.Bottom;
  let targetSide: Side = horizontal
    ? direction === 'RL'
      ? Position.Right
      : Position.Left
    : direction === 'BT'
      ? Position.Bottom
      : Position.Top;

  const sourcePortModel = source.size.shape.portModel;
  const targetPortModel = target.size.shape.portModel;
  const isDependency = edge.data?.kind === 'dependency';

  if (horizontal && Math.abs(deltaY) > Math.abs(deltaX) * 0.75) {
    sourceSide = deltaY < 0 ? Position.Top : Position.Bottom;
    targetSide = deltaY < 0 ? Position.Bottom : Position.Top;
  }

  if (!horizontal && Math.abs(deltaX) > Math.abs(deltaY) * 0.75) {
    sourceSide = deltaX < 0 ? Position.Left : Position.Right;
    targetSide = deltaX < 0 ? Position.Right : Position.Left;
  }

  if (sourcePortModel === 'gateway' && horizontal) {
    sourceSide = deltaY < 0 ? Position.Top : Position.Bottom;
  }

  if (targetPortModel === 'database' || targetPortModel === 'queue') {
    targetSide = horizontal ? (deltaX < 0 ? Position.Right : Position.Left) : targetSide;
  }

  if (isDependency) {
    sourceSide = horizontal ? Position.Top : Position.Left;
  }

  const sourceAnchorPoint = sideOffset(sourceBounds, sourceSide, targetCenter);
  const targetAnchorPoint = sideOffset(targetBounds, targetSide, sourceCenter);

  return {
    sourceSide,
    targetSide,
    sourceAnchorPoint,
    targetAnchorPoint,
  };
}

function orthogonalRoute(source: { x: number; y: number }, target: { x: number; y: number }, direction: PositionedGraph['direction']) {
  if (direction === 'LR' || direction === 'RL') {
    const midX = (source.x + target.x) / 2;
    return [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target];
  }
  const midY = (source.y + target.y) / 2;
  return [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target];
}

function compactRoute(source: { x: number; y: number }, target: { x: number; y: number }) {
  return [source, { x: (source.x + target.x) / 2, y: source.y }, target];
}

function radialRoute(source: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  return [
    source,
    { x: source.x + dx / 3, y: source.y + dy / 6 },
    { x: source.x + (dx * 2) / 3, y: target.y - dy / 6 },
    target,
  ];
}

function routePoints(
  style: RoutingStyle,
  source: { x: number; y: number },
  target: { x: number; y: number },
  direction: PositionedGraph['direction']
) {
  switch (style) {
    case 'bezier':
      return radialRoute(source, target);
    case 'polyline':
      return compactRoute(source, target);
    default:
      return orthogonalRoute(source, target, direction);
  }
}

function midpoint(points: { x: number; y: number }[]) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }
  const midIndex = Math.floor((points.length - 1) / 2);
  const start = points[midIndex];
  const end = points[midIndex + 1] ?? start;
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

function labelSideForDirection(direction: PositionedGraph['direction']) {
  switch (direction) {
    case 'TB':
      return 'right' as const;
    case 'BT':
      return 'left' as const;
    case 'RL':
      return 'below' as const;
    default:
      return 'above' as const;
  }
}

export function routeEdges(graph: PositionedGraph): RoutedGraph {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  const edges = [...graph.edges]
    .sort((a, b) => edgePriority(b) - edgePriority(a))
    .map((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) {
        return {
          ...edge,
          routing: { priority: edgePriority(edge), style: 'orthogonal' as RoutingStyle },
        };
      }

      const { sourceAnchorPoint, targetAnchorPoint } = selectPortSides(
        source,
        target,
        graph.direction,
        edge
      );
      const style: RoutingStyle =
        graph.strategy.type === 'radial'
          ? 'bezier'
          : graph.strategy.type === 'compact'
            ? 'polyline'
            : 'orthogonal';
      const layoutPoints = routePoints(style, sourceAnchorPoint, targetAnchorPoint, graph.direction);
      const sourceAnchor = anchorFromPoint(sourceAnchorPoint, nodeBounds(source));
      const targetAnchor = anchorFromPoint(targetAnchorPoint, nodeBounds(target));
      const labelPos = midpoint(layoutPoints);

      return {
        ...edge,
        data: {
          ...edge.data,
          layoutPoints,
          sourceAnchor,
          targetAnchor,
          labelPos,
          labelSide: labelSideForDirection(graph.direction),
        },
        routing: {
          priority: edgePriority(edge),
          style,
        },
      } satisfies RoutedEdge;
    });

  return {
    ...graph,
    edges,
  };
}
