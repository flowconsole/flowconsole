import { edge, element, fixture } from './types';

export default fixture({
  id: 'top-to-bottom-process',
  name: 'Top To Bottom Process',
  model: {
    nodes: [
      element('ingest', 'Ingest'),
      element('validate', 'Validate'),
      element('decide', 'Decision Gateway', { shape: 'gateway' }),
      element('execute', 'Execute'),
      element('archive', 'Archive', { shape: 'storage' }),
    ],
    edges: [
      edge('tb-1', 'ingest', 'validate', 'normalize'),
      edge('tb-2', 'validate', 'decide', 'check'),
      edge('tb-3', 'decide', 'execute', 'approve'),
      edge('tb-4', 'execute', 'archive', 'store'),
    ],
  },
  directions: ['TB'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    semanticOrder: [['ingest', 'above', 'execute']],
    containersMustEnclose: true,
  },
});
