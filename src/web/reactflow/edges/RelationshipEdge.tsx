import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  useInternalNode,
  useReactFlow,
  useStore,
  type EdgeProps,
  type XYPosition,
} from '@xyflow/react';
import { curveCatmullRomOpen, line } from 'd3-shape';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { relationshipStroke } from '../../diagram/theme';
import type { RelationshipEdgeType } from '../../diagram/types';
import { getFloatingEdgePath } from '../utils/floating';

type Point = XYPosition;
const catmullRomLine = line<Point>()
  .curve(curveCatmullRomOpen.alpha(0.7))
  .x((d) => Math.round(d.x))
  .y((d) => Math.round(d.y));

function smoothPath(points: Point[] | undefined) {
  if (!points || points.length < 2) return undefined;
  return catmullRomLine(points) ?? undefined;
}

function polylinePath(points: Point[]) {
  if (points.length < 2) return undefined;
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ');
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(points: Point[]) {
  if (points.length === 0) return undefined;
  if (points.length === 1) return points[0];
  const segmentLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = distance(points[i], points[i + 1]);
    segmentLengths.push(len);
    total += len;
  }
  if (total === 0) return points[0];
  const target = total / 2;
  let acc = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const len = segmentLengths[i];
    if (acc + len >= target) {
      const t = (target - acc) / (len || 1);
      const start = points[i];
      const end = points[i + 1];
      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      };
    }
    acc += len;
  }
  return points[points.length - 1];
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const segLenSq = Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2);
  if (segLenSq === 0) return distance(point, start);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
        segLenSq
    )
  );
  const proj = {
    x: start.x + t * (end.x - start.x),
    y: start.y + t * (end.y - start.y),
  };
  return distance(point, proj);
}

function insertControlPoint(
  controlPoints: Point[],
  newPoint: Point,
  start: Point,
  end: Point
) {
  const allPoints = [start, ...controlPoints, end];
  let insertIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < allPoints.length - 1; i++) {
    const dist = distanceToSegment(newPoint, allPoints[i], allPoints[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
      insertIndex = i;
    }
  }
  const next = controlPoints.slice();
  const targetIndex = Math.min(insertIndex, controlPoints.length);
  next.splice(targetIndex, 0, newPoint);
  return next;
}

