import { edge, element, fixture } from './types';

export default fixture({
  id: 'filter-stability',
  name: 'Filter Stability',
  model: {
    nodes: [
      element('public-api', 'Public API', { badge: 'public', tags: ['public'] }),
      element('private-api', 'Private API', { badge: 'internal', tags: ['internal'] }),
      element('billing-worker', 'Billing Worker', { tags: ['jobs'] }),
      element('event-log', 'Event Log', { shape: 'database', tags: ['infra'] }),
      element('jobs-queue', 'Jobs Queue', { shape: 'queue', tags: ['infra'] }),
    ],
    edges: [
      edge('filter-1', 'public-api', 'private-api', 'routes'),
      edge('filter-2', 'private-api', 'billing-worker', 'schedules', { kind: 'async' }),
      edge('filter-3', 'billing-worker', 'jobs-queue', 'publishes', { kind: 'event' }),
      edge('filter-4', 'billing-worker', 'event-log', 'stores'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    containersMustEnclose: true,
  },
});
