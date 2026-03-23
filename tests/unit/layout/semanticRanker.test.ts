import { describe, expect, it } from 'vitest';
import { architectureNotation } from '../../../src/web/diagram/layout/notation/architectureNotation';
import { rankSemantically } from '../../../src/web/diagram/layout/semanticRanker';
import type { ArchitectureDiagramModel } from '../../../src/web/diagram/types';
import type { GraphProfile, LayoutStrategy, NodeRole } from '../../../src/web/diagram/layout/types';

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

function makeProfile(
  roles: Record<string, NodeRole>,
  degrees: Record<string, { in: number; out: number }>
): GraphProfile {
  return {
    nodeCount: Object.keys(roles).length,
    edgeCount: 0,
    containerCount: 0,
    maxNestingDepth: 0,
    edgeDensity: 0,
    hasFlows: false,
    disconnectedComponents: [],
    nodeRoles: new Map(Object.entries(roles)),
    clusters: new Map(),
    sourceSinks: { sources: [], sinks: [] },
    containerChildCounts: new Map(),
    inDegree: new Map(Object.entries(degrees).map(([id, degree]) => [id, degree.in])),
    outDegree: new Map(Object.entries(degrees).map(([id, degree]) => [id, degree.out])),
  };
}

const layeredStrategy: LayoutStrategy = {
  type: 'layered',
  direction: 'LR',
  spacing: { node: 88, layer: 128, container: 144 },
};

describe('rankSemantically', () => {
  it('assigns nodes to semantic lanes', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('entry'),
        makeNode('frontend', { data: { title: 'Customer SPA' } }),
        makeNode('gateway'),
        makeNode('processor'),
        makeNode('worker'),
        makeNode('store'),
        makeNode('external'),
      ],
      edges: [],
    };
    const profile = makeProfile(
      {
        entry: 'entry',
        frontend: 'frontend',
        gateway: 'gateway',
        processor: 'processor',
        worker: 'worker',
        store: 'store',
        external: 'external',
      },
      {
        entry: { in: 0, out: 1 },
        frontend: { in: 1, out: 1 },
        gateway: { in: 1, out: 2 },
        processor: { in: 2, out: 2 },
        worker: { in: 1, out: 0 },
        store: { in: 2, out: 0 },
        external: { in: 1, out: 0 },
      }
    );

    const ranked = rankSemantically(model, profile, layeredStrategy, architectureNotation);
    const lanes = new Map(ranked.nodes.map((node) => [node.id, node.layout.lane]));

    expect(lanes.get('entry')).toBe('leading');
    expect(lanes.get('frontend')).toBe('central-early');
    expect(lanes.get('gateway')).toBe('central-early');
    expect(lanes.get('processor')).toBe('central');
    expect(lanes.get('worker')).toBe('central-late');
    expect(lanes.get('store')).toBe('supporting');
    expect(lanes.get('external')).toBe('trailing');
    expect(ranked.laneAxis).toBe('x');
  });

  it('maps lanes to the correct axis for top-to-bottom direction', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [makeNode('frontend', { data: { title: 'Frontend SPA' } })],
      edges: [],
    };
    const profile = makeProfile(
      { frontend: 'frontend' },
      { frontend: { in: 1, out: 1 } }
    );

    const ranked = rankSemantically(
      model,
      profile,
      { ...layeredStrategy, direction: 'TB' },
      architectureNotation
    );

    expect(ranked.laneAxis).toBe('y');
    expect(ranked.nodes[0].layout.direction).toBe('TB');
  });

  it('marks back edges when semantic order is reversed', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [makeNode('processor'), makeNode('entry')],
      edges: [
        {
          id: 'edge-1',
          source: 'processor',
          target: 'entry',
          type: 'relationship',
          data: {},
        },
      ],
    };
    const profile = makeProfile(
      { processor: 'processor', entry: 'entry' },
      {
        processor: { in: 1, out: 1 },
        entry: { in: 0, out: 1 },
      }
    );

    const ranked = rankSemantically(model, profile, layeredStrategy, architectureNotation);

    expect(ranked.edges[0]?.layout.isBackEdge).toBe(true);
  });
});
