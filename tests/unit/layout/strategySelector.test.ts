import { describe, expect, it } from 'vitest';
import { architectureNotation } from '../../../src/web/diagram/layout/notation/architectureNotation';
import type { NotationAdapter } from '../../../src/web/diagram/layout/notation/types';
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
    edgeDensity: 1,
    hasFlows: false,
    disconnectedComponents: [],
    nodeRoles: new Map(),
    clusters: new Map(),
    sourceSinks: { sources: [], sinks: [] },
    containerChildCounts: new Map(),
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

  it('selects radial for small graphs without containers', () => {
    const strategy = selectStrategy(
      makeProfile({ nodeCount: 8, containerCount: 0 }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('radial');
    expect(strategy.direction).toBe('LR');
  });

  it('selects layered for graphs with flows', () => {
    const strategy = selectStrategy(
      makeProfile({ hasFlows: true, edgeDensity: 1.2 }),
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

  it('selects compact for dense sibling containers', () => {
    const strategy = selectStrategy(
      makeProfile({ containerChildCounts: new Map([['container-1', 16]]) }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('compact');
  });

  it('selects compact for dense graphs', () => {
    const strategy = selectStrategy(
      makeProfile({ edgeDensity: 3 }),
      config,
      architectureNotation
    );

    expect(strategy.type).toBe('compact');
  });

  it('resolves direction from explicit override before notation default', () => {
    const strategy = selectStrategy(
      makeProfile(),
      { ...config, direction: 'RL' },
      architectureNotation
    );

    expect(strategy.direction).toBe('RL');
  });

  it('falls back to strategy heuristic when notation default is absent', () => {
    const notation = {
      ...architectureNotation,
      defaultDirection: undefined,
    } as unknown as NotationAdapter;
    const strategy = selectStrategy(
      makeProfile({
        hasFlows: true,
        edgeDensity: 1.2,
        nodeRoles: new Map([
          ['worker-1', 'worker'],
          ['processor-1', 'processor'],
          ['processor-2', 'processor'],
        ]),
      }),
      config,
      notation
    );

    expect(strategy.direction).toBe('TB');
  });
});
