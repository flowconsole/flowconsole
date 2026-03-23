import { container, edge, element, fixture } from './types';

export default fixture({
  id: 'shape-registry-showcase',
  name: 'Shape Registry Showcase',
  model: {
    nodes: [
      element('person', 'Customer', { shape: 'person' }),
      element('service', 'Application Service', { shape: 'service' }),
      element('database', 'Primary DB', { shape: 'database' }),
      element('queue', 'Notification Queue', { shape: 'queue' }),
      element('storage', 'Object Storage', { shape: 'storage' }),
      element('gateway', 'Gateway', { shape: 'gateway' }),
      container('boundary', 'Boundary Scope'),
      element('inside-boundary', 'Inside Boundary', { parentId: 'boundary' }),
    ],
    edges: [
      edge('showcase-1', 'person', 'gateway', 'requests'),
      edge('showcase-2', 'gateway', 'service', 'routes'),
      edge('showcase-3', 'service', 'database', 'writes'),
      edge('showcase-4', 'service', 'queue', 'publishes', { kind: 'event' }),
      edge('showcase-5', 'service', 'storage', 'stores'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 1,
    containersMustEnclose: true,
  },
  scopes: [{ scopeId: 'boundary', expectedVisibleCount: 7 }],
});
