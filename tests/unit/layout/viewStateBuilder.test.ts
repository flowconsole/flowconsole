import { describe, expect, it } from 'vitest';

import type { ArchitectureDiagramModel } from '../../../src/web/diagram/types';
import {
  buildLayoutViewState,
  buildScopedModelFromViewState,
  resolveScopeAwareTarget,
} from '../../../src/web/diagram/layout/scope/viewStateBuilder';

const model: ArchitectureDiagramModel = {
  nodes: [
    {
      id: 'container-a',
      type: 'container',
      position: { x: 0, y: 0 },
      data: { title: 'Container A' },
    },
    {
      id: 'service-a',
      type: 'element',
      parentId: 'container-a',
      position: { x: 0, y: 0 },
      data: { title: 'Service A' },
    },
    {
      id: 'child-scope',
      type: 'container',
      parentId: 'container-a',
      position: { x: 0, y: 0 },
      data: { title: 'Child Scope' },
    },
    {
      id: 'nested-leaf',
      type: 'element',
      parentId: 'child-scope',
      position: { x: 0, y: 0 },
      data: { title: 'Nested Leaf' },
    },
    {
      id: 'container-b',
      type: 'container',
      position: { x: 0, y: 0 },
      data: { title: 'Container B' },
    },
    {
      id: 'worker-b',
      type: 'element',
      parentId: 'container-b',
      position: { x: 0, y: 0 },
      data: { title: 'Worker B' },
    },
    {
      id: 'database-root',
      type: 'element',
      position: { x: 0, y: 0 },
      data: { title: 'Database Root', shape: 'database' },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'relationship',
      source: 'service-a',
      target: 'database-root',
      data: { kind: 'sync', label: 'write' },
    },
    {
      id: 'edge-2',
      type: 'relationship',
      source: 'nested-leaf',
      target: 'database-root',
      data: { kind: 'sync', label: 'write' },
    },
    {
      id: 'edge-3',
      type: 'relationship',
      source: 'nested-leaf',
      target: 'worker-b',
      data: { kind: 'event', label: 'publish' },
    },
  ],
  flows: [
    {
      id: 'flow-1',
      name: 'Flow 1',
      steps: [
        {
          id: 'step-1',
          edgeId: 'edge-2',
          sourceId: 'nested-leaf',
          targetId: 'database-root',
          label: 'write',
        },
      ],
    },
  ],
};

describe('viewStateBuilder', () => {
  it('builds a stable root view state with representative collapsing', () => {
    const first = buildLayoutViewState(model, {
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });
    const second = buildLayoutViewState(model, {
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });

    expect(Array.from(first.visibleNodeIds)).toEqual(['container-a', 'container-b', 'database-root']);
    expect(first.representativeNodeIds.get('service-a')).toBe('container-a');
    expect(first.representativeNodeIds.get('nested-leaf')).toBe('container-a');
    expect(first.representativeNodeIds.get('worker-b')).toBe('container-b');
    expect(first.cacheKey).toBe(second.cacheKey);
  });

  it('builds a scoped view state that keeps direct children first-class', () => {
    const scoped = buildLayoutViewState(model, {
      scopeId: 'container-a',
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });

    expect(Array.from(scoped.visibleNodeIds)).toEqual([
      'container-a',
      'service-a',
      'child-scope',
      'container-b',
      'database-root',
    ]);
    expect(scoped.representativeNodeIds.get('nested-leaf')).toBe('child-scope');
    expect(scoped.representativeNodeIds.get('worker-b')).toBe('container-b');
  });

  it('preserves originalEdgeIds when aggregating scoped edges', () => {
    const rootView = buildLayoutViewState(model, {
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });
    const scopedModel = buildScopedModelFromViewState(model, rootView);
    const aggregate = scopedModel.edges.find((edge) => edge.id.startsWith('agg:'));

    expect(aggregate?.source).toBe('container-a');
    expect(aggregate?.target).toBe('database-root');
    expect(aggregate?.data?.originalEdgeIds).toEqual(['edge-1', 'edge-2']);
    expect(aggregate?.data?.detail).toContain('2 links');
  });

  it('resolves scope-aware targets for visible and hidden nodes', () => {
    const rootView = buildLayoutViewState(model, {
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });
    const scopedView = buildLayoutViewState(model, {
      scopeId: 'container-a',
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });

    expect(resolveScopeAwareTarget(model, rootView, 'nested-leaf')).toEqual({
      scopeId: 'child-scope',
      focusId: 'nested-leaf',
      representativeId: 'child-scope',
    });
    expect(resolveScopeAwareTarget(model, scopedView, 'service-a')).toEqual({
      scopeId: 'container-a',
      focusId: 'service-a',
      representativeId: 'service-a',
    });
    expect(resolveScopeAwareTarget(model, scopedView, 'worker-b')).toEqual({
      scopeId: 'container-b',
      focusId: 'worker-b',
      representativeId: 'container-b',
    });
  });
});
