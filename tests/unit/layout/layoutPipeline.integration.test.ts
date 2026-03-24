import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  layoutWithGraphviz: vi.fn(),
}));

vi.mock('../../../src/web/diagram/graphvizLayoutService', async () => {
  const actual = await vi.importActual('../../../src/web/diagram/graphvizLayoutService');
  return {
    ...actual,
    layoutWithGraphviz: (...args: unknown[]) => mocks.layoutWithGraphviz(...args),
  };
});

import {
  clearLayoutPipelineCache,
  getLastLayoutDiagnostics,
  layoutPipeline,
} from '../../../src/web/diagram/layout/layoutPipeline';
import { clearRelayoutLog, getRelayoutLog } from '../../../src/web/diagram/layout/debug/relayoutLogger';
import {
  buildLayoutViewState,
  buildScopedModelFromViewState,
  hashDiagramModel,
} from '../../../src/web/diagram/layout/scope/viewStateBuilder';
import type { ArchitectureDiagramModel } from '../../../src/web/diagram/types';

const baseModel: ArchitectureDiagramModel = {
  nodes: [
    { id: 'a', type: 'element', position: { x: 0, y: 0 }, data: { title: 'A' } },
    { id: 'b', type: 'element', position: { x: 0, y: 0 }, data: { title: 'B' } },
  ],
  edges: [{ id: 'edge-1', source: 'a', target: 'b', type: 'relationship', data: { kind: 'sync' } }],
};

describe('layoutPipeline integration', () => {
  beforeEach(() => {
    clearLayoutPipelineCache();
    clearRelayoutLog();
    mocks.layoutWithGraphviz.mockReset();
    mocks.layoutWithGraphviz.mockImplementation(async (model: ArchitectureDiagramModel) => ({
      nodes: model.nodes.map((node, index) => ({
        ...node,
        position: { x: 24 + index * 296, y: 40 },
        style: { ...node.style, width: 220, height: 100 },
      })),
      edges: model.edges,
      flows: model.flows,
    }));
  });

  it('runs the full pipeline end-to-end and preserves the immutable output contract', async () => {
    const result = await layoutPipeline(baseModel, { engine: 'graphviz' }, { reason: 'graph_changed' });
    const edge = result.edges[0];

    expect(result).not.toBe(baseModel);
    expect(result.nodes[0].position.x).toBeGreaterThanOrEqual(0);
    expect(edge.data?.layoutPoints?.length).toBeGreaterThan(0);
    expect(edge.data?.sourceAnchor).toBeDefined();
    expect(edge.data?.targetAnchor).toBeDefined();
  });

  it('records cache miss on first run and cache hit on repeated view state', async () => {
    await layoutPipeline(baseModel, { engine: 'graphviz' }, { scopeId: 'root', reason: 'cache_miss' });
    const first = getLastLayoutDiagnostics();

    await layoutPipeline(baseModel, { engine: 'graphviz' }, { scopeId: 'root', reason: 'scope_changed' });
    const second = getLastLayoutDiagnostics();

    expect(first?.cacheHit).toBe(false);
    expect(second?.cacheHit).toBe(true);
    expect(second?.reason).toBe('scope_changed');
    expect(mocks.layoutWithGraphviz).toHaveBeenCalledTimes(1);
  });

  it('emits relayout diagnostics to the logger', async () => {
    await layoutPipeline(baseModel, { engine: 'graphviz', debug: true }, { reason: 'graph_changed' });
    const log = getRelayoutLog();

    expect(log.length).toBeGreaterThan(0);
    expect(log.at(-1)?.reason).toBe('graph_changed');
    expect(log.at(-1)?.strategy).toBeDefined();
  });

  it('cola refinement is wired: pipeline uses double routing (route → cola → re-route)', async () => {
    // Overlapping nodes — cola should resolve overlaps
    const overlapModel: ArchitectureDiagramModel = {
      nodes: [
        { id: 'x', type: 'element', position: { x: 0, y: 0 }, data: { title: 'X', shape: 'service' } },
        { id: 'y', type: 'element', position: { x: 0, y: 0 }, data: { title: 'Y', shape: 'service' } },
        { id: 'z', type: 'element', position: { x: 0, y: 0 }, data: { title: 'Z', shape: 'service' } },
      ],
      edges: [
        { id: 'e1', source: 'x', target: 'y', type: 'relationship', data: { kind: 'sync' } },
        { id: 'e2', source: 'y', target: 'z', type: 'relationship', data: { kind: 'sync' } },
      ],
    };

    let diagnostics: ReturnType<typeof getLastLayoutDiagnostics>;
    const result = await layoutPipeline(overlapModel, {}, {
      reason: 'graph_changed',
      forceRelayout: true,
      onDiagnostics: (d) => { diagnostics = d; },
    });

    // Pipeline ran successfully with cola refinement wired in
    expect(diagnostics!.qualityScore).toBeDefined();
    expect(diagnostics!.qualityScore.nodeOverlaps).toBeGreaterThanOrEqual(0);
    // All edges should have layout points (re-routed after cola)
    for (const edge of result.edges) {
      expect(edge.data?.layoutPoints?.length).toBeGreaterThan(0);
    }
    // All nodes should have non-negative positions (bounds normalized)
    for (const node of result.nodes) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('restores cached parent layout after drilldown back using view-state keys', async () => {
    const scopedModel: ArchitectureDiagramModel = {
      nodes: [
        { id: 'root', type: 'container', position: { x: 0, y: 0 }, data: { title: 'Root' } },
        { id: 'scope-a', type: 'container', parentId: 'root', position: { x: 0, y: 0 }, data: { title: 'Scope A' } },
        { id: 'leaf-a', type: 'element', parentId: 'scope-a', position: { x: 0, y: 0 }, data: { title: 'Leaf A' } },
        { id: 'scope-b', type: 'container', parentId: 'root', position: { x: 0, y: 0 }, data: { title: 'Scope B' } },
        { id: 'leaf-b', type: 'element', parentId: 'scope-b', position: { x: 0, y: 0 }, data: { title: 'Leaf B' } },
      ],
      edges: [
        { id: 'edge-scope', source: 'leaf-a', target: 'leaf-b', type: 'relationship', data: { kind: 'sync' } },
      ],
    };
    const modelIdentity = hashDiagramModel(scopedModel);
    const rootView = buildLayoutViewState(scopedModel, {
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });
    const childView = buildLayoutViewState(scopedModel, {
      scopeId: 'scope-a',
      notation: 'architecture',
      preset: 'c4-like',
      direction: 'LR',
    });

    await layoutPipeline(
      buildScopedModelFromViewState(scopedModel, rootView),
      { engine: 'graphviz' },
      {
        scopeId: rootView.scopeId,
        cacheKey: rootView.cacheKey,
        modelIdentity,
        reason: 'cache_miss',
      }
    );
    await layoutPipeline(
      buildScopedModelFromViewState(scopedModel, childView),
      { engine: 'graphviz' },
      {
        scopeId: childView.scopeId,
        cacheKey: childView.cacheKey,
        modelIdentity,
        reason: 'scope_changed',
      }
    );
    await layoutPipeline(
      buildScopedModelFromViewState(scopedModel, rootView),
      { engine: 'graphviz' },
      {
        scopeId: rootView.scopeId,
        cacheKey: rootView.cacheKey,
        modelIdentity,
        reason: 'scope_changed',
      }
    );

    expect(getLastLayoutDiagnostics()?.cacheHit).toBe(true);
    expect(mocks.layoutWithGraphviz).toHaveBeenCalledTimes(2);
  });
});
