import type { ArchitectureEdgeTypes, ArchitectureNodeTypes } from './types';
import { ElementNode } from '../reactflow/nodes/ElementNode';
import { ContainerNode } from '../reactflow/nodes/ContainerNode';
import { CircleNode } from '../reactflow/nodes/CircleNode';
import { HexagonNode } from '../reactflow/nodes/HexagonNode';
import { CloudNode } from '../reactflow/nodes/CloudNode';
import { DatabaseNode } from '../reactflow/nodes/DatabaseNode';
import { QueueNode } from '../reactflow/nodes/QueueNode';
import { PersonNode } from '../reactflow/nodes/PersonNode';
import { StorageNode } from '../reactflow/nodes/StorageNode';
import { BoundaryNode } from '../reactflow/nodes/BoundaryNode';
import { RelationshipEdge } from '../reactflow/edges/RelationshipEdge';

export const architectureNodeTypes: ArchitectureNodeTypes = {
  element: ElementNode,
  person: PersonNode,
  database: DatabaseNode,
  queue: QueueNode,
  storage: StorageNode,
  boundary: BoundaryNode,
  circle: CircleNode,
  hexagon: HexagonNode,
  cloud: CloudNode,
  container: ContainerNode,
};

export const architectureEdgeTypes: ArchitectureEdgeTypes = {
  relationship: RelationshipEdge,
};
