import Graph from 'graphology';
import { connectedComponents } from 'graphology-components';
import { hasCycle, topologicalSort } from 'graphology-dag';

import type { ArchitectureDiagramModel } from '../types';
import type { SubgraphPattern } from './types';

function buildSubgraph(
  childIds: ReadonlySet<string>,
  edges: ArchitectureDiagramModel['edges']
): Graph {
  const sub = new Graph({ type: 'directed', multi: true, allowSelfLoops: true });

  for (const id of childIds) {
    sub.addNode(id);
  }

  for (const edge of edges) {
    if (childIds.has(edge.source) && childIds.has(edge.target)) {
      sub.addEdge(edge.source, edge.target);
    }
  }

  return sub;
}

function isChain(sub: Graph): boolean {
  if (sub.order < 2) {
    return true;
  }

  if (hasCycle(sub)) {
    return false;
  }

  const sorted = topologicalSort(sub);
  let longestPath = 1;
  const dist = new Map<string, number>();

  for (const nodeId of sorted) {
    dist.set(nodeId, 1);
  }

  for (const nodeId of sorted) {
    const currentDist = dist.get(nodeId) ?? 1;
    for (const neighbor of sub.outNeighbors(nodeId)) {
      const neighborDist = dist.get(neighbor) ?? 1;
      if (currentDist + 1 > neighborDist) {
        dist.set(neighbor, currentDist + 1);
        longestPath = Math.max(longestPath, currentDist + 1);
      }
    }
  }

  return longestPath / sub.order > 0.7;
}

function isStar(sub: Graph): boolean {
  if (sub.order < 4) {
    return false;
  }

  const degrees: number[] = [];
  sub.forEachNode((nodeId) => {
    degrees.push(sub.inDegree(nodeId) + sub.outDegree(nodeId));
  });

  degrees.sort((a, b) => b - a);
  const maxDegree = degrees[0];
  const secondMaxDegree = degrees[1] ?? 0;

  return maxDegree >= sub.order - 2 && maxDegree > secondMaxDegree * 2;
}

function isTree(sub: Graph): boolean {
  if (sub.order < 2) {
    return false;
  }

  const components = connectedComponents(sub);
  if (components.length !== 1) {
    return false;
  }

  if (hasCycle(sub)) {
    return false;
  }

  let rootCount = 0;
  sub.forEachNode((nodeId) => {
    if (sub.inDegree(nodeId) === 0) {
      rootCount += 1;
    }
  });

  return rootCount === 1;
}

function isBipartite(sub: Graph): boolean {
  if (sub.order < 3) {
    return false;
  }

  const color = new Map<string, 0 | 1>();
  const queue: string[] = [];

  const startNode = sub.nodes()[0];
  color.set(startNode, 0);
  queue.push(startNode);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentColor = color.get(current)!;
    const nextColor: 0 | 1 = currentColor === 0 ? 1 : 0;

    for (const neighbor of sub.neighbors(current)) {
      if (!color.has(neighbor)) {
        color.set(neighbor, nextColor);
        queue.push(neighbor);
      } else if (color.get(neighbor) === currentColor) {
        return false;
      }
    }
  }

  if (color.size !== sub.order) {
    return false;
  }

  let crossEdges = 0;
  sub.forEachEdge((_edge, _attrs, source, target) => {
    if (color.get(source) !== color.get(target)) {
      crossEdges += 1;
    }
  });

  return crossEdges / sub.size > 0.7;
}

function isDense(sub: Graph): boolean {
  if (sub.order === 0) {
    return false;
  }

  return sub.size / sub.order > 2.0;
}

function classifySubgraph(sub: Graph): SubgraphPattern {
  if (sub.order <= 1) {
    return 'sparse';
  }

  if (isChain(sub)) {
    return 'chain';
  }

  if (isStar(sub)) {
    return 'star';
  }

  if (isTree(sub)) {
    return 'tree';
  }

  if (isBipartite(sub)) {
    return 'bipartite';
  }

  if (isDense(sub)) {
    return 'dense';
  }

  return 'sparse';
}

export function detectPatterns(
  model: ArchitectureDiagramModel,
  childrenByParent: ReadonlyMap<string, readonly string[]>
): ReadonlyMap<string, SubgraphPattern> {
  const result = new Map<string, SubgraphPattern>();

  for (const [containerId, children] of childrenByParent) {
    const childSet = new Set(children);
    const sub = buildSubgraph(childSet, model.edges);
    result.set(containerId, classifySubgraph(sub));
  }

  return result;
}
