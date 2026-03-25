import { Position } from '@xyflow/react';
import type { ArchitectureEdge } from '../types';
import type { LayoutConfig } from './types';
import type { PositionMap } from './coordinateAssignment';

type Point = { readonly x: number; readonly y: number };

type NodeRect = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly layer: number;
};

export type RoutedEdge = {
  readonly layoutPoints: Point[];
  readonly sourceAnchor: { readonly position: Position; readonly offset: number };
  readonly targetAnchor: { readonly position: Position; readonly offset: number };
  readonly labelPos: Point;
  readonly pathType: 'smooth';
};

/**
 * Route all edges through inter-layer channels to avoid crossing nodes.
 *
 * Runs as stage 4 after coordinate assignment in the Sugiyama pipeline.
 */
export function routeEdges(
  positions: PositionMap,
  edges: ReadonlyArray<ArchitectureEdge>,
  layers: ReadonlyArray<ReadonlyArray<string>>,
  config: LayoutConfig
): Map<string, RoutedEdge> {
  const result = new Map<string, RoutedEdge>();
  if (layers.length === 0 || edges.length === 0) return result;

  const isHorizontal = config.direction === 'RIGHT';

  // Build node rects with layer info
  const nodeLayerIndex = new Map<string, number>();
  for (let i = 0; i < layers.length; i++) {
    for (const id of layers[i]) {
      nodeLayerIndex.set(id, i);
    }
  }

  const nodeRects: NodeRect[] = [];
  for (const [id, pos] of positions) {
    const layer = nodeLayerIndex.get(id) ?? 0;
    nodeRects.push({ id, x: pos.x, y: pos.y, width: pos.width, height: pos.height, layer });
  }

  // Build layer bounds: for each layer, the min/max main-axis extent of its nodes
  const layerBounds = computeLayerBounds(nodeRects, layers.length, isHorizontal);

  // Compute channel midpoints between adjacent layers
  const channels = computeChannels(layerBounds, layers.length);

  // Group edges by which channels they traverse → assign distinct tracks
  // Only route multi-layer edges (skipping ≥1 layer) — adjacent/same-layer use default bezier
  const edgeChannelUsage = new Map<string, number[]>(); // edgeId → channel indices
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (!positions.has(edge.source) || !positions.has(edge.target)) continue;
    const srcLayer = nodeLayerIndex.get(edge.source) ?? 0;
    const tgtLayer = nodeLayerIndex.get(edge.target) ?? 0;
    const [minL, maxL] = srcLayer < tgtLayer ? [srcLayer, tgtLayer] : [tgtLayer, srcLayer];
    // Skip same-layer and adjacent-layer edges
    if (maxL - minL <= 1) continue;
    const usedChannels: number[] = [];
    for (let ch = minL; ch < maxL; ch++) {
      usedChannels.push(ch);
    }
    edgeChannelUsage.set(edge.id, usedChannels);
  }

  const channelTracks = assignChannelTracks(edgeChannelUsage, channels);

  // Collect node rects per layer for gap-finding
  const layerNodeRects = new Map<number, NodeRect[]>();
  for (const rect of nodeRects) {
    const list = layerNodeRects.get(rect.layer) ?? [];
    list.push(rect);
    layerNodeRects.set(rect.layer, list);
  }

  // Route each edge
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    const srcPos = positions.get(edge.source);
    const tgtPos = positions.get(edge.target);
    if (!srcPos || !tgtPos) continue;

    const srcLayer = nodeLayerIndex.get(edge.source) ?? 0;
    const tgtLayer = nodeLayerIndex.get(edge.target) ?? 0;
    const tracks = channelTracks.get(edge.id) ?? new Map<number, number>();

    const waypoints = computeWaypoints(
      { ...srcPos, id: edge.source, layer: srcLayer },
      { ...tgtPos, id: edge.target, layer: tgtLayer },
      channels,
      tracks,
      layerNodeRects,
      isHorizontal
    );

    // Skip edges with fewer than 4 waypoints — Catmull-Rom needs ≥4 points.
    // For straight or near-straight edges, the fallback bezier in RelationshipEdge works fine.
    if (waypoints.length < 4) continue;

    const sourcePort = waypoints[0];
    const targetPort = waypoints[waypoints.length - 1];

    const sourceAnchor = anchorFromSide(
      sourcePort,
      srcPos,
      isHorizontal,
      srcLayer <= tgtLayer ? 'forward' : 'backward'
    );
    const targetAnchor = anchorFromSide(
      targetPort,
      tgtPos,
      isHorizontal,
      srcLayer <= tgtLayer ? 'forward' : 'backward'
    );

    const labelPos = computeLabelPos(waypoints);

    result.set(edge.id, {
      layoutPoints: waypoints,
      sourceAnchor,
      targetAnchor,
      labelPos,
      pathType: 'smooth',
    });
  }

  return result;
}