export function RelationshipEdge(props: EdgeProps<RelationshipEdgeType>) {
  const {
    id,
    style,
    data,
    selected,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  } = props;

  const [localHovered, setLocalHovered] = useState(false);
  const flowCurrent = Boolean(data?.flowCurrent);
  const hovered = (data?.hovered ?? localHovered) || flowCurrent;
  const flowTick = data?.flowTick ?? 0;
  const [draftPoints, setDraftPoints] = useState<Point[] | null>(null);
  const [isDraggingControl, setIsDraggingControl] = useState(false);
  const draftRef = useRef<Point[] | null>(null);
  draftRef.current = draftPoints;
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const reactFlow = useReactFlow();
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  // Collect sibling nodes as potential obstacles for floating edge routing
  const obstacleNodes = useStore(
    useMemo(
      () => (state) => {
        const nodes: Array<ReturnType<typeof useInternalNode>> = [];
        state.nodeLookup.forEach((n) => {
          if (n.id !== source && n.id !== target) {
            nodes.push(n as ReturnType<typeof useInternalNode>);
          }
        });
        return nodes;
      },
      [source, target]
    )
  );

  // Floating edge: compute connection points on node boundaries + avoid obstacles
  const floatingEdge = useMemo(
    () => getFloatingEdgePath(sourceNode, targetNode, obstacleNodes),
    [sourceNode, targetNode, obstacleNodes]
  );

  const sx = floatingEdge?.points[0]?.x ?? sourceX;
  const sy = floatingEdge?.points[0]?.y ?? sourceY;
  const tx = floatingEdge?.points[floatingEdge.points.length - 1]?.x ?? targetX;
  const ty = floatingEdge?.points[floatingEdge.points.length - 1]?.y ?? targetY;
  const sourcePos = floatingEdge?.sourcePosition ?? sourcePosition ?? Position.Right;
  const targetPos = floatingEdge?.targetPosition ?? targetPosition ?? Position.Left;

  // Floating path: straight line for 2 points, smooth curve for obstacle waypoints
  const floatingPath = useMemo(() => {
    if (!floatingEdge || floatingEdge.points.length < 2) return undefined;
    if (floatingEdge.points.length === 2) {
      // Direct connection — straight line (avoids bezier bulge through nodes)
      const [p0, p1] = floatingEdge.points;
      return `M ${p0.x},${p0.y} L ${p1.x},${p1.y}`;
    }
    return smoothPath(floatingEdge.points) ?? polylinePath(floatingEdge.points);
  }, [floatingEdge]);

  const [fallbackPath, fallbackLabelX, fallbackLabelY] = useMemo(
    () =>
      getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
      }),
    [sourcePos, sx, sy, targetPos, tx, ty]
  );

  const storedControlPoints = data?.controlPoints ?? [];
  const controlPoints = draftPoints ?? storedControlPoints;

  const manualPath = useMemo(() => {
    if (!controlPoints.length) return undefined;
    const manualPoints = [{ x: sx, y: sy }, ...controlPoints, { x: tx, y: ty }];
    const path = smoothPath(manualPoints);
    const labelPoint = midpoint(manualPoints);
    return path
      ? {
            path,
            labelPoint,
          }
      : undefined;
  }, [controlPoints, sx, sy, tx, ty]);

  const floatingLabelPoint = useMemo(() => {
    if (floatingEdge?.points?.length) {
      return midpoint(floatingEdge.points);
    }
    return undefined;
  }, [floatingEdge]);

  const resolvedPath = manualPath?.path ?? floatingPath ?? fallbackPath;
  const resolvedLabelPoint =
    manualPath?.labelPoint ?? floatingLabelPoint ?? { x: fallbackLabelX, y: fallbackLabelY };

  const stroke = relationshipStroke(data?.kind);
  const direction = data?.direction ?? 'forward';
  const isDirectional = direction !== 'none';
  const markerStart = direction === 'both' ? `url(#${id}-start)` : undefined;
  const markerEnd = isDirectional ? `url(#${id}-end)` : undefined;
  const hasIcon = Boolean(data?.icon);
  const isAnimated = isDirectional && hovered;
  const animationDirection =
    direction === 'forward' ? 'reverse' : direction === 'both' ? 'alternate' : 'normal';
  const animatedStyle = isAnimated
    ? { strokeDasharray: '8 10', animationDirection }
    : undefined;
  const flowStyle = data?.flowHighlighted ? { strokeWidth: 3 } : undefined;
  const interactionWidth = 20;

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.max(Math.hypot(dx, dy), 1);

  const side = data?.labelSide ?? 'above';
  const offset = 18;
  let offsetX = 0;
  let offsetY = 0;
  if (side === 'above') {
    offsetX = (-dy / len) * offset;
    offsetY = (dx / len) * offset;
  } else if (side === 'below') {
    offsetX = (dy / len) * offset;
    offsetY = (-dx / len) * offset;
  } else if (side === 'left') {
    offsetX = (-dx / len) * offset;
    offsetY = (-dy / len) * offset;
  } else if (side === 'right') {
    offsetX = (dx / len) * offset;
    offsetY = (dy / len) * offset;
  }

  const updateEdgeData = useCallback(
    (partial: Partial<NonNullable<RelationshipEdgeType['data']>>) => {
      reactFlow.setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  ...partial,
                },
              }
            : edge
        )
      );
    },
    [id, reactFlow]
  );

  const commitControlPoints = useCallback(
    (points: Point[]) => {
      const manualPoints = [{ x: sx, y: sy }, ...points, { x: tx, y: ty }];
      updateEdgeData({
        controlPoints: points,
        labelPos: midpoint(manualPoints) ?? resolvedLabelPoint,
      });
    },
    [sx, sy, tx, ty, updateEdgeData, resolvedLabelPoint]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent<SVGPathElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const flow = reactFlow.screenToFlowPosition(
        {
          x: event.clientX,
          y: event.clientY,
        },
        { snapToGrid: false }
      );
      const next = insertControlPoint(storedControlPoints, flow, { x: sx, y: sy }, { x: tx, y: ty });
      commitControlPoints(next);
    },
    [reactFlow, storedControlPoints, sx, sy, tx, ty, commitControlPoints]
  );

  const handleControlPointerDown = useCallback(
    (index: number) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        if (storedControlPoints.length <= index) return;
        const next = storedControlPoints.slice();
        next.splice(index, 1);
        commitControlPoints(next);
        return;
      }
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingControl(true);
      const pointerId = event.pointerId;
      const initialPoints = (draftRef.current ?? storedControlPoints).map((p) => ({ ...p }));
      setDraftPoints(initialPoints);
      let moved = false;
      const handleMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        moved = true;
        const nextPos = reactFlow.screenToFlowPosition(
          { x: ev.clientX, y: ev.clientY },
          { snapToGrid: false }
        );
        setDraftPoints((prev) => {
          const next = (prev ?? initialPoints).map((p) => ({ ...p }));
          next[index] = { x: Math.round(nextPos.x), y: Math.round(nextPos.y) };
          return next;
        });
      };
      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        dragCleanupRef.current = null;
      };
      const handleUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        const finalPoints = draftRef.current ?? initialPoints;
        setDraftPoints(null);
        setIsDraggingControl(false);
        if (moved && finalPoints) {
          commitControlPoints(finalPoints);
        }
      };
      dragCleanupRef.current?.();
      dragCleanupRef.current = cleanup;
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [commitControlPoints, reactFlow, storedControlPoints]
  );

  const showControlPoints =
    (controlPoints.length > 0 || isDraggingControl) && (selected || hovered || isDraggingControl);

  if (!resolvedPath) {
    return null;
  }

  return (
    <g key={`${id}-${flowTick}-${flowCurrent ? 'flow' : 'idle'}`}>
      {isDirectional ? (
        <defs>
          <marker
            id={`${id}-end`}
            markerWidth="18"
            markerHeight="18"
            refX="9"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M2,2 L10,6 L2,10 Z" fill={stroke.stroke} />
          </marker>
          {direction === 'both' ? (
            <marker
              id={`${id}-start`}
              markerWidth="18"
              markerHeight="18"
              refX="9"
              refY="6"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path d="M2,2 L10,6 L2,10 Z" fill={stroke.stroke} />
            </marker>
          ) : null}
        </defs>
      ) : null}

      <BaseEdge
        id={id}
        path={resolvedPath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          strokeWidth: 2.4,
          ...stroke,
          ...animatedStyle,
          ...flowStyle,
          ...style,
          opacity: data?.muted ? 0.7 : 1,
        }}
        className={[
          'relationship-path',
          isDirectional ? 'relationship-path--directional' : '',
          isAnimated ? 'relationship-path--animated' : '',
          data?.flowHighlighted ? 'relationship-path--flow' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onContextMenu={handleEdgeContextMenu}
        interactionWidth={0}
      />

      <path
        d={resolvedPath}
        fill="none"
        stroke="transparent"
        strokeWidth={interactionWidth}
        className="relationship-path-interaction"
        onMouseEnter={() => setLocalHovered(true)}
        onMouseLeave={() => setLocalHovered(false)}
        onContextMenu={handleEdgeContextMenu}
      />

      {false && (data?.label || data?.detail || hasIcon) && (
        <EdgeLabelRenderer>
          <div
            className="relationship-label"
            style={{
              transform: `translate(-50%, -50%) translate(${resolvedLabelPoint.x + offsetX}px, ${
                resolvedLabelPoint.y + offsetY
              }px)`,
              borderColor: stroke.stroke,
            }}
          >
            {hasIcon ? <span className="relationship-label__icon">{data?.icon}</span> : null}
            {data?.label ? <span className="relationship-label__main">{data?.label}</span> : null}
            {data?.detail ? (
              <span className="relationship-label__detail">{data?.detail}</span>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      )}

      {showControlPoints ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            {controlPoints.map((point, index) => (
              <div
                key={`${id}-cp-${index}`}
                className="relationship-control-point nodrag nopan"
                style={{
                  transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
                  borderColor: stroke.stroke,
                }}
                onPointerDown={handleControlPointerDown(index)}
              />
            ))}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
