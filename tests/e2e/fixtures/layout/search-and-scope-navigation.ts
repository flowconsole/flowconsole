import { container, edge, element, fixture } from './types';

export default fixture({
  id: 'search-and-scope-navigation',
  name: 'Search And Scope Navigation',
  model: {
    nodes: [
      container('admin-zone', 'Admin Zone'),
      container('billing-zone', 'Billing Zone'),
      element('dashboard', 'Dashboard'),
      container('audit-panel', 'Audit Panel', { parentId: 'admin-zone' }),
      element('user-directory', 'User Directory', { parentId: 'admin-zone' }),
      element('search-index', 'Search Index', { parentId: 'audit-panel', shape: 'database' }),
      element('invoice-api', 'Invoice API', { parentId: 'billing-zone' }),
      element('ledger', 'Ledger', { parentId: 'billing-zone', shape: 'database' }),
    ],
    edges: [
      edge('search-1', 'dashboard', 'user-directory', 'opens'),
      edge('search-2', 'user-directory', 'search-index', 'queries'),
      edge('search-3', 'dashboard', 'invoice-api', 'links'),
      edge('search-4', 'invoice-api', 'ledger', 'writes'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 1,
    containersMustEnclose: true,
  },
  scopes: [
    { scopeId: 'admin-zone', expectedVisibleCount: 5 },
    { scopeId: 'audit-panel', expectedVisibleCount: 4 },
  ],
});
