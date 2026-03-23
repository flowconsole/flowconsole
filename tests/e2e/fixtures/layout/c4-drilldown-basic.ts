import { container, edge, element, fixture } from './types';

export default fixture({
  id: 'c4-drilldown-basic',
  name: 'C4 Drilldown Basic',
  model: {
    nodes: [
      element('web-app', 'Web App', { shape: 'service', badge: 'ui' }),
      container('core-services', 'Core Services'),
      container('data-store', 'Data Store'),
      element('accounts-api', 'Accounts API', { parentId: 'core-services' }),
      element('notification-worker', 'Notification Worker', { parentId: 'core-services' }),
      element('ledger-db', 'Ledger DB', { parentId: 'data-store', shape: 'database' }),
      element('audit-db', 'Audit DB', { parentId: 'data-store', shape: 'database' }),
    ],
    edges: [
      edge('rel-web-api', 'web-app', 'accounts-api', 'calls'),
      edge('rel-api-worker', 'accounts-api', 'notification-worker', 'dispatches', { kind: 'async' }),
      edge('rel-api-ledger', 'accounts-api', 'ledger-db', 'writes'),
      edge('rel-worker-audit', 'notification-worker', 'audit-db', 'archives', { kind: 'event' }),
    ],
  },
  directions: ['LR', 'TB'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    semanticOrder: [['web-app', 'left-of', 'core-services']],
    containersMustEnclose: true,
  },
  scopes: [{ scopeId: 'core-services', expectedVisibleCount: 5 }],
});
