import type { AutoLayoutConfig } from '../types';
import type { GraphProfile, LayoutDirection, LayoutStrategy, NodeRole } from './types';
import type { NotationAdapter } from './notation/types';

function strategyFallbackDirection(
  type: LayoutStrategy['type'],
  profile: GraphProfile
): LayoutDirection {
  if (type === 'layered') {
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
  }

  return 'LR';
}

function resolveDirection(
  profile: GraphProfile,
  type: LayoutStrategy['type'],
  config: AutoLayoutConfig,
  notation: NotationAdapter
) {
  return config.direction ?? notation.defaultDirection ?? strategyFallbackDirection(type, profile);
}

export function selectStrategy(
  profile: GraphProfile,
  config: AutoLayoutConfig,
  notation: NotationAdapter
): LayoutStrategy {
  let type: LayoutStrategy['type'] = 'layered';

  if (profile.nodeCount <= 8 && profile.containerCount === 0) {
    type = 'radial';
  } else if (profile.hasFlows && profile.edgeDensity < 1.5) {
    type = 'layered';
  } else if (profile.maxNestingDepth >= 2) {
    type = 'layered';
  } else if (Array.from(profile.containerChildCounts.values()).some((count) => count > 15)) {
    type = 'compact';
  } else if (profile.edgeDensity > 2.5) {
    type = 'compact';
  }

  return {
    type,
    direction: resolveDirection(profile, type, config, notation),
    spacing:
      type === 'compact'
        ? { node: 56, layer: 88, container: 104 }
        : type === 'radial'
          ? { node: 72, layer: 96, container: 112 }
          : { node: 88, layer: 128, container: 144 },
  };
}
