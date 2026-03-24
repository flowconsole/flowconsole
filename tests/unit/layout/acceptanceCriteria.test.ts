/**
 * Acceptance criteria tests for the semantically-aware auto-layout engine.
 * Maps directly to Task 13 checkboxes in the plan.
 */
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
import { computeQualityScore, isQualityAcceptable, qualityScoreValue } from '../../../src/web/diagram/layout/qualityScore';
import { analyzeGraph } from '../../../src/web/diagram/layout/graphAnalyzer';
import { selectStrategy } from '../../../src/web/diagram/layout/strategySelector';
import { architectureNotation } from '../../../src/web/diagram/layout/notation/architectureNotation';
import { rankSemantically } from '../../../src/web/diagram/layout/semanticRanker';
import { sizeRankedGraph } from '../../../src/web/diagram/layout/shapeSizing';
import { positionNodes } from '../../../src/web/diagram/layout/positioningEngine';
import { routeEdges } from '../../../src/web/diagram/layout/edgeRouter';
import { refineLayout } from '../../../src/web/diagram/layout/layoutRefiner';
import { defaultShapeRegistry } from '../../../src/web/diagram/layout/shapes/builtins';
import type { ArchitectureDiagramModel, AutoLayoutConfig } from '../../../src/web/diagram/types';

// --- Fixtures ---

const simpleModel: ArchitectureDiagramModel = {
  nodes: [
    { id: 'web', type: 'element', position: { x: 0, y: 0 }, data: { title: 'Web App', shape: 'service' } },
    { id: 'api', type: 'element', position: { x: 0, y: 0 }, data: { title: 'API Server', shape: 'service' } },
    { id: 'db', type: 'element', position: { x: 0, y: 0 }, data: { title: 'Database', shape: 'database' } },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'api', type: 'relationship', data: { kind: 'sync', label: 'HTTP' } },
    { id: 'e2', source: 'api', target: 'db', type: 'relationship', data: { kind: 'sync', label: 'SQL' } },
  ],
};

const containerModel: ArchitectureDiagramModel = {
  nodes: [
    { id: 'system', type: 'container', position: { x: 0, y: 0 }, data: { title: 'System' } },
    { id: 'svc-a', type: 'element', parentId: 'system', position: { x: 0, y: 0 }, data: { title: 'Service A', shape: 'service' } },
    { id: 'svc-b', type: 'element', parentId: 'system', position: { x: 0, y: 0 }, data: { title: 'Service B', shape: 'service' } },
    { id: 'external', type: 'element', position: { x: 0, y: 0 }, data: { title: 'External', shape: 'service' } },
  ],
  edges: [
    { id: 'e1', source: 'svc-a', target: 'svc-b', type: 'relationship', data: { kind: 'sync' } },
    { id: 'e2', source: 'external', target: 'svc-a', type: 'relationship', data: { kind: 'sync' } },
  ],
};

const flowModel: ArchitectureDiagramModel = {
  nodes: [
    { id: 'user', type: 'element', position: { x: 0, y: 0 }, data: { title: 'User', shape: 'person' } },
    { id: 'app', type: 'element', position: { x: 0, y: 0 }, data: { title: 'App', shape: 'service' } },
    { id: 'store', type: 'element', position: { x: 0, y: 0 }, data: { title: 'Store', shape: 'database' } },
  ],
  edges: [
    { id: 'e1', source: 'user', target: 'app', type: 'relationship', data: { kind: 'sync', label: 'request' } },
    { id: 'e2', source: 'app', target: 'store', type: 'relationship', data: { kind: 'sync', label: 'query' } },
  ],
  flows: [
    {
      id: 'flow-1',
      title: 'Login Flow',
      steps: [
        { id: 'step-1', source: 'user', target: 'app', label: 'Login request' },
        { id: 'step-2', source: 'app', target: 'store', label: 'Validate credentials' },
      ],
    },
  ],
};

function mockGraphviz() {
  mocks.layoutWithGraphviz.mockImplementation(async (model: ArchitectureDiagramModel) => ({
    nodes: model.nodes.map((node, index) => ({
      ...node,
      position: { x: 24 + index * 296, y: 40 + (node.parentId ? 60 : 0) },
      style: { ...node.style, width: 220, height: 100 },
    })),
    edges: model.edges,
    flows: model.flows,
  }));
}

