import { describe, expect, it } from 'vitest';
import { analyzeGraph } from '../../../src/web/diagram/layout/graphAnalyzer';
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
  id: string,
  source: string,
  target: string
): ArchitectureDiagramModel['edges'][number] {
  return {
    id,
    source,
    target,
    type: 'relationship',
    data: {},
  };
}

describe('analyzeGraph', () => {
  it('classifies nodes with the documented 10-rule priority chain', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('person', { data: { title: 'User', shape: 'person' } }),
        makeNode('database', { data: { title: 'Orders DB', shape: 'database' } }),
        makeNode('queue', { data: { title: 'Jobs Queue', shape: 'queue' } }),
        makeNode('gateway', { data: { title: 'Edge', technology: 'API Gateway' } }),
        makeNode('worker', { data: { title: 'Nightly Job Runner' } }),
        makeNode('external', {
          data: { title: 'Vendor', tone: 'muted', weakOwnership: true },
        }),
        makeNode('source'),
        makeNode('middle-a'),
        makeNode('sink'),
        makeNode('frontend', { data: { title: 'Customer SPA' } }),
        makeNode('processor'),
        makeNode('processor-target'),
        makeNode('frontend-target'),
      ],
      edges: [
        makeEdge('e1', 'source', 'middle-a'),
        makeEdge('e2', 'middle-a', 'sink'),
        makeEdge('e3', 'gateway', 'processor'),
        makeEdge('e4', 'processor', 'processor-target'),
        makeEdge('e5', 'processor', 'frontend'),
        makeEdge('e6', 'frontend', 'frontend-target'),
      ],
    };

    const profile = analyzeGraph(model);

    expect(profile.nodeRoles.get('person')).toBe('entry');
    expect(profile.nodeRoles.get('database')).toBe('store');
    expect(profile.nodeRoles.get('queue')).toBe('queue');
    expect(profile.nodeRoles.get('gateway')).toBe('gateway');
    expect(profile.nodeRoles.get('worker')).toBe('worker');
    expect(profile.nodeRoles.get('external')).toBe('external');
    expect(profile.nodeRoles.get('source')).toBe('entry');
    expect(profile.nodeRoles.get('sink')).toBe('store');
    expect(profile.nodeRoles.get('frontend')).toBe('frontend');
    expect(profile.nodeRoles.get('processor')).toBe('processor');
  });

  it('computes density, sources, sinks and nesting depth', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('root', { type: 'container' }),
        makeNode('child', { parentId: 'root' }),
        makeNode('grandchild', { parentId: 'child' }),
        makeNode('sink'),
      ],
      edges: [makeEdge('e1', 'child', 'sink'), makeEdge('e2', 'grandchild', 'sink')],
      flows: [{ id: 'flow-1', steps: [] }],
    };

    const profile = analyzeGraph(model);

    expect(profile.edgesPerNode).toBe(0.5);
    expect(profile.maxNestingDepth).toBe(2);
    expect(profile.hasFlows).toBe(true);
    expect(profile.sourceSinks.sources).toEqual(['child', 'grandchild', 'root']);
    expect(profile.sourceSinks.sinks).toEqual(['root', 'sink']);
    expect(profile.containerChildCounts.get('root')).toBe(1);
    expect(profile.containerCount).toBe(1);
  });

  it('classifies nodes by technology regex patterns', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        makeNode('gw', { data: { title: 'Edge', technology: 'Kong' } }),
        makeNode('nginx-gw', { data: { title: 'Proxy', technology: 'Nginx' } }),
        makeNode('celery-worker', { data: { title: 'Tasks', technology: 'Celery' } }),
        makeNode('sidekiq-worker', { data: { title: 'Jobs', technology: 'Sidekiq' } }),
        makeNode('react-app', { data: { title: 'Dashboard', technology: 'React' } }),
        makeNode('flutter-app', { data: { title: 'Mobile', technology: 'Flutter' } }),
        makeNode('target'),
      ],
      edges: [
        makeEdge('e1', 'gw', 'target'),
        makeEdge('e2', 'nginx-gw', 'target'),
        makeEdge('e3', 'celery-worker', 'target'),
        makeEdge('e4', 'sidekiq-worker', 'target'),
        makeEdge('e5', 'target', 'react-app'),
        makeEdge('e6', 'target', 'flutter-app'),
        makeEdge('e7', 'react-app', 'gw'),
        makeEdge('e8', 'flutter-app', 'gw'),
      ],
    };

    const profile = analyzeGraph(model);

    expect(profile.nodeRoles.get('gw')).toBe('gateway');
    expect(profile.nodeRoles.get('nginx-gw')).toBe('gateway');
    expect(profile.nodeRoles.get('celery-worker')).toBe('worker');
    expect(profile.nodeRoles.get('sidekiq-worker')).toBe('worker');
    expect(profile.nodeRoles.get('react-app')).toBe('frontend');
    expect(profile.nodeRoles.get('flutter-app')).toBe('frontend');
  });

  it('returns SCC as array of sets with >1 member', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')],
      edges: [
        makeEdge('e1', 'a', 'b'),
        makeEdge('e2', 'b', 'c'),
        makeEdge('e3', 'c', 'a'),
        makeEdge('e4', 'c', 'd'),
      ],
    };

    const profile = analyzeGraph(model);
    const sccMembers = profile.scc.map((s) => Array.from(s).sort());

    expect(sccMembers).toEqual([['a', 'b', 'c']]);
  });

  it('detects disconnected components with union-find', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d'), makeNode('e')],
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'c', 'd')],
    };

    const profile = analyzeGraph(model);
    const components = profile.disconnectedComponents.map((component) =>
      Array.from(component).sort()
    );

    expect(components).toEqual([['e'], ['a', 'b'], ['c', 'd']]);
  });

  it('detects strongly connected clusters', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')],
      edges: [
        makeEdge('e1', 'a', 'b'),
        makeEdge('e2', 'b', 'a'),
        makeEdge('e3', 'b', 'c'),
        makeEdge('e4', 'c', 'd'),
      ],
    };

    const profile = analyzeGraph(model);
    const clusters = Array.from(profile.clusters.values()).map((cluster) =>
      Array.from(cluster).sort()
    );

    expect(clusters).toEqual([['a', 'b']]);
  });
});
