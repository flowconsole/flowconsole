import { describe, expect, it, vi } from 'vitest';
import { positionNodes, buildElkGraphInput } from '../../../src/web/diagram/layout/positioningEngine';
import type { SizedGraph, SizedNode } from '../../../src/web/diagram/layout/shapeSizing';

function makeNode(
  id: string,
  overrides: Partial<SizedNode> = {}
): SizedNode {
  const overrideData = overrides.data ?? {};
  const overrideLayout = overrides.layout ?? {};
  const overrideSize = overrides.size ?? {};
  return {
    id,
    type: 'element',
    position: { x: 0, y: 0 },
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
  } as SizedNode;
}

function makeGraph(overrides: Partial<SizedGraph> = {}): SizedGraph {
  return {
    nodes: [makeNode('a'), makeNode('b')],
    edges: [{ id: 'edge-1', source: 'a', target: 'b', type: 'relationship', data: {} }],
    profile: {
      nodeCount: 2,
      edgeCount: 1,
      containerCount: 0,
      maxNestingDepth: 0,
      edgeDensity: 0.5,
      hasFlows: false,
      disconnectedComponents: [],
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
    ...overrides,
  };
}

describe('buildElkGraphInput', () => {
  it('builds layered ELK input with compound nodes and lane partitions', () => {
    const graph = makeGraph({
      nodes: [
        makeNode('parent', { type: 'container', size: { width: 320, height: 200, shape: makeNode('shape').size.shape } }),
        makeNode('child', { parentId: 'parent', layout: { laneIndex: 0, semanticRank: 0, lane: 'leading' } }),
      ],
      edges: [{ id: 'edge-1', source: 'child', target: 'child', type: 'relationship', data: {} }],
    });

    const input = buildElkGraphInput(graph);
    const parent = input.children[0];
    const child = parent?.children?.[0];

    expect(input.layoutOptions['elk.algorithm']).toBe('layered');
    expect(input.layoutOptions['org.eclipse.elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    expect(child?.layoutOptions?.['org.eclipse.elk.partitioning.partition']).toBe('0');
    expect(child?.layoutOptions?.['org.eclipse.elk.portConstraints']).toBe('FIXED_ORDER');
  });
});

describe('positionNodes', () => {
  it('positions compact graphs in a deterministic grid', async () => {
    const graph = makeGraph({
      strategy: { type: 'compact', direction: 'LR', spacing: { node: 40, layer: 80, container: 100 } },
      nodes: [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')],
    });

    const positioned = await positionNodes(graph);

    expect(positioned.engine).toBe('analytical');
    expect(new Set(positioned.nodes.map((node) => `${node.position.x}:${node.position.y}`)).size).toBe(4);
  });

  it('positions radial graphs around the max-degree center', async () => {
    const graph = makeGraph({
      strategy: { type: 'radial', direction: 'LR', spacing: { node: 40, layer: 100, container: 100 } },
      nodes: [makeNode('hub'), makeNode('leaf-1'), makeNode('leaf-2')],
      edges: [
        { id: 'e1', source: 'hub', target: 'leaf-1', type: 'relationship', data: {} },
        { id: 'e2', source: 'hub', target: 'leaf-2', type: 'relationship', data: {} },
      ],
    });

    const positioned = await positionNodes(graph);
    const hub = positioned.nodes.find((node) => node.id === 'hub');
    const leaf = positioned.nodes.find((node) => node.id === 'leaf-1');

    expect(positioned.engine).toBe('analytical');
    expect(hub?.absolutePosition.x).not.toBe(leaf?.absolutePosition.x);
    expect(hub?.absolutePosition.y).not.toBe(leaf?.absolutePosition.y);
  });

  it('uses ELK layered output when available', async () => {
    const elkLayout = vi.fn().mockResolvedValue({
      id: 'root',
      children: [
        { id: 'a', x: 0, y: 0, width: 220, height: 100 },
        { id: 'b', x: 320, y: 0, width: 220, height: 100 },
      ],
    });
    const graph = makeGraph();

    const positioned = await positionNodes(graph, {
      elkFactory: async () => ({ layout: elkLayout }),
      fallbackLayout: vi.fn(),
    });

    expect(elkLayout).toHaveBeenCalledTimes(1);
    expect(positioned.engine).toBe('elk');
    expect(positioned.usedFallback).toBe(false);
    expect(positioned.nodes.find((node) => node.id === 'b')?.absolutePosition.x).toBe(320);
  });

  it('falls back to graphviz when ELK fails quality checks', async () => {
    const graph = makeGraph();
    const fallbackLayout = vi.fn().mockResolvedValue({
      nodes: [
        { ...makeNode('a'), position: { x: 10, y: 20 } },
        { ...makeNode('b'), position: { x: 260, y: 20 } },
      ],
      edges: graph.edges,
    });

    const positioned = await positionNodes(graph, {
      elkFactory: async () => ({
        layout: async () => ({
          id: 'root',
          children: [
            { id: 'a', x: 0, y: 0, width: 220, height: 100 },
            { id: 'b', x: 10, y: 0, width: 220, height: 100 },
          ],
        }),
      }),
      fallbackLayout,
      qualityEvaluator: (candidate) => (candidate.engine === 'graphviz' ? 0.9 : 0.1),
      minQuality: 0.5,
    });

    expect(fallbackLayout).toHaveBeenCalledTimes(1);
    expect(positioned.engine).toBe('graphviz');
    expect(positioned.usedFallback).toBe(true);
  });
});
