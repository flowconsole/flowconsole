import { element, edge, fixture } from './types';

export default fixture({
  id: 'bipartite-services',
  name: 'Bipartite Services — Two-Column Layout',
  model: {
    nodes: [
      element('web-fe', 'Web Frontend', { shape: 'service' }),
      element('mobile-fe', 'Mobile Frontend', { shape: 'service' }),
      element('api-users', 'Users API', { shape: 'service' }),
      element('api-orders', 'Orders API', { shape: 'service' }),
      element('api-products', 'Products API', { shape: 'service' }),
    ],
    edges: [
      edge('e1', 'web-fe', 'api-users', 'REST'),
      edge('e2', 'web-fe', 'api-orders', 'REST'),
      edge('e3', 'web-fe', 'api-products', 'REST'),
      edge('e4', 'mobile-fe', 'api-users', 'REST'),
      edge('e5', 'mobile-fe', 'api-orders', 'REST'),
      edge('e6', 'mobile-fe', 'api-products', 'GraphQL'),
    ],
  },
  directions: ['LR', 'TB'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 4,
    containersMustEnclose: false,
    semanticOrder: [
      ['web-fe', 'left-of', 'api-users'],
      ['mobile-fe', 'left-of', 'api-orders'],
    ],
  },
});
