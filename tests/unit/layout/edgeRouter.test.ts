import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { routeEdges, selectPortSides, edgePriority } from '../../../src/web/diagram/layout/edgeRouter';
import type { PositionedGraph, PositionedNode } from '../../../src/web/diagram/layout/positioningEngine';

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

function makeGraph(
  overrides: Partial<PositionedGraph> = {}
): PositionedGraph {
  const nodes = [makeNode('a', 0, 0), makeNode('b', 320, 0)];
  return {
    nodes,
    edges: [{ id: 'edge-1', source: 'a', target: 'b', type: 'relationship', data: { kind: 'sync' } }],
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

describe('edge routing helpers', () => {
  it('selects port sides from direction and relative geometry', () => {
    const source = makeNode('source', 0, 0);
    const target = makeNode('target', 320, 0, {
      size: {
        width: 220,
        height: 100,
        shape: {
          shapeId: 'database',
          geometryKind: 'database',
          defaultDimensions: { width: 220, height: 100 },
          minDimensions: { width: 200, height: 90 },
          portModel: 'database',
          labelZones: ['header', 'body'],
          renderClassName: 'diagram-card--database',
        },
      },
    });

    const selected = selectPortSides(
      source,
      target,
      'LR',
      { id: 'edge-1', source: 'source', target: 'target', type: 'relationship', data: { kind: 'sync' } }
    );

    expect(selected.sourceSide).toBe(Position.Right);
    expect(selected.targetSide).toBe(Position.Left);
    expect(selected.sourceAnchorPoint.x).toBe(220);
  });

  it('assigns priority by edge kind and active flow', () => {
    expect(edgePriority({ id: 'a', source: 's', target: 't', type: 'relationship', data: { kind: 'sync' } })).toBe(100);
    expect(edgePriority({ id: 'b', source: 's', target: 't', type: 'relationship', data: { kind: 'dependency' } })).toBe(30);
    expect(edgePriority({ id: 'c', source: 's', target: 't', type: 'relationship', data: { kind: 'event', flowCurrent: true } })).toBe(120);
  });
});

describe('routeEdges', () => {
  it('produces orthogonal routes and anchors for layered strategy', () => {
    const routed = routeEdges(makeGraph());
    const edge = routed.edges[0];

    expect(edge.routing.style).toBe('orthogonal');
    expect(edge.data?.layoutPoints).toHaveLength(4);
    expect(edge.data?.sourceAnchor).toEqual({ position: Position.Right, offset: 0.5 });
    expect(edge.data?.targetAnchor).toEqual({ position: Position.Left, offset: 0.5 });
    expect(edge.data?.labelSide).toBe('above');
  });

  it('always produces orthogonal routes', () => {
    const routed = routeEdges(makeGraph());

    expect(routed.edges[0]?.routing.style).toBe('orthogonal');
    expect(routed.edges[0]?.data?.layoutPoints).toHaveLength(4);
  });
});
