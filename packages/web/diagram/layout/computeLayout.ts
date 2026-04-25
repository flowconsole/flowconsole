import type { ArchitectureDiagramModel } from '../types';
import type { LayoutConfig, LayoutResult } from './types';
import { DEFAULT_LAYOUT_CONFIG } from './types';
import { assignLayers } from './layerAssignment';
import { reduceCrossings } from './crossingReduction';
import { assignCoordinates } from './coordinateAssignment';
import { routeEdges } from './edgeRouting';

/**
 * Compute layout positions for a flat set of nodes (one drill-down level).
 *
 * The caller is responsible for filtering nodes to the current level
 * via `buildScopedModel` before calling this function.
 *
 * Algorithm (Sugiyama-style):
 * 1. Assign layers via longest-path layering
 * 2. Reduce edge crossings via barycenter heuristic
 * 3. Assign x,y coordinates with centered layers
 */
export function computeLayout(
  model: ArchitectureDiagramModel,
  config?: Partial<LayoutConfig>
): LayoutResult {
  const effectiveConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };

  if (model.nodes.length === 0) {
    return { nodes: [], edges: [], bounds: { width: 0, height: 0 } };
  }

  const { layers: rawLayers, adjacency, reverseAdjacency } = assignLayers(model);
  const orderedLayers = reduceCrossings(rawLayers, adjacency, reverseAdjacency);
  const { positions, bounds } = assignCoordinates(orderedLayers, model, effectiveConfig);

  // Stage 4: Edge routing — compute waypoints that avoid nodes
  const routedEdgeMap = routeEdges(positions, model.edges, orderedLayers, effectiveConfig);

  const nodes = model.nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return node;

    return {
      ...node,
      position: { x: pos.x, y: pos.y },
      style: {
        ...node.style,
        width: pos.width,
      },
    };
  });

  const edges = model.edges.map((edge) => {
    const routed = routedEdgeMap.get(edge.id);
    if (!routed) return edge;
    return {
      ...edge,
      data: { ...edge.data, ...routed },
    };
  });

  return { nodes, edges, bounds, layers: orderedLayers };
}
