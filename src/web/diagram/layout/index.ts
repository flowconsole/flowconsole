export { analyzeGraph, classifyNodeRole } from './graphAnalyzer';
export { layoutPipeline } from './layoutPipeline';
export { architectureNotation } from './notation/architectureNotation';
export { rankSemantically } from './semanticRanker';
export { computeSize, sizeRankedGraph } from './shapeSizing';
export { builtInShapes, createBuiltInShapeRegistry, defaultShapeRegistry } from './shapes/builtins';
export { ShapeRegistry } from './shapes/shapeRegistry';
export { selectStrategy } from './strategySelector';
export type {
  GraphProfile,
  LayoutDirection,
  LayoutQualityScore,
  LaneAxis,
  LayoutStrategy,
  LayoutStrategyType,
  LayoutViewState,
  NodeRole,
  RankedEdge,
  RankedGraph,
  RankedNode,
  SemanticLane,
  RelayoutReason,
  SemanticEdge,
  SemanticNode,
} from './types';
export type { LabelPolicy, NotationAdapter } from './notation/types';
export type { ShapeDefinition } from './shapes/shapeRegistry';
export {
  LAYOUT_DIRECTIONS,
  LAYOUT_STRATEGY_TYPES,
  NODE_ROLES,
  SEMANTIC_LANES,
  RELAYOUT_REASONS,
} from './types';
