import type { ArchitectureEdge, ArchitectureNode } from '../types';

export const NODE_ROLES = [
  'entry',
  'frontend',
  'gateway',
  'processor',
  'worker',
  'store',
  'queue',
  'external',
] as const;

export type NodeRole = (typeof NODE_ROLES)[number];

export const LAYOUT_DIRECTIONS = ['LR', 'TB', 'RL', 'BT'] as const;

export type LayoutDirection = (typeof LAYOUT_DIRECTIONS)[number];

export const LAYOUT_STRATEGY_TYPES = ['layered', 'compact', 'radial'] as const;

export type LayoutStrategyType = (typeof LAYOUT_STRATEGY_TYPES)[number];

export type GraphProfile = {
  nodeCount: number;
  edgeCount: number;
  containerCount: number;
  maxNestingDepth: number;
  edgeDensity: number;
  hasFlows: boolean;
  disconnectedComponents: ReadonlyArray<ReadonlySet<string>>;
  nodeRoles: ReadonlyMap<string, NodeRole>;
  clusters: ReadonlyMap<string, ReadonlySet<string>>;
  sourceSinks: { sources: readonly string[]; sinks: readonly string[] };
  containerChildCounts: ReadonlyMap<string, number>;
  inDegree: ReadonlyMap<string, number>;
  outDegree: ReadonlyMap<string, number>;
};

export type LayoutStrategy = {
  type: LayoutStrategyType;
  direction: LayoutDirection;
  spacing: {
    node: number;
    layer: number;
    container: number;
  };
};

export type LayoutQualityScore = {
  edgeCrossings: number;
  nodeOverlaps: number;
  containerViolations: number;
  labelOverlaps: number;
  edgeLengthVariance: number;
  siblingAlignmentScore: number;
  laneViolations: number;
  gatewayPlacementViolations: number;
  disconnectedPackingScore: number;
};

export const RELAYOUT_REASONS = [
  'graph_changed',
  'scope_changed',
  'filter_changed',
  'notation_changed',
  'direction_changed',
  'preset_changed',
  'size_measured',
  'engine_fallback',
  'cache_miss',
  'manual_debug_force',
] as const;

export type RelayoutReason = (typeof RELAYOUT_REASONS)[number];

export type SemanticNode = ArchitectureNode & {
  data: ArchitectureNode['data'] & {
    metadata?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    technology?: string;
    roleHint?: NodeRole;
    notationShape?: string;
    weakOwnership?: boolean;
  };
};

export type SemanticEdge = ArchitectureEdge & {
  data?: NonNullable<ArchitectureEdge['data']> & {
    metadata?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    activeFlow?: boolean;
  };
};

export type LayoutViewState = {
  scopeId?: string;
  visibleNodeIds: ReadonlySet<string>;
  representativeNodeIds: ReadonlyMap<string, string>;
  aggregatedEdgeGroups: ReadonlyMap<string, readonly string[]>;
  notation: string;
  preset: string;
  direction: LayoutDirection;
  cacheKey: string;
};

