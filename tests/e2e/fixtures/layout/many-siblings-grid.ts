import { container, edge, element, fixture } from './types';

const siblingNodes = Array.from({ length: 16 }, (_, index) =>
  element(`svc-${index + 1}`, `Catalog Service ${index + 1}`, { parentId: 'catalog-domain' })
);

const siblingEdges = siblingNodes.slice(0, 8).map((node, index) =>
  edge(`grid-${index + 1}`, node.id, 'catalog-db', `sync-${index + 1}`, { kind: 'async' })
);

export default fixture({
  id: 'many-siblings-grid',
  name: 'Many Siblings Grid',
  model: {
    nodes: [
      container('catalog-domain', 'Catalog Domain'),
      element('catalog-db', 'Catalog DB', { shape: 'database' }),
      ...siblingNodes,
    ],
    edges: siblingEdges,
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 1,
    containersMustEnclose: true,
  },
  scopes: [{ scopeId: 'catalog-domain', expectedVisibleCount: 18 }],
});