// --- Internal helpers ---

type LayerBound = { readonly start: number; readonly end: number };

function computeLayerBounds(
  nodeRects: ReadonlyArray<NodeRect>,
  layerCount: number,
  isHorizontal: boolean
): LayerBound[] {
  const bounds: { start: number; end: number }[] = [];
  for (let i = 0; i < layerCount; i++) {
    bounds.push({ start: Infinity, end: -Infinity });
  }

  for (const rect of nodeRects) {
    const b = bounds[rect.layer];
    if (!b) continue;
    const start = isHorizontal ? rect.x : rect.y;
    const size = isHorizontal ? rect.width : rect.height;
    bounds[rect.layer] = {
      start: Math.min(b.start, start),
      end: Math.max(b.end, start + size),
    };
  }

  return bounds;
}

type Channel = { readonly mid: number; readonly start: number; readonly end: number };

function computeChannels(
  layerBounds: ReadonlyArray<LayerBound>,
  layerCount: number
): Channel[] {
  const channels: Channel[] = [];
  for (let i = 0; i < layerCount - 1; i++) {
    const prevEnd = layerBounds[i].end;
    const nextStart = layerBounds[i + 1].start;
    channels.push({
      start: prevEnd,
      end: nextStart,
      mid: (prevEnd + nextStart) / 2,
    });
  }
  return channels;
}

/**
 * Assign distinct track positions within each channel for edges that share it.
 * Returns Map<edgeId, Map<channelIndex, trackY>>.
 */
function assignChannelTracks(
  edgeChannelUsage: Map<string, number[]>,
  channels: ReadonlyArray<Channel>
): Map<string, Map<number, number>> {
  // Group edges by channel
  const channelEdges = new Map<number, string[]>();
  for (const [edgeId, chs] of edgeChannelUsage) {
    for (const ch of chs) {
      const list = channelEdges.get(ch) ?? [];
      list.push(edgeId);
      channelEdges.set(ch, list);
    }
  }

  const result = new Map<string, Map<number, number>>();

  for (const [ch, edgeIds] of channelEdges) {
    const channel = channels[ch];
    if (!channel) continue;

    const count = edgeIds.length;
    if (count === 1) {
      // Single edge — use channel midpoint
      const tracks = result.get(edgeIds[0]) ?? new Map<number, number>();
      tracks.set(ch, channel.mid);
      result.set(edgeIds[0], tracks);
      continue;
    }

    // Multiple edges — distribute evenly within channel
    const margin = Math.min(8, (channel.end - channel.start) * 0.1);
    const usableStart = channel.start + margin;
    const usableEnd = channel.end - margin;
    const step = (usableEnd - usableStart) / (count - 1);

    for (let i = 0; i < edgeIds.length; i++) {
      const trackPos = usableStart + i * step;
      const tracks = result.get(edgeIds[i]) ?? new Map<number, number>();
      tracks.set(ch, trackPos);
      result.set(edgeIds[i], tracks);
    }
  }

  return result;
}

