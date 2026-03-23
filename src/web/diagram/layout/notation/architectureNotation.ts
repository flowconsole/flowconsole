import { classifyNodeRole } from '../graphAnalyzer';
import type { NodeRole, SemanticEdge, SemanticNode } from '../types';
import type { NotationAdapter } from './types';

function shapeFromRole(role: NodeRole) {
  switch (role) {
    case 'entry':
      return 'person';
    case 'store':
      return 'database';
    case 'queue':
      return 'queue';
    case 'gateway':
      return 'gateway';
    case 'external':
      return 'boundary';
    default:
      return 'service';
  }
}

function laneFromRole(role: NodeRole) {
  switch (role) {
    case 'entry':
      return 'leading';
    case 'frontend':
    case 'gateway':
      return 'central-early';
    case 'processor':
      return 'central';
    case 'worker':
      return 'central-late';
    case 'queue':
    case 'store':
      return 'supporting';
    case 'external':
      return 'trailing';
    default:
      return 'central';
  }
}

export const architectureNotation: NotationAdapter = {
  notationId: 'architecture',
  defaultPreset: 'c4-like',
  defaultDirection: 'LR',
  classifyNode(node: SemanticNode) {
    return node.data.roleHint ?? classifyNodeRole(node, 1, 1);
  },
  classifyEdge(edge: SemanticEdge) {
    return edge.data?.kind ?? 'relationship';
  },
  defaultShape(node: SemanticNode) {
    if (node.type === 'container') {
      return 'boundary';
    }
    if (node.data.shape) {
      return node.data.shape;
    }
    return shapeFromRole(this.classifyNode(node));
  },
  lanePolicy(_node: SemanticNode, role: NodeRole) {
    return laneFromRole(role);
  },
  labelPolicy(edge: SemanticEdge) {
    switch (edge.data?.kind) {
      case 'event':
      case 'dependency':
        return 'minimal';
      case 'async':
        return 'selective';
      default:
        return 'all';
    }
  },
};
