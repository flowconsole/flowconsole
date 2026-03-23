import type { LayoutDirection, NodeRole, SemanticEdge, SemanticNode } from '../types';

export type LabelPolicy = 'all' | 'selective' | 'minimal';

export type NotationAdapter = {
  notationId: string;
  defaultPreset: string;
  defaultDirection: LayoutDirection;
  classifyNode(node: SemanticNode): NodeRole;
  classifyEdge(edge: SemanticEdge): string;
  defaultShape(node: SemanticNode): string;
  lanePolicy(node: SemanticNode, role: NodeRole): string;
  labelPolicy(edge: SemanticEdge): LabelPolicy;
};
