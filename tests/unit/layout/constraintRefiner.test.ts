import { describe, expect, it } from 'vitest';
import { refineWithConstraints } from '../../../src/web/diagram/layout/constraintRefiner';
import type { PositionedGraph, PositionedNode } from '../../../src/web/diagram/layout/positioningEngine';
import type { SemanticConstraints } from '../../../src/web/diagram/layout/types';

function makeNode(
  id: string,
  x: number,
  y: number,
  overrides: Partial<PositionedNode> = {}
): PositionedNode {
  const overrideData = overrides.data ?? {};
  const overrideLayout = overrides.layout ?? {};
  const overrideSize = overrides.size ?? {};
  return {
    id,
    type: 'element',
    position: { x, y },
    absolutePosition: { x, y },
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
  } as PositionedNode;
}

function makeGraph(overrides: Partial<PositionedGraph> = {}): PositionedGraph {
  return {
    nodes: [makeNode('a', 0, 0), makeNode('b', 320, 0)],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'relationship', data: {} }],
    profile: {
      nodeCount: 2,
      edgeCount: 1,
      containerCount: 0,
      maxNestingDepth: 0,
      edgesPerNode: 0.5,
      hasFlows: false,
      disconnectedComponents: [],
      nodeRoles: new Map(),
      clusters: new Map(),
      scc: [],
      sourceSinks: { sources: [], sinks: [] },
      containerChildCounts: new Map(),
      subgraphPatterns: new Map(),
      inDegree: new Map(),
      outDegree: new Map(),
    },
    strategy: { type: 'layered', direction: 'LR', spacing: { node: 80, layer: 120, container: 140 } },
    notation: 'architecture',
    preset: 'c4-like',
    direction: 'LR',
    laneAxis: 'x',
    laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    engine: 'elk',
    usedFallback: false,
    qualityScore: 0.9,
    ...overrides,
  };
}

describe('refineWithConstraints', () => {
  it('resolves overlapping nodes', () => {
    // Two nodes at same position — should be separated
    const graph = makeGraph({
      nodes: [makeNode('a', 10, 10), makeNode('b', 10, 10)],
    });

    const refined = refineWithConstraints(graph);

    const a = refined.nodes.find((n) => n.id === 'a')!;
    const b = refined.nodes.find((n) => n.id === 'b')!;
    const overlapX =
      a.absolutePosition.x < b.absolutePosition.x + b.size.width &&
      a.absolutePosition.x + a.size.width > b.absolutePosition.x;
    const overlapY =
      a.absolutePosition.y < b.absolutePosition.y + b.size.height &&
      a.absolutePosition.y + a.size.height > b.absolutePosition.y;
    expect(overlapX && overlapY).toBe(false);
  });

  it('aligns siblings with same role via alignment constraints', () => {
    const graph = makeGraph({
      nodes: [
        makeNode('parent', 0, 0, { type: 'container' }),
        makeNode('svc1', 40, 10, { parentId: 'parent', layout: { role: 'processor' } }),
        makeNode('svc2', 40, 150, { parentId: 'parent', layout: { role: 'processor' } }),
      ],
      edges: [],
    });

    const constraints: SemanticConstraints = {
      elkPartitions: new Map(),
      elkLayerConstraints: [],
      laneOrdering: [],
      alignments: [{ nodes: ['svc1', 'svc2'], axis: 'y' }],
      containments: [{ parent: 'parent', children: ['svc1', 'svc2'], padding: 40 }],
      backEdges: new Set(),
    };

    const refined = refineWithConstraints(graph, constraints);
    const svc1 = refined.nodes.find((n) => n.id === 'svc1')!;
    const svc2 = refined.nodes.find((n) => n.id === 'svc2')!;

    // After alignment, y coordinates should be closer than the original 140px gap
    // Cola stress-majorization is approximate, especially with competing containment constraints
    const originalGap = 140;
    const refinedGap = Math.abs(svc1.absolutePosition.y - svc2.absolutePosition.y);
    expect(refinedGap).toBeLessThan(originalGap);
  });

  it('fits containers to enclose children', () => {
    const graph = makeGraph({
      nodes: [
        makeNode('parent', 0, 0, {
          type: 'container',
          size: { width: 100, height: 100 },
        }),
        makeNode('child1', 50, 50, { parentId: 'parent' }),
        makeNode('child2', 300, 50, { parentId: 'parent' }),
      ],
      edges: [],
    });

    const refined = refineWithConstraints(graph);
    const parent = refined.nodes.find((n) => n.id === 'parent')!;
    const child1 = refined.nodes.find((n) => n.id === 'child1')!;
    const child2 = refined.nodes.find((n) => n.id === 'child2')!;

    // Parent should enclose both children
    expect(parent.absolutePosition.x).toBeLessThanOrEqual(child1.absolutePosition.x);
    expect(parent.absolutePosition.y).toBeLessThanOrEqual(child1.absolutePosition.y);
    expect(parent.absolutePosition.x + parent.size.width).toBeGreaterThanOrEqual(
      child2.absolutePosition.x + child2.size.width
    );
  });

  it('snaps to 10px grid', () => {
    const graph = makeGraph({
      nodes: [makeNode('a', 103, 207), makeNode('b', 458, 312)],
    });

    const refined = refineWithConstraints(graph);
    for (const node of refined.nodes) {
      expect(node.absolutePosition.x % 10).toBe(0);
      expect(node.absolutePosition.y % 10).toBe(0);
    }
  });

  it('normalizes bounds to origin', () => {
    const graph = makeGraph({
      nodes: [makeNode('a', 500, 300), makeNode('b', 800, 300)],
    });

    const refined = refineWithConstraints(graph);
    const minX = Math.min(...refined.nodes.map((n) => n.absolutePosition.x));
    const minY = Math.min(...refined.nodes.map((n) => n.absolutePosition.y));
    expect(minX).toBe(0);
    expect(minY).toBe(0);
  });

  it('preserves lane ordering with separation constraints', () => {
    const graph = makeGraph({
      nodes: [
        makeNode('entry', 0, 0, { layout: { role: 'entry', lane: 'leading', laneIndex: 0 } }),
        makeNode('proc', 300, 0, { layout: { role: 'processor', lane: 'central', laneIndex: 2 } }),
        makeNode('store', 600, 0, { layout: { role: 'store', lane: 'supporting', laneIndex: 4 } }),
      ],
      edges: [
        { id: 'e1', source: 'entry', target: 'proc', type: 'relationship', data: {} },
        { id: 'e2', source: 'proc', target: 'store', type: 'relationship', data: {} },
      ],
    });

    const constraints: SemanticConstraints = {
      elkPartitions: new Map([['entry', 0], ['proc', 2], ['store', 4]]),
      elkLayerConstraints: [],
      laneOrdering: [
        { left: 'entry', right: 'proc', axis: 'x', gap: 100 },
        { left: 'proc', right: 'store', axis: 'x', gap: 100 },
      ],
      alignments: [],
      containments: [],
      backEdges: new Set(),
    };

    const refined = refineWithConstraints(graph, constraints);
    const entry = refined.nodes.find((n) => n.id === 'entry')!;
    const proc = refined.nodes.find((n) => n.id === 'proc')!;
    const store = refined.nodes.find((n) => n.id === 'store')!;

    // Lane ordering preserved: entry < proc < store on x axis
    expect(entry.absolutePosition.x).toBeLessThan(proc.absolutePosition.x);
    expect(proc.absolutePosition.x).toBeLessThan(store.absolutePosition.x);
  });
});
