import type { ArchitectureEdgeTypes, ArchitectureNodeTypes } from './types';
import { ElementNode } from '../reactflow/nodes/ElementNode';
import { ContainerNode } from '../reactflow/nodes/ContainerNode';
import { CircleNode } from '../reactflow/nodes/CircleNode';
import { HexagonNode } from '../reactflow/nodes/HexagonNode';
import { CloudNode } from '../reactflow/nodes/CloudNode';
import { RelationshipEdge } from '../reactflow/edges/RelationshipEdge';

export const architectureNodeTypes: ArchitectureNodeTypes = {
  element: ElementNode,
  person: ElementNode,
  database: ElementNode,
  queue: ElementNode,
  storage: ElementNode,
  boundary: ElementNode,
  circle: CircleNode,
  hexagon: HexagonNode,
  cloud: CloudNode,
  container: ContainerNode,
};

export const architectureEdgeTypes: ArchitectureEdgeTypes = {
  relationship: RelationshipEdge,
};
