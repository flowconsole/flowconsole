import { element, container, edge, fixture } from './types';

export default fixture({
  id: 'chain-inside-container',
  name: 'Chain Inside Container — Per-Container Direction',
  model: {
    nodes: [
      element('client', 'Client App', { shape: 'service' }),
      container('pipeline', 'Data Pipeline'),
      element('ingest', 'Ingest', { parentId: 'pipeline', shape: 'service' }),
      element('transform', 'Transform', { parentId: 'pipeline', shape: 'service' }),
      element('validate', 'Validate', { parentId: 'pipeline', shape: 'service' }),
      element('load', 'Load', { parentId: 'pipeline', shape: 'service' }),
      element('warehouse', 'Data Warehouse', { shape: 'database' }),
    ],
    edges: [
      edge('e1', 'client', 'ingest', 'submit data'),
      edge('e2', 'ingest', 'transform', 'raw data'),
      edge('e3', 'transform', 'validate', 'transformed'),
      edge('e4', 'validate', 'load', 'validated'),
      edge('e5', 'load', 'warehouse', 'bulk insert'),
    ],
  },
  directions: ['LR', 'TB'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 1,
    containersMustEnclose: true,
    semanticOrder: [
      ['client', 'left-of', 'ingest'],
      ['load', 'left-of', 'warehouse'],
    ],
  },
  scopes: [
    { scopeId: 'pipeline', expectedVisibleCount: 4 },
  ],
});
