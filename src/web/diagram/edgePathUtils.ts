type Point = { x: number; y: number };

/**
 * Build an SVG path string from Graphviz cubic Bézier control points.
 * Expects (1 + 3k) points: M start, then groups of (cp1, cp2, end).
 * @internal Exported for testing
 */
export function bezierPathFromGraphviz(points: Point[] | undefined): string | undefined {
  if (!points?.length) return undefined;
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i + 2 < points.length; i += 3) {
    const cp1 = points[i];
    const cp2 = points[i + 1];
    const end = points[i + 2];
    if (!cp1 || !cp2 || !end) break;
    path += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${end.x},${end.y}`;
  }
  return path;
}

/**
 * Adjust pre-computed Graphviz Bézier spline so that the first point
 * matches `source` and the last point matches `target`.
 *
 * Uses **linear interpolation** of the shift across the full point array
 * so the path deforms smoothly instead of creating a kink.
 *
 * Returns `undefined` when the point array is too short or not a valid
 * cubic Bézier sequence (length must equal 1 + 3k).
 * @internal Exported for testing
 */
export function normalizeGraphvizPoints(
  basePoints: Point[] | undefined,
  source: Point,
  target: Point
): Point[] | undefined {
  if (!basePoints?.length || basePoints.length < 4) return undefined;
  if ((basePoints.length - 1) % 3 !== 0) return undefined;

  const n = basePoints.length;
  const sourceShiftX = source.x - basePoints[0].x;
  const sourceShiftY = source.y - basePoints[0].y;
  const targetShiftX = target.x - basePoints[n - 1].x;
  const targetShiftY = target.y - basePoints[n - 1].y;

  // Linearly interpolate the shift from source-delta at index 0
  // to target-delta at index n-1. This distributes any positional
  // difference evenly across all control points instead of applying
  // a uniform source shift + abrupt target correction.
  return basePoints.map((p, idx) => {
    const t = n > 1 ? idx / (n - 1) : 0.5;
    const shiftX = sourceShiftX * (1 - t) + targetShiftX * t;
    const shiftY = sourceShiftY * (1 - t) + targetShiftY * t;
    return { x: p.x + shiftX, y: p.y + shiftY };
  });
}
