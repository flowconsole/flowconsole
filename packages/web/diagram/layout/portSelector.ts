import { getShapeDefinitionOrDefault } from './shapes/shapeRegistry';

type Point = { readonly x: number; readonly y: number };
type Rect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/**
 * Compute the point on the shape's visual boundary where an edge should connect,
 * given the node's bounding box and the direction toward the connected node.
 *
 * For rectangular shapes this is the bounding box edge intersection.
 * For circle/hexagon/cloud the point lies on the shape's actual contour.
 */
export function computePortPosition(
  nodeRect: Rect,
  targetPoint: Point,
  nodeType: string,
): Point {
  const shapeDef = getShapeDefinitionOrDefault(nodeType);
  const cx = nodeRect.x + nodeRect.width / 2;
  const cy = nodeRect.y + nodeRect.height / 2;

  switch (shapeDef.geometryKind) {
    case 'circle':
      return circleIntersection(cx, cy, nodeRect.width / 2, targetPoint);
    case 'hexagon':
      return hexagonIntersection(cx, cy, nodeRect.width, nodeRect.height, targetPoint);
    case 'cloud':
      // Cloud is irregular — approximate with an ellipse close to bbox edges
      return ellipseIntersection(cx, cy, nodeRect.width * 0.48, nodeRect.height * 0.46, targetPoint);
    default:
      return bboxIntersection(nodeRect, targetPoint);
  }
}

/** Intersection of a ray from center to target with a circle boundary. */
function circleIntersection(cx: number, cy: number, radius: number, target: Point): Point {
  const dx = target.x - cx;
  const dy = target.y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: cx + radius, y: cy };
  return {
    x: cx + (dx / dist) * radius,
    y: cy + (dy / dist) * radius,
  };
}

/** Intersection of a ray from center to target with an ellipse boundary. */
function ellipseIntersection(cx: number, cy: number, rx: number, ry: number, target: Point): Point {
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx + rx, y: cy };
  // Parametric: find t such that (dx*t/rx)^2 + (dy*t/ry)^2 = 1
  const t = 1 / Math.hypot(dx / rx, dy / ry);
  return {
    x: cx + dx * t,
    y: cy + dy * t,
  };
}

/**
 * Intersection of a ray from center to target with a flat-top hexagon boundary.
 * The hexagon vertices at the midpoints of left/right sides and top/bottom center.
 */
function hexagonIntersection(
  cx: number,
  cy: number,
  width: number,
  height: number,
  target: Point,
): Point {
  const hw = width / 2;
  const hh = height / 2;
  // Flat-top hexagon vertices at bbox edges — matches SVG where points
  // reach bbox corners (arrow marker tip then visually lands on the visible contour).
  const vertices: Point[] = [
    { x: cx, y: cy - hh },
    { x: cx + hw, y: cy - hh * 0.5 },
    { x: cx + hw, y: cy + hh * 0.5 },
    { x: cx, y: cy + hh },
    { x: cx - hw, y: cy + hh * 0.5 },
    { x: cx - hw, y: cy - hh * 0.5 },
  ];

  return polygonIntersection(cx, cy, vertices, target);
}

/** Intersection of a ray from center to target with a convex polygon. */
function polygonIntersection(cx: number, cy: number, vertices: Point[], target: Point): Point {
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return vertices[0];

  let bestT = Infinity;
  let bestPoint: Point = { x: cx + dx, y: cy + dy };

  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];
    const t = raySegmentIntersection(cx, cy, dx, dy, v1, v2);
    if (t !== null && t > 0 && t < bestT) {
      bestT = t;
      bestPoint = { x: cx + dx * t, y: cy + dy * t };
    }
  }

  return bestPoint;
}

/** Find parameter t where ray (ox+dx*t, oy+dy*t) intersects segment v1-v2. Returns null if no intersection. */
function raySegmentIntersection(
  ox: number, oy: number,
  dx: number, dy: number,
  v1: Point, v2: Point,
): number | null {
  const ex = v2.x - v1.x;
  const ey = v2.y - v1.y;
  const denom = dx * ey - dy * ex;
  if (Math.abs(denom) < 1e-10) return null;

  const fx = v1.x - ox;
  const fy = v1.y - oy;
  const t = (fx * ey - fy * ex) / denom;
  const u = (fx * dy - fy * dx) / denom;

  if (u >= 0 && u <= 1 && t > 0) return t;
  return null;
}

/** Intersection of a ray from center to target with an axis-aligned rectangle. */
function bboxIntersection(rect: Rect, target: Point): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: rect.x + rect.width, y: cy };

  const hw = rect.width / 2;
  const hh = rect.height / 2;

  // Find the smallest positive t that places the point on the bbox boundary
  const tX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const tY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tX, tY);

  return {
    x: cx + dx * t,
    y: cy + dy * t,
  };
}
