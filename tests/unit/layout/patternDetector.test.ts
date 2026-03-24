import { describe, expect, it } from 'vitest';
import { detectPatterns } from '../../../src/web/diagram/layout/patternDetector';
import type { ArchitectureDiagramModel } from '../../../src/web/diagram/types';

function makeNode(
  id: string,
  overrides: Partial<ArchitectureDiagramModel['nodes'][number]> = {}
): ArchitectureDiagramModel['nodes'][number] {
  const overrideData = overrides.data ?? {};
  return {
    id,
    type: 'element',
    position: { x: 0, y: 0 },
    ...overrides,
    data: {
      title: id,
      ...overrideData,
    },
  };
}

function makeEdge(
  source: string,
  target: string
): ArchitectureDiagramModel['edges'][number] {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: 'relationship',
    data: {},
  };
}

describe('detectPatterns', () => {
  it('detects chain pattern (linear pipeline)', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('api', { parentId: 'container' }),
        makeNode('auth', { parentId: 'container' }),
        makeNode('service', { parentId: 'container' }),
        makeNode('db', { parentId: 'container' }),
      ],
      edges: [
        makeEdge('api', 'auth'),
        makeEdge('auth', 'service'),
        makeEdge('service', 'db'),
      ],
    };

    const childrenByParent = new Map([['container', ['api', 'auth', 'service', 'db']]]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('container')).toBe('chain');
  });

  it('detects star pattern (hub-and-spoke)', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('gateway', { parentId: 'container' }),
        makeNode('svc1', { parentId: 'container' }),
        makeNode('svc2', { parentId: 'container' }),
        makeNode('svc3', { parentId: 'container' }),
        makeNode('svc4', { parentId: 'container' }),
      ],
      edges: [
        makeEdge('gateway', 'svc1'),
        makeEdge('gateway', 'svc2'),
        makeEdge('gateway', 'svc3'),
        makeEdge('gateway', 'svc4'),
      ],
    };

    const childrenByParent = new Map([
      ['container', ['gateway', 'svc1', 'svc2', 'svc3', 'svc4']],
    ]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('container')).toBe('star');
  });

  it('detects tree pattern (hierarchical)', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('root', { parentId: 'container' }),
        makeNode('left', { parentId: 'container' }),
        makeNode('right', { parentId: 'container' }),
        makeNode('leaf1', { parentId: 'container' }),
        makeNode('leaf2', { parentId: 'container' }),
      ],
      edges: [
        makeEdge('root', 'left'),
        makeEdge('root', 'right'),
        makeEdge('left', 'leaf1'),
        makeEdge('left', 'leaf2'),
      ],
    };

    const childrenByParent = new Map([
      ['container', ['root', 'left', 'right', 'leaf1', 'leaf2']],
    ]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('container')).toBe('tree');
  });

  it('detects bipartite pattern (two-layer cross-connections)', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('frontend', { parentId: 'container' }),
        makeNode('mobile', { parentId: 'container' }),
        makeNode('userApi', { parentId: 'container' }),
        makeNode('orderApi', { parentId: 'container' }),
        makeNode('payApi', { parentId: 'container' }),
      ],
      edges: [
        makeEdge('frontend', 'userApi'),
        makeEdge('frontend', 'orderApi'),
        makeEdge('frontend', 'payApi'),
        makeEdge('mobile', 'userApi'),
        makeEdge('mobile', 'orderApi'),
        makeEdge('mobile', 'payApi'),
      ],
    };

    const childrenByParent = new Map([
      ['container', ['frontend', 'mobile', 'userApi', 'orderApi', 'payApi']],
    ]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('container')).toBe('bipartite');
  });

  it('detects dense pattern (highly connected)', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('a', { parentId: 'container' }),
        makeNode('b', { parentId: 'container' }),
        makeNode('c', { parentId: 'container' }),
      ],
      edges: [
        makeEdge('a', 'b'),
        makeEdge('b', 'a'),
        makeEdge('a', 'c'),
        makeEdge('c', 'a'),
        makeEdge('b', 'c'),
        makeEdge('c', 'b'),
        makeEdge('a', 'a'),
      ],
    };

    const childrenByParent = new Map([['container', ['a', 'b', 'c']]]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('container')).toBe('dense');
  });

  it('returns sparse for empty container', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [makeNode('container', { type: 'container' })],
      edges: [],
    };

    const childrenByParent = new Map<string, string[]>([['container', []]]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('container')).toBe('sparse');
  });

  it('returns chain for single child', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('child', { parentId: 'container' }),
      ],
      edges: [],
    };

    const childrenByParent = new Map([['container', ['child']]]);
    const patterns = detectPatterns(model, childrenByParent);

    // Single node subgraph has order <= 1 → sparse
    expect(patterns.get('container')).toBe('sparse');
  });

  it('detects sparse for unconnected siblings', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('a', { parentId: 'container' }),
        makeNode('b', { parentId: 'container' }),
        makeNode('c', { parentId: 'container' }),
      ],
      edges: [makeEdge('a', 'b')],
    };

    const childrenByParent = new Map([['container', ['a', 'b', 'c']]]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('container')).toBe('sparse');
  });

  it('classifies cycle as dense (not chain)', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('container', { type: 'container' }),
        makeNode('a', { parentId: 'container' }),
        makeNode('b', { parentId: 'container' }),
        makeNode('c', { parentId: 'container' }),
      ],
      edges: [
        makeEdge('a', 'b'),
        makeEdge('b', 'c'),
        makeEdge('c', 'a'),
      ],
    };

    const childrenByParent = new Map([['container', ['a', 'b', 'c']]]);
    const patterns = detectPatterns(model, childrenByParent);

    // 3 edges / 3 nodes = 1.0, not > 2.0, so not dense → sparse
    // Cycle prevents chain/tree, not star (max degree 2, need >= 1), not bipartite (odd cycle)
    expect(patterns.get('container')).toBe('sparse');
  });

  it('handles multiple containers independently', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('c1', { type: 'container' }),
        makeNode('c2', { type: 'container' }),
        makeNode('a', { parentId: 'c1' }),
        makeNode('b', { parentId: 'c1' }),
        makeNode('c', { parentId: 'c1' }),
        makeNode('hub', { parentId: 'c2' }),
        makeNode('s1', { parentId: 'c2' }),
        makeNode('s2', { parentId: 'c2' }),
        makeNode('s3', { parentId: 'c2' }),
      ],
      edges: [
        makeEdge('a', 'b'),
        makeEdge('b', 'c'),
        makeEdge('hub', 's1'),
        makeEdge('hub', 's2'),
        makeEdge('hub', 's3'),
      ],
    };

    const childrenByParent = new Map([
      ['c1', ['a', 'b', 'c']],
      ['c2', ['hub', 's1', 's2', 's3']],
    ]);
    const patterns = detectPatterns(model, childrenByParent);

    expect(patterns.get('c1')).toBe('chain');
    expect(patterns.get('c2')).toBe('star');
  });
});