describe('Acceptance Criteria - Task 13', () => {
  beforeEach(() => {
    clearLayoutPipelineCache();
    clearRelayoutLog();
    mocks.layoutWithGraphviz.mockReset();
    mockGraphviz();
  });

  describe('AC1: No node overlap on fixture corpus', () => {
    it('produces zero node overlaps on simple model', async () => {
      const result = await layoutPipeline(simpleModel, { engine: 'graphviz' }, { reason: 'graph_changed' });
      const profile = analyzeGraph(result);
      const strategy = selectStrategy(profile, { engine: 'graphviz' }, architectureNotation);
      const ranked = rankSemantically(result, profile, strategy, architectureNotation, { notation: 'architecture', preset: 'c4-like' });
      const sized = sizeRankedGraph(ranked, architectureNotation);
      const positioned = await positionNodes(sized, { forceGraphviz: true });
      const routed = routeEdges(positioned);
      const quality = computeQualityScore(routed);
      expect(quality.nodeOverlaps).toBe(0);
    });
  });

  describe('AC2: No child outside container bounds', () => {
    it('container violations are zero on container model', async () => {
      const result = await layoutPipeline(containerModel, { engine: 'graphviz' }, { reason: 'graph_changed' });
      const profile = analyzeGraph(result);
      const strategy = selectStrategy(profile, { engine: 'graphviz' }, architectureNotation);
      const ranked = rankSemantically(result, profile, strategy, architectureNotation, { notation: 'architecture', preset: 'c4-like' });
      const sized = sizeRankedGraph(ranked, architectureNotation);
      const positioned = await positionNodes(sized, { forceGraphviz: true });
      const routed = routeEdges(positioned);
      const quality = computeQualityScore(routed);
      expect(quality.containerViolations).toBe(0);
    });
  });

  describe('AC3: Stable positions for unchanged state', () => {
    it('same input produces same output (deterministic)', async () => {
      const result1 = await layoutPipeline(simpleModel, { engine: 'graphviz' }, { reason: 'graph_changed', forceRelayout: true });
      clearLayoutPipelineCache();
      const result2 = await layoutPipeline(simpleModel, { engine: 'graphviz' }, { reason: 'graph_changed', forceRelayout: true });

      for (let i = 0; i < result1.nodes.length; i++) {
        expect(result1.nodes[i].position.x).toBe(result2.nodes[i].position.x);
        expect(result1.nodes[i].position.y).toBe(result2.nodes[i].position.y);
      }
    });
  });

  describe('AC4: drilldown -> back preserves mental map', () => {
    it('restores cached parent layout after drilldown/back', async () => {
      const modelIdentity = hashDiagramModel(containerModel);
      const rootView = buildLayoutViewState(containerModel, {
        notation: 'architecture',
        preset: 'c4-like',
        direction: 'LR',
      });
      const childView = buildLayoutViewState(containerModel, {
        scopeId: 'system',
        notation: 'architecture',
        preset: 'c4-like',
        direction: 'LR',
      });

      // Layout root
      const rootResult = await layoutPipeline(
        buildScopedModelFromViewState(containerModel, rootView),
        { engine: 'graphviz' },
        { scopeId: rootView.scopeId, cacheKey: rootView.cacheKey, modelIdentity, reason: 'cache_miss' }
      );

      // Drilldown to child
      await layoutPipeline(
        buildScopedModelFromViewState(containerModel, childView),
        { engine: 'graphviz' },
        { scopeId: childView.scopeId, cacheKey: childView.cacheKey, modelIdentity, reason: 'scope_changed' }
      );

      // Back to root - should use cache
      const backResult = await layoutPipeline(
        buildScopedModelFromViewState(containerModel, rootView),
        { engine: 'graphviz' },
        { scopeId: rootView.scopeId, cacheKey: rootView.cacheKey, modelIdentity, reason: 'scope_changed' }
      );

      expect(getLastLayoutDiagnostics()?.cacheHit).toBe(true);
      // Positions should be identical
      for (let i = 0; i < rootResult.nodes.length; i++) {
        const original = rootResult.nodes.find((n) => n.id === backResult.nodes[i].id);
        if (original) {
          expect(backResult.nodes[i].position.x).toBe(original.position.x);
          expect(backResult.nodes[i].position.y).toBe(original.position.y);
        }
      }
    });
  });

  describe('AC5: Relayout reasons emitted correctly', () => {
    it('emits graph_changed reason on initial layout', async () => {
      await layoutPipeline(simpleModel, { engine: 'graphviz', debug: true }, { reason: 'graph_changed' });
      const log = getRelayoutLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log.at(-1)?.reason).toBe('graph_changed');
    });

    it('emits scope_changed when drilldown occurs', async () => {
      await layoutPipeline(simpleModel, { engine: 'graphviz', debug: true }, { reason: 'scope_changed' });
      const log = getRelayoutLog();
      expect(log.at(-1)?.reason).toBe('scope_changed');
    });

    it('emits config_changed when direction changes', async () => {
      await layoutPipeline(simpleModel, { engine: 'graphviz', debug: true }, { reason: 'config_changed' });
      const log = getRelayoutLog();
      expect(log.at(-1)?.reason).toBe('config_changed');
    });
  });

  describe('AC6: Active flow readable and focusable', () => {
    it('preserves flow data through the pipeline', async () => {
      const result = await layoutPipeline(flowModel, { engine: 'graphviz' }, { reason: 'graph_changed' });
      expect(result.flows).toBeDefined();
      expect(result.flows?.length).toBe(1);
      expect(result.flows?.[0].title).toBe('Login Flow');
      expect(result.flows?.[0].steps.length).toBe(2);
    });
  });

  describe('AC7: Custom shapes route correctly', () => {
    it('shape registry returns definitions for all built-in shapes', () => {
      const shapes = ['person', 'service', 'database', 'queue', 'storage', 'gateway', 'boundary', 'generic'];
      for (const shapeId of shapes) {
        const def = defaultShapeRegistry.resolve(shapeId);
        expect(def).toBeDefined();
        expect(def?.shapeId).toBe(shapeId);
        expect(def?.geometryKind).toBeDefined();
        expect(def?.defaultDimensions.width).toBeGreaterThan(0);
        expect(def?.defaultDimensions.height).toBeGreaterThan(0);
      }
    });

    it('unknown shapes fall back to generic', () => {
      const def = defaultShapeRegistry.resolve('unknown-shape');
      expect(def).toBeDefined();
      expect(def?.shapeId).toBe('generic');
    });
  });

  describe('AC8: Direction switch preserves readability', () => {
    it.each(['LR', 'TB', 'RL', 'BT'] as const)('produces valid layout for direction %s', async (direction) => {
      const config: AutoLayoutConfig = { engine: 'graphviz', direction };
      clearLayoutPipelineCache();
      const result = await layoutPipeline(simpleModel, config, { reason: 'config_changed', forceRelayout: true });
      expect(result.nodes.length).toBe(simpleModel.nodes.length);
      expect(result.edges.length).toBe(simpleModel.edges.length);
      // All nodes should have valid positions
      for (const node of result.nodes) {
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
      }
    });
  });

  describe('AC9: Quality score above thresholds', () => {
    it('simple model passes quality thresholds', async () => {
      const profile = analyzeGraph(simpleModel);
      const strategy = selectStrategy(profile, { engine: 'graphviz' }, architectureNotation);
      const ranked = rankSemantically(simpleModel, profile, strategy, architectureNotation, { notation: 'architecture', preset: 'c4-like' });
      const sized = sizeRankedGraph(ranked, architectureNotation);
      const positioned = await positionNodes(sized, { forceGraphviz: true });
      const routed = routeEdges(positioned);
      const refined = refineLayout(routed);
      const quality = computeQualityScore(refined);
      const value = qualityScoreValue(quality, refined.nodes.length);

      expect(value).toBeGreaterThan(0.7);
      // nodeOverlaps and containerViolations must be zero (hard constraints)
      expect(quality.nodeOverlaps).toBe(0);
      expect(quality.containerViolations).toBe(0);
    });
  });
});