function computeWaypoints(
  source: NodeRect,
  target: NodeRect,
  channels: ReadonlyArray<Channel>,
  tracks: Map<number, number>,
  layerNodeRects: Map<number, NodeRect[]>,
  isHorizontal: boolean
): Point[] {
  const srcCenter = isHorizontal
    ? { main: source.x + source.width / 2, cross: source.y + source.height / 2 }
    : { main: source.y + source.height / 2, cross: source.x + source.width / 2 };
  const tgtCenter = isHorizontal
    ? { main: target.x + target.width / 2, cross: target.y + target.height / 2 }
    : { main: target.y + target.height / 2, cross: target.x + target.width / 2 };

  const forward = source.layer <= target.layer;
  const srcExit = isHorizontal
    ? { main: forward ? source.x + source.width : source.x, cross: srcCenter.cross }
    : { main: forward ? source.y + source.height : source.y, cross: srcCenter.cross };
  const tgtEntry = isHorizontal
    ? { main: forward ? target.x : target.x + target.width, cross: tgtCenter.cross }
    : { main: forward ? target.y : target.y + target.height, cross: tgtCenter.cross };

  const toPoint = (main: number, cross: number): Point =>
    isHorizontal ? { x: main, y: cross } : { x: cross, y: main };

  const srcLayer = source.layer;
  const tgtLayer = target.layer;

  const [minLayer, maxLayer] = forward ? [srcLayer, tgtLayer] : [tgtLayer, srcLayer];

  const sourcePort = toPoint(srcExit.main, srcExit.cross);
  const targetPort = toPoint(tgtEntry.main, tgtEntry.cross);

  // Same-layer or adjacent-layer edges: no obstacles in between → let default bezier handle
  if (maxLayer - minLayer <= 1) {
    return [sourcePort, targetPort];
  }

  // Collect all intermediate node rects (layers between source and target)
  const intermediateRects: NodeRect[] = [];
  for (let layer = minLayer + 1; layer < maxLayer; layer++) {
    const rects = layerNodeRects.get(layer);
    if (rects) intermediateRects.push(...rects);
  }

  // If the direct line doesn't cross any intermediate node, use default bezier
  if (!lineIntersectsAnyRect(sourcePort, targetPort, intermediateRects)) {
    return [sourcePort, targetPort];
  }

  // Multi-layer edge — find one clear x-position through all intermediate layers
  // and route with minimal waypoints: source → (gapX, ch0) → (gapX, chN) → target
  const idealCross = (srcExit.cross + tgtEntry.cross) / 2;

  // Find a gap x-position that avoids all intermediate nodes
  const gapCross = findGapInLayer(
    srcExit.cross,
    idealCross,
    intermediateRects,
    isHorizontal
  );

  // Channel near source comes first, channel near target comes last
  const srcChIdx = forward ? minLayer : maxLayer - 1;
  const tgtChIdx = forward ? maxLayer - 1 : minLayer;
  const srcChMain = tracks.get(srcChIdx) ?? channels[srcChIdx]?.mid;
  const tgtChMain = tracks.get(tgtChIdx) ?? channels[tgtChIdx]?.mid;

  if (srcChMain === undefined || tgtChMain === undefined) {
    return [sourcePort, targetPort];
  }

  const waypoints = [
    sourcePort,
    toPoint(srcChMain, gapCross),
    toPoint(tgtChMain, gapCross),
    targetPort,
  ];

  // Detect hooks: if the routed path is much longer than the direct line,
  // or if it reverses direction (non-monotonic in main axis), skip routing
  if (hasHook(waypoints, isHorizontal)) {
    return [sourcePort, targetPort];
  }

  return waypoints;
}


/**
 * Detect if waypoints form a "hook" — the path reverses direction on the main axis
 * or takes a detour more than 2x the direct distance.
 */
function hasHook(points: ReadonlyArray<Point>, isHorizontal: boolean): boolean {
  if (points.length < 3) return false;

  // Check monotonicity on main axis: path should not reverse direction
  const mainValues = points.map((p) => isHorizontal ? p.x : p.y);
  const totalDir = Math.sign(mainValues[mainValues.length - 1] - mainValues[0]);
  if (totalDir !== 0) {
    for (let i = 1; i < mainValues.length; i++) {
      const segDir = Math.sign(mainValues[i] - mainValues[i - 1]);
      // Reversal on main axis = hook
      if (segDir !== 0 && segDir !== totalDir) return true;
    }
  }

  // Check detour ratio: routed length vs direct distance
  let routeLen = 0;
  for (let i = 1; i < points.length; i++) {
    routeLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  const directLen = Math.hypot(
    points[points.length - 1].x - points[0].x,
    points[points.length - 1].y - points[0].y
  );
  if (directLen > 0 && routeLen / directLen > 2.5) return true;

  return false;
}

/**
 * Check if a line segment from `a` to `b` intersects any node rectangle.
 * Uses a simple AABB test against the bezier's bounding box (the straight line).
 */
function lineIntersectsAnyRect(
  a: Point,
  b: Point,
  rects: ReadonlyArray<NodeRect>
): boolean {
  const margin = 5;
  for (const r of rects) {
    const rLeft = r.x - margin;
    const rRight = r.x + r.width + margin;
    const rTop = r.y - margin;
    const rBottom = r.y + r.height + margin;

    // Liang-Barsky line-rectangle intersection
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const p = [-dx, dx, -dy, dy];
    const q = [a.x - rLeft, rRight - a.x, a.y - rTop, rBottom - a.y];

    let tMin = 0;
    let tMax = 1;
    let skip = false;

    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) { skip = true; break; }
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0) {
          tMin = Math.max(tMin, t);
        } else {
          tMax = Math.min(tMax, t);
        }
        if (tMin > tMax) { skip = true; break; }
      }
    }

    if (!skip && tMin <= tMax) return true;
  }
  return false;
}

