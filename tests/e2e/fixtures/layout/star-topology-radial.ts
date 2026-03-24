import { element, edge, fixture } from './types';

export default fixture({
  id: 'star-topology-radial',
  name: 'Star Topology — Radial Strategy',
  model: {
    nodes: [
      element('gateway', 'API Gateway', { shape: 'gateway' }),
      element('users', 'User Service', { shape: 'service' }),
      element('orders', 'Order Service', { shape: 'service' }),
      element('payments', 'Payment Service', { shape: 'service' }),
      element('inventory', 'Inventory Service', { shape: 'service' }),
      element('notifications', 'Notification Service', { shape: 'service' }),
      element('analytics', 'Analytics Service', { shape: 'service' }),
    ],
    edges: [
      edge('e1', 'gateway', 'users', 'REST'),
      edge('e2', 'gateway', 'orders', 'REST'),
      edge('e3', 'gateway', 'payments', 'REST'),
      edge('e4', 'gateway', 'inventory', 'REST'),
      edge('e5', 'gateway', 'notifications', 'gRPC'),
      edge('e6', 'gateway', 'analytics', 'gRPC'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 3,
    containersMustEnclose: false,
  },
});
