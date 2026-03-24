import type { AutoLayoutConfig } from '../types';
import type { GraphProfile, LayoutDirection, LayoutStrategy, NodeRole } from './types';
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

export function selectStrategy(
  profile: GraphProfile,
  config: AutoLayoutConfig,
  notation: NotationAdapter
): LayoutStrategy {
  return {
    type: 'layered',
    direction: resolveDirection(profile, config, notation),
    spacing: { node: 88, layer: 128, container: 144 },
  };
}
