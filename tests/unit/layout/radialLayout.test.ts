import { describe, expect, it } from 'vitest';
import { positionRadial, positionNodes } from '../../../src/web/diagram/layout/positioningEngine';
import type { SizedGraph, SizedNode } from '../../../src/web/diagram/layout/shapeSizing';

function makeNode(id: string, overrides: Partial<SizedNode> = {}): SizedNode {
  const overrideData = overrides.data ?? {};
  const overrideLayout = overrides.layout ?? {};
  const overrideSize = overrides.size ?? {};
  return {
    id,
    type: 'element',
    position: { x: 0, y: 0 },
    ...overrides,
    data: { title: id, shape: 'service', ...overrideData },
    layout: {
      role: 'processor',
      lane: 'central',
      laneIndex: 2,
      semanticRank: 2,
      axis: 'x',
      direction: 'LR',
      inDegree: 1,
      outDegree: 1,
      order: 0,
      ...overrideLayout,
    },
    size: {
      width: 220,
      height: 100,
      shape: {
        shapeId: 'service',
        geometryKind: 'card',
        defaultDimensions: { width: 220, height: 100 },
        minDimensions: { width: 200, height: 90 },
        portModel: 'card',
        labelZones: ['header', 'body'],
        renderClassName: 'diagram-card--service',
      },
      ...overrideSize,
    },
  } as SizedNode;
}

function makeStarGraph(): SizedGraph {
  const hub = makeNode('hub', { layout: { role: 'gateway' } });
  const spokes = Array.from({ length: 4 }, (_, i) =>
    makeNode(`spoke${i}`, { layout: { role: i === 0 ? 'entry' : 'processor' } })
  );
  const edges = spokes.map((s, i) => ({
    id: `e${i}`,
    source: 'hub',
    target: s.id,
    type: 'relationship' as const,
    data: {},
  }));

  return {
    nodes: [hub, ...spokes],
    edges,
    profile: {
      nodeCount: 5,
      edgeCount: 4,
      containerCount: 0,
      maxNestingDepth: 0,
      edgesPerNode: 0.8,
      hasFlows: false,
      disconnectedComponents: [],
      nodeRoles: new Map(),
      clusters: new Map(),
      scc: [],
      sourceSinks: { sources: [], sinks: [] },
      containerChildCounts: new Map(),
      subgraphPatterns: new Map([['root', 'star']]),
      inDegree: new Map(),
      outDegree: new Map(),
    },
    strategy: { type: 'radial', direction: 'LR', spacing: { node: 80, layer: 120, container: 140 } },
    notation: 'architecture',
    preset: 'c4-like',
    direction: 'LR',
    laneAxis: 'x',
    laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
  };
}

describe('positionRadial', () => {
  it('places center node at origin', () => {
    const graph = makeStarGraph();
    const positions = positionRadial(graph);

    // Center node is offset so its center is at origin
    const hubPos = positions.get('hub')!;
    expect(hubPos.x).toBe(-110); // -width/2
    expect(hubPos.y).toBe(-50);  // -height/2
  });

  it('places spokes on ring around center', () => {
    const graph = makeStarGraph();
    const positions = positionRadial(graph);

    for (let i = 0; i < 4; i++) {
      const pos = positions.get(`spoke${i}`);
      expect(pos).toBeDefined();
      // Measure from node center (pos is top-left, add half dimensions)
      const cx = pos!.x + 110;
      const cy = pos!.y + 50;
      const dist = Math.sqrt(cx ** 2 + cy ** 2);
      expect(dist).toBeGreaterThan(100);
    }
  });

  it('produces no overlaps for 5-node star', () => {
    const graph = makeStarGraph();
    const positions = positionRadial(graph);

    const rects = graph.nodes.map((n) => {
      const pos = positions.get(n.id)!;
      return { id: n.id, x: pos.x, y: pos.y, w: n.size.width, h: n.size.height };
    });

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
        const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlapX && overlapY, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('places entry nodes at top of ring', () => {
    const graph = makeStarGraph();
    const positions = positionRadial(graph);

    // spoke0 is 'entry', should be first in sort → gets startAngle (-π/2 = top)
    const entryPos = positions.get('spoke0')!;
    // Top means center y should be the most negative among spokes
    const spokeCenterYs = [0, 1, 2, 3].map((i) => positions.get(`spoke${i}`)!.y + 50);
    expect(entryPos.y + 50).toBe(Math.min(...spokeCenterYs));
  });

  it('handles disconnected nodes by placing them on ring 1', () => {
    const graph = makeStarGraph();
    // Add a disconnected node
    graph.nodes.push(makeNode('isolated'));
    const positions = positionRadial(graph);

    const pos = positions.get('isolated');
    expect(pos).toBeDefined();
    // Measure from node center
    const cx = pos!.x + 110;
    const cy = pos!.y + 50;
    const dist = Math.sqrt(cx ** 2 + cy ** 2);
    expect(dist).toBeGreaterThan(0);
  });
});

describe('radial positionNodes', () => {
  it('uses radial engine when strategy is radial', async () => {
    const graph = makeStarGraph();

    const positioned = await positionNodes(graph, {
      elkFactory: async () => undefined,
    });

    expect(positioned.engine).toBe('radial');
    expect(positioned.usedFallback).toBe(false);
    expect(positioned.nodes.length).toBe(5);
  });
});
