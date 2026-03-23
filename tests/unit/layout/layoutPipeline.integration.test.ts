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
    mocks.layoutWithGraphviz.mockResolvedValue({
      nodes: [
        { ...baseModel.nodes[0], position: { x: 24, y: 40 }, style: { width: 220, height: 100 } },
        { ...baseModel.nodes[1], position: { x: 320, y: 40 }, style: { width: 220, height: 100 } },
      ],
      edges: baseModel.edges,
      flows: baseModel.flows,
    });
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
});
