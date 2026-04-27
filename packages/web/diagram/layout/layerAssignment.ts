import type { ArchitectureDiagramModel } from './types';

type AdjacencyMap = Map<string, string[]>;

/**
 * Break cycles by reversing back-edges detected via DFS.
 * Returns a set of edge keys "source|target" that were reversed.
 */
function breakCycles(
  nodeIds: ReadonlyArray<string>,
  adjacency: AdjacencyMap
): Set<string> {
  const reversed = new Set<string>();
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string) {
    visited.add(nodeId);
    inStack.add(nodeId);
    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (inStack.has(neighbor)) {
        // Back-edge: reverse it
        reversed.add(`${nodeId}|${neighbor}`);
        continue;
      }
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
    inStack.delete(nodeId);
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }
  return reversed;
}

/**
 * Build a DAG adjacency map from edges, reversing back-edges.
 */
function buildDAG(
  nodeIds: ReadonlyArray<string>,
  edges: ArchitectureDiagramModel['edges'],
  nodeSet: ReadonlySet<string>
): { adjacency: AdjacencyMap; reverseAdjacency: AdjacencyMap } {
  const adjacency: AdjacencyMap = new Map();
  const reverseAdjacency: AdjacencyMap = new Map();

  for (const id of nodeIds) {
    adjacency.set(id, []);
    reverseAdjacency.set(id, []);
  }

  // Build initial adjacency
  const tempAdj: AdjacencyMap = new Map();
  for (const id of nodeIds) {
    tempAdj.set(id, []);
  }
  for (const edge of edges) {
    if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    tempAdj.get(edge.source)!.push(edge.target);
  }

  const reversedEdges = breakCycles(nodeIds, tempAdj);

  for (const edge of edges) {
    if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    const key = `${edge.source}|${edge.target}`;
    if (reversedEdges.has(key)) {
      // Reverse the edge in the DAG
      adjacency.get(edge.target)!.push(edge.source);
      reverseAdjacency.get(edge.source)!.push(edge.target);
    } else {
      adjacency.get(edge.source)!.push(edge.target);
      reverseAdjacency.get(edge.target)!.push(edge.source);
    }
  }

  return { adjacency, reverseAdjacency };
}

/**
 * Longest-path layer assignment.
 * Assigns each node to a layer based on its longest path from a source node.
 */
export function assignLayers(
  model: ArchitectureDiagramModel
): {
  layers: string[][];
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
} {
  const nodeIds = model.nodes.map((n) => n.id);
  const nodeSet = new Set(nodeIds);

  if (nodeIds.length === 0) {
    return { layers: [], adjacency: new Map(), reverseAdjacency: new Map() };
  }

  const { adjacency, reverseAdjacency } = buildDAG(nodeIds, model.edges, nodeSet);

  // Find sources (nodes with no incoming edges in the DAG)
  const sources = nodeIds.filter((id) => {
    const incoming = reverseAdjacency.get(id) ?? [];
    return incoming.length === 0;
  });

  // Longest-path layering via BFS from sources
  const layerOf = new Map<string, number>();

  // Initialize all nodes to layer 0
  for (const id of nodeIds) {
    layerOf.set(id, 0);
  }

  // BFS topological processing
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, (reverseAdjacency.get(id) ?? []).length);
  }

  const queue: string[] = [...sources];
  // If no sources found (all nodes in cycles), pick first node
  if (queue.length === 0 && nodeIds.length > 0) {
    queue.push(nodeIds[0]);
    layerOf.set(nodeIds[0], 0);
  }

  const processed = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (processed.has(current)) continue;
    processed.add(current);

    const currentLayer = layerOf.get(current) ?? 0;
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      const newLayer = currentLayer + 1;
      if (newLayer > (layerOf.get(neighbor) ?? 0)) {
        layerOf.set(neighbor, newLayer);
      }
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg <= 0) {
        queue.push(neighbor);
      }
    }
  }

  // Handle any nodes not yet processed (disconnected)
  for (const id of nodeIds) {
    if (!processed.has(id)) {
      layerOf.set(id, 0);
    }
  }

  // Group nodes into layers
  const maxLayer = Math.max(0, ...Array.from(layerOf.values()));
  const layers: string[][] = [];
  for (let i = 0; i <= maxLayer; i++) {
    layers.push([]);
  }
  for (const id of nodeIds) {
    const layer = layerOf.get(id) ?? 0;
    layers[layer].push(id);
  }

  // Remove empty trailing layers
  while (layers.length > 0 && layers[layers.length - 1].length === 0) {
    layers.pop();
  }

  return { layers, adjacency, reverseAdjacency };
}
