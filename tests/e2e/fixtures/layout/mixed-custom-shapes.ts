import { edge, element, fixture } from './types';

export default fixture({
  id: 'mixed-custom-shapes',
  name: 'Mixed Custom Shapes',
  model: {
    nodes: [
      element('orchestrator', 'Orchestrator', { notationShape: 'hex-service' }),
      element('scheduler', 'Scheduler', { notationShape: 'capsule-worker' }),
      element('events', 'Events', { shape: 'queue' }),
      element('warehouse', 'Warehouse', { shape: 'database' }),
    ],
    edges: [
      edge('custom-1', 'orchestrator', 'scheduler', 'dispatches', { kind: 'async' }),
      edge('custom-2', 'scheduler', 'events', 'publishes', { kind: 'event' }),
      edge('custom-3', 'scheduler', 'warehouse', 'stores'),
    ],
  },
  directions: ['LR'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    containersMustEnclose: true,
  },
  customShapes: [
    {
      shapeId: 'hex-service',
      geometryKind: 'custom',
      defaultDimensions: { width: 230, height: 110 },
      minDimensions: { width: 210, height: 100 },
      portModel: 'card',
      labelZones: ['header', 'body'],
      renderClassName: 'diagram-card--hex-service',
    },
    {
      shapeId: 'capsule-worker',
      geometryKind: 'pill',
      defaultDimensions: { width: 220, height: 92 },
      minDimensions: { width: 200, height: 88 },
      portModel: 'card',
      labelZones: ['header', 'body'],
      renderClassName: 'diagram-card--capsule-worker',
    },
  ],
});