/**
 * Find a gap in a layer's nodes where an edge can pass through.
 * Returns the best cross-axis position between `current` and `target`
 * that doesn't overlap a node.
 */
function findGapInLayer(
  _currentCross: number,
  targetCross: number,
  rects: ReadonlyArray<NodeRect>,
  isHorizontal: boolean
): number {
  if (rects.length === 0) return targetCross;

  // Sort rects by cross-axis position
  const sorted = [...rects].sort((a, b) => {
    const aCross = isHorizontal ? a.y : a.x;
    const bCross = isHorizontal ? b.y : b.x;
    return aCross - bCross;
  });

  // Check if targetCross is already in a gap
  const margin = 15;
  const blocked = sorted.some((r) => {
    const rStart = (isHorizontal ? r.y : r.x) - margin;
    const rEnd = rStart + (isHorizontal ? r.height : r.width) + margin * 2;
    return targetCross >= rStart && targetCross <= rEnd;
  });

  if (!blocked) return targetCross;

  // Find the nearest gap
  const gaps: Array<{ pos: number; dist: number }> = [];

  // Gap before first node
  const firstStart = (isHorizontal ? sorted[0].y : sorted[0].x) - margin;
  gaps.push({ pos: firstStart - margin, dist: Math.abs(targetCross - (firstStart - margin)) });

  // Gaps between nodes
  for (let i = 0; i < sorted.length - 1; i++) {
    const endI = (isHorizontal ? sorted[i].y : sorted[i].x) + (isHorizontal ? sorted[i].height : sorted[i].width) + margin;
    const startNext = (isHorizontal ? sorted[i + 1].y : sorted[i + 1].x) - margin;
    if (startNext > endI) {
      const gapMid = (endI + startNext) / 2;
      gaps.push({ pos: gapMid, dist: Math.abs(targetCross - gapMid) });
    }
  }

  // Gap after last node
  const lastRect = sorted[sorted.length - 1];
  const lastEnd = (isHorizontal ? lastRect.y : lastRect.x) + (isHorizontal ? lastRect.height : lastRect.width) + margin;
  gaps.push({ pos: lastEnd + margin, dist: Math.abs(targetCross - (lastEnd + margin)) });

  // Pick closest gap
  gaps.sort((a, b) => a.dist - b.dist);
  return gaps[0]?.pos ?? targetCross;
}

function anchorFromSide(
  port: Point,
  rect: { x: number; y: number; width: number; height: number },
  _isHorizontal: boolean,
  _dir: 'forward' | 'backward'
): { position: Position; offset: number } {
  // Determine which side of the rect the port is closest to
  const distTop = Math.abs(port.y - rect.y);
  const distBottom = Math.abs(port.y - (rect.y + rect.height));
  const distLeft = Math.abs(port.x - rect.x);
  const distRight = Math.abs(port.x - (rect.x + rect.width));
  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distTop) {
    return { position: Position.Top, offset: clamp01((port.x - rect.x) / rect.width) };
  }
  if (minDist === distBottom) {
    return { position: Position.Bottom, offset: clamp01((port.x - rect.x) / rect.width) };
  }
  if (minDist === distLeft) {
    return { position: Position.Left, offset: clamp01((port.y - rect.y) / rect.height) };
  }
  return { position: Position.Right, offset: clamp01((port.y - rect.y) / rect.height) };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function computeLabelPos(points: ReadonlyArray<Point>): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  // Find midpoint along the polyline
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalLen += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  const half = totalLen / 2;
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const segLen = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    if (acc + segLen >= half) {
      const t = segLen > 0 ? (half - acc) / segLen : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    acc += segLen;
  }
  return points[points.length - 1];
}
