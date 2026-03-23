import { container, edge, element, fixture } from './types';

export default fixture({
  id: 'dense-cross-container',
  name: 'Dense Cross Container',
  model: {
    nodes: [
      container('ingress', 'Ingress'),
      container('domain', 'Domain'),
      container('support', 'Support'),
      element('edge-router', 'Edge Router', { parentId: 'ingress' }),
      element('authz', 'AuthZ', { parentId: 'ingress' }),
      element('api-core', 'API Core', { parentId: 'domain' }),
      element('workflow', 'Workflow', { parentId: 'domain' }),
      element('cache', 'Cache', { parentId: 'support', shape: 'storage' }),
      element('events', 'Events', { parentId: 'support', shape: 'queue' }),
    ],
    edges: [
      edge('dense-1', 'edge-router', 'api-core', 'routes'),
      edge('dense-2', 'authz', 'api-core', 'authorizes'),
      edge('dense-3', 'api-core', 'workflow', 'delegates', { kind: 'async' }),
      edge('dense-4', 'workflow', 'events', 'publishes', { kind: 'event' }),
      edge('dense-5', 'api-core', 'cache', 'caches'),
      edge('dense-6', 'workflow', 'cache', 'reads'),
      edge('dense-7', 'authz', 'events', 'alerts', { kind: 'event' }),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 2,
    containersMustEnclose: true,
  },
  scopes: [{ scopeId: 'domain', expectedVisibleCount: 5 }],
});
