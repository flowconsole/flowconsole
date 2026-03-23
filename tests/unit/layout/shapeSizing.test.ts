import { describe, expect, it } from 'vitest';
import { architectureNotation } from '../../../src/web/diagram/layout/notation/architectureNotation';
import { computeSize, sizeRankedGraph } from '../../../src/web/diagram/layout/shapeSizing';
import { defaultShapeRegistry, builtInShapes, createBuiltInShapeRegistry } from '../../../src/web/diagram/layout/shapes/builtins';
import { ShapeRegistry } from '../../../src/web/diagram/layout/shapes/shapeRegistry';
import type { RankedGraph, RankedNode } from '../../../src/web/diagram/layout/types';

function makeNode(overrides: Partial<RankedNode> = {}): RankedNode {
  const overrideData = overrides.data ?? {};
  const overrideLayout = overrides.layout ?? {};
  return {
    id: 'node-1',
    type: 'element',
    position: { x: 0, y: 0 },
    ...overrides,
    data: {
      title: 'Node',
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
  } as RankedNode;
}

describe('ShapeRegistry', () => {
  it('registers the built-in shape set', () => {
    expect(builtInShapes).toHaveLength(8);
    expect(defaultShapeRegistry.get('person')?.defaultDimensions).toEqual({ width: 200, height: 120 });
    expect(defaultShapeRegistry.get('boundary')?.renderClassName).toBe('diagram-container');
  });

  it('supports registering custom shapes', () => {
    const registry = new ShapeRegistry();
    registry.register({
      shapeId: 'hex',
      geometryKind: 'custom',
      defaultDimensions: { width: 180, height: 120 },
      minDimensions: { width: 160, height: 100 },
      portModel: 'card',
      labelZones: ['header', 'body'],
      renderClassName: 'diagram-card--hex',
    });

    expect(registry.has('hex')).toBe(true);
  });
});

describe('computeSize', () => {
  it('uses shape defaults and expands for long content', () => {
    const node = makeNode({
      data: {
        title: 'Very Long Service Title That Should Expand The Node Width',
        description: 'Long description '.repeat(8).trim(),
        tags: ['core', 'payments', 'critical', 'api'],
        badge: 'SOURCE',
        shape: 'service',
      },
    });

    const size = computeSize(node, defaultShapeRegistry, architectureNotation);

    expect(size.width).toBeGreaterThan(240);
    expect(size.height).toBeGreaterThan(100);
    expect(size.shape.shapeId).toBe('service');
  });

  it('adds footer-aware height for boundary shapes', () => {
    const node = makeNode({
      type: 'container',
      data: {
        title: 'Platform',
        shape: 'boundary',
        footer: 'scope footer',
      },
    });

    const size = computeSize(node, createBuiltInShapeRegistry(), architectureNotation);

    expect(size.height).toBeGreaterThanOrEqual(118);
    expect(size.shape.shapeId).toBe('boundary');
  });

  it('sizes every node in a ranked graph', () => {
    const graph: RankedGraph = {
      nodes: [makeNode(), makeNode({ id: 'node-2', data: { title: 'DB', shape: 'database' } })],
      edges: [],
      profile: {
        nodeCount: 2,
        edgeCount: 0,
        containerCount: 0,
        maxNestingDepth: 0,
        edgeDensity: 0,
        hasFlows: false,
        disconnectedComponents: [],
        nodeRoles: new Map(),
        clusters: new Map(),
        sourceSinks: { sources: [], sinks: [] },
        containerChildCounts: new Map(),
        inDegree: new Map(),
        outDegree: new Map(),
      },
      strategy: { type: 'layered', direction: 'LR', spacing: { node: 1, layer: 1, container: 1 } },
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
      laneAxis: 'x',
      laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    };

    const sized = sizeRankedGraph(graph, architectureNotation);

    expect(sized.nodes).toHaveLength(2);
    expect(sized.nodes[1]?.size.shape.shapeId).toBe('database');
  });
});
