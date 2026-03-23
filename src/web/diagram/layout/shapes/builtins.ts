import { ShapeRegistry, type ShapeDefinition } from './shapeRegistry';

export const builtInShapes: readonly ShapeDefinition[] = [
  {
    shapeId: 'person',
    geometryKind: 'person',
    defaultDimensions: { width: 200, height: 120 },
    minDimensions: { width: 180, height: 110 },
    portModel: 'sides',
    labelZones: ['header', 'body'],
    renderClassName: 'diagram-card--person',
  },
  {
    shapeId: 'service',
    geometryKind: 'card',
    defaultDimensions: { width: 240, height: 100 },
    minDimensions: { width: 200, height: 96 },
    portModel: 'card',
    labelZones: ['header', 'body', 'footer'],
    renderClassName: 'diagram-card--service',
  },
  {
    shapeId: 'database',
    geometryKind: 'database',
    defaultDimensions: { width: 200, height: 110 },
    minDimensions: { width: 180, height: 100 },
    portModel: 'database',
    labelZones: ['header', 'body'],
    renderClassName: 'diagram-card--database',
  },
  {
    shapeId: 'queue',
    geometryKind: 'queue',
    defaultDimensions: { width: 220, height: 90 },
    minDimensions: { width: 190, height: 90 },
    portModel: 'queue',
    labelZones: ['header', 'body'],
    renderClassName: 'diagram-card--queue',
  },
  {
    shapeId: 'storage',
    geometryKind: 'storage',
    defaultDimensions: { width: 220, height: 96 },
    minDimensions: { width: 200, height: 96 },
    portModel: 'database',
    labelZones: ['header', 'body'],
    renderClassName: 'diagram-card--storage',
  },
  {
    shapeId: 'gateway',
    geometryKind: 'gateway',
    defaultDimensions: { width: 240, height: 100 },
    minDimensions: { width: 220, height: 100 },
    portModel: 'gateway',
    labelZones: ['header', 'body'],
    renderClassName: 'diagram-card--gateway',
  },
  {
    shapeId: 'boundary',
    geometryKind: 'card',
    defaultDimensions: { width: 260, height: 100 },
    minDimensions: { width: 240, height: 100 },
    portModel: 'card',
    labelZones: ['header', 'body', 'footer'],
    renderClassName: 'diagram-container',
  },
  {
    shapeId: 'generic',
    geometryKind: 'card',
    defaultDimensions: { width: 220, height: 96 },
    minDimensions: { width: 180, height: 90 },
    portModel: 'card',
    labelZones: ['header', 'body'],
    renderClassName: 'diagram-card--generic',
  },
] as const;

export function createBuiltInShapeRegistry() {
  return new ShapeRegistry(builtInShapes);
}

export const defaultShapeRegistry = createBuiltInShapeRegistry();
