import { describe, expect, it, vi } from 'vitest';
import { buildCompactElkInput, positionNodes } from '../../../src/web/diagram/layout/positioningEngine';
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

function makeCompactGraph(nodeCount: number): SizedGraph {
  const nodes: SizedNode[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const role = i === 0 ? 'entry' : i === nodeCount - 1 ? 'store' : 'processor';
    nodes.push(makeNode(`n${i}`, { layout: { role, outDegree: nodeCount - i } }));
  }
  return {
    nodes,
    edges: [],
    profile: {
      nodeCount,
      edgeCount: 0,
      containerCount: 0,
      maxNestingDepth: 0,
      edgesPerNode: 0,
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
    strategy: { type: 'compact', direction: 'LR', spacing: { node: 30, layer: 30, container: 40 } },
    notation: 'architecture',
    preset: 'c4-like',
    direction: 'LR',
    laneAxis: 'x',
    laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
  };
}

describe('buildCompactElkInput', () => {
  it('uses rectpacking algorithm', () => {
    const graph = makeCompactGraph(4);
    const input = buildCompactElkInput(graph);

    expect(input.layoutOptions['elk.algorithm']).toBe('rectpacking');
    expect(input.layoutOptions['org.eclipse.elk.spacing.nodeNode']).toBe('30');
  });

  it('sorts nodes by role priority then out-degree', () => {
    const graph = makeCompactGraph(4);
    const input = buildCompactElkInput(graph);
    const ids = input.children.map((c) => c.id);

    // n0 = entry (priority 0), n1-n2 = processor (priority 3), n3 = store (priority 6)
    expect(ids[0]).toBe('n0');
    expect(ids[ids.length - 1]).toBe('n3');
  });

  it('excludes child nodes from top-level children', () => {
    const graph = makeCompactGraph(3);
    graph.nodes.push(makeNode('child', { parentId: 'n0' }));
    const input = buildCompactElkInput(graph);

    const ids = input.children.map((c) => c.id);
    expect(ids).not.toContain('child');
  });
});

describe('compact positionNodes', () => {
  it('positions 16 nodes without overlap', async () => {
    const graph = makeCompactGraph(16);

    const elkLayout = vi.fn().mockImplementation((input: { children: Array<{ id: string; width: number; height: number }> }) => {
      // Simulate rectpacking: arrange in 4x4 grid
      const cols = 4;
      const spacing = 30;
      return Promise.resolve({
        id: 'root',
        children: input.children.map((child, i) => ({
          id: child.id,
          x: (i % cols) * (child.width + spacing),
          y: Math.floor(i / cols) * (child.height + spacing),
          width: child.width,
          height: child.height,
        })),
      });
    });

    const positioned = await positionNodes(graph, {
      elkFactory: async () => ({ layout: elkLayout }),
    });

    expect(positioned.engine).toBe('elk');

    // AABB overlap check
    for (let i = 0; i < positioned.nodes.length; i++) {
      for (let j = i + 1; j < positioned.nodes.length; j++) {
        const a = positioned.nodes[i];
        const b = positioned.nodes[j];
        const overlapX =
          a.absolutePosition.x < b.absolutePosition.x + b.size.width &&
          a.absolutePosition.x + a.size.width > b.absolutePosition.x;
        const overlapY =
          a.absolutePosition.y < b.absolutePosition.y + b.size.height &&
          a.absolutePosition.y + a.size.height > b.absolutePosition.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });
});
