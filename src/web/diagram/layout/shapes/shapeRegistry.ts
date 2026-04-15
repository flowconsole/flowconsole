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
  /** Extra padding factor for content (multiplied with base padding). */
  readonly contentPaddingFactor: number;
};

const registry = new Map<ElementNodeTypeName, ShapeDefinition>();

export function registerShape(nodeType: ElementNodeTypeName, definition: ShapeDefinition): void {
  registry.set(nodeType, definition);
}

export function getShapeDefinition(nodeType: ElementNodeTypeName): ShapeDefinition | undefined {
  return registry.get(nodeType);
}

export function getShapeDefinitionOrDefault(nodeType: string): ShapeDefinition {
  return registry.get(nodeType as ElementNodeTypeName) ?? DEFAULT_SHAPE;
}

export const DEFAULT_SHAPE: ShapeDefinition = {
  geometryKind: 'rectangle',
  minWidth: 200,
  minHeight: 92,
  portModel: 'bbox',
  squareAspect: false,
  contentPaddingFactor: 1,
};
