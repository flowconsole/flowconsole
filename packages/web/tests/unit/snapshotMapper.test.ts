import { describe, it, expect } from 'vitest';
import { mapSnapshotToDiagram } from '../../architecture/snapshotMapper';
import type { ModelSnapshotWire } from '../../architecture/snapshotTypes';

function makeSnapshot(
  overrides: Partial<ModelSnapshotWire> = {},
): ModelSnapshotWire {
  return {
    $schema: 'https://flowconsole.tech/contracts/model-snapshot/v1/schema.json',
    schemaVersion: '1.0.0',
    source: 'CodeScan',
    elements: [],
    relationships: [],
    ...overrides,
  };
}

describe('mapSnapshotToDiagram', () => {
  it('maps Database kind to database nodeType and icon', () => {
    const snapshot = makeSnapshot({
      elements: [{ id: 'db1', kind: 'Database', name: 'Users DB' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('database');
    expect(result.nodes[0].data).toMatchObject({
      title: 'Users DB',
      subtitle: 'Database',
      icon: 'database',
    });
  });

  it('maps Queue kind to queue nodeType and icon', () => {
    const snapshot = makeSnapshot({
      elements: [{ id: 'q1', kind: 'Queue', name: 'Order Queue' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes[0].type).toBe('queue');
    expect(result.nodes[0].data).toMatchObject({ icon: 'queue' });
  });

  it('maps Cache kind to database nodeType with cache icon', () => {
    const snapshot = makeSnapshot({
      elements: [{ id: 'c1', kind: 'Cache', name: 'Redis' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes[0].type).toBe('database');
    expect(result.nodes[0].data).toMatchObject({ icon: 'cache' });
  });

  it('maps External kind to cloud nodeType', () => {
    const snapshot = makeSnapshot({
      elements: [{ id: 'e1', kind: 'External', name: 'Stripe API' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes[0].type).toBe('cloud');
    expect(result.nodes[0].data).toMatchObject({ icon: 'cloud' });
  });

  it('maps Gateway kind to hexagon nodeType', () => {
    const snapshot = makeSnapshot({
      elements: [{ id: 'g1', kind: 'Gateway', name: 'API GW' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes[0].type).toBe('hexagon');
    expect(result.nodes[0].data).toMatchObject({ icon: 'gateway' });
  });

  it('applies SOURCE_TONE based on snapshot source', () => {
    const snapshot = makeSnapshot({
      source: 'Git',
      elements: [{ id: 'svc', kind: 'Service', name: 'Auth' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes[0].data).toMatchObject({ tone: 'primary' });
  });

  it('applies per-element source override for tone', () => {
    const snapshot = makeSnapshot({
      source: 'Git',
      elements: [{ id: 'svc', kind: 'Service', name: 'Auth', source: 'InfraScan' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes[0].data).toMatchObject({ tone: 'warning' });
  });

  it('falls back to muted tone for unknown source', () => {
    const snapshot = makeSnapshot({
      source: 'Unknown',
      elements: [{ id: 'svc', kind: 'Service', name: 'Auth' }],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes[0].data).toMatchObject({ tone: 'muted' });
  });

  it('detects containers via parentId references', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'parent', kind: 'Service', name: 'Parent' },
        { id: 'child', kind: 'Endpoint', name: 'GET /users', parentId: 'parent' },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    const parent = result.nodes.find((n) => n.id === 'parent')!;
    const child = result.nodes.find((n) => n.id === 'child')!;
    expect(parent.type).toBe('container');
    expect(parent.data.icon).toBeUndefined();
    expect(child.type).toBe('element');
    expect(child.parentId).toBe('parent');
  });

  it('handles orphan parentId (parent not in elements)', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'child', kind: 'Endpoint', name: 'GET /users', parentId: 'missing' },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].parentId).toBe('missing');
    expect(result.nodes[0].type).toBe('element');
  });

  it('returns empty model for empty snapshot', () => {
    const snapshot = makeSnapshot();

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('maps relationships sourceId/targetId to edge source/target', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'a', kind: 'Service', name: 'A' },
        { id: 'b', kind: 'Service', name: 'B' },
      ],
      relationships: [
        { id: 'r1', sourceId: 'a', targetId: 'b', kind: 'Calls', label: 'HTTP' },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      id: 'r1',
      source: 'a',
      target: 'b',
      type: 'relationship',
    });
    expect(result.edges[0].data).toMatchObject({
      label: 'HTTP',
      kind: 'sync',
    });
  });

  it('maps Produces/Consumes relationship kind to event', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'a', kind: 'Service', name: 'A' },
        { id: 'b', kind: 'Queue', name: 'Q' },
      ],
      relationships: [
        { id: 'r1', sourceId: 'a', targetId: 'b', kind: 'Produces' },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.edges[0].data?.kind).toBe('event');
  });

  it('maps DependsOn/Imports relationship kind to dependency', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'a', kind: 'Module', name: 'A' },
        { id: 'b', kind: 'Module', name: 'B' },
      ],
      relationships: [
        { id: 'r1', sourceId: 'a', targetId: 'b', kind: 'DependsOn' },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.edges[0].data?.kind).toBe('dependency');
  });

  it('uses relationship kind as label when label is absent', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'a', kind: 'Service', name: 'A' },
        { id: 'b', kind: 'Service', name: 'B' },
      ],
      relationships: [
        { id: 'r1', sourceId: 'a', targetId: 'b', kind: 'Calls' },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.edges[0].data?.label).toBe('Calls');
  });

  it('maps roleHint for known kinds', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'gw', kind: 'Gateway', name: 'GW' },
        { id: 'db', kind: 'Database', name: 'DB' },
        { id: 'q', kind: 'Queue', name: 'Q' },
        { id: 'w', kind: 'Worker', name: 'W' },
        { id: 'ext', kind: 'External', name: 'E' },
        { id: 'svc', kind: 'Service', name: 'S' },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);
    const byId = Object.fromEntries(result.nodes.map((n) => [n.id, n]));

    expect(byId['gw'].data).toMatchObject({ roleHint: 'gateway' });
    expect(byId['db'].data).toMatchObject({ roleHint: 'store' });
    expect(byId['q'].data).toMatchObject({ roleHint: 'queue' });
    expect(byId['w'].data).toMatchObject({ roleHint: 'worker' });
    expect(byId['ext'].data).toMatchObject({ roleHint: 'entry' });
    expect((byId['svc'].data as Record<string, unknown>).roleHint).toBeUndefined();
  });

  it('maps flows with edge steps using relationshipId', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'a', kind: 'Service', name: 'A' },
        { id: 'b', kind: 'Service', name: 'B' },
      ],
      relationships: [
        { id: 'r1', sourceId: 'a', targetId: 'b', kind: 'Calls' },
      ],
      flows: [
        {
          id: 'f1',
          name: 'Flow',
          steps: [
            { sourceElementId: 'a', relationshipId: 'r1', label: 'call B' },
          ],
        },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.flows).toHaveLength(1);
    expect(result.flows![0].steps).toHaveLength(1);
    expect(result.flows![0].steps[0]).toMatchObject({
      edgeId: 'r1',
      sourceId: 'a',
      targetId: 'b',
      label: 'call B',
    });
  });

  it('preserves action steps with null relationshipId', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'a', kind: 'Service', name: 'A' },
        { id: 'b', kind: 'Service', name: 'B' },
      ],
      relationships: [
        { id: 'r1', sourceId: 'a', targetId: 'b', kind: 'Calls' },
      ],
      flows: [
        {
          id: 'f1',
          name: 'Login',
          steps: [
            { sourceElementId: 'a', relationshipId: 'r1', label: 'POST /auth' },
            { sourceElementId: 'b', relationshipId: null, label: 'validates credentials' },
            { sourceElementId: 'b', relationshipId: 'r1', label: 'SELECT user' },
          ],
        },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.flows![0].steps).toHaveLength(3);
    const actionStep = result.flows![0].steps[1];
    expect(actionStep.sourceId).toBe('b');
    expect(actionStep.targetId).toBe('b');
    expect(actionStep.label).toBe('validates credentials');
  });

  it('preserves action steps with undefined relationshipId', () => {
    const snapshot = makeSnapshot({
      elements: [
        { id: 'svc', kind: 'Service', name: 'Order Service' },
      ],
      flows: [
        {
          id: 'f1',
          name: 'Process',
          steps: [
            { sourceElementId: 'svc', label: 'validateOrder()' },
            { sourceElementId: 'svc', label: 'calculateTotal()' },
          ],
        },
      ],
    });

    const result = mapSnapshotToDiagram(snapshot);

    expect(result.flows![0].steps).toHaveLength(2);
    expect(result.flows![0].steps[0].label).toBe('validateOrder()');
    expect(result.flows![0].steps[1].label).toBe('calculateTotal()');
  });
});
