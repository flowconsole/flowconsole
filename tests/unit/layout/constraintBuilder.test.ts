import { describe, expect, it } from 'vitest';
import { buildConstraints } from '../../../src/web/diagram/layout/constraintBuilder';
import type {
  GraphProfile,
  RankedEdge,
  RankedGraph,
  RankedNode,
  SemanticLane,
} from '../../../src/web/diagram/layout/types';

function makeRankedNode(
  id: string,
  role: string,
  lane: SemanticLane,
  laneIndex: number,
  overrides: Partial<RankedNode> = {}
): RankedNode {
  return {
    id,
    type: 'element',
    position: { x: 0, y: 0 },
    data: { title: id },
    ...overrides,
    layout: {
      role: role as RankedNode['layout']['role'],
      lane,
      laneIndex,
      semanticRank: laneIndex,
      axis: 'x',
      direction: 'LR',
      inDegree: 0,
      outDegree: 0,
      order: 0,
      ...(overrides as { layout?: Partial<RankedNode['layout']> }).layout,
    },
  } as RankedNode;
}

function makeRankedEdge(
  id: string,
  source: string,
  target: string,
  isBackEdge = false
): RankedEdge {
  return {
    id,
    source,
    target,
    type: 'relationship',
    data: {},
    layout: {
      sourceLane: 'central',
      targetLane: 'central',
      semanticPriority: 5,
      isBackEdge,
    },
  } as RankedEdge;
}

function makeProfile(overrides: Partial<GraphProfile> = {}): GraphProfile {
  return {
    nodeCount: 3,
    edgeCount: 2,
    containerCount: 0,
    maxNestingDepth: 0,
    edgesPerNode: 0.67,
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
    ...overrides,
  };
}

describe('buildConstraints', () => {
  it('assigns ELK partitions from lane indices', () => {
    const graph: RankedGraph = {
      nodes: [
        makeRankedNode('entry', 'entry', 'leading', 0),
        makeRankedNode('proc', 'processor', 'central', 2),
        makeRankedNode('db', 'store', 'supporting', 4),
      ],
      edges: [
        makeRankedEdge('e1', 'entry', 'proc'),
        makeRankedEdge('e2', 'proc', 'db'),
      ],
      profile: makeProfile(),
      strategy: { type: 'layered', direction: 'LR', spacing: { node: 88, layer: 128, container: 144 } },
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
      laneAxis: 'x',
      laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    };

    const constraints = buildConstraints(graph, makeProfile({
      sourceSinks: { sources: ['entry'], sinks: ['db'] },
    }));

    expect(constraints.elkPartitions.get('entry')).toBe(0);
    expect(constraints.elkPartitions.get('proc')).toBe(2);
    expect(constraints.elkPartitions.get('db')).toBe(4);
  });

  it('generates FIRST/LAST layer constraints for sources and sinks', () => {
    const graph: RankedGraph = {
      nodes: [
        makeRankedNode('entry', 'entry', 'leading', 0),
        makeRankedNode('proc', 'processor', 'central', 2),
        makeRankedNode('db', 'store', 'supporting', 4),
      ],
      edges: [
        makeRankedEdge('e1', 'entry', 'proc'),
        makeRankedEdge('e2', 'proc', 'db'),
      ],
      profile: makeProfile(),
      strategy: { type: 'layered', direction: 'LR', spacing: { node: 88, layer: 128, container: 144 } },
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
      laneAxis: 'x',
      laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    };

    const constraints = buildConstraints(graph, makeProfile({
      sourceSinks: { sources: ['entry'], sinks: ['db'] },
    }));

    expect(constraints.elkLayerConstraints).toContainEqual({ node: 'entry', constraint: 'FIRST' });
    expect(constraints.elkLayerConstraints).toContainEqual({ node: 'db', constraint: 'LAST' });
  });

  it('generates lane ordering constraints between different lanes', () => {
    const graph: RankedGraph = {
      nodes: [
        makeRankedNode('entry', 'entry', 'leading', 0),
        makeRankedNode('proc', 'processor', 'central', 2),
        makeRankedNode('db', 'store', 'supporting', 4),
      ],
      edges: [
        makeRankedEdge('e1', 'entry', 'proc'),
        makeRankedEdge('e2', 'proc', 'db'),
      ],
      profile: makeProfile(),
      strategy: { type: 'layered', direction: 'LR', spacing: { node: 88, layer: 128, container: 144 } },
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
      laneAxis: 'x',
      laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    };

    const constraints = buildConstraints(graph, makeProfile());

    expect(constraints.laneOrdering.length).toBe(2);
    expect(constraints.laneOrdering[0]).toEqual({
      left: 'entry',
      right: 'proc',
      axis: 'x',
      gap: 100,
    });
    expect(constraints.laneOrdering[1]).toEqual({
      left: 'proc',
      right: 'db',
      axis: 'x',
      gap: 100,
    });
  });

  it('excludes back-edge source nodes from lane ordering', () => {
    const graph: RankedGraph = {
      nodes: [
        makeRankedNode('entry', 'entry', 'leading', 0),
        makeRankedNode('proc', 'processor', 'central', 2),
        makeRankedNode('db', 'store', 'supporting', 4),
      ],
      edges: [
        makeRankedEdge('e1', 'entry', 'proc'),
        makeRankedEdge('e2', 'proc', 'db'),
        makeRankedEdge('back', 'db', 'entry', true),
      ],
      profile: makeProfile(),
      strategy: { type: 'layered', direction: 'LR', spacing: { node: 88, layer: 128, container: 144 } },
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
      laneAxis: 'x',
      laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    };

    const constraints = buildConstraints(graph, makeProfile());

    expect(constraints.backEdges.has('back')).toBe(true);
    const sourceNodes = constraints.laneOrdering.map((c) => c.left);
    expect(sourceNodes).not.toContain('db');
  });

  it('generates alignment constraints for siblings with same role', () => {
    const graph: RankedGraph = {
      nodes: [
        makeRankedNode('container', 'processor', 'central', 2),
        makeRankedNode('svc1', 'processor', 'central', 2, { parentId: 'container' }),
        makeRankedNode('svc2', 'processor', 'central', 2, { parentId: 'container' }),
        makeRankedNode('db', 'store', 'supporting', 4, { parentId: 'container' }),
      ],
      edges: [],
      profile: makeProfile(),
      strategy: { type: 'layered', direction: 'LR', spacing: { node: 88, layer: 128, container: 144 } },
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
      laneAxis: 'x',
      laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    };

    const constraints = buildConstraints(graph, makeProfile());

    const processorAlignment = constraints.alignments.find(
      (a) => a.nodes.includes('svc1') && a.nodes.includes('svc2')
    );
    expect(processorAlignment).toBeDefined();
    expect(processorAlignment?.axis).toBe('y');
  });

  it('generates containment constraints for children', () => {
    const graph: RankedGraph = {
      nodes: [
        makeRankedNode('parent', 'processor', 'central', 2),
        makeRankedNode('child1', 'processor', 'central', 2, { parentId: 'parent' }),
        makeRankedNode('child2', 'store', 'supporting', 4, { parentId: 'parent' }),
      ],
      edges: [],
      profile: makeProfile(),
      strategy: { type: 'layered', direction: 'LR', spacing: { node: 88, layer: 128, container: 144 } },
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
      laneAxis: 'x',
      laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    };

    const constraints = buildConstraints(graph, makeProfile());

    expect(constraints.containments).toEqual([
      {
        parent: 'parent',
        children: ['child1', 'child2'],
        padding: 40,
      },
    ]);
  });
});
