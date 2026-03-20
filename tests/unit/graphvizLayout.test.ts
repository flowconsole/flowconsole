import { describe, it, expect } from 'vitest';
import { buildDot, parseJsonLayout, estimateSize } from '../../src/web/diagram/graphvizLayoutService';
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
      // empty container width uses container base size (280) + padding → ~3.125 in
      expect(dot).toMatch(/"empty-container"\s+\[label="Empty", width=3\.125/);
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

    it('includes TBbalance=min attribute for balanced TB layout', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('TBbalance=min');
    });

    it('includes newrank=true and clusterrank=global', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('newrank=true');
      expect(dot).toContain('clusterrank=global');
    });

    it('sets labeljust=c for TB direction', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'TB' });
      expect(dot).toContain('labeljust=c');
    });

    it('sets labeljust=c for BT direction', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'BT' });
      expect(dot).toContain('labeljust=c');
    });

    it('sets labeljust=l for LR direction (LikeC4 pattern)', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'LR' });
      expect(dot).toContain('labeljust=l');
      expect(dot).toContain('labelloc=t');
    });

    it('sets labeljust=l for RL direction (LikeC4 pattern)', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'RL' });
      expect(dot).toContain('labeljust=l');
      expect(dot).toContain('labelloc=t');
    });

    it('includes fontname and fontsize in graph attributes', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Graph-level font attributes
      expect(dot).toMatch(/graph \[.*fontname="Arial".*fontsize=14/);
      // Node-level font attributes
      expect(dot).toMatch(/node \[.*fontname="Arial".*fontsize=14/);
      // Edge-level font attributes
      expect(dot).toMatch(/edge \[.*fontname="Arial".*fontsize=12/);
    });

    it('TBbalance=min present for all directions', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      for (const dir of ['TB', 'BT', 'LR', 'RL'] as const) {
        const dot = buildDot(model, { direction: dir });
        expect(dot).toContain('TBbalance=min');
        expect(dot).toContain('newrank=true');
        expect(dot).toContain('clusterrank=global');
      }
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

  describe('estimateSize', () => {
    function makeNode(overrides: any) {
      return {
        id: 'test',
        type: 'element',
        position: { x: 0, y: 0 },
        data: { title: 'Test' },
        ...overrides,
      } as any;
    }

    it('produces different base sizes for different shapes', () => {
      const person = estimateSize(makeNode({ data: { title: 'X', shape: 'person' } }));
      const database = estimateSize(makeNode({ data: { title: 'X', shape: 'database' } }));
      const service = estimateSize(makeNode({ data: { title: 'X', shape: 'service' } }));
      const queue = estimateSize(makeNode({ data: { title: 'X', shape: 'queue' } }));
      const storage = estimateSize(makeNode({ data: { title: 'X', shape: 'storage' } }));

      // Person is taller than service (200 vs 120 base height)
      expect(person.height).toBeGreaterThan(service.height);
      // Database is taller than service (160 vs 120 base height)
      expect(database.height).toBeGreaterThan(service.height);
      // Person is narrower than service (180 vs 240 base width)
      expect(person.width).toBeLessThan(service.width);
      // Queue and storage have distinct sizes
      expect(queue.width).not.toEqual(storage.width);
    });

    it('uses service as default shape for element nodes', () => {
      const noShape = estimateSize(makeNode({ data: { title: 'X' } }));
      const service = estimateSize(makeNode({ data: { title: 'X', shape: 'service' } }));
      expect(noShape.width).toEqual(service.width);
      expect(noShape.height).toEqual(service.height);
    });

    it('uses container base size for container nodes', () => {
      const container = estimateSize(makeNode({ type: 'container', data: { title: 'X' } }));
      const service = estimateSize(makeNode({ data: { title: 'X', shape: 'service' } }));
      // Container base width (280) > service base width (240)
      expect(container.width).toBeGreaterThan(service.width);
    });

    it('adds extra width when icon is present', () => {
      const withIcon = estimateSize(makeNode({ data: { title: 'Test', shape: 'service', icon: 'server' } }));
      const noIcon = estimateSize(makeNode({ data: { title: 'Test', shape: 'service' } }));
      expect(withIcon.width).toBeGreaterThan(noIcon.width);
    });

    it('adds extra height when icon is present', () => {
      const withIcon = estimateSize(makeNode({ data: { title: 'Test', shape: 'service', icon: 'server' } }));
      const noIcon = estimateSize(makeNode({ data: { title: 'Test', shape: 'service' } }));
      expect(withIcon.height).toBeGreaterThan(noIcon.height);
    });

    it('uses smaller char limit for narrow shapes (person = xs/sm = 30 chars)', () => {
      // Person base width is 180, so charLimit = 30
      // A 60-char title should wrap into 2 lines with limit 30
      const longTitle = 'A'.repeat(60);
      const personLong = estimateSize(makeNode({ data: { title: longTitle, shape: 'person' } }));
      const personShort = estimateSize(makeNode({ data: { title: 'X', shape: 'person' } }));
      // Long title wraps and adds height
      expect(personLong.height).toBeGreaterThan(personShort.height);
    });

    it('accounts for subtitle in height', () => {
      const withSub = estimateSize(makeNode({ data: { title: 'T', subtitle: 'Subtitle text here' } }));
      const noSub = estimateSize(makeNode({ data: { title: 'T' } }));
      expect(withSub.height).toBeGreaterThan(noSub.height);
    });

    it('accounts for description in height', () => {
      const withDesc = estimateSize(makeNode({ data: { title: 'T', description: 'A long description that spans many characters to test wrapping behavior' } }));
      const noDesc = estimateSize(makeNode({ data: { title: 'T' } }));
      expect(withDesc.height).toBeGreaterThan(noDesc.height);
    });

    it('accounts for technology field in height', () => {
      const withTech = estimateSize(makeNode({ data: { title: 'T', technology: 'TypeScript / React / Node.js' } }));
      const noTech = estimateSize(makeNode({ data: { title: 'T' } }));
      expect(withTech.height).toBeGreaterThan(noTech.height);
    });

    it('accounts for tags in height', () => {
      const withTags = estimateSize(makeNode({ data: { title: 'T', tags: ['tag1', 'tag2', 'tag3', 'tag4'] } }));
      const noTags = estimateSize(makeNode({ data: { title: 'T' } }));
      expect(withTags.height).toBeGreaterThan(noTags.height);
    });

    it('accounts for badge in height', () => {
      const withBadge = estimateSize(makeNode({ data: { title: 'T', badge: 'NEW' } }));
      const noBadge = estimateSize(makeNode({ data: { title: 'T' } }));
      expect(withBadge.height).toBeGreaterThan(noBadge.height);
    });

    it('adds extra padding for queue shape', () => {
      const queue = estimateSize(makeNode({ data: { title: 'X', shape: 'queue' } }));
      const service = estimateSize(makeNode({ data: { title: 'X', shape: 'service' } }));
      // Queue gets extra padding on both width and height
      expect(queue.height).toBeGreaterThan(service.height);
    });

    it('adds extra padding for person shape', () => {
      const person = estimateSize(makeNode({ data: { title: 'X', shape: 'person' } }));
      // Person gets +30 height from shape extra padding, plus 200 base (vs 120 for service)
      expect(person.height).toBeGreaterThan(200);
    });

    it('adds extra padding for database shape', () => {
      const database = estimateSize(makeNode({ data: { title: 'X', shape: 'database' } }));
      // Database gets +20 height from shape extra padding on top of 160 base
      expect(database.height).toBeGreaterThan(160);
    });

    it('respects styled width when allowStyledSize is true', () => {
      const withStyled = estimateSize(makeNode({ data: { title: 'X' }, style: { width: 500 } }));
      const noStyled = estimateSize(makeNode({ data: { title: 'X' } }));
      expect(withStyled.width).toBeGreaterThan(noStyled.width);
    });

    it('ignores styled width when allowStyledSize is false', () => {
      const ignored = estimateSize(makeNode({ data: { title: 'X' }, style: { width: 500 } }), { allowStyledSize: false });
      const noStyled = estimateSize(makeNode({ data: { title: 'X' } }));
      expect(ignored.width).toEqual(noStyled.width);
    });
  });
});
