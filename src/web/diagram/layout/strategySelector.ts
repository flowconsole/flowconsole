import type { AutoLayoutConfig } from '../types';
import type {
  GraphProfile,
  LayoutDirection,
  LayoutPlan,
  LayoutStrategy,
  LayoutStrategyType,
  NodeRole,
  SubgraphPattern,
} from './types';
import type { NotationAdapter } from './notation/types';

function strategyFallbackDirection(
  profile: GraphProfile,
  notationDefault: LayoutDirection
): LayoutDirection {
  const roleCounts = Array.from(profile.nodeRoles.values()).reduce<Record<NodeRole, number>>(
    (acc, role) => {
      acc[role] += 1;
      return acc;
    },
    {
      entry: 0,
      frontend: 0,
      gateway: 0,
      processor: 0,
      worker: 0,
      store: 0,
      queue: 0,
      external: 0,
    }
  );

  if (profile.hasFlows && roleCounts.worker + roleCounts.processor > roleCounts.store + roleCounts.queue) {
    return 'TB';
  }

  return notationDefault;
}

function resolveDirection(
  profile: GraphProfile,
  config: AutoLayoutConfig,
  notation: NotationAdapter
) {
  return config.direction ?? strategyFallbackDirection(profile, notation.defaultDirection);
}

function hasStarTopology(profile: GraphProfile): boolean {
  for (const pattern of profile.subgraphPatterns.values()) {
    if (pattern === 'star') {
      return true;
    }
  }

  if (profile.nodeCount < 4 || profile.containerCount > 0) {
    return false;
  }

  let maxDegree = 0;
  for (const nodeId of profile.nodeRoles.keys()) {
    const degree = (profile.inDegree.get(nodeId) ?? 0) + (profile.outDegree.get(nodeId) ?? 0);
    maxDegree = Math.max(maxDegree, degree);
  }

  return maxDegree >= profile.nodeCount - 2;
}

function selectGlobalStrategy(profile: GraphProfile): LayoutStrategyType {
  if (hasStarTopology(profile) && profile.containerCount === 0) {
    return 'radial';
  }

  if (profile.edgesPerNode > 2.5) {
    return 'compact';
  }

  return 'layered';
}

function crossDirection(direction: LayoutDirection): LayoutDirection {
  return direction === 'LR' || direction === 'RL' ? 'TB' : 'LR';
}

function overrideForPattern(
  pattern: SubgraphPattern,
  parentDirection: LayoutDirection
): { strategy: LayoutStrategyType; direction: LayoutDirection } | undefined {
  switch (pattern) {
    case 'chain':
      return { strategy: 'layered', direction: crossDirection(parentDirection) };
    case 'star':
      return { strategy: 'radial', direction: parentDirection };
    case 'dense':
      return { strategy: 'compact', direction: parentDirection };
    default:
      return undefined;
  }
}

function computeContainerOverrides(
  profile: GraphProfile,
  globalDirection: LayoutDirection
): ReadonlyMap<string, { strategy: LayoutStrategyType; direction: LayoutDirection }> {
  const overrides = new Map<string, { strategy: LayoutStrategyType; direction: LayoutDirection }>();

  for (const [containerId, pattern] of profile.subgraphPatterns) {
    const override = overrideForPattern(pattern, globalDirection);
    if (override) {
      overrides.set(containerId, override);
    }
  }

  return overrides;
}

export function selectStrategy(
  profile: GraphProfile,
  config: AutoLayoutConfig,
  notation: NotationAdapter
): LayoutStrategy {
  const direction = resolveDirection(profile, config, notation);
  const strategyType = selectGlobalStrategy(profile);

  return {
    type: strategyType,
    direction,
    spacing: { node: 88, layer: 128, container: 144 },
  };
}

export function selectLayoutPlan(
  profile: GraphProfile,
  config: AutoLayoutConfig,
  notation: NotationAdapter
): LayoutPlan {
  const direction = resolveDirection(profile, config, notation);
  const strategyType = selectGlobalStrategy(profile);

  return {
    globalStrategy: strategyType,
    globalDirection: direction,
    containerOverrides: computeContainerOverrides(profile, direction),
    spacing: { node: 88, layer: 128, container: 144 },
  };
}
