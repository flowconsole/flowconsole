import { describe, it, expect } from 'vitest';
import { buildDot, parseJsonLayout } from '../../src/web/diagram/graphvizLayoutService';
import type { ArchitectureDiagramModel } from '../../src/web/diagram/types';
import { defaultAutoLayoutConfig } from '../../src/web/diagram/types';

const makeJson = (objects: any[], edges: any[], bb = '0,0,0,0') =>
  JSON.stringify({ objects, edges, bb });

function makeModel(overrides?: Partial<ArchitectureDiagramModel>): ArchitectureDiagramModel {
  return {
    nodes: [],
    edges: [],
    ...overrides,
  } as ArchitectureDiagramModel;
}

describe('graphvizLayout', () => {
  describe('buildDot', () => {
    it('builds DOT with clusters and ignores styled width for empty container', () => {
      const model = makeModel({
        nodes: [
          { id: 'empty-container', type: 'container', data: { title: 'Empty' }, position: { x: 0, y: 0 }, style: { width: 400 } },
          { id: 'parent', type: 'container', data: { title: 'Parent "quote"' }, position: { x: 0, y: 0 } },
          { id: 'child', type: 'element', data: { title: 'Child' }, position: { x: 0, y: 0 }, parentId: 'parent' },
        ] as any,
        edges: [{ id: 'e', source: 'child', target: 'child', data: { label: 'edge' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('subgraph cluster_parent');
      expect(dot).toContain('"child";');
      expect(dot).toContain('label="Parent \\"quote\\""');
      // empty container width should fall back to default (~2.708 in)
      expect(dot).toMatch(/"empty-container"\s+\[label="Empty", width=2\.708/);
      // edge label preserved
      expect(dot).toContain('"child" -> "child" [id="e", label="edge"]');
    });

    it('uses default TB direction when defaultAutoLayoutConfig is used', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('rankdir=TB');
    });

    it('applies LR direction from config', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'LR' });
      expect(dot).toContain('rankdir=LR');
    });

    it('applies RL direction from config', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'RL' });
      expect(dot).toContain('rankdir=RL');
    });

    it('applies BT direction from config', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'BT' });
      expect(dot).toContain('rankdir=BT');
    });

    it('applies custom nodeSep and rankSep from config', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'TB', nodeSep: 200, rankSep: 250 });
      // 200/96 ≈ 2.083, 250/96 ≈ 2.604
      expect(dot).toContain('nodesep=2.083');
      expect(dot).toContain('ranksep=2.604');
    });

    it('uses default nodeSep/rankSep when not specified in config', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'TB' });
      // Default nodeSep=110/96 ≈ 1.146, rankSep=120/96 = 1.250
      expect(dot).toContain('nodesep=1.146');
      expect(dot).toContain('ranksep=1.250');
    });
  });

  describe('parseJsonLayout', () => {
    it('parses node positions from objects', () => {
      const inch100 = (100 / 96).toFixed(4);
      const json = makeJson(
        [
          { name: 'a', pos: '37.5,37.5', width: inch100, height: inch100 },
          { name: 'b', pos: '112.5,37.5', width: inch100, height: inch100 },
        ],
        [],
        '0,0,150,75'
      );
      const result = parseJsonLayout(json);
      expect(result.nodes.has('a')).toBe(true);
      expect(result.nodes.has('b')).toBe(true);
      const a = result.nodes.get('a')!;
      expect(a.width).toBeGreaterThan(0);
      expect(a.height).toBeGreaterThan(0);
    });

    it('parses cluster bounding boxes', () => {
      const json = makeJson(
        [{ name: 'cluster_my_cluster', bb: '0,0,200,150' }],
        [],
        '0,0,300,200'
      );
      const result = parseJsonLayout(json);
      expect(result.nodes.has('my_cluster')).toBe(true);
      // Also check reverse ID mapping (underscore to dash)
      expect(result.nodes.has('my-cluster')).toBe(true);
    });

    it('parses edge spline points from _draw_ ops', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-1',
            _draw_: [{ op: 'B', points: [[0, 37.5], [37.5, 37.5], [75, 37.5], [112.5, 37.5]] }],
            lp: '75,75',
          },
        ],
        '0,0,150,150'
      );
      const result = parseJsonLayout(json);
      expect(result.edges.has('edge-1')).toBe(true);
      const edge = result.edges.get('edge-1')!;
      expect(edge.points.length).toBeGreaterThanOrEqual(4);
      expect(edge.label).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    });

    it('parses edge points from pos string when no _draw_', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-2',
            pos: 'e,100,50 0,50 50,50 100,50',
          },
        ],
        '0,0,150,100'
      );
      const result = parseJsonLayout(json);
      expect(result.edges.has('edge-2')).toBe(true);
      const edge = result.edges.get('edge-2')!;
      expect(edge.points.length).toBeGreaterThan(0);
    });

    it('positions child relative to parent cluster', () => {
      const inch100 = (100 / 96).toFixed(4);
      const inch200 = (200 / 96).toFixed(4);
      const json = makeJson(
        [
          { name: 'cluster_parent', bb: '10,10,210,210' },
          { name: 'child', pos: '150,150', width: inch100, height: inch100 },
        ],
        [],
        '0,0,300,300'
      );
      const result = parseJsonLayout(json);
      const parent = result.nodes.get('parent');
      const child = result.nodes.get('child');
      expect(parent).toBeDefined();
      expect(child).toBeDefined();
      expect(parent!.width).toBeGreaterThan(0);
      expect(child!.width).toBeGreaterThan(0);
    });
  });

  describe('AutoLayoutConfig defaults', () => {
    it('defaultAutoLayoutConfig has direction TB', () => {
      expect(defaultAutoLayoutConfig.direction).toBe('TB');
    });

    it('defaultAutoLayoutConfig does not set nodeSep or rankSep', () => {
      expect(defaultAutoLayoutConfig.nodeSep).toBeUndefined();
      expect(defaultAutoLayoutConfig.rankSep).toBeUndefined();
    });

    it('explicit config direction overrides default', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      // buildDot uses the config directly, so explicit BT should appear
      const dot = buildDot(model, { direction: 'BT' });
      expect(dot).toContain('rankdir=BT');
      expect(dot).not.toContain('rankdir=TB');
    });
  });
});
