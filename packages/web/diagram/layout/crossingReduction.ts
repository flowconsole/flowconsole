/**
 * Crossing reduction using barycenter heuristic.
 * Minimizes edge crossings by reordering nodes within each layer.
 */

const PASSES = 6;

function barycenter(
  nodeId: string,
  adjacentLayer: ReadonlyArray<string>,
  connections: ReadonlyMap<string, ReadonlyArray<string>>
): number | undefined {
  const neighbors = connections.get(nodeId) ?? [];
  const positions: number[] = [];

  for (const neighbor of neighbors) {
    const pos = adjacentLayer.indexOf(neighbor);
    if (pos >= 0) {
      positions.push(pos);
    }
  }

  if (positions.length === 0) return undefined;
  return positions.reduce((sum, p) => sum + p, 0) / positions.length;
}

function reorderLayer(
  layer: ReadonlyArray<string>,
  adjacentLayer: ReadonlyArray<string>,
  connections: ReadonlyMap<string, ReadonlyArray<string>>
): string[] {
  const entries = layer.map((nodeId, originalIndex) => ({
    nodeId,
    bary: barycenter(nodeId, adjacentLayer, connections),
    originalIndex,
  }));

  entries.sort((a, b) => {
    const aVal = a.bary ?? a.originalIndex;
    const bVal = b.bary ?? b.originalIndex;
    if (aVal !== bVal) return aVal - bVal;
    // Stable sort: preserve original order when barycenter is equal
    return a.originalIndex - b.originalIndex;
  });

  return entries.map((e) => e.nodeId);
}

function countCrossings(
  layers: ReadonlyArray<ReadonlyArray<string>>,
  adjacency: ReadonlyMap<string, ReadonlyArray<string>>
): number {
  let crossings = 0;

  for (let i = 0; i < layers.length - 1; i++) {
    const topLayer = layers[i];
    const bottomLayer = layers[i + 1];

    // Collect edges between these two layers as position pairs
    const edges: Array<[number, number]> = [];
    for (let topIdx = 0; topIdx < topLayer.length; topIdx++) {
      const neighbors = adjacency.get(topLayer[topIdx]) ?? [];
      for (const neighbor of neighbors) {
        const bottomIdx = bottomLayer.indexOf(neighbor);
        if (bottomIdx >= 0) {
          edges.push([topIdx, bottomIdx]);
        }
      }
    }

    // Count inversions (crossings)
    for (let a = 0; a < edges.length; a++) {
      for (let b = a + 1; b < edges.length; b++) {
        const [a1, a2] = edges[a];
        const [b1, b2] = edges[b];
        if ((a1 < b1 && a2 > b2) || (a1 > b1 && a2 < b2)) {
          crossings++;
        }
      }
    }
  }

  return crossings;
}

/**
 * Reduce edge crossings in a layered graph using barycenter heuristic.
 * Performs multiple passes alternating top-down and bottom-up sweeps.
 */
export function reduceCrossings(
  layers: ReadonlyArray<ReadonlyArray<string>>,
  adjacency: ReadonlyMap<string, ReadonlyArray<string>>,
  reverseAdjacency: ReadonlyMap<string, ReadonlyArray<string>>
): string[][] {
  if (layers.length <= 1) {
    return layers.map((l) => [...l]);
  }

  let bestLayers = layers.map((l) => [...l]);
  let bestCrossings = countCrossings(bestLayers, adjacency);

  let currentLayers = bestLayers.map((l) => [...l]);

  for (let pass = 0; pass < PASSES; pass++) {
    if (pass % 2 === 0) {
      // Top-down sweep
      for (let i = 1; i < currentLayers.length; i++) {
        currentLayers[i] = reorderLayer(
          currentLayers[i],
          currentLayers[i - 1],
          reverseAdjacency
        );
      }
    } else {
      // Bottom-up sweep
      for (let i = currentLayers.length - 2; i >= 0; i--) {
        currentLayers[i] = reorderLayer(
          currentLayers[i],
          currentLayers[i + 1],
          adjacency
        );
      }
    }

    const crossings = countCrossings(currentLayers, adjacency);
    if (crossings < bestCrossings) {
      bestCrossings = crossings;
      bestLayers = currentLayers.map((l) => [...l]);
    }
  }

  return bestLayers;
}
