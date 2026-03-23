import { edge, element, fixture } from './types';

export default fixture({
  id: 'long-labels-and-badges',
  name: 'Long Labels And Badges',
  model: {
    nodes: [
      element('experience-orchestrator', 'Experience Orchestrator Service', {
        badge: 'high-priority',
        description: 'Coordinates a very long customer-facing workflow with multiple dependent systems.',
      }),
      element('inventory-snapshot', 'Inventory Snapshot Materialized View', {
        shape: 'database',
        badge: 'replica',
      }),
      element('notifications-bus', 'Notifications Dispatch Queue', {
        shape: 'queue',
        badge: 'fan-out',
      }),
    ],
    edges: [
      edge(
        'labels-1',
        'experience-orchestrator',
        'inventory-snapshot',
        'Loads projection for enriched fulfillment decisions'
      ),
      edge(
        'labels-2',
        'experience-orchestrator',
        'notifications-bus',
        'Publishes customer-visible workflow transitions',
        { kind: 'event' }
      ),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    containersMustEnclose: true,
  },
});
