import { Position, type Node } from '@xyflow/react';

type Rect = { x: number; y: number; width: number; height: number };

type InternalNode = Node & {
  positionAbsolute?: { x: number; y: number };
  measured?: { width?: number; height?: number };
};

const opposite: Record<Position, Position> = {
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
};

function nodeRect(node?: InternalNode): Rect | null {
  if (!node) return null;
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  const x = node.positionAbsolute?.x ?? node.position.x;
  const y = node.positionAbsolute?.y ?? node.position.y;
  return { x, y, width, height };
}

function center(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function intersection(rect: Rect, target: { x: number; y: number }) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const w = rect.width / 2;
  const h = rect.height / 2;
  const sx = dx === 0 ? Infinity : w / Math.abs(dx);
  const sy = dy === 0 ? Infinity : h / Math.abs(dy);
  const t = Math.min(sx, sy);
  return { x: cx + dx * t, y: cy + dy * t };
}

function sideFromDelta(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Position.Right : Position.Left;
  }
  return dy > 0 ? Position.Bottom : Position.Top;
}

export function getFloatingParams(
  sourceNode?: InternalNode | null,
  targetNode?: InternalNode | null
): {
  source: { x: number; y: number; position: Position };
  target: { x: number; y: number; position: Position };
} | null {
  const srcRect = nodeRect(sourceNode ?? undefined);
  const tgtRect = nodeRect(targetNode ?? undefined);
  if (!srcRect || !tgtRect) return null;

  const srcCenter = center(srcRect);
  const tgtCenter = center(tgtRect);
  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  const sourceSide = sideFromDelta(dx, dy);
  const targetSide = opposite[sourceSide];

  const sourceIntersect = intersection(srcRect, tgtCenter);
  const targetIntersect = intersection(tgtRect, srcCenter);

  return {
    source: { ...sourceIntersect, position: sourceSide },
    target: { ...targetIntersect, position: targetSide },
  };
}

type Point = { x: number; y: number };

const OBSTACLE_MARGIN = 12;

function inflateRect(rect: Rect, margin: number): Rect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + 2 * margin,
    height: rect.height + 2 * margin,
  };
}

function segmentIntersectsRect(p1: Point, p2: Point, rect: Rect): boolean {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;

  let tMin = 0;
  let tMax = 1;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  for (const [p, d, lo, hi] of [
    [p1.x, dx, minX, maxX],
    [p1.y, dy, minY, maxY],
  ] as [number, number, number, number][]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      const t1 = (lo - p) / d;
      const t2 = (hi - p) / d;
      const tEnter = Math.min(t1, t2);
      const tExit = Math.max(t1, t2);
      tMin = Math.max(tMin, tEnter);
      tMax = Math.min(tMax, tExit);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

function rectCorners(rect: Rect): Point[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

function distanceSq(a: Point, b: Point) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function findDetourPoints(
  source: Point,
  target: Point,
  obstacleRect: Rect
): Point[] {
  const inflated = inflateRect(obstacleRect, OBSTACLE_MARGIN);
  const corners = rectCorners(inflated);

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const perpX = -dy;
  const perpY = dx;

  const obstCenter = center(obstacleRect);
  const sideSign =
    perpX * (obstCenter.x - source.x) + perpY * (obstCenter.y - source.y);

  const sorted = corners
    .map((c) => ({
      point: c,
      side: perpX * (c.x - source.x) + perpY * (c.y - source.y),
    }))
    .sort((a, b) => {
      const aSameSide = Math.sign(a.side) === Math.sign(sideSign);
      const bSameSide = Math.sign(b.side) === Math.sign(sideSign);
      if (aSameSide !== bSameSide) return aSameSide ? 1 : -1;
      return distanceSq(a.point, source) - distanceSq(b.point, source);
    });

  const detour = sorted[0].point;
  const detour2 = sorted[1].point;

  const along1 =
    dx * (detour.x - source.x) + dy * (detour.y - source.y);
  const along2 =
    dx * (detour2.x - source.x) + dy * (detour2.y - source.y);

  if (along1 <= along2) {
    return [detour, detour2];
  }
  return [detour2, detour];
}

export type FloatingEdgePath = {
  points: Point[];
  sourcePosition: Position;
  targetPosition: Position;
};

export function getFloatingEdgePath(
  sourceNode: InternalNode | undefined | null,
  targetNode: InternalNode | undefined | null,
  obstacles: ReadonlyArray<InternalNode | undefined | null> = []
): FloatingEdgePath | null {
  const srcRect = nodeRect(sourceNode ?? undefined);
  const tgtRect = nodeRect(targetNode ?? undefined);
  if (!srcRect || !tgtRect) return null;

  const srcCenter = center(srcRect);
  const tgtCenter = center(tgtRect);
  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  const sourceSide = sideFromDelta(dx, dy);
  const targetSide = opposite[sourceSide];

  const sourcePoint = intersection(srcRect, tgtCenter);
  const targetPoint = intersection(tgtRect, srcCenter);

  const sourceId = sourceNode?.id;
  const targetId = targetNode?.id;
  const parentId = sourceNode?.parentId;

  const blockingRects: Rect[] = [];
  for (const obs of obstacles) {
    if (!obs || obs.id === sourceId || obs.id === targetId) continue;
    if (parentId && obs.id === parentId) continue;
    const r = nodeRect(obs);
    if (!r || r.width === 0 || r.height === 0) continue;
    if (segmentIntersectsRect(sourcePoint, targetPoint, inflateRect(r, 2))) {
      blockingRects.push(r);
    }
  }

  if (blockingRects.length === 0) {
    return {
      points: [sourcePoint, targetPoint],
      sourcePosition: sourceSide,
      targetPosition: targetSide,
    };
  }

  let waypoints: Point[] = [sourcePoint];
  for (const rect of blockingRects) {
    const detour = findDetourPoints(sourcePoint, targetPoint, rect);
    waypoints.push(...detour);
  }
  waypoints.push(targetPoint);

  const newSource = intersection(srcRect, waypoints[1] ?? tgtCenter);
  const newTarget = intersection(tgtRect, waypoints[waypoints.length - 2] ?? srcCenter);
  waypoints[0] = newSource;
  waypoints[waypoints.length - 1] = newTarget;

  return {
    points: waypoints,
    sourcePosition: sourceSide,
    targetPosition: targetSide,
  };
}
