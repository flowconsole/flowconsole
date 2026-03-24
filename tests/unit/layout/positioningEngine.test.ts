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
    // Partitions are only assigned to top-level nodes, not children inside compound nodes
    expect(parent?.layoutOptions?.['org.eclipse.elk.partitioning.partition']).toBe('2');
    expect(child?.layoutOptions?.['org.eclipse.elk.partitioning.partition']).toBeUndefined();
    expect(child?.layoutOptions?.['org.eclipse.elk.portConstraints']).toBe('FIXED_ORDER');
  });
});

describe('positionNodes', () => {
  it('uses ELK as primary engine', async () => {
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
    });

    expect(elkLayout).toHaveBeenCalledTimes(1);
    expect(positioned.engine).toBe('elk');
    expect(positioned.usedFallback).toBe(false);
    expect(positioned.nodes.find((node) => node.id === 'b')?.absolutePosition.x).toBe(320);
  });

  it('falls back to graphviz when ELK is unavailable', async () => {
    const graph = makeGraph();
    const fallbackLayout = vi.fn().mockResolvedValue({
      nodes: [
        { ...makeNode('a'), position: { x: 10, y: 20 } },
        { ...makeNode('b'), position: { x: 260, y: 20 } },
      ],
      edges: graph.edges,
    });

    const positioned = await positionNodes(graph, {
      elkFactory: async () => undefined,
      fallbackLayout,
    });

    expect(fallbackLayout).toHaveBeenCalledTimes(1);
    expect(positioned.engine).toBe('graphviz');
    expect(positioned.usedFallback).toBe(true);
  });

  it('falls back to graphviz when ELK throws', async () => {
    const graph = makeGraph();
    const fallbackLayout = vi.fn().mockResolvedValue({
      nodes: [
        { ...makeNode('a'), position: { x: 10, y: 20 } },
        { ...makeNode('b'), position: { x: 260, y: 20 } },
      ],
      edges: graph.edges,
    });

    const positioned = await positionNodes(graph, {
      elkFactory: async () => { throw new Error('ELK failed'); },
      fallbackLayout,
    });

    expect(fallbackLayout).toHaveBeenCalledTimes(1);
    expect(positioned.engine).toBe('graphviz');
  });

  it('throws when both engines fail', async () => {
    const graph = makeGraph();

    let thrownError: Error | undefined;
    try {
      await positionNodes(graph, {
        elkFactory: async () => { throw new Error('ELK failed'); },
        fallbackLayout: async () => { throw new Error('graphviz failed'); },
      });
    } catch (err) {
      thrownError = err as Error;
    }
    expect(thrownError).toBeDefined();
    expect(thrownError!.message).toContain('Layout failed');
  });

  it('uses graphviz when forceGraphviz is set', async () => {
    const graph = makeGraph();
    const fallbackLayout = vi.fn().mockResolvedValue({
      nodes: [
        { ...makeNode('a'), position: { x: 10, y: 20 } },
        { ...makeNode('b'), position: { x: 260, y: 20 } },
      ],
      edges: graph.edges,
    });

    const positioned = await positionNodes(graph, {
      forceGraphviz: true,
      fallbackLayout,
    });

    expect(positioned.engine).toBe('graphviz');
    expect(positioned.usedFallback).toBe(true);
  });
});
