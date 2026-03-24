/**
 * Integration tests: run legacy codeSamplesOld through DSL eval → layout pipeline.
 * Verifies that real-world architecture diagrams produce valid layouts
 * (no crashes, no overlaps, nodes positioned, edges routed).
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

import { evaluateDiagramCode } from '../../../src/web/languages/typescript/evaluateDiagramCode';
import { codeSamplesOld } from '../../../src/web/languages/typescript/samples';
import {
  clearLayoutPipelineCache,
  layoutPipeline,
  type LayoutRunDiagnostics,
} from '../../../src/web/diagram/layout/layoutPipeline';
import { computeQualityScore } from '../../../src/web/diagram/layout/qualityScore';
import type { ArchitectureDiagramModel } from '../../../src/web/diagram/types';

function mockGraphviz() {
  mocks.layoutWithGraphviz.mockImplementation(async (model: ArchitectureDiagramModel) => ({
    nodes: model.nodes.map((node, index) => ({
      ...node,
      position: { x: 24 + index * 296, y: 40 + (node.parentId ? 60 : 0) },
      style: { ...node.style, width: 220, height: 100 },
    })),
    edges: model.edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        layoutPoints: [
          { x: 24 + 220, y: 90 },
          { x: 24 + 296, y: 90 },
        ],
      },
    })),
    flows: model.flows,
  }));
}

describe('Legacy samples through layout pipeline', () => {
  beforeEach(() => {
    clearLayoutPipelineCache();
    mocks.layoutWithGraphviz.mockReset();
    mockGraphviz();
  });

  for (const sample of codeSamplesOld) {
    describe(`${sample.id}: ${sample.title}`, () => {
      it('DSL evaluates successfully', async () => {
        const result = await evaluateDiagramCode(sample.code);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.model.nodes.length).toBeGreaterThan(0);
        expect(result.model.edges.length).toBeGreaterThan(0);
      });

      it('layout pipeline produces valid output without crashing', async () => {
        const evalResult = await evaluateDiagramCode(sample.code);
        expect(evalResult.ok).toBe(true);
        if (!evalResult.ok) return;

        let diagnostics: LayoutRunDiagnostics | undefined;
        const result = await layoutPipeline(evalResult.model, {}, {
          reason: 'graph_changed',
          forceRelayout: true,
          onDiagnostics: (d) => { diagnostics = d; },
        });

        // All nodes positioned with finite coordinates
        expect(result.nodes.length).toBe(evalResult.model.nodes.length);
        for (const node of result.nodes) {
          expect(Number.isFinite(node.position.x)).toBe(true);
          expect(Number.isFinite(node.position.y)).toBe(true);
        }

        // All edges present
        expect(result.edges.length).toBe(evalResult.model.edges.length);

        // Diagnostics available
        expect(diagnostics).toBeDefined();
      });

      it('no node overlaps (excluding parent-child containment)', async () => {
        const evalResult = await evaluateDiagramCode(sample.code);
        if (!evalResult.ok) return;

        const result = await layoutPipeline(evalResult.model, {}, {
          reason: 'graph_changed',
          forceRelayout: true,
        });

        // Compute absolute positions (children have relative positions)
        const nodeById = new Map(result.nodes.map((n) => [n.id, n]));
        const absPos = (n: typeof result.nodes[0]): { x: number; y: number } => {
          if (!n.parentId) return { x: n.position.x, y: n.position.y };
          const parent = nodeById.get(n.parentId);
          if (!parent) return { x: n.position.x, y: n.position.y };
          const parentAbs = absPos(parent);
          return { x: parentAbs.x + n.position.x, y: parentAbs.y + n.position.y };
        };

        // Check pairwise overlaps (exclude containment)
        const rects = result.nodes.map((node) => {
          const abs = absPos(node);
          return {
            id: node.id,
            parentId: node.parentId,
            x1: abs.x,
            y1: abs.y,
            x2: abs.x + (node.style?.width as number ?? 220),
            y2: abs.y + (node.style?.height as number ?? 100),
          };
        });

        // Group rects by parent — only check overlaps between siblings
        const byParent = new Map<string | undefined, typeof rects>();
        for (const r of rects) {
          const group = byParent.get(r.parentId) ?? [];
          group.push(r);
          byParent.set(r.parentId, group);
        }

        let overlaps = 0;
        for (const siblings of byParent.values()) {
          for (let i = 0; i < siblings.length; i++) {
            for (let j = i + 1; j < siblings.length; j++) {
              const a = siblings[i];
              const b = siblings[j];
              const left = Math.max(a.x1, b.x1);
              const top = Math.max(a.y1, b.y1);
              const right = Math.min(a.x2, b.x2);
              const bottom = Math.min(a.y2, b.y2);
              if (right > left && bottom > top) {
                overlaps++;
              }
            }
          }
        }
        expect(overlaps).toBe(0);
      });

      it('container children are inside parent bounds', async () => {
        const evalResult = await evaluateDiagramCode(sample.code);
        if (!evalResult.ok) return;

        const result = await layoutPipeline(evalResult.model, {}, {
          reason: 'graph_changed',
          forceRelayout: true,
        });

        const nodeById = new Map(result.nodes.map((n) => [n.id, n]));
        const violations: string[] = [];

        for (const node of result.nodes) {
          if (!node.parentId) continue;
          const parent = nodeById.get(node.parentId);
          if (!parent) continue;

          // Children have relative positions to parent
          const childAbsX = (parent.position.x ?? 0) + (node.position.x ?? 0);
          const childAbsY = (parent.position.y ?? 0) + (node.position.y ?? 0);
          const childW = (node.style?.width as number) ?? 220;
          const childH = (node.style?.height as number) ?? 100;
          const parentW = (parent.style?.width as number) ?? 220;
          const parentH = (parent.style?.height as number) ?? 100;

          // Check containment with generous tolerance (layout may have padding)
          const tolerance = 50;
          if (
            childAbsX < parent.position.x - tolerance ||
            childAbsY < parent.position.y - tolerance ||
            childAbsX + childW > parent.position.x + parentW + tolerance ||
            childAbsY + childH > parent.position.y + parentH + tolerance
          ) {
            violations.push(`${node.id} outside ${node.parentId}`);
          }
        }

        expect(violations).toEqual([]);
      });

      it('edges have routing data', async () => {
        const evalResult = await evaluateDiagramCode(sample.code);
        if (!evalResult.ok) return;

        const result = await layoutPipeline(evalResult.model, {}, {
          reason: 'graph_changed',
          forceRelayout: true,
        });

        for (const edge of result.edges) {
          expect(edge.data?.layoutPoints).toBeDefined();
          expect(edge.data?.layoutPoints?.length).toBeGreaterThanOrEqual(2);
        }
      });

      it('flows are preserved through pipeline', async () => {
        const evalResult = await evaluateDiagramCode(sample.code);
        if (!evalResult.ok) return;
        if (!evalResult.model.flows?.length) return;

        const result = await layoutPipeline(evalResult.model, {}, {
          reason: 'graph_changed',
          forceRelayout: true,
        });

        expect(result.flows).toBeDefined();
        expect(result.flows?.length).toBe(evalResult.model.flows.length);
      });

      it('quality score is above minimum threshold', async () => {
        const evalResult = await evaluateDiagramCode(sample.code);
        if (!evalResult.ok) return;

        let diagnostics: LayoutRunDiagnostics | undefined;
        await layoutPipeline(evalResult.model, {}, {
          reason: 'graph_changed',
          forceRelayout: true,
          onDiagnostics: (d) => { diagnostics = d; },
        });

        expect(diagnostics).toBeDefined();
        // Minimum quality bar — layout shouldn't be terrible
        expect(diagnostics!.qualityValue).toBeGreaterThan(0.2);
      });
    });
  }
});
