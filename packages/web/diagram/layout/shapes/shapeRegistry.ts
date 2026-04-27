import type { ElementNodeTypeName } from '../../types';

/** Geometry kind determines how port positions and intersection are computed. */
export type GeometryKind = 'rectangle' | 'circle' | 'hexagon' | 'cloud';

/** Port model describes where edges can connect to a shape. */
export type PortModel = 'bbox' | 'perimeter';

export type ShapeDefinition = {
  /** Visual geometry kind for computing port intersections. */
  readonly geometryKind: GeometryKind;
  /** Minimum width in pixels. */
  readonly minWidth: number;
  /** Minimum height in pixels. */
  readonly minHeight: number;
  /** Port connection model: 'bbox' uses bounding box edges, 'perimeter' uses shape contour. */
  readonly portModel: PortModel;
  /** Whether the shape enforces 1:1 aspect ratio. */
  readonly squareAspect: boolean;
  /** Fixed aspect ratio (width/height). When set, layout height is derived from width. Ignored if squareAspect is true. */
  readonly aspectRatio?: number;
  /** Extra padding factor for content (multiplied with base padding). */
  readonly contentPaddingFactor: number;
};

export const DEFAULT_SHAPE: ShapeDefinition = {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 92,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
};

/**
 * Built-in shape definitions, initialized inline to avoid tree-shaking issues.
 * The registry is a static map — no side-effect imports needed.
 */
const registry = new Map<string, ShapeDefinition>([
  // Rectangle (default service)
  ['element', { geometryKind: 'rectangle', minWidth: 200, minHeight: 92, portModel: 'bbox', squareAspect: false, contentPaddingFactor: 1 }],
  // Container: same dimensions as default rectangle
  ['container', { geometryKind: 'rectangle', minWidth: 200, minHeight: 92, portModel: 'bbox', squareAspect: false, contentPaddingFactor: 1 }],
  // SVG-based shapes rendered via renderShapeBackground in BaseElementNode
  ['person', { geometryKind: 'rectangle', minWidth: 180, minHeight: 120, portModel: 'bbox', squareAspect: false, contentPaddingFactor: 1 }],
  ['database', { geometryKind: 'rectangle', minWidth: 92, minHeight: 92, portModel: 'bbox', squareAspect: false, contentPaddingFactor: 1 }],
  ['queue', { geometryKind: 'rectangle', minWidth: 220, minHeight: 92, portModel: 'bbox', squareAspect: false, contentPaddingFactor: 1 }],
  ['storage', { geometryKind: 'rectangle', minWidth: 200, minHeight: 100, portModel: 'bbox', squareAspect: false, contentPaddingFactor: 1 }],
  ['boundary', { geometryKind: 'rectangle', minWidth: 200, minHeight: 100, portModel: 'bbox', squareAspect: false, contentPaddingFactor: 1 }],
  ['circle', { geometryKind: 'circle', minWidth: 140, minHeight: 140, portModel: 'perimeter', squareAspect: true, contentPaddingFactor: 1.4 }],
  ['hexagon', { geometryKind: 'hexagon', minWidth: 90, minHeight: 80, portModel: 'perimeter', squareAspect: false, aspectRatio: 1.15, contentPaddingFactor: 1.3 }],
  ['cloud', { geometryKind: 'cloud', minWidth: 220, minHeight: 130, portModel: 'perimeter', squareAspect: false, contentPaddingFactor: 1.2 }],
]);

export function registerShape(nodeType: ElementNodeTypeName, definition: ShapeDefinition): void {
  registry.set(nodeType, definition);
}

export function getShapeDefinition(nodeType: ElementNodeTypeName): ShapeDefinition | undefined {
  return registry.get(nodeType);
}

export function getShapeDefinitionOrDefault(nodeType: string): ShapeDefinition {
  return registry.get(nodeType as ElementNodeTypeName) ?? DEFAULT_SHAPE;
}
