import { describe, it, expect } from 'vitest';
import { buildDot, parseJsonLayout, estimateSize, edgeEndpoint, hierarchyDistance, clusterColorsByDepth, assignGroups, sanitizeId } from '../../src/web/diagram/graphvizLayoutService';
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
      // empty container width uses container base size (280) + padding → ~4.167 in (DPI=72)
      expect(dot).toMatch(/"empty-container"\s+\[label="Empty", width=4\.167/);
      // edge label preserved (with weight and minlen from edge weight system)
      expect(dot).toMatch(/"child" -> "child" \[id="e", label="edge"/);
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
      // 200/72 ≈ 2.778, 250/72 ≈ 3.472 (DPI=72)
      expect(dot).toContain('nodesep=2.778');
      expect(dot).toContain('ranksep=3.472');
    });

    it('uses default nodeSep/rankSep when not specified in config', () => {
      const model = makeModel({
        nodes: [{ id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } }] as any,
      });
      const dot = buildDot(model, { direction: 'TB' });
      // Default nodeSep=110/72 ≈ 1.528, rankSep=120/72 ≈ 1.667 (DPI=72)
      expect(dot).toContain('nodesep=1.528');
      expect(dot).toContain('ranksep=1.667');
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
      const inch100 = (100 / 72).toFixed(4);
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
      const inch100 = (100 / 72).toFixed(4);
      const inch200 = (200 / 72).toFixed(4);
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

  describe('edgeEndpoint', () => {
    function buildIndex(nodes: any[]) {
      const childrenByParent = new Map<string | undefined, string[]>();
      const nodeById = new Map<string, any>();
      for (const node of nodes) {
        nodeById.set(node.id, node);
        const parent = node.parentId;
        const list = childrenByParent.get(parent) ?? [];
        list.push(node.id);
        childrenByParent.set(parent, list);
      }
      const toClusterName = (id: string) => id.replace(/-/g, '_');
      return { childrenByParent, nodeById, toClusterName };
    }

    it('returns physicalNode=id for leaf nodes (no cluster)', () => {
      const nodes = [
        { id: 'leaf', type: 'element', data: { title: 'Leaf' }, position: { x: 0, y: 0 } },
      ];
      const { childrenByParent, nodeById, toClusterName } = buildIndex(nodes);
      const result = edgeEndpoint('leaf', childrenByParent, nodeById, toClusterName);
      expect(result.physicalNode).toBe('leaf');
      expect(result.clusterAttr).toBeUndefined();
    });

    it('returns leaf node and cluster attr for container with children', () => {
      const nodes = [
        { id: 'container-a', type: 'container', data: { title: 'Container A' }, position: { x: 0, y: 0 } },
        { id: 'child-1', type: 'element', data: { title: 'Child 1' }, position: { x: 0, y: 0 }, parentId: 'container-a' },
        { id: 'child-2', type: 'element', data: { title: 'Child 2' }, position: { x: 0, y: 0 }, parentId: 'container-a' },
      ];
      const { childrenByParent, nodeById, toClusterName } = buildIndex(nodes);
      const result = edgeEndpoint('container-a', childrenByParent, nodeById, toClusterName);
      expect(result.physicalNode).toBe('child-1');
      expect(result.clusterAttr).toBe('cluster_container_a');
    });

    it('recurses into nested clusters to find leaf', () => {
      const nodes = [
        { id: 'outer', type: 'container', data: { title: 'Outer' }, position: { x: 0, y: 0 } },
        { id: 'inner', type: 'container', data: { title: 'Inner' }, position: { x: 0, y: 0 }, parentId: 'outer' },
        { id: 'deep-leaf', type: 'element', data: { title: 'Deep Leaf' }, position: { x: 0, y: 0 }, parentId: 'inner' },
      ];
      const { childrenByParent, nodeById, toClusterName } = buildIndex(nodes);
      const result = edgeEndpoint('outer', childrenByParent, nodeById, toClusterName);
      expect(result.physicalNode).toBe('deep-leaf');
      expect(result.clusterAttr).toBe('cluster_outer');
    });

    it('returns physicalNode=id for empty container (no children)', () => {
      const nodes = [
        { id: 'empty', type: 'container', data: { title: 'Empty' }, position: { x: 0, y: 0 } },
      ];
      const { childrenByParent, nodeById, toClusterName } = buildIndex(nodes);
      const result = edgeEndpoint('empty', childrenByParent, nodeById, toClusterName);
      expect(result.physicalNode).toBe('empty');
      expect(result.clusterAttr).toBeUndefined();
    });
  });

  describe('hierarchyDistance', () => {
    function buildNodeMap(nodes: any[]) {
      const map = new Map<string, any>();
      for (const n of nodes) map.set(n.id, n);
      return map;
    }

    it('returns 0 for same node', () => {
      const map = buildNodeMap([{ id: 'a', type: 'element', data: {} }]);
      expect(hierarchyDistance('a', 'a', map)).toBe(0);
    });

    it('returns 2 for siblings (same parent)', () => {
      const map = buildNodeMap([
        { id: 'parent', type: 'container', data: {} },
        { id: 'a', type: 'element', data: {}, parentId: 'parent' },
        { id: 'b', type: 'element', data: {}, parentId: 'parent' },
      ]);
      // chainA=[a, parent], chainB=[b, parent]. LCA=parent at indexA=1, indexB=1. dist=1+1=2
      expect(hierarchyDistance('a', 'b', map)).toBe(2);
    });

    it('returns 1 for parent-child', () => {
      const map = buildNodeMap([
        { id: 'parent', type: 'container', data: {} },
        { id: 'child', type: 'element', data: {}, parentId: 'parent' },
      ]);
      // chainA=[child, parent], chainB=[parent]. LCA=parent at indexA=1, indexB=0. dist=1+0=1
      expect(hierarchyDistance('child', 'parent', map)).toBe(1);
    });

    it('returns 4 for cousins (different parents, same grandparent)', () => {
      const map = buildNodeMap([
        { id: 'gp', type: 'container', data: {} },
        { id: 'p1', type: 'container', data: {}, parentId: 'gp' },
        { id: 'p2', type: 'container', data: {}, parentId: 'gp' },
        { id: 'a', type: 'element', data: {}, parentId: 'p1' },
        { id: 'b', type: 'element', data: {}, parentId: 'p2' },
      ]);
      // chainA=[a, p1, gp], chainB=[b, p2, gp]. LCA=gp at indexA=2, indexB=2. dist=2+2=4
      expect(hierarchyDistance('a', 'b', map)).toBe(4);
    });

    it('returns sum of chain lengths for nodes with no common ancestor', () => {
      const map = buildNodeMap([
        { id: 'c1', type: 'container', data: {} },
        { id: 'a', type: 'element', data: {}, parentId: 'c1' },
        { id: 'c2', type: 'container', data: {} },
        { id: 'b', type: 'element', data: {}, parentId: 'c2' },
      ]);
      // chainA=[a, c1] (len 2), chainB=[b, c2] (len 2). No LCA → 2+2=4
      expect(hierarchyDistance('a', 'b', map)).toBe(4);
    });

    it('returns 2 for root-level nodes (no parent)', () => {
      const map = buildNodeMap([
        { id: 'a', type: 'element', data: {} },
        { id: 'b', type: 'element', data: {} },
      ]);
      // chainA=[a] (len 1), chainB=[b] (len 1). No LCA → 1+1=2
      expect(hierarchyDistance('a', 'b', map)).toBe(2);
    });
  });

  describe('edge weight and constraint system in buildDot', () => {
    it('adds weight attribute based on hierarchy distance', () => {
      const model = makeModel({
        nodes: [
          { id: 'parent', type: 'container', data: { title: 'Parent' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'parent' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'parent' },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Siblings: distance=2, maxDist=2, weight=2-2+1=1
      expect(dot).toContain('weight=1');
    });

    it('higher weight for closer nodes, lower for distant nodes', () => {
      const model = makeModel({
        nodes: [
          { id: 'gp', type: 'container', data: { title: 'GP' }, position: { x: 0, y: 0 } },
          { id: 'p1', type: 'container', data: { title: 'P1' }, position: { x: 0, y: 0 }, parentId: 'gp' },
          { id: 'p2', type: 'container', data: { title: 'P2' }, position: { x: 0, y: 0 }, parentId: 'gp' },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'p1' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'p1' },
          { id: 'c', type: 'element', data: { title: 'C' }, position: { x: 0, y: 0 }, parentId: 'p2' },
        ] as any,
        edges: [
          { id: 'e-close', source: 'a', target: 'b', data: {} },
          { id: 'e-far', source: 'a', target: 'c', data: {} },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // a→b: siblings (dist=2), a→c: cousins (dist=4). maxDist=4
      // e-close weight = 4-2+1 = 3
      // e-far weight = 4-4+1 = 1
      expect(dot).toMatch(/"a" -> "b" \[.*weight=3/);
      expect(dot).toMatch(/"a" -> "c" \[.*weight=1/);
    });

    it('adds dir=both for bidirectional edges', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: { direction: 'both' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('dir=both');
    });

    it('adds dir=none for directionless edges', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: { direction: 'none' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('dir=none');
    });

    it('adds dir=back for back-direction edges', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: { direction: 'back' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('dir=back');
    });

    it('does not add dir attribute for forward edges', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: { direction: 'forward' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).not.toMatch(/\bdir=(back|both|none)\b/);
    });

    it('adds constraint=false for edges with direction none', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: { direction: 'none' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('constraint=false');
    });

    it('adds constraint=false for cross-cluster edges with no common ancestor', () => {
      const model = makeModel({
        nodes: [
          { id: 'c1', type: 'container', data: { title: 'C1' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'c1' },
          { id: 'c2', type: 'container', data: { title: 'C2' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'c2' },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // c1 and c2 are separate top-level clusters, no common ancestor
      expect(dot).toContain('constraint=false');
    });

    it('does not add constraint=false for edges within same hierarchy', () => {
      const model = makeModel({
        nodes: [
          { id: 'gp', type: 'container', data: { title: 'GP' }, position: { x: 0, y: 0 } },
          { id: 'p1', type: 'container', data: { title: 'P1' }, position: { x: 0, y: 0 }, parentId: 'gp' },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'p1' },
          { id: 'p2', type: 'container', data: { title: 'P2' }, position: { x: 0, y: 0 }, parentId: 'gp' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'p2' },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // a and b share grandparent gp — have hierarchy relationship
      expect(dot).not.toContain('constraint=false');
    });

    it('adds minlen=0 for sole edge within a container', () => {
      const model = makeModel({
        nodes: [
          { id: 'parent', type: 'container', data: { title: 'Parent' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'parent' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'parent' },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('minlen=0');
    });

    it('does not add minlen=0 when container has multiple internal edges', () => {
      const model = makeModel({
        nodes: [
          { id: 'parent', type: 'container', data: { title: 'Parent' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'parent' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'parent' },
          { id: 'c', type: 'element', data: { title: 'C' }, position: { x: 0, y: 0 }, parentId: 'parent' },
        ] as any,
        edges: [
          { id: 'e1', source: 'a', target: 'b', data: {} },
          { id: 'e2', source: 'b', target: 'c', data: {} },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).not.toContain('minlen=0');
    });

    it('does not add minlen=0 for edges crossing containers', () => {
      const model = makeModel({
        nodes: [
          { id: 'p1', type: 'container', data: { title: 'P1' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'p1' },
          { id: 'p2', type: 'container', data: { title: 'P2' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'p2' },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).not.toContain('minlen=0');
    });
  });

  describe('compound edge routing in buildDot', () => {
    it('adds lhead for edges targeting a container cluster', () => {
      const model = makeModel({
        nodes: [
          { id: 'ext', type: 'element', data: { title: 'External' }, position: { x: 0, y: 0 } },
          { id: 'svc-group', type: 'container', data: { title: 'Services' }, position: { x: 0, y: 0 } },
          { id: 'svc-a', type: 'element', data: { title: 'Svc A' }, position: { x: 0, y: 0 }, parentId: 'svc-group' },
        ] as any,
        edges: [{ id: 'e1', source: 'ext', target: 'svc-group', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Edge should route through svc-a (leaf) with lhead pointing to cluster
      expect(dot).toContain('"ext" -> "svc-a"');
      expect(dot).toContain('lhead="cluster_svc_group"');
    });

    it('adds ltail for edges sourcing from a container cluster', () => {
      const model = makeModel({
        nodes: [
          { id: 'svc-group', type: 'container', data: { title: 'Services' }, position: { x: 0, y: 0 } },
          { id: 'svc-a', type: 'element', data: { title: 'Svc A' }, position: { x: 0, y: 0 }, parentId: 'svc-group' },
          { id: 'ext', type: 'element', data: { title: 'External' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'svc-group', target: 'ext', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('"svc-a" -> "ext"');
      expect(dot).toContain('ltail="cluster_svc_group"');
    });

    it('adds both lhead and ltail for edges between two clusters', () => {
      const model = makeModel({
        nodes: [
          { id: 'group-a', type: 'container', data: { title: 'Group A' }, position: { x: 0, y: 0 } },
          { id: 'a-child', type: 'element', data: { title: 'A Child' }, position: { x: 0, y: 0 }, parentId: 'group-a' },
          { id: 'group-b', type: 'container', data: { title: 'Group B' }, position: { x: 0, y: 0 } },
          { id: 'b-child', type: 'element', data: { title: 'B Child' }, position: { x: 0, y: 0 }, parentId: 'group-b' },
        ] as any,
        edges: [{ id: 'e1', source: 'group-a', target: 'group-b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('"a-child" -> "b-child"');
      expect(dot).toContain('ltail="cluster_group_a"');
      expect(dot).toContain('lhead="cluster_group_b"');
    });

    it('uses xlabel instead of label for compound edges (LikeC4 pattern)', () => {
      const model = makeModel({
        nodes: [
          { id: 'ext', type: 'element', data: { title: 'External' }, position: { x: 0, y: 0 } },
          { id: 'svc-group', type: 'container', data: { title: 'Services' }, position: { x: 0, y: 0 } },
          { id: 'svc-a', type: 'element', data: { title: 'Svc A' }, position: { x: 0, y: 0 }, parentId: 'svc-group' },
        ] as any,
        edges: [{ id: 'e1', source: 'ext', target: 'svc-group', data: { label: 'HTTP' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Compound edge should use xlabel, not label
      expect(dot).toContain('xlabel="HTTP"');
      expect(dot).not.toMatch(/[^x]label="HTTP"/);
    });

    it('uses label (not xlabel) for non-compound edges', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: { label: 'calls' } }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('label="calls"');
      expect(dot).not.toContain('xlabel="calls"');
    });

    it('does not add lhead/ltail for edges between leaf nodes', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('"a" -> "b"');
      expect(dot).not.toContain('lhead');
      expect(dot).not.toContain('ltail');
    });

    it('handles nested clusters for compound edge routing', () => {
      const model = makeModel({
        nodes: [
          { id: 'ext', type: 'element', data: { title: 'External' }, position: { x: 0, y: 0 } },
          { id: 'outer', type: 'container', data: { title: 'Outer' }, position: { x: 0, y: 0 } },
          { id: 'inner', type: 'container', data: { title: 'Inner' }, position: { x: 0, y: 0 }, parentId: 'outer' },
          { id: 'leaf', type: 'element', data: { title: 'Leaf' }, position: { x: 0, y: 0 }, parentId: 'inner' },
        ] as any,
        edges: [{ id: 'e1', source: 'ext', target: 'outer', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Should route through 'leaf' (deepest leaf in outer), with lhead pointing to outer cluster
      expect(dot).toContain('"ext" -> "leaf"');
      expect(dot).toContain('lhead="cluster_outer"');
    });
  });

  describe('child chunking in buildDot', () => {
    it('creates rank=same subgraphs for clusters with multiple children', () => {
      const model = makeModel({
        nodes: [
          { id: 'parent', type: 'container', data: { title: 'Parent' }, position: { x: 0, y: 0 } },
          { id: 'c1', type: 'element', data: { title: 'C1' }, position: { x: 0, y: 0 }, parentId: 'parent' },
          { id: 'c2', type: 'element', data: { title: 'C2' }, position: { x: 0, y: 0 }, parentId: 'parent' },
          { id: 'c3', type: 'element', data: { title: 'C3' }, position: { x: 0, y: 0 }, parentId: 'parent' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // 3 children, chunk size=2 → 2 chunks: [c1,c2], [c3]
      expect(dot).toContain('subgraph chunk_parent_0');
      expect(dot).toContain('subgraph chunk_parent_1');
      expect(dot).toContain('rank=same;');
    });

    it('uses chunk size 2 for 4 or fewer children', () => {
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'c', type: 'element', data: { title: 'C' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'd', type: 'element', data: { title: 'D' }, position: { x: 0, y: 0 }, parentId: 'p' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // 4 children, chunk size=2 → chunks: [a,b], [c,d]
      expect(dot).toContain('subgraph chunk_p_0');
      expect(dot).toContain('subgraph chunk_p_1');
      // Exactly 2 chunks, no chunk_p_2
      expect(dot).not.toContain('subgraph chunk_p_2');
    });

    it('uses chunk size 3 for 5-11 children', () => {
      const children = Array.from({ length: 6 }, (_, i) => ({
        id: `n${i}`, type: 'element', data: { title: `N${i}` }, position: { x: 0, y: 0 }, parentId: 'p',
      }));
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          ...children,
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // 6 children, chunk size=3 → chunks: [n0,n1,n2], [n3,n4,n5]
      expect(dot).toContain('subgraph chunk_p_0');
      expect(dot).toContain('subgraph chunk_p_1');
      expect(dot).not.toContain('subgraph chunk_p_2');
    });

    it('uses chunk size 4 for more than 11 children', () => {
      const children = Array.from({ length: 12 }, (_, i) => ({
        id: `n${i}`, type: 'element', data: { title: `N${i}` }, position: { x: 0, y: 0 }, parentId: 'p',
      }));
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          ...children,
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // 12 children, chunk size=4 → chunks: [0-3], [4-7], [8-11]
      expect(dot).toContain('subgraph chunk_p_0');
      expect(dot).toContain('subgraph chunk_p_1');
      expect(dot).toContain('subgraph chunk_p_2');
      expect(dot).not.toContain('subgraph chunk_p_3');
    });

    it('adds invisible edges between chunk head nodes', () => {
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'c', type: 'element', data: { title: 'C' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'd', type: 'element', data: { title: 'D' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'e', type: 'element', data: { title: 'E' }, position: { x: 0, y: 0 }, parentId: 'p' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // 5 children, chunk size=3 → chunks: [a,b,c], [d,e]
      // Invisible edge between chunk heads: a → d
      expect(dot).toContain('"a" -> "d" [style=invis]');
    });

    it('does not chunk single child in cluster', () => {
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          { id: 'only', type: 'element', data: { title: 'Only' }, position: { x: 0, y: 0 }, parentId: 'p' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Single child — no chunking
      expect(dot).not.toContain('subgraph chunk_');
      expect(dot).not.toContain('rank=same');
      expect(dot).toContain('"only";');
    });

    it('does not apply chunking to top-level nodes', () => {
      const nodes = Array.from({ length: 6 }, (_, i) => ({
        id: `top${i}`, type: 'element', data: { title: `Top${i}` }, position: { x: 0, y: 0 },
      }));
      const model = makeModel({ nodes: nodes as any });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Top-level nodes should not have chunk subgraphs
      expect(dot).not.toContain('subgraph chunk_');
      expect(dot).not.toContain('rank=same');
    });

    it('chunks leaf children but still renders sub-clusters normally', () => {
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          { id: 'sub', type: 'container', data: { title: 'Sub' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'sub-child', type: 'element', data: { title: 'SubChild' }, position: { x: 0, y: 0 }, parentId: 'sub' },
          { id: 'leaf1', type: 'element', data: { title: 'Leaf1' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'leaf2', type: 'element', data: { title: 'Leaf2' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'leaf3', type: 'element', data: { title: 'Leaf3' }, position: { x: 0, y: 0 }, parentId: 'p' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Sub-cluster rendered normally
      expect(dot).toContain('subgraph cluster_sub');
      // Leaf children chunked (3 leaves, chunk size=2 → 2 chunks)
      expect(dot).toContain('subgraph chunk_p_0');
      expect(dot).toContain('subgraph chunk_p_1');
      // Invisible edge between chunk heads
      expect(dot).toContain('"leaf1" -> "leaf3" [style=invis]');
    });

    it('invisible edges have correct head nodes for multi-chunk layout', () => {
      const children = Array.from({ length: 9 }, (_, i) => ({
        id: `n${i}`, type: 'element', data: { title: `N${i}` }, position: { x: 0, y: 0 }, parentId: 'p',
      }));
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          ...children,
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // 9 children, chunk size=3 → chunks: [n0,n1,n2], [n3,n4,n5], [n6,n7,n8]
      // Invisible edges: n0→n3, n3→n6
      expect(dot).toContain('"n0" -> "n3" [style=invis]');
      expect(dot).toContain('"n3" -> "n6" [style=invis]');
    });
  });

  describe('dynamic cluster margins in buildDot', () => {
    it('uses margin=40 for clusters with multiple children', () => {
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'p' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('margin=40');
    });

    it('uses margin=32 for clusters with single child', () => {
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          { id: 'only', type: 'element', data: { title: 'Only' }, position: { x: 0, y: 0 }, parentId: 'p' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).toContain('margin=32');
    });

    it('different margins for clusters with different child counts', () => {
      const model = makeModel({
        nodes: [
          { id: 'multi', type: 'container', data: { title: 'Multi' }, position: { x: 0, y: 0 } },
          { id: 'm1', type: 'element', data: { title: 'M1' }, position: { x: 0, y: 0 }, parentId: 'multi' },
          { id: 'm2', type: 'element', data: { title: 'M2' }, position: { x: 0, y: 0 }, parentId: 'multi' },
          { id: 'single', type: 'container', data: { title: 'Single' }, position: { x: 0, y: 0 } },
          { id: 's1', type: 'element', data: { title: 'S1' }, position: { x: 0, y: 0 }, parentId: 'single' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Multi-child cluster gets margin=40, single-child gets margin=32
      expect(dot).toContain('margin=40');
      expect(dot).toContain('margin=32');
    });
  });

  describe('depth-based cluster colors', () => {
    it('returns base colors for depth 0', () => {
      const colors = clusterColorsByDepth(0);
      expect(colors.fillcolor).toBe('#0f1625');
      expect(colors.color).toBe('#1f2a3d');
    });

    it('returns lighter colors for depth 1', () => {
      const colors = clusterColorsByDepth(1);
      // depth 1: fillcolor = (0x0f+8, 0x16+8, 0x25+8) = (23, 30, 45) = #171e2d
      expect(colors.fillcolor).toBe('#171e2d');
      // depth 1: color = (0x1f+8, 0x2a+8, 0x3d+8) = (39, 50, 69) = #273245
      expect(colors.color).toBe('#273245');
    });

    it('returns even lighter colors for depth 2', () => {
      const colors0 = clusterColorsByDepth(0);
      const colors1 = clusterColorsByDepth(1);
      const colors2 = clusterColorsByDepth(2);
      // Each depth level should be progressively lighter
      expect(colors2.fillcolor).not.toBe(colors1.fillcolor);
      expect(colors1.fillcolor).not.toBe(colors0.fillcolor);
    });

    it('applies depth-based colors to nested clusters in DOT', () => {
      const model = makeModel({
        nodes: [
          { id: 'outer', type: 'container', data: { title: 'Outer' }, position: { x: 0, y: 0 } },
          { id: 'inner', type: 'container', data: { title: 'Inner' }, position: { x: 0, y: 0 }, parentId: 'outer' },
          { id: 'leaf', type: 'element', data: { title: 'Leaf' }, position: { x: 0, y: 0 }, parentId: 'inner' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Outer (depth 0) uses base colors
      expect(dot).toContain('fillcolor="#0f1625"');
      // Inner (depth 1) uses lighter colors
      const depth1Colors = clusterColorsByDepth(1);
      expect(dot).toContain(`fillcolor="${depth1Colors.fillcolor}"`);
    });
  });

  describe('assignGroups', () => {
    function buildNodeMap(nodes: any[]) {
      const map = new Map<string, any>();
      for (const n of nodes) map.set(n.id, n);
      return map;
    }

    it('returns empty map when no internal edges', () => {
      const nodes = [
        { id: 'a', type: 'element', data: {}, parentId: 'p' },
        { id: 'b', type: 'element', data: {}, parentId: 'q' },
      ];
      const edges = [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any;
      const groups = assignGroups(edges, buildNodeMap(nodes));
      expect(groups.size).toBe(0);
    });

    it('returns empty map for container with only 1 internal edge', () => {
      const nodes = [
        { id: 'p', type: 'container', data: {} },
        { id: 'a', type: 'element', data: {}, parentId: 'p' },
        { id: 'b', type: 'element', data: {}, parentId: 'p' },
      ];
      const edges = [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any;
      const groups = assignGroups(edges, buildNodeMap(nodes));
      expect(groups.size).toBe(0);
    });

    it('assigns groups for container with 2-8 internal edges', () => {
      const nodes = [
        { id: 'p', type: 'container', data: {} },
        { id: 'a', type: 'element', data: {}, parentId: 'p' },
        { id: 'b', type: 'element', data: {}, parentId: 'p' },
        { id: 'c', type: 'element', data: {}, parentId: 'p' },
      ];
      const edges = [
        { id: 'e1', source: 'a', target: 'b', data: {} },
        { id: 'e2', source: 'b', target: 'c', data: {} },
      ] as any;
      const groups = assignGroups(edges, buildNodeMap(nodes));
      // All 3 nodes should get a group (they're all connected)
      expect(groups.has('a')).toBe(true);
      expect(groups.has('b')).toBe(true);
      expect(groups.has('c')).toBe(true);
    });

    it('does not assign groups for container with more than 8 internal edges', () => {
      const nodes = [
        { id: 'p', type: 'container', data: {} },
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `n${i}`, type: 'element', data: {}, parentId: 'p',
        })),
      ];
      // Create 9 edges (>8)
      const edges = Array.from({ length: 9 }, (_, i) => ({
        id: `e${i}`, source: `n${i}`, target: `n${i + 1}`, data: {},
      })) as any;
      const groups = assignGroups(edges, buildNodeMap(nodes));
      expect(groups.size).toBe(0);
    });

    it('limits to max 4 groups per cluster', () => {
      const nodes = [
        { id: 'p', type: 'container', data: {} },
        // Create 10 disconnected pairs = 5 groups, but max 4
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `n${i}`, type: 'element', data: {}, parentId: 'p',
        })),
      ];
      // 5 disconnected edges = 5 groups
      const edges = Array.from({ length: 5 }, (_, i) => ({
        id: `e${i}`, source: `n${i * 2}`, target: `n${i * 2 + 1}`, data: {},
      })) as any;
      const groups = assignGroups(edges, buildNodeMap(nodes));
      const uniqueGroups = new Set(groups.values());
      expect(uniqueGroups.size).toBeLessThanOrEqual(4);
    });

    it('group attribute appears in DOT output for grouped nodes', () => {
      const model = makeModel({
        nodes: [
          { id: 'p', type: 'container', data: { title: 'P' }, position: { x: 0, y: 0 } },
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 }, parentId: 'p' },
          { id: 'c', type: 'element', data: { title: 'C' }, position: { x: 0, y: 0 }, parentId: 'p' },
        ] as any,
        edges: [
          { id: 'e1', source: 'a', target: 'b', data: {} },
          { id: 'e2', source: 'b', target: 'c', data: {} },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // Nodes should have group attribute in DOT
      expect(dot).toMatch(/"a" \[.*group="/);
      expect(dot).toMatch(/"b" \[.*group="/);
      expect(dot).toMatch(/"c" \[.*group="/);
    });

    it('no group attribute for nodes without internal edge grouping', () => {
      const model = makeModel({
        nodes: [
          { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
          { id: 'b', type: 'element', data: { title: 'B' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      expect(dot).not.toContain('group=');
    });
  });

  describe('sanitizeId', () => {
    it('replaces dashes with underscores', () => {
      expect(sanitizeId('my-service')).toBe('my_service');
    });

    it('replaces dots with underscores', () => {
      expect(sanitizeId('my.service')).toBe('my_service');
    });

    it('replaces colons with underscores', () => {
      expect(sanitizeId('ns:service')).toBe('ns_service');
    });

    it('replaces spaces with underscores', () => {
      expect(sanitizeId('my service')).toBe('my_service');
    });

    it('preserves alphanumeric and underscores', () => {
      expect(sanitizeId('my_service_123')).toBe('my_service_123');
    });

    it('handles multiple special characters', () => {
      expect(sanitizeId('a-b.c:d e')).toBe('a_b_c_d_e');
    });
  });

  describe('parseJsonLayout improvements', () => {
    it('parses multi-segment splines from multiple Bezier operations', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-multi',
            _draw_: [
              { op: 'B', points: [[0, 37.5], [18.75, 37.5], [37.5, 37.5], [56.25, 37.5]] },
              { op: 'B', points: [[56.25, 37.5], [75, 37.5], [93.75, 37.5], [112.5, 37.5]] },
            ],
          },
        ],
        '0,0,150,75'
      );
      const result = parseJsonLayout(json);
      expect(result.edges.has('edge-multi')).toBe(true);
      const edge = result.edges.get('edge-multi')!;
      // Should have 8 points from two Bezier ops (4 + 4)
      expect(edge.points.length).toBe(8);
    });

    it('concatenates points from all Bezier ops in order', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-concat',
            _draw_: [
              { op: 'B', points: [[0, 0], [10, 0]] },
              { op: 'c', color: '#000' }, // non-bezier op in between
              { op: 'B', points: [[20, 0], [30, 0]] },
            ],
          },
        ],
        '0,0,40,10'
      );
      const result = parseJsonLayout(json);
      const edge = result.edges.get('edge-concat')!;
      expect(edge.points.length).toBe(4);
      // First two points from first B op, last two from second B op
      expect(edge.points[0].x).toBeCloseTo(0);
      expect(edge.points[1].x).toBeCloseTo(10);
      expect(edge.points[2].x).toBeCloseTo(20);
      expect(edge.points[3].x).toBeCloseTo(30);
    });

    it('parses label position from _ldraw_ text operations', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-ldraw',
            _draw_: [{ op: 'B', points: [[0, 37.5], [75, 37.5]] }],
            _ldraw_: [
              { op: 'F', size: 12, face: 'Arial' },
              { op: 'T', pt: [50, 40], align: 'c', width: 30, text: 'HTTP' },
            ],
          },
        ],
        '0,0,100,80'
      );
      const result = parseJsonLayout(json);
      const edge = result.edges.get('edge-ldraw')!;
      expect(edge.label).toBeDefined();
      // With DPI=72, pointToPx is identity. Position from T op: x=50, y=(80-40)-fontSize*0.5=40-6=34
      expect(edge.label!.x).toBeCloseTo(50);
      expect(edge.label!.y).toBeCloseTo(34);
    });

    it('_ldraw_ label takes precedence over lp', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-precedence',
            _draw_: [{ op: 'B', points: [[0, 37.5], [75, 37.5]] }],
            _ldraw_: [
              { op: 'F', size: 14, face: 'Arial' },
              { op: 'T', pt: [60, 50], align: 'c', width: 30, text: 'label' },
            ],
            lp: '30,25', // different position — should be ignored
          },
        ],
        '0,0,100,100'
      );
      const result = parseJsonLayout(json);
      const edge = result.edges.get('edge-precedence')!;
      // Should use _ldraw_ position (60), not lp position (30)
      expect(edge.label!.x).toBeCloseTo(60);
    });

    it('falls back to lp when _ldraw_ is absent', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-lp-fallback',
            _draw_: [{ op: 'B', points: [[0, 37.5], [75, 37.5]] }],
            lp: '50,60',
          },
        ],
        '0,0,100,100'
      );
      const result = parseJsonLayout(json);
      const edge = result.edges.get('edge-lp-fallback')!;
      expect(edge.label).toBeDefined();
      // With DPI=72 (identity), lp: 50, 100-60=40
      expect(edge.label!.x).toBeCloseTo(50);
      expect(edge.label!.y).toBeCloseTo(40);
    });

    it('tracks font size changes in _ldraw_ ops', () => {
      const json = makeJson(
        [],
        [
          {
            id: 'edge-fontsize',
            _draw_: [{ op: 'B', points: [[0, 25], [50, 25]] }],
            _ldraw_: [
              { op: 'F', size: 10, face: 'Arial' },
              { op: 'F', size: 20, face: 'Arial' }, // font size changes
              { op: 'T', pt: [25, 30], align: 'c', width: 40, text: 'big' },
            ],
          },
        ],
        '0,0,50,50'
      );
      const result = parseJsonLayout(json);
      const edge = result.edges.get('edge-fontsize')!;
      // Label y should use fontSize=20: y = (50-30) - 20*0.5 = 20 - 10 = 10
      expect(edge.label!.y).toBeCloseTo(10);
    });

    it('handles nested cluster objects in subgraphs', () => {
      // Simulate a JSON where clusters are nested within objects' subgraphs
      const json = JSON.stringify({
        objects: [
          {
            name: 'cluster_outer',
            bb: '0,0,200,150',
            subgraphs: [
              { name: 'cluster_inner', bb: '10,10,100,80' },
            ],
          },
        ],
        edges: [],
        bb: '0,0,300,200',
      });
      const result = parseJsonLayout(json);
      expect(result.nodes.has('outer')).toBe(true);
      expect(result.nodes.has('inner')).toBe(true);
    });

    it('uses clusterIdMap for robust cluster ID reverse lookup', () => {
      const json = makeJson(
        [{ name: 'cluster_my_service_v2', bb: '0,0,200,150' }],
        [],
        '0,0,300,200'
      );
      const clusterIdMap = new Map([['my_service_v2', 'my-service.v2']]);
      const result = parseJsonLayout(json, { clusterIdMap });
      // Should have both sanitized and original IDs
      expect(result.nodes.has('my_service_v2')).toBe(true);
      expect(result.nodes.has('my-service.v2')).toBe(true);
    });

    it('clusterIdMap handles IDs with dots and colons', () => {
      const json = makeJson(
        [{ name: 'cluster_ns_api_v1', bb: '0,0,200,150' }],
        [],
        '0,0,300,200'
      );
      const clusterIdMap = new Map([['ns_api_v1', 'ns:api.v1']]);
      const result = parseJsonLayout(json, { clusterIdMap });
      expect(result.nodes.has('ns:api.v1')).toBe(true);
    });

    it('falls back to dash heuristic when no clusterIdMap provided', () => {
      const json = makeJson(
        [{ name: 'cluster_my_cluster', bb: '0,0,200,150' }],
        [],
        '0,0,300,200'
      );
      const result = parseJsonLayout(json); // no options
      expect(result.nodes.has('my_cluster')).toBe(true);
      expect(result.nodes.has('my-cluster')).toBe(true);
    });

    it('DPI=72 makes pointToPx identity (1 point = 1 pixel)', () => {
      // Verify that with DPI=72, positions map 1:1 from points to pixels
      const json = makeJson(
        [{ name: 'node_a', pos: '100,50', width: '1.3889', height: '1.3889' }],
        [],
        '0,0,200,100'
      );
      const result = parseJsonLayout(json);
      const a = result.nodes.get('node_a')!;
      // With DPI=72: pointToPx(100)=100, pointToPx(50)=50
      // graphHeight=100, cy=100-50=50, width=1.3889*72≈100, x=100-50=50
      expect(a.width).toBeCloseTo(100, 0);
    });
  });

  describe('sanitizeId used in buildDot', () => {
    it('uses sanitizeId for cluster names in DOT output', () => {
      const model = makeModel({
        nodes: [
          { id: 'svc-group', type: 'container', data: { title: 'Services' }, position: { x: 0, y: 0 } },
          { id: 'child', type: 'element', data: { title: 'Child' }, position: { x: 0, y: 0 }, parentId: 'svc-group' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // sanitizeId('svc-group') = 'svc_group'
      expect(dot).toContain('subgraph cluster_svc_group');
    });

    it('sanitizes dots in cluster names', () => {
      const model = makeModel({
        nodes: [
          { id: 'api.v2', type: 'container', data: { title: 'API v2' }, position: { x: 0, y: 0 } },
          { id: 'endpoint', type: 'element', data: { title: 'Endpoint' }, position: { x: 0, y: 0 }, parentId: 'api.v2' },
        ] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // sanitizeId('api.v2') = 'api_v2'
      expect(dot).toContain('subgraph cluster_api_v2');
    });

    it('uses sanitizeId for lhead/ltail attributes', () => {
      const model = makeModel({
        nodes: [
          { id: 'ext', type: 'element', data: { title: 'External' }, position: { x: 0, y: 0 } },
          { id: 'svc.group', type: 'container', data: { title: 'Services' }, position: { x: 0, y: 0 } },
          { id: 'svc-a', type: 'element', data: { title: 'Svc A' }, position: { x: 0, y: 0 }, parentId: 'svc.group' },
        ] as any,
        edges: [{ id: 'e1', source: 'ext', target: 'svc.group', data: {} }] as any,
      });
      const dot = buildDot(model, defaultAutoLayoutConfig);
      // sanitizeId('svc.group') = 'svc_group'
      expect(dot).toContain('lhead="cluster_svc_group"');
    });
  });

  describe('acceptance: complex diagram with 15+ nodes, 3+ nested containers', () => {
    // Build a complex model matching the manual test scenario
    function buildComplexModel(): ArchitectureDiagramModel {
      return makeModel({
        nodes: [
          // Top-level container: Frontend
          { id: 'frontend', type: 'container', data: { title: 'Frontend' }, position: { x: 0, y: 0 } },
          { id: 'web-app', type: 'element', data: { title: 'Web App', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'frontend' },
          { id: 'mobile-app', type: 'element', data: { title: 'Mobile App', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'frontend' },
          { id: 'admin-panel', type: 'element', data: { title: 'Admin Panel', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'frontend' },

          // Top-level container: Backend (with nested sub-containers)
          { id: 'backend', type: 'container', data: { title: 'Backend' }, position: { x: 0, y: 0 } },
          { id: 'api-gateway', type: 'element', data: { title: 'API Gateway', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'backend' },

          // Nested container: Microservices inside Backend
          { id: 'microservices', type: 'container', data: { title: 'Microservices' }, position: { x: 0, y: 0 }, parentId: 'backend' },
          { id: 'user-svc', type: 'element', data: { title: 'User Service', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'microservices' },
          { id: 'order-svc', type: 'element', data: { title: 'Order Service', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'microservices' },
          { id: 'payment-svc', type: 'element', data: { title: 'Payment Service', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'microservices' },
          { id: 'notification-svc', type: 'element', data: { title: 'Notification Service', shape: 'service' }, position: { x: 0, y: 0 }, parentId: 'microservices' },

          // Top-level container: Data Layer
          { id: 'data-layer', type: 'container', data: { title: 'Data Layer' }, position: { x: 0, y: 0 } },
          { id: 'postgres-db', type: 'element', data: { title: 'PostgreSQL', shape: 'database' }, position: { x: 0, y: 0 }, parentId: 'data-layer' },
          { id: 'redis-cache', type: 'element', data: { title: 'Redis Cache', shape: 'database' }, position: { x: 0, y: 0 }, parentId: 'data-layer' },
          { id: 'message-queue', type: 'element', data: { title: 'Message Queue', shape: 'queue' }, position: { x: 0, y: 0 }, parentId: 'data-layer' },

          // Top-level nodes (external)
          { id: 'user', type: 'element', data: { title: 'User', shape: 'person' }, position: { x: 0, y: 0 } },
          { id: 'external-api', type: 'element', data: { title: 'External API', shape: 'service' }, position: { x: 0, y: 0 } },
        ] as any,
        edges: [
          // User to frontend
          { id: 'e-user-web', source: 'user', target: 'web-app', data: { label: 'HTTPS' } },
          { id: 'e-user-mobile', source: 'user', target: 'mobile-app', data: { label: 'HTTPS' } },
          // Frontend to API Gateway
          { id: 'e-web-api', source: 'web-app', target: 'api-gateway', data: { label: 'REST' } },
          { id: 'e-mobile-api', source: 'mobile-app', target: 'api-gateway', data: { label: 'REST' } },
          { id: 'e-admin-api', source: 'admin-panel', target: 'api-gateway', data: { label: 'REST' } },
          // API Gateway to microservices
          { id: 'e-api-user', source: 'api-gateway', target: 'user-svc', data: { label: 'gRPC' } },
          { id: 'e-api-order', source: 'api-gateway', target: 'order-svc', data: { label: 'gRPC' } },
          // Cross-microservice edges
          { id: 'e-order-payment', source: 'order-svc', target: 'payment-svc', data: { label: 'async' } },
          { id: 'e-payment-notif', source: 'payment-svc', target: 'notification-svc', data: { label: 'event' } },
          // Microservices to data layer
          { id: 'e-user-db', source: 'user-svc', target: 'postgres-db', data: { label: 'SQL' } },
          { id: 'e-order-db', source: 'order-svc', target: 'postgres-db', data: { label: 'SQL' } },
          { id: 'e-user-redis', source: 'user-svc', target: 'redis-cache', data: { label: 'cache' } },
          { id: 'e-order-queue', source: 'order-svc', target: 'message-queue', data: { label: 'publish' } },
          // External API
          { id: 'e-payment-ext', source: 'payment-svc', target: 'external-api', data: { label: 'HTTPS' } },
          // Compound edge: user to backend container
          { id: 'e-user-backend', source: 'user', target: 'backend', data: { label: 'traffic' } },
        ] as any,
      });
    }

    it('generates valid DOT for 17 nodes across 4 containers with nesting', () => {
      const model = buildComplexModel();
      const dot = buildDot(model, defaultAutoLayoutConfig);

      // Basic structure
      expect(dot).toContain('digraph G {');
      expect(dot).toContain('rankdir=TB');

      // All 4 top-level/nested clusters present
      expect(dot).toContain('subgraph cluster_frontend');
      expect(dot).toContain('subgraph cluster_backend');
      expect(dot).toContain('subgraph cluster_microservices');
      expect(dot).toContain('subgraph cluster_data_layer');

      // Top-level element nodes present
      expect(dot).toContain('"user"');
      expect(dot).toContain('"external-api"');

      // Leaf nodes inside containers present
      expect(dot).toContain('"web-app"');
      expect(dot).toContain('"user-svc"');
      expect(dot).toContain('"postgres-db"');
    });

    it('applies compound edge routing for edge targeting backend container', () => {
      const model = buildComplexModel();
      const dot = buildDot(model, defaultAutoLayoutConfig);

      // e-user-backend targets 'backend' which is a cluster
      // Should route through a leaf inside backend with lhead
      expect(dot).toContain('lhead="cluster_backend"');
      // Should use xlabel for compound edge label
      expect(dot).toContain('xlabel="traffic"');
    });

    it('applies chunking inside microservices cluster (4 children)', () => {
      const model = buildComplexModel();
      const dot = buildDot(model, defaultAutoLayoutConfig);

      // microservices has 4 children -> chunk size 2
      expect(dot).toContain('subgraph chunk_microservices_0');
      expect(dot).toContain('subgraph chunk_microservices_1');
    });

    it('applies depth-based colors to nested cluster', () => {
      const model = buildComplexModel();
      const dot = buildDot(model, defaultAutoLayoutConfig);

      // microservices is depth 1 (inside backend)
      const depth1Colors = clusterColorsByDepth(1);
      expect(dot).toContain(`fillcolor="${depth1Colors.fillcolor}"`);
    });

    it('applies edge weights based on hierarchy distance', () => {
      const model = buildComplexModel();
      const dot = buildDot(model, defaultAutoLayoutConfig);

      // Edges between siblings within microservices should have higher weight
      // than edges crossing containers
      expect(dot).toMatch(/"order-svc" -> "payment-svc" \[.*weight=/);
      expect(dot).toMatch(/"user-svc" -> "postgres-db" \[.*weight=/);
    });

    it('produces valid DOT for all four directions', () => {
      const model = buildComplexModel();
      for (const dir of ['TB', 'BT', 'LR', 'RL'] as const) {
        const dot = buildDot(model, { direction: dir });
        expect(dot).toContain(`rankdir=${dir}`);
        expect(dot).toContain('digraph G {');
        expect(dot).toContain('subgraph cluster_frontend');
        expect(dot).toContain('subgraph cluster_backend');
        expect(dot).toContain('subgraph cluster_microservices');
        expect(dot).toContain('subgraph cluster_data_layer');
        // All edges present
        expect(dot).toMatch(/"user" -> "web-app"/);
        expect(dot).toMatch(/"order-svc" -> "payment-svc"/);
      }
    });

    it('no overlapping node definitions in DOT', () => {
      const model = buildComplexModel();
      const dot = buildDot(model, defaultAutoLayoutConfig);

      // Count node definitions - each leaf node should appear exactly once as a definition
      const leafNodeIds = ['web-app', 'mobile-app', 'admin-panel', 'api-gateway',
        'user-svc', 'order-svc', 'payment-svc', 'notification-svc',
        'postgres-db', 'redis-cache', 'message-queue', 'user', 'external-api'];

      for (const id of leafNodeIds) {
        const definitionPattern = new RegExp(`"${id.replace('-', '\\-')}"\\s+\\[label=`, 'g');
        const matches = dot.match(definitionPattern);
        expect(matches?.length).toBe(1);
      }
    });
  });
});
