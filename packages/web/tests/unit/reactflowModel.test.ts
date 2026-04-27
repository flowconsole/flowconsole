import { describe, it, expect } from 'vitest';
import type { DiagramIntermediateModel, EntityRecord } from '../../languages/typescript/diagramRuntime';
import { buildReactFlowModel } from '../../languages/typescript/modelToReactflowMapper';

function makeEntity(overrides: Partial<EntityRecord> & { id: string; name: string }): EntityRecord {
  return {
    type: 'Service',
    description: '',
    parentId: undefined,
    tags: undefined,
    badge: undefined,
    tone: undefined,
    kind: 'Service',
    style: {},
    metadata: {},
    ...overrides,
  };
}

function buildSingle(entity: EntityRecord) {
  const intermediate: DiagramIntermediateModel = {
    entities: [entity],
    relationships: [],
    flows: [],
    deployments: [],
  };
  return buildReactFlowModel(intermediate).nodes[0];
}

describe('buildReactFlowModel', () => {
  it('converts intermediate entities into nodes and edges', () => {
    const intermediate: DiagramIntermediateModel = {
      entities: [
        makeEntity({
          id: 'sys',
          type: 'SoftwareSystem',
          name: 'System',
          description: 'Root domain',
          style: { icon: 'system', shape: 'rectangle' },
        }),
        makeEntity({
          id: 'api',
          type: 'RestApi',
          name: 'Accounts',
          description: 'handles balances',
          parentId: 'sys',
          tags: ['rest'],
          badge: 'beta',
          kind: 'Application',
          style: { icon: 'api', shape: 'rectangle' },
          metadata: { framework: 'Express' },
        }),
        makeEntity({
          id: 'user',
          type: 'User',
          name: 'Customer',
          description: 'Reads data',
          kind: 'External',
          style: { icon: 'user', shape: 'person' },
        }),
      ],
      relationships: [
        {
          id: 'rel-1',
          sourceId: 'user',
          targetId: 'api',
          label: 'call',
          detail: 'fetch',
          kind: 'sync',
          icon: undefined,
          muted: false,
        },
      ],
      flows: [],
      deployments: [],
    };

    const model = buildReactFlowModel(intermediate);
    expect(model.nodes).toHaveLength(3);
    const containerNode = model.nodes.find((node) => node.id === 'sys');
    expect(containerNode?.type).toBe('container');
    const apiNode = model.nodes.find((node) => node.id === 'api');
    expect(apiNode?.type).toBe('element');
    expect(apiNode?.data.subtitle).toBe('Express');

    expect(model.edges).toHaveLength(1);
    expect(model.edges[0]?.data?.label).toBe('call');
  });

  describe('SHAPE_MAP: assigns correct nodeType for each ShapeKind', () => {
    it.each([
      ['circle', 'circle'],
      ['hexagon', 'hexagon'],
      ['cloud', 'cloud'],
      ['rectangle', 'element'],
      ['cylinder', 'database'],
      ['pipe', 'queue'],
      ['person', 'person'],
    ] as const)('shape: %s -> type: %s', (shape, expectedType) => {
      const node = buildSingle(makeEntity({ id: 'n1', name: 'Test', style: { shape } }));
      expect(node?.type).toBe(expectedType);
    });
  });

  it('defaults to type=element when no shape is specified', () => {
    const node = buildSingle(makeEntity({ id: 'n1', name: 'NoShape', style: {} }));
    expect(node?.type).toBe('element');
  });

  it('defaults to type=element when style is undefined', () => {
    const node = buildSingle(makeEntity({ id: 'n1', name: 'NoStyle' }));
    expect(node?.type).toBe('element');
  });

  it('does not include shape in node data', () => {
    const node = buildSingle(makeEntity({ id: 'n1', name: 'Test', style: { shape: 'circle' } }));
    expect(node?.data).not.toHaveProperty('shape');
  });

  it('assigns person nodeType for User entity with person shape', () => {
    const node = buildSingle(makeEntity({
      id: 'u1',
      type: 'User',
      name: 'User',
      style: { shape: 'person' },
    }));
    expect(node?.type).toBe('person');
  });

  it('assigns container type for SoftwareSystem', () => {
    const node = buildSingle(makeEntity({
      id: 's1',
      type: 'SoftwareSystem',
      name: 'System',
    }));
    expect(node?.type).toBe('container');
  });

  describe('custom colors and preset', () => {
    it('passes custom colors from entity style to element node data', () => {
      const node = buildSingle(makeEntity({
        id: 'styled',
        name: 'Styled',
        style: {
          shape: 'rectangle',
          color: '#ff0000',
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
        },
      }));
      expect(node?.data).toHaveProperty('customColor', '#ff0000');
      expect(node?.data).toHaveProperty('customBackgroundColor', '#e74c3c');
      expect(node?.data).toHaveProperty('customBorderColor', '#c0392b');
    });

    it('passes preset from entity style to element node data', () => {
      const node = buildSingle(makeEntity({
        id: 'preset-node',
        name: 'Critical',
        style: { preset: 'critical' },
      }));
      expect(node?.data).toHaveProperty('preset', 'critical');
    });

    it('does not include custom color fields when absent from entity style', () => {
      const node = buildSingle(makeEntity({
        id: 'plain',
        name: 'Plain',
        style: { shape: 'rectangle' },
      }));
      expect(node?.data).not.toHaveProperty('customColor');
      expect(node?.data).not.toHaveProperty('customBackgroundColor');
      expect(node?.data).not.toHaveProperty('customBorderColor');
      expect(node?.data).not.toHaveProperty('preset');
    });

    it('does not include preset when it is "default"', () => {
      const node = buildSingle(makeEntity({
        id: 'default-preset',
        name: 'Default',
        style: { preset: 'default' },
      }));
      expect(node?.data).not.toHaveProperty('preset');
    });

    it('passes custom colors and preset to container node data', () => {
      const node = buildSingle(makeEntity({
        id: 'sys-styled',
        type: 'SoftwareSystem',
        name: 'Styled System',
        style: {
          backgroundColor: '#2ecc71',
          borderColor: '#27ae60',
          preset: 'highlighted',
        },
      }));
      expect(node?.type).toBe('container');
      expect(node?.data).toHaveProperty('customBackgroundColor', '#2ecc71');
      expect(node?.data).toHaveProperty('customBorderColor', '#27ae60');
      expect(node?.data).toHaveProperty('preset', 'highlighted');
    });

    it('does not include custom color fields on container when absent', () => {
      const node = buildSingle(makeEntity({
        id: 'sys-plain',
        type: 'SoftwareSystem',
        name: 'Plain System',
        style: {},
      }));
      expect(node?.type).toBe('container');
      expect(node?.data).not.toHaveProperty('customColor');
      expect(node?.data).not.toHaveProperty('customBackgroundColor');
      expect(node?.data).not.toHaveProperty('customBorderColor');
      expect(node?.data).not.toHaveProperty('preset');
    });

    it('preserves tone and badge alongside custom styles', () => {
      const node = buildSingle(makeEntity({
        id: 'full',
        name: 'Full Style',
        tone: 'danger',
        badge: 'v2',
        style: {
          preset: 'critical',
          backgroundColor: '#e74c3c',
        },
      }));
      expect(node?.data).toHaveProperty('tone', 'danger');
      expect(node?.data).toHaveProperty('badge', 'v2');
      expect(node?.data).toHaveProperty('preset', 'critical');
      expect(node?.data).toHaveProperty('customBackgroundColor', '#e74c3c');
    });
  });
});
