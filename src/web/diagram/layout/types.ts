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

export const SUBGRAPH_PATTERNS = ['chain', 'star', 'tree', 'bipartite', 'dense', 'sparse'] as const;

export type SubgraphPattern = (typeof SUBGRAPH_PATTERNS)[number];

export type GraphProfile = {
  nodeCount: number;
  edgeCount: number;
  containerCount: number;
  maxNestingDepth: number;
  edgesPerNode: number;
  hasFlows: boolean;
  disconnectedComponents: ReadonlyArray<ReadonlySet<string>>;
  scc: ReadonlyArray<ReadonlySet<string>>;
  nodeRoles: ReadonlyMap<string, NodeRole>;
  /** @deprecated Use scc instead */
  clusters: ReadonlyMap<string, ReadonlySet<string>>;
  sourceSinks: { sources: readonly string[]; sinks: readonly string[] };
  containerChildCounts: ReadonlyMap<string, number>;
  subgraphPatterns: ReadonlyMap<string, SubgraphPattern>;
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

export type LayoutPlan = {
  globalStrategy: LayoutStrategyType;
  globalDirection: LayoutDirection;
  containerOverrides: ReadonlyMap<
    string,
    { strategy: LayoutStrategyType; direction: LayoutDirection }
  >;
  spacing: {
    node: number;
    layer: number;
    container: number;
  };
};

export type SemanticConstraints = {
  elkPartitions: ReadonlyMap<string, number>;
  elkLayerConstraints: ReadonlyArray<{
    node: string;
    constraint: 'FIRST' | 'LAST';
  }>;
  laneOrdering: ReadonlyArray<{
    left: string;
    right: string;
    axis: 'x' | 'y';
    gap: number;
  }>;
  alignments: ReadonlyArray<{
    nodes: readonly string[];
    axis: 'x' | 'y';
  }>;
  containments: ReadonlyArray<{
    parent: string;
    children: readonly string[];
    padding: number;
  }>;
  backEdges: ReadonlySet<string>;
};

export type LayoutQualityScore = {
  edgeCrossings: number;
  nodeOverlaps: number;
  containerViolations: number;
  labelOverlaps: number;
  edgeLengthVariance: number;
  edgeBendCount: number;
  siblingAlignmentScore: number;
  laneViolations: number;
  gatewayPlacementViolations: number;
  disconnectedPackingScore: number;
  flowDirectionConsistency: number;
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

export const SEMANTIC_LANES = [
  'leading',
  'central-early',
  'central',
  'central-late',
  'supporting',
  'trailing',
] as const;

export type SemanticLane = (typeof SEMANTIC_LANES)[number];

export type LaneAxis = 'x' | 'y';

export type RankedNode = SemanticNode & {
  layout: {
    role: NodeRole;
    lane: SemanticLane;
    laneIndex: number;
    semanticRank: number;
    axis: LaneAxis;
    direction: LayoutDirection;
    inDegree: number;
    outDegree: number;
    order: number;
  };
};

export type RankedEdge = SemanticEdge & {
  layout: {
    sourceLane: SemanticLane;
    targetLane: SemanticLane;
    semanticPriority: number;
    isBackEdge: boolean;
  };
};

export type RankedGraph = {
  nodes: RankedNode[];
  edges: RankedEdge[];
  profile: GraphProfile;
  strategy: LayoutStrategy;
  notation: string;
  preset: string;
  direction: LayoutDirection;
  laneAxis: LaneAxis;
  laneOrder: ReadonlyArray<SemanticLane>;
};

export type EdgeRouting = {
  layoutPoints: ReadonlyArray<{ x: number; y: number }>;
  sourceAnchor: { x: number; y: number; side: 'N' | 'S' | 'E' | 'W' };
  targetAnchor: { x: number; y: number; side: 'N' | 'S' | 'E' | 'W' };
  labelPos: { x: number; y: number };
  labelSide: 'top' | 'bottom' | 'left' | 'right';
};

export type LayoutResult = {
  positions: ReadonlyMap<string, { x: number; y: number }>;
  containerBounds: ReadonlyMap<
    string,
    { x: number; y: number; width: number; height: number }
  >;
  routing: ReadonlyMap<string, EdgeRouting>;
  score: LayoutQualityScore;
  metadata: {
    engine: 'elk' | 'graphviz';
    strategy: LayoutStrategyType;
    direction: LayoutDirection;
    fallbackUsed: boolean;
    durationMs: number;
  };
};

export type LLMEnricherConfig = {
  enabled: boolean;
  endpoint: string;
  model: string;
  timeoutMs: number;
  processorThreshold: number;
  cache: boolean;
};
