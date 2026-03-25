import { describe, it, expect } from 'vitest';
import { routeEdges } from '../../src/web/diagram/layout/edgeRouting';
import { DEFAULT_LAYOUT_CONFIG } from '../../src/web/diagram/layout/types';
import type { ArchitectureEdge } from '../../src/web/diagram/types';
import type { PositionMap } from '../../src/web/diagram/layout/coordinateAssignment';

function makeEdge(id: string, source: string, target: string): ArchitectureEdge {
  return { id, source, target, type: 'relationship', data: {} } as ArchitectureEdge;
}

function makePositions(
  entries: Array<{ id: string; x: number; y: number; width: number; height: number }>
): PositionMap {
  const map: PositionMap = new Map();
  for (const e of entries) {
    map.set(e.id, { x: e.x, y: e.y, width: e.width, height: e.height });
  }
  return map;
}

const config = DEFAULT_LAYOUT_CONFIG;

describe('routeEdges', () => {
  it('returns empty map for empty inputs', () => {
    const result = routeEdges(new Map(), [], [], config);
    expect(result.size).toBe(0);
  });

  it('skips self-loop edges', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'A')];
    const layers = [['A']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(false);
  });

  it('skips edges with missing source/target position', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'B')];
    const layers = [['A']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(false);
  });

  it('skips adjacent aligned edges (default bezier)', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
      { id: 'B', x: 60, y: 270, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'B')];
    const layers = [['A'], ['B']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(false);
  });

  it('skips adjacent offset edges (default bezier)', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
      { id: 'B', x: 400, y: 270, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'B')];
    const layers = [['A'], ['B']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(false);
  });

  it('skips same-layer edges (default bezier)', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
      { id: 'B', x: 400, y: 60, width: 240, height: 100 },
      { id: 'C', x: 60, y: 270, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'B')];
    const layers = [['A', 'B'], ['C']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(false);
  });

  it('routes multi-layer edges with intermediate waypoints', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
      { id: 'B', x: 60, y: 270, width: 240, height: 100 },
      { id: 'C', x: 60, y: 480, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'C')]; // skips layer 1
    const layers = [['A'], ['B'], ['C']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(true);
    const routed = result.get('e1')!;
    expect(routed.layoutPoints.length).toBeGreaterThanOrEqual(4);
    expect(routed.pathType).toBe('smooth');
  });

  it('assigns different tracks for multi-layer edges in same channel', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
      { id: 'B', x: 400, y: 60, width: 240, height: 100 },
      { id: 'C', x: 60, y: 270, width: 240, height: 100 },
      { id: 'D', x: 400, y: 270, width: 240, height: 100 },
      { id: 'E', x: 60, y: 480, width: 240, height: 100 },
      { id: 'F', x: 400, y: 480, width: 240, height: 100 },
    ]);
    const edges = [
      makeEdge('e1', 'A', 'F'), // skips layers 1 → multi-layer
      makeEdge('e2', 'B', 'E'), // skips layers 1 → multi-layer
    ];
    const layers = [['A', 'B'], ['C', 'D'], ['E', 'F']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(true);
    expect(result.has('e2')).toBe(true);
    // The channel y-positions should differ for the two edges
    const y1 = result.get('e1')!.layoutPoints[1].y;
    const y2 = result.get('e2')!.layoutPoints[1].y;
    expect(y1).not.toBe(y2);
  });

  it('produces valid label positions for multi-layer edges', () => {
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
      { id: 'B', x: 60, y: 270, width: 240, height: 100 },
      { id: 'C', x: 400, y: 480, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'C')];
    const layers = [['A'], ['B'], ['C']];
    const result = routeEdges(positions, edges, layers, config);
    expect(result.has('e1')).toBe(true);
    const routed = result.get('e1')!;
    expect(routed.labelPos.x).toBeGreaterThan(0);
    expect(routed.labelPos.y).toBeGreaterThan(0);
  });

  it('works with RIGHT direction for multi-layer edges', () => {
    const rightConfig = { ...config, direction: 'RIGHT' as const };
    const positions = makePositions([
      { id: 'A', x: 60, y: 60, width: 240, height: 100 },
      { id: 'B', x: 360, y: 60, width: 240, height: 100 },
      { id: 'C', x: 660, y: 300, width: 240, height: 100 },
    ]);
    const edges = [makeEdge('e1', 'A', 'C')]; // skips layer 1
    const layers = [['A'], ['B'], ['C']];
    const result = routeEdges(positions, edges, layers, rightConfig);
    expect(result.has('e1')).toBe(true);
    const routed = result.get('e1')!;
    expect(routed.layoutPoints.length).toBeGreaterThanOrEqual(4);
  });
});
