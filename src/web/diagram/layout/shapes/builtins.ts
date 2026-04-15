import { registerShape } from './shapeRegistry';

/**
 * Register all built-in shape definitions.
 * Called once at module load time.
 */

// Rectangle-based shapes (CSS styling only, no SVG overlay)
registerShape('element', {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 92,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
});

registerShape('person', {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 92,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
});

registerShape('database', {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 100,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
});

registerShape('queue', {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 92,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
});

registerShape('storage', {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 92,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
});

registerShape('boundary', {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 92,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
});

// SVG-based shapes (rendered via shapeBackground prop)
registerShape('circle', {
  geometryKind: 'circle',
  minWidth: 140,
  minHeight: 140,
  portModel: 'perimeter',
  squareAspect: true,
  contentPaddingFactor: 1.4,
});

registerShape('hexagon', {
  geometryKind: 'hexagon',
  minWidth: 180,
  minHeight: 160,
  portModel: 'perimeter',
  squareAspect: false,
  contentPaddingFactor: 1.3,
});

registerShape('cloud', {
  geometryKind: 'cloud',
  minWidth: 220,
  minHeight: 130,
  portModel: 'perimeter',
  squareAspect: false,
  contentPaddingFactor: 1.2,
});
