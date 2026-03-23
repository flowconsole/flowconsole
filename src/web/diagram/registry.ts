import { createElement } from 'react';
import type { ArchitectureEdgeTypes, ArchitectureNodeTypes } from './types';
import { defaultShapeRegistry } from './layout/shapes/builtins';
import type { ShapeDefinition, ShapeRegistry } from './layout/shapes/shapeRegistry';
import { ElementNode } from '../reactflow/nodes/ElementNode';
import { ContainerNode } from '../reactflow/nodes/ContainerNode';
import { RelationshipEdge } from '../reactflow/edges/RelationshipEdge';

export function createArchitectureNodeTypes(shapeRegistry: ShapeRegistry = defaultShapeRegistry): ArchitectureNodeTypes {
  return {
    element: (props: Parameters<typeof ElementNode>[0]) =>
      createElement(ElementNode, { ...props, shapeRegistry }),
    container: (props: Parameters<typeof ContainerNode>[0]) =>
      createElement(ContainerNode, { ...props, shapeRegistry }),
  };
}

export function registerArchitectureShape(definition: ShapeDefinition) {
  defaultShapeRegistry.register(definition);
  return defaultShapeRegistry;
}

export const architectureNodeTypes: ArchitectureNodeTypes = createArchitectureNodeTypes();

export const architectureEdgeTypes: ArchitectureEdgeTypes = {
  relationship: RelationshipEdge,
};
