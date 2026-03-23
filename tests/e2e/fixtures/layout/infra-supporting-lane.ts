import { edge, element, fixture } from './types';

export default fixture({
  id: 'infra-supporting-lane',
  name: 'Infrastructure Supporting Lane',
  model: {
    nodes: [
      element('portal', 'Operations Portal'),
      element('service', 'Control Service'),
      element('worker', 'Background Worker'),
      element('queue', 'Command Queue', { shape: 'queue' }),
      element('cache', 'Hot Cache', { shape: 'storage' }),
      element('postgres', 'Postgres', { shape: 'database' }),
      element('vendor-api', 'Vendor API', { tone: 'muted', weakOwnership: true, shape: 'service' }),
    ],
    edges: [
      edge('infra-1', 'portal', 'service', 'triggers'),
      edge('infra-2', 'service', 'queue', 'enqueues', { kind: 'async' }),
      edge('infra-3', 'worker', 'queue', 'consumes', { kind: 'async' }),
      edge('infra-4', 'worker', 'postgres', 'writes'),
      edge('infra-5', 'service', 'cache', 'hydrates'),
      edge('infra-6', 'service', 'vendor-api', 'syncs'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 1,
    semanticOrder: [['service', 'left-of', 'postgres']],
    containersMustEnclose: true,
  },
});
