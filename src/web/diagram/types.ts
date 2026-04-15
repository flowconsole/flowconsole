import type { Edge, EdgeTypes, Node, NodeTypes, Position } from '@xyflow/react';

export type ElementTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';

export type ElementStatus = 'operational' | 'degraded' | 'down';

type BaseNodeData = {
  title: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  badge?: string;
  tone?: ElementTone;
  status?: ElementStatus;
  flowHighlighted?: boolean;
  flowCurrent?: 'source' | 'target';
  ghost?: boolean;
  ghostParentId?: string;
};

export type ElementNodeData = BaseNodeData & {
  icon?: string;
  clickable?: boolean;
};

export type ContainerNodeData = BaseNodeData & {
  shape?: 'container';
  footer?: string;
  muted?: boolean;
  expanded?: boolean;
  childCount?: number;
  showOpenButton?: boolean;
};

export type ArchitectureNodeData =
  | ElementNodeData
  | ContainerNodeData;

export type RelationshipKind = 'sync' | 'async' | 'event' | 'dependency';

export type RelationshipEdgeData = {
  label?: string;
  detail?: string;
  kind?: RelationshipKind;
  muted?: boolean;
  hovered?: boolean;
  direction?: 'forward' | 'both' | 'none';
  icon?: string;
  labelSide?: 'above' | 'below' | 'left' | 'right';
  layoutPoints?: { x: number; y: number }[];
  labelPos?: { x: number; y: number };
  controlPoints?: { x: number; y: number }[];
  sourceAnchor?: {
    position: Position;
    offset: number;
  };
  targetAnchor?: {
    position: Position;
    offset: number;
  };
  flowHighlighted?: boolean;
  flowCurrent?: boolean;
  originalEdgeIds?: string[];
  flowTick?: number;
  pathType?: 'smooth';
};

export type ElementNodeType = Node<ElementNodeData, 'element'>;
export type PersonNodeType = Node<ElementNodeData, 'person'>;
export type DatabaseNodeType = Node<ElementNodeData, 'database'>;
export type QueueNodeType = Node<ElementNodeData, 'queue'>;
export type StorageNodeType = Node<ElementNodeData, 'storage'>;
export type BoundaryNodeType = Node<ElementNodeData, 'boundary'>;
export type CircleNodeType = Node<ElementNodeData, 'circle'>;
export type HexagonNodeType = Node<ElementNodeData, 'hexagon'>;
export type CloudNodeType = Node<ElementNodeData, 'cloud'>;
export type ContainerNodeType = Node<ContainerNodeData, 'container'>;
export type RelationshipEdgeType = Edge<RelationshipEdgeData, 'relationship'>;

/** All element (non-container) node type names. */
export type ElementNodeTypeName = 'element' | 'person' | 'database' | 'queue' | 'storage' | 'boundary' | 'circle' | 'hexagon' | 'cloud';

export type ArchitectureNode =
  | ElementNodeType
  | PersonNodeType
  | DatabaseNodeType
  | QueueNodeType
  | StorageNodeType
  | BoundaryNodeType
  | CircleNodeType
  | HexagonNodeType
  | CloudNodeType
  | ContainerNodeType;
export type ArchitectureEdge = RelationshipEdgeType;

export type FlowStep = {
  id: string;
  edgeId: string;
  sourceId: string;
  targetId: string;
  label?: string;
};

export type FlowDefinition = {
  id: string;
  name?: string;
  steps: FlowStep[];
};

export type ArchitectureNodeTypes = NodeTypes;
export type ArchitectureEdgeTypes = EdgeTypes;

export type ArchitectureDiagramModel = {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  flows?: FlowDefinition[];
};
