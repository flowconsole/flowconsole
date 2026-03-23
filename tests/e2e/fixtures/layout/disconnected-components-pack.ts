import { edge, element, fixture } from './types';

export default fixture({
  id: 'disconnected-components-pack',
  name: 'Disconnected Components Pack',
  model: {
    nodes: [
      element('checkout-ui', 'Checkout UI'),
      element('payment-api', 'Payment API'),
      element('support-ui', 'Support UI'),
      element('ticket-service', 'Ticket Service'),
      element('etl-worker', 'ETL Worker'),
      element('warehouse', 'Warehouse DB', { shape: 'database' }),
    ],
    edges: [
      edge('disc-1', 'checkout-ui', 'payment-api', 'submits'),
      edge('disc-2', 'support-ui', 'ticket-service', 'creates'),
      edge('disc-3', 'etl-worker', 'warehouse', 'loads'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    containersMustEnclose: true,
  },
});
