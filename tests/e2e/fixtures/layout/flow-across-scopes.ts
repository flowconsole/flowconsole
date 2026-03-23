import { container, edge, element, fixture, flow } from './types';

export default fixture({
  id: 'flow-across-scopes',
  name: 'Flow Across Scopes',
  model: {
    nodes: [
      element('customer', 'Customer', { shape: 'person' }),
      container('gateway-scope', 'Gateway Scope'),
      container('order-domain', 'Order Domain'),
      container('eventing', 'Eventing'),
      container('analytics', 'Analytics'),
      element('bff-gateway', 'BFF Gateway', { parentId: 'gateway-scope', shape: 'gateway' }),
      element('order-service', 'Order Service', { parentId: 'order-domain' }),
      element('events-bus', 'Events Bus', { parentId: 'eventing', shape: 'queue' }),
      element('analytics-worker', 'Analytics Worker', { parentId: 'analytics' }),
    ],
    edges: [
      edge('flow-1-edge-1', 'customer', 'bff-gateway', 'Open order'),
      edge('flow-1-edge-2', 'bff-gateway', 'order-service', 'Submit order'),
      edge('flow-1-edge-3', 'order-service', 'events-bus', 'Publish event', { kind: 'event' }),
      edge('flow-1-edge-4', 'events-bus', 'analytics-worker', 'Consume event', { kind: 'async' }),
    ],
    flows: [
      flow(
        'order-flow',
        [
          { edgeId: 'flow-1-edge-1', sourceId: 'customer', targetId: 'bff-gateway', label: 'Open order' },
          { edgeId: 'flow-1-edge-2', sourceId: 'bff-gateway', targetId: 'order-service', label: 'Submit order' },
          { edgeId: 'flow-1-edge-3', sourceId: 'order-service', targetId: 'events-bus', label: 'Publish event' },
          { edgeId: 'flow-1-edge-4', sourceId: 'events-bus', targetId: 'analytics-worker', label: 'Consume event' },
        ],
        'Order Flow'
      ),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    semanticOrder: [['customer', 'left-of', 'gateway-scope']],
    containersMustEnclose: true,
  },
  scopes: [{ scopeId: 'order-domain', expectedVisibleCount: 5 }],
  flows: [{ flowId: 'order-flow', stepCount: 4 }],
});
