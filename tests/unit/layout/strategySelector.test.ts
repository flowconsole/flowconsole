import { describe, expect, it } from 'vitest';
import { architectureNotation } from '../../../src/web/diagram/layout/notation/architectureNotation';
import { selectStrategy } from '../../../src/web/diagram/layout/strategySelector';
import type { AutoLayoutConfig } from '../../../src/web/diagram/types';
import type { GraphProfile, SemanticEdge, SemanticNode } from '../../../src/web/diagram/layout/types';

function makeProfile(
  overrides: Partial<GraphProfile> = {}
): GraphProfile {
  return {
    nodeCount: 10,
    edgeCount: 10,
    containerCount: 0,
    maxNestingDepth: 0,
    edgesPerNode: 1,
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

function makeNode(overrides: Partial<SemanticNode> = {}): SemanticNode {
  const overrideData = overrides.data ?? {};
  return {
    id: 'node-1',
    type: 'element',
    position: { x: 0, y: 0 },
    ...overrides,
    data: {
      title: 'Node',
      ...overrideData,
    },
  } as SemanticNode;
}

function makeEdge(overrides: Partial<SemanticEdge> = {}): SemanticEdge {
  const overrideData = overrides.data ?? {};
  return {
    id: 'edge-1',
    source: 'a',
    target: 'b',
    type: 'relationship',
    ...overrides,
    data: {
      ...overrideData,
    },
  } as SemanticEdge;
}

describe('architectureNotation', () => {
  it('classifies nodes and default shapes for architecture notation', () => {
    expect(architectureNotation.classifyNode(makeNode({ data: { title: 'Gateway', technology: 'API Gateway' } }))).toBe(
      'gateway'
    );
    expect(architectureNotation.defaultShape(makeNode({ data: { title: 'User', shape: 'person' } }))).toBe('person');
    expect(architectureNotation.defaultShape(makeNode({ type: 'container' }))).toBe('boundary');
  });

  it('exposes lane and label policies', () => {
    expect(architectureNotation.lanePolicy(makeNode(), 'worker')).toBe('central-late');
    expect(architectureNotation.labelPolicy(makeEdge({ data: { kind: 'dependency' } }))).toBe('minimal');
    expect(architectureNotation.classifyEdge(makeEdge({ data: { kind: 'async' } }))).toBe('async');
  });
});

describe('selectStrategy', () => {
  const config: AutoLayoutConfig = { notation: 'architecture', preset: 'c4-like' };

  it('always selects layered strategy', () => {
    const strategy = selectStrategy(
      makeProfile({ nodeCount: 5, containerCount: 0 }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('layered');
    expect(strategy.direction).toBe('LR');
  });

  it('selects layered for graphs with flows', () => {
    const strategy = selectStrategy(
      makeProfile({ hasFlows: true, edgesPerNode: 1.2 }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('layered');
  });

  it('selects layered for deeply nested graphs', () => {
    const strategy = selectStrategy(
      makeProfile({ maxNestingDepth: 2, containerCount: 2 }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('layered');
  });

  it('selects layered for dense graphs', () => {
    const strategy = selectStrategy(
      makeProfile({ edgesPerNode: 3.0 }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('layered');
  });

  it('selects layered for large container graphs', () => {
    const strategy = selectStrategy(
      makeProfile({
        containerChildCounts: new Map([['big-container', 20]]),
        containerCount: 1,
      }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('layered');
  });

  it('uses TB direction for flow-heavy processor/worker graphs', () => {
    const strategy = selectStrategy(
      makeProfile({
        hasFlows: true,
        nodeRoles: new Map([
          ['a', 'processor'],
          ['b', 'worker'],
          ['c', 'processor'],
        ]),
      }),
      config,
      architectureNotation
    );

    expect(strategy.direction).toBe('TB');
  });

  it('respects explicit direction from config', () => {
    const strategy = selectStrategy(
      makeProfile(),
      { ...config, direction: 'RL' },
      architectureNotation
    );

    expect(strategy.direction).toBe('RL');
  });
});
