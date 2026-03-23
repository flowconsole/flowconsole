import { describe, expect, it } from 'vitest';
import { refineLayout } from '../../../src/web/diagram/layout/layoutRefiner';
import type { RoutedGraph } from '../../../src/web/diagram/layout/edgeRouter';
import type { PositionedNode } from '../../../src/web/diagram/layout/positioningEngine';

function makeNode(id: string, x: number, y: number, overrides: Partial<PositionedNode> = {}): PositionedNode {
  const overrideData = overrides.data ?? {};
  const overrideLayout = overrides.layout ?? {};
  const overrideSize = overrides.size ?? {};
  return {
    id,
    type: 'element',
    position: { x, y },
    absolutePosition: { x, y },
    ...overrides,
    data: {
      title: id,
      shape: 'service',
      ...overrideData,
    },
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
      width: 120,
      height: 80,
      shape: {
        shapeId: 'service',
        geometryKind: 'card',
        defaultDimensions: { width: 120, height: 80 },
        minDimensions: { width: 120, height: 80 },
        portModel: 'card',
        labelZones: ['header', 'body'],
        renderClassName: 'diagram-card--service',
      },
      ...overrideSize,
    },
  } as PositionedNode;
}

function makeGraph(overrides: Partial<RoutedGraph> = {}): RoutedGraph {
  return {
    nodes: [makeNode('a', 11, 13), makeNode('b', 190, 29)],
    edges: [
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        type: 'relationship',
        data: {
          layoutPoints: [
            { x: 120, y: 53 },
            { x: 155, y: 53 },
            { x: 155, y: 69 },
            { x: 190, y: 69 },
          ],
          labelPos: { x: 205, y: 50 },
        },
        routing: { priority: 100, style: 'orthogonal' },
      },
    ],
    profile: {
      nodeCount: 2,
      edgeCount: 1,
      containerCount: 0,
      maxNestingDepth: 0,
      edgeDensity: 0.5,
      hasFlows: false,
      disconnectedComponents: [new Set(['a']), new Set(['b'])],
      nodeRoles: new Map(),
      clusters: new Map(),
      sourceSinks: { sources: [], sinks: [] },
      containerChildCounts: new Map(),
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
    qualityScore: 0.8,
    ...overrides,
  };
}

describe('refineLayout', () => {
  it('fits containers around children', () => {
    const graph = makeGraph({
      nodes: [
        makeNode('container', 0, 0, { type: 'container', size: { width: 100, height: 100, shape: makeNode('shape', 0, 0).size.shape } }),
        makeNode('child', 140, 120, { parentId: 'container' }),
      ],
      profile: {
        ...makeGraph().profile,
        containerCount: 1,
        disconnectedComponents: [new Set(['container', 'child'])],
      },
    });

    const refined = refineLayout(graph);
    const container = refined.nodes.find((node) => node.id === 'container');

    expect(container?.size.width).toBeGreaterThan(100);
    expect(container?.size.height).toBeGreaterThan(100);
  });

  it('aligns sibling baselines and snaps nodes to the grid', () => {
    const refined = refineLayout(makeGraph());
    const [a, b] = refined.nodes;

    expect(a.absolutePosition.y % 8).toBe(0);
    expect(b.absolutePosition.y % 8).toBe(0);
    expect(a.absolutePosition.y).toBe(b.absolutePosition.y);
  });

  it('moves labels away from overlapping nodes', () => {
    const refined = refineLayout(makeGraph());

    expect(refined.edges[0]?.data?.labelPos?.y).toBeLessThan(50);
  });

  it('packs disconnected components apart from each other', () => {
    const refined = refineLayout(makeGraph());

    expect(refined.nodes[1].absolutePosition.x - refined.nodes[0].absolutePosition.x).toBeGreaterThan(120);
  });
});
