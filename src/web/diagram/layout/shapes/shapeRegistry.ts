import type { SemanticNode } from '../types';

export type ShapeDefinition = {
  shapeId: string;
  geometryKind: 'card' | 'pill' | 'person' | 'database' | 'queue' | 'storage' | 'gateway' | 'custom';
  defaultDimensions: { width: number; height: number };
  minDimensions: { width: number; height: number };
  portModel: 'card' | 'sides' | 'database' | 'queue' | 'gateway';
  labelZones: ReadonlyArray<'header' | 'body' | 'footer' | 'outside-top' | 'outside-bottom'>;
  renderClassName: string;
};

export class ShapeRegistry {
  private readonly shapes = new Map<string, ShapeDefinition>();

  constructor(definitions: ReadonlyArray<ShapeDefinition> = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: ShapeDefinition) {
    this.shapes.set(definition.shapeId, definition);
    return this;
  }

  get(shapeId: string) {
    return this.shapes.get(shapeId);
  }

  has(shapeId: string) {
    return this.shapes.has(shapeId);
  }

  list() {
    return Array.from(this.shapes.values());
  }

  resolveForNode(node: SemanticNode, fallbackShapeId = 'generic', explicitShapeId?: string) {
    const requested =
      explicitShapeId ??
      node.data.shape ??
      node.data.notationShape ??
      fallbackShapeId;
    return this.get(requested) ?? this.get(fallbackShapeId);
  }
}
