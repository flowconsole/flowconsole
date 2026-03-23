import { edge, element, fixture } from './types';

export default fixture({
  id: 'gateway-bff-topology',
  name: 'Gateway BFF Topology',
  model: {
    nodes: [
      element('user', 'User', { shape: 'person' }),
      element('mobile-app', 'Mobile App'),
      element('web-app', 'Web App'),
      element('bff', 'BFF Gateway', { shape: 'gateway' }),
      element('api', 'Public API'),
      element('db', 'Customer DB', { shape: 'database' }),
    ],
    edges: [
      edge('gw-1', 'user', 'mobile-app', 'opens'),
      edge('gw-2', 'mobile-app', 'bff', 'requests'),
      edge('gw-3', 'web-app', 'bff', 'requests'),
      edge('gw-4', 'bff', 'api', 'aggregates'),
      edge('gw-5', 'api', 'db', 'reads'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 1,
    semanticOrder: [
      ['user', 'left-of', 'bff'],
      ['bff', 'left-of', 'api'],
    ],
    containersMustEnclose: true,
  },
});
