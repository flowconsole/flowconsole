import { describe, it, expect } from 'vitest';
import { computeLayout } from '../../diagram/layout/computeLayout';
import { assignLayers } from '../../diagram/layout/layerAssignment';
import { reduceCrossings } from '../../diagram/layout/crossingReduction';
import type { ArchitectureDiagramModel } from '../../diagram/layout/types';

function makeModel(
  nodes: Array<{ id: string; type?: string; parentId?: string; title?: string }>,
  edges: Array<{ id: string; source: string; target: string }>
): ArchitectureDiagramModel {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.type ?? 'element') as 'element' | 'container',
      position: { x: 0, y: 0 },
      parentId: n.parentId,
      data: { title: n.title ?? n.id },
    })) as ArchitectureDiagramModel['nodes'],
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'relationship' as const,
      data: {},
    })) as ArchitectureDiagramModel['edges'],
  };
}

describe('computeLayout', () => {
  it('returns empty result for empty model', () => {
    const result = computeLayout({ nodes: [], edges: [] });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.bounds.width).toBe(0);
    expect(result.bounds.height).toBe(0);
  });

  it('assigns positions to nodes without overlaps', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ]
    );
    const result = computeLayout(model);
    expect(result.nodes).toHaveLength(3);

    // All nodes should have distinct positions
    const positions = result.nodes.map((n) => `${n.position.x},${n.position.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(3);

    // No overlapping bounding boxes
    for (let i = 0; i < result.nodes.length; i++) {
      for (let j = i + 1; j < result.nodes.length; j++) {
        const a = result.nodes[i];
        const b = result.nodes[j];
        const aw = (typeof a.style?.width === 'number' ? a.style.width : 240);
        const ah = 100;
        const bw = (typeof b.style?.width === 'number' ? b.style.width : 240);
        const bh = 100;
        const overlapsX = a.position.x < b.position.x + bw && a.position.x + aw > b.position.x;
        const overlapsY = a.position.y < b.position.y + bh && a.position.y + ah > b.position.y;
        expect(overlapsX && overlapsY).toBe(false);
      }
    }
  });

  it('produces deterministic layout', () => {
    const model = makeModel(
      [{ id: 'x' }, { id: 'y' }, { id: 'z' }],
      [
        { id: 'e1', source: 'x', target: 'y' },
        { id: 'e2', source: 'y', target: 'z' },
      ]
    );
    const r1 = computeLayout(model);
    const r2 = computeLayout(model);
    expect(r1.nodes.map((n) => n.position)).toEqual(r2.nodes.map((n) => n.position));
  });

  it('lays out linear chain top-to-bottom with direction=DOWN', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ]
    );
    const result = computeLayout(model, { direction: 'DOWN' });
    const nodeA = result.nodes.find((n) => n.id === 'a')!;
    const nodeB = result.nodes.find((n) => n.id === 'b')!;
    const nodeC = result.nodes.find((n) => n.id === 'c')!;
    // a should be above b, b above c
    expect(nodeA.position.y).toBeLessThan(nodeB.position.y);
    expect(nodeB.position.y).toBeLessThan(nodeC.position.y);
  });

  it('lays out linear chain left-to-right with direction=RIGHT', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'e1', source: 'a', target: 'b' }]
    );
    const result = computeLayout(model, { direction: 'RIGHT' });
    const nodeA = result.nodes.find((n) => n.id === 'a')!;
    const nodeB = result.nodes.find((n) => n.id === 'b')!;
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
  });

  it('handles disconnected nodes', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      []
    );
    const result = computeLayout(model);
    expect(result.nodes).toHaveLength(3);
    // All should be in the same layer (all sources), side by side
    const ys = result.nodes.map((n) => n.position.y);
    expect(new Set(ys).size).toBe(1); // same layer = same y
  });

  it('handles cyclic graphs without crashing', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
        { id: 'e3', source: 'c', target: 'a' },
      ]
    );
    const result = computeLayout(model);
    expect(result.nodes).toHaveLength(3);
    // Should still produce valid positions
    result.nodes.forEach((n) => {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    });
  });

  it('passes edges through unchanged', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'e1', source: 'a', target: 'b' }]
    );
    const result = computeLayout(model);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe('e1');
    expect(result.edges[0].source).toBe('a');
    expect(result.edges[0].target).toBe('b');
  });

  it('computes layout within 50ms for 50 nodes', () => {
    const nodes = Array.from({ length: 50 }, (_, i) => ({ id: `n${i}` }));
    const edges = Array.from({ length: 49 }, (_, i) => ({
      id: `e${i}`,
      source: `n${i}`,
      target: `n${i + 1}`,
    }));
    const model = makeModel(nodes, edges);
    const start = performance.now();
    const result = computeLayout(model);
    const elapsed = performance.now() - start;
    expect(result.nodes).toHaveLength(50);
    expect(elapsed).toBeLessThan(50);
  });
});

describe('assignLayers', () => {
  it('assigns source nodes to layer 0', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ]
    );
    const { layers } = assignLayers(model);
    expect(layers[0]).toContain('a');
    expect(layers[1]).toContain('b');
    expect(layers[2]).toContain('c');
  });

  it('puts nodes with no edges in layer 0', () => {
    const model = makeModel(
      [{ id: 'lonely' }],
      []
    );
    const { layers } = assignLayers(model);
    expect(layers).toHaveLength(1);
    expect(layers[0]).toContain('lonely');
  });

  it('handles diamond dependency graph', () => {
    const model = makeModel(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'c' },
        { id: 'e3', source: 'b', target: 'd' },
        { id: 'e4', source: 'c', target: 'd' },
      ]
    );
    const { layers } = assignLayers(model);
    expect(layers[0]).toContain('a');
    // b and c should be in the middle layer
    const middleNodes = layers.slice(1, -1).flat();
    expect(middleNodes).toContain('b');
    expect(middleNodes).toContain('c');
    // d should be in the last layer
    expect(layers[layers.length - 1]).toContain('d');
  });
});

describe('reduceCrossings', () => {
  it('reorders layers to reduce crossings', () => {
    // Classic case: two layers where crossing is unavoidable unless reordered
    const layers = [['a', 'b'], ['c', 'd']];
    // a -> d, b -> c creates a crossing that can be fixed by swapping c/d
    const adjacency = new Map<string, string[]>([
      ['a', ['d']],
      ['b', ['c']],
      ['c', []],
      ['d', []],
    ]);
    const reverseAdjacency = new Map<string, string[]>([
      ['a', []],
      ['b', []],
      ['c', ['b']],
      ['d', ['a']],
    ]);

    const result = reduceCrossings(layers, adjacency, reverseAdjacency);
    // After reduction, the bottom layer should be reordered to [d, c]
    // to eliminate the crossing
    expect(result[1]).toEqual(['d', 'c']);
  });

  it('preserves single-layer graph', () => {
    const layers = [['a', 'b', 'c']];
    const adjacency = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();
    const result = reduceCrossings(layers, adjacency, reverseAdjacency);
    expect(result).toEqual([['a', 'b', 'c']]);
  });
});
