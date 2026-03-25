import { describe, it, expect } from 'vitest';
import { ArchitectureDiagramModel } from '../../src/web/diagram/types';
import { buildScopedModel, scopeTrail, canDrillDown } from '../../src/web/diagram/utils/scopedModel';

const baseModel: ArchitectureDiagramModel = {
  nodes: [
    {
      id: 'root',
      type: 'container',
      data: { title: 'Root', expanded: true },
      position: { x: 0, y: 0 },
    },
    {
      id: 'module',
      type: 'container',
      parentId: 'root',
      data: { title: 'Module', expanded: true },
      position: { x: 0, y: 0 },
    },
    {
      id: 'service-a',
      type: 'element',
      parentId: 'module',
      data: { title: 'Service A' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'service-b',
      type: 'element',
      parentId: 'module',
      data: { title: 'Service B' },
      position: { x: 0, y: 0 },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'relationship',
      source: 'service-a',
      target: 'service-b',
      data: { label: 'calls' },
    },
    {
      id: 'edge-2',
      type: 'relationship',
      source: 'service-a',
      target: 'service-b',
      data: { label: 'calls' },
    },
  ],
};

describe('buildScopedModel', () => {
it('annotates child counts in the root view', () => {
  const scoped = buildScopedModel(baseModel);
  const rootNode = scoped.nodes.find((node) => node.id === 'root');
  expect(rootNode?.type).toBe('container');
  if (rootNode?.type === 'container') {
    expect(rootNode.data.childCount).toBe(1);
  }
});

it('aggregates duplicate edges within the scoped view', () => {
  const scoped = buildScopedModel(baseModel, 'module');
  expect(scoped.edges).toHaveLength(1);
  expect(scoped.edges[0]?.data?.detail).toContain('2 links');
});

  it('returns children of the scope (not the scope itself)', () => {
    const scoped = buildScopedModel(baseModel, 'module');
    // Scoped view shows children of 'module', not 'module' itself
    expect(scoped.nodes.some((node) => node.id === 'module')).toBe(false);
    expect(scoped.nodes.map((n) => n.id).sort()).toEqual(['service-a', 'service-b']);
  });

  it('builds scope trail for nested scopes', () => {
    const trail = scopeTrail(baseModel, 'module');
    expect(trail.map((node) => node.id)).toEqual(['root', 'module']);
  });

  it('strips parentId from output nodes (flat output)', () => {
    const scoped = buildScopedModel(baseModel, 'module');
    scoped.nodes.forEach((node) => {
      expect(node.parentId).toBeUndefined();
    });
  });

  it('marks containers as collapsed with childCount', () => {
    const scoped = buildScopedModel(baseModel);
    const rootNode = scoped.nodes.find((n) => n.id === 'root');
    expect(rootNode?.type).toBe('container');
    if (rootNode?.type === 'container') {
      expect(rootNode.data.expanded).toBe(false);
      expect(rootNode.data.showOpenButton).toBe(true);
    }
  });

  it('drops edges between nodes on different levels', () => {
    const model: ArchitectureDiagramModel = {
      nodes: [
        { id: 'a', type: 'element', data: { title: 'A' }, position: { x: 0, y: 0 } },
        { id: 'b', type: 'element', parentId: 'c', data: { title: 'B' }, position: { x: 0, y: 0 } },
        { id: 'c', type: 'container', data: { title: 'C' }, position: { x: 0, y: 0 } },
      ] as ArchitectureDiagramModel['nodes'],
      edges: [
        { id: 'e1', type: 'relationship', source: 'a', target: 'b', data: {} },
      ] as ArchitectureDiagramModel['edges'],
    };
    // At root level, edge from 'a' to 'b' should be re-routed to container 'c'
    const scoped = buildScopedModel(model);
    expect(scoped.edges.length).toBe(1);
    expect(scoped.edges[0].target).toBe('c');
  });

  it('returns empty trail for root scope', () => {
    const trail = scopeTrail(baseModel);
    expect(trail).toEqual([]);
  });
});

// Model simulating Streamly-like cross-container edges
const crossContainerModel: ArchitectureDiagramModel = {
  nodes: [
    { id: 'system', type: 'container', data: { title: 'System' }, position: { x: 0, y: 0 } },
    { id: 'frontend', type: 'container', parentId: 'system', data: { title: 'Frontend' }, position: { x: 0, y: 0 } },
    { id: 'backend', type: 'container', parentId: 'system', data: { title: 'Backend' }, position: { x: 0, y: 0 } },
    { id: 'web-app', type: 'element', parentId: 'frontend', data: { title: 'Web App' }, position: { x: 0, y: 0 } },
    { id: 'api', type: 'element', parentId: 'backend', data: { title: 'API' }, position: { x: 0, y: 0 } },
    { id: 'db', type: 'element', parentId: 'backend', data: { title: 'Database' }, position: { x: 0, y: 0 } },
    { id: 'external', type: 'element', data: { title: 'External Service' }, position: { x: 0, y: 0 } },
  ] as ArchitectureDiagramModel['nodes'],
  edges: [
    { id: 'e1', type: 'relationship', source: 'web-app', target: 'api', data: { label: 'calls' } },
    { id: 'e2', type: 'relationship', source: 'api', target: 'db', data: { label: 'reads' } },
    { id: 'e3', type: 'relationship', source: 'api', target: 'external', data: { label: 'fetches' } },
  ] as ArchitectureDiagramModel['edges'],
};

describe('ghost nodes', () => {
  it('creates ghost nodes for external connections in scoped view', () => {
    // Drill into 'backend' — visible: api, db
    // web-app (in frontend) calls api → should create ghost for web-app
    // api calls external (top-level) → should create ghost for external
    const scoped = buildScopedModel(crossContainerModel, 'backend');

    const realNodes = scoped.nodes.filter((n) => !n.data.ghost);
    const ghostNodes = scoped.nodes.filter((n) => n.data.ghost);

    expect(realNodes.map((n) => n.id).sort()).toEqual(['api', 'db']);
    expect(ghostNodes.length).toBe(2);

    const ghostIds = ghostNodes.map((n) => n.id).sort();
    expect(ghostIds).toEqual(['ghost:external', 'ghost:web-app']);
  });

  it('ghost nodes have muted tone and ghost flag', () => {
    const scoped = buildScopedModel(crossContainerModel, 'backend');
    const ghost = scoped.nodes.find((n) => n.id === 'ghost:web-app');

    expect(ghost).toBeDefined();
    expect(ghost!.data.ghost).toBe(true);
    expect(ghost!.data.tone).toBe('muted');
    expect(ghost!.data.title).toBe('Web App');
  });

  it('ghost nodes show parent container in subtitle', () => {
    const scoped = buildScopedModel(crossContainerModel, 'backend');
    const ghost = scoped.nodes.find((n) => n.id === 'ghost:web-app');

    expect(ghost!.data.subtitle).toBe('← Frontend');
  });

  it('ghost nodes have ghostParentId for navigation', () => {
    const scoped = buildScopedModel(crossContainerModel, 'backend');
    const ghost = scoped.nodes.find((n) => n.id === 'ghost:web-app');

    expect(ghost!.data.ghostParentId).toBe('frontend');
  });

  it('edges connect to ghost node IDs', () => {
    const scoped = buildScopedModel(crossContainerModel, 'backend');

    // web-app → api becomes ghost:web-app → api
    const webToApi = scoped.edges.find((e) => e.source === 'ghost:web-app' && e.target === 'api');
    expect(webToApi).toBeDefined();

    // api → external becomes api → ghost:external
    const apiToExt = scoped.edges.find((e) => e.source === 'api' && e.target === 'ghost:external');
    expect(apiToExt).toBeDefined();
  });

  it('does NOT create ghost nodes at root level', () => {
    const scoped = buildScopedModel(crossContainerModel);
    const ghostNodes = scoped.nodes.filter((n) => n.data.ghost);

    expect(ghostNodes.length).toBe(0);
  });

  it('does NOT create ghost nodes when no external edges exist', () => {
    // Drill into 'backend' with only internal edges
    const internalModel: ArchitectureDiagramModel = {
      nodes: crossContainerModel.nodes,
      edges: [
        { id: 'e2', type: 'relationship', source: 'api', target: 'db', data: { label: 'reads' } },
      ] as ArchitectureDiagramModel['edges'],
    };
    const scoped = buildScopedModel(internalModel, 'backend');
    const ghostNodes = scoped.nodes.filter((n) => n.data.ghost);

    expect(ghostNodes.length).toBe(0);
  });
});

describe('canDrillDown', () => {
  it('returns true for nodes with children', () => {
    expect(canDrillDown('root', baseModel.nodes)).toBe(true);
    expect(canDrillDown('module', baseModel.nodes)).toBe(true);
  });

  it('returns false for leaf nodes', () => {
    expect(canDrillDown('service-a', baseModel.nodes)).toBe(false);
    expect(canDrillDown('service-b', baseModel.nodes)).toBe(false);
  });

  it('returns false for non-existent nodes', () => {
    expect(canDrillDown('nonexistent', baseModel.nodes)).toBe(false);
  });
});
