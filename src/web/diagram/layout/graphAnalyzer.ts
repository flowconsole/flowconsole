import Graph from 'graphology';
import { connectedComponents, stronglyConnectedComponents } from 'graphology-components';

import type { ArchitectureDiagramModel } from '../types';
import { detectPatterns } from './patternDetector';
import type { GraphProfile, NodeRole, SemanticNode } from './types';

type DegreeMaps = {
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
};

type GraphIndex = {
  nodesById: Map<string, SemanticNode>;
  childrenByParent: Map<string, string[]>;
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
};

function toSemanticNode(
  node: ArchitectureDiagramModel['nodes'][number]
): SemanticNode {
  return node as SemanticNode;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function nodeHints(node: SemanticNode) {
  const data = node.data ?? {};
  return collectStrings([
    node.id,
    node.type,
    data.title,
    data.subtitle,
    data.description,
    data.badge,
    data.shape,
    data.notationShape,
    data.technology,
    data.roleHint,
    data.tags ?? [],
    data.metadata ?? {},
    data.properties ?? {},
  ])
    .join(' ')
    .toLowerCase();
}

const GATEWAY_TECH_RE = /gateway|nginx|envoy|haproxy|kong|traefik|balancer/i;
const WORKER_TECH_RE = /worker|scheduler|cron|job|celery|sidekiq/i;
const FRONTEND_TECH_RE = /react|angular|vue|spa|webapp|mobile|ios|android|flutter/i;

function technologyOf(node: SemanticNode): string {
  return (node.data.technology ?? '').toLowerCase();
}

function isGatewayByTechnology(node: SemanticNode) {
  return GATEWAY_TECH_RE.test(technologyOf(node));
}

function isWorkerByTechnology(node: SemanticNode) {
  return WORKER_TECH_RE.test(technologyOf(node));
}

function isFrontendByTechnology(node: SemanticNode) {
  return FRONTEND_TECH_RE.test(technologyOf(node));
}

function isGateway(node: SemanticNode, hints: string) {
  return (
    node.data.shape === 'gateway' ||
    isGatewayByTechnology(node) ||
    hints.includes('gateway') ||
    hints.includes('api gateway') ||
    hints.includes('bff') ||
    hints.includes('ingress') ||
    hints.includes('proxy')
  );
}

function isWorker(node: SemanticNode, hints: string) {
  return (
    isWorkerByTechnology(node) ||
    hints.includes('worker') ||
    hints.includes('background') ||
    hints.includes('scheduler') ||
    hints.includes('cron') ||
    hints.includes('job') ||
    hints.includes('runner')
  );
}

function isFrontend(node: SemanticNode, hints: string) {
  return (
    isFrontendByTechnology(node) ||
    hints.includes(' ui') ||
    hints.startsWith('ui ') ||
    hints.includes('spa') ||
    hints.includes('webapp') ||
    hints.includes('frontend') ||
    hints.includes('dashboard') ||
    hints.includes('portal')
  );
}

function hasWeakOwnership(node: SemanticNode, hints: string) {
  return (
    node.data.weakOwnership === true ||
    hints.includes('external') ||
    hints.includes('third-party') ||
    hints.includes('vendor')
  );
}

function buildIndex(model: ArchitectureDiagramModel): GraphIndex {
  const nodesById = new Map<string, SemanticNode>();
  const childrenByParent = new Map<string, string[]>();
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  for (const node of model.nodes) {
    const semanticNode = toSemanticNode(node);
    nodesById.set(node.id, semanticNode);
    adjacency.set(node.id, []);
    reverseAdjacency.set(node.id, []);
    if (!node.parentId) {
      continue;
    }
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parentId, children);
  }

  for (const edge of model.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    reverseAdjacency.get(edge.target)?.push(edge.source);
  }

  return { nodesById, childrenByParent, adjacency, reverseAdjacency };
}

function buildDegrees(model: ArchitectureDiagramModel): DegreeMaps {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  for (const node of model.nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  for (const edge of model.edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  return { inDegree, outDegree };
}

export function classifyNodeRole(
  node: SemanticNode,
  inDegree: number,
  outDegree: number
): NodeRole {
  const hints = nodeHints(node);

  if (node.data.shape === 'person' || hints.includes('person')) {
    return 'entry';
  }

  if (node.data.shape === 'database' || node.data.shape === 'storage') {
    return 'store';
  }

  if (node.data.shape === 'queue' || hints.includes('queue')) {
    return 'queue';
  }

  if (isGateway(node, hints)) {
    return 'gateway';
  }

  if (isWorker(node, hints)) {
    return 'worker';
  }

  if (node.data.tone === 'muted' && !node.parentId && hasWeakOwnership(node, hints)) {
    return 'external';
  }

  if (inDegree === 0) {
    return 'entry';
  }

  if (outDegree === 0) {
    return 'store';
  }

  if (isFrontend(node, hints)) {
    return 'frontend';
  }

  return 'processor';
}

function computeMaxNestingDepth(nodesById: Map<string, SemanticNode>) {
  const depthCache = new Map<string, number>();

  const depthOf = (nodeId: string): number => {
    if (depthCache.has(nodeId)) {
      return depthCache.get(nodeId) ?? 0;
    }
    const node = nodesById.get(nodeId);
    if (!node?.parentId) {
      depthCache.set(nodeId, 0);
      return 0;
    }
    const depth = depthOf(node.parentId) + 1;
    depthCache.set(nodeId, depth);
    return depth;
  };

  let maxDepth = 0;
  for (const nodeId of nodesById.keys()) {
    maxDepth = Math.max(maxDepth, depthOf(nodeId));
  }

  return maxDepth;
}

function buildGraphologyGraph(model: ArchitectureDiagramModel): Graph {
  const graph = new Graph({ type: 'directed', allowSelfLoops: true });

  for (const node of model.nodes) {
    graph.addNode(node.id);
  }

  for (const edge of model.edges) {
    graph.addEdge(edge.source, edge.target);
  }

  return graph;
}

function computeDisconnectedComponents(graph: Graph): Set<string>[] {
  return connectedComponents(graph)
    .map((component) => new Set(component))
    .sort((a, b) => a.size - b.size || [...a][0].localeCompare([...b][0]));
}

function computeClusters(index: GraphIndex) {
  const ids = Array.from(index.nodesById.keys());
  const nodeIndex = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const clusters = new Map<string, ReadonlySet<string>>();
  let currentIndex = 0;

  const strongConnect = (nodeId: string) => {
    nodeIndex.set(nodeId, currentIndex);
    lowLink.set(nodeId, currentIndex);
    currentIndex += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const neighbor of index.adjacency.get(nodeId) ?? []) {
      if (!nodeIndex.has(neighbor)) {
        strongConnect(neighbor);
        lowLink.set(nodeId, Math.min(lowLink.get(nodeId) ?? 0, lowLink.get(neighbor) ?? 0));
      } else if (onStack.has(neighbor)) {
        lowLink.set(nodeId, Math.min(lowLink.get(nodeId) ?? 0, nodeIndex.get(neighbor) ?? 0));
      }
    }

    if (lowLink.get(nodeId) !== nodeIndex.get(nodeId)) {
      return;
    }

    const component = new Set<string>();
    let member: string | undefined;
    do {
      member = stack.pop();
      if (!member) {
        break;
      }
      onStack.delete(member);
      component.add(member);
    } while (member !== nodeId);

    const hasSelfLoop = (index.adjacency.get(nodeId) ?? []).includes(nodeId);
    if (component.size > 1 || hasSelfLoop) {
      const key = Array.from(component).sort()[0] ?? nodeId;
      clusters.set(key, component);
    }
  };

  for (const id of ids) {
    if (!nodeIndex.has(id)) {
      strongConnect(id);
    }
  }

  return clusters;
}

function computeSCC(graph: Graph): ReadonlyArray<ReadonlySet<string>> {
  return stronglyConnectedComponents(graph)
    .filter((component) => component.length > 1)
    .map((component) => new Set(component) as ReadonlySet<string>);
}

export function analyzeGraph(model: ArchitectureDiagramModel): GraphProfile {
  const index = buildIndex(model);
  const graph = buildGraphologyGraph(model);
  const { inDegree, outDegree } = buildDegrees(model);
  const nodeRoles = new Map<string, NodeRole>();

  for (const node of model.nodes) {
    nodeRoles.set(
      node.id,
      classifyNodeRole(
        toSemanticNode(node),
        inDegree.get(node.id) ?? 0,
        outDegree.get(node.id) ?? 0
      )
    );
  }

  const containerChildCounts = new Map<string, number>();
  for (const [parentId, children] of index.childrenByParent.entries()) {
    containerChildCounts.set(parentId, children.length);
  }

  const sources = model.nodes
    .filter((node) => (inDegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort();

  const sinks = model.nodes
    .filter((node) => (outDegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort();

  return {
    nodeCount: model.nodes.length,
    edgeCount: model.edges.length,
    containerCount: model.nodes.filter((node) => node.type === 'container').length,
    maxNestingDepth: computeMaxNestingDepth(index.nodesById),
    edgesPerNode: model.nodes.length === 0 ? 0 : model.edges.length / model.nodes.length,
    hasFlows: (model.flows?.length ?? 0) > 0,
    disconnectedComponents: computeDisconnectedComponents(graph),
    scc: computeSCC(graph),
    nodeRoles,
    clusters: computeClusters(index),
    sourceSinks: { sources, sinks },
    containerChildCounts,
    subgraphPatterns: detectPatterns(model, index.childrenByParent),
    inDegree,
    outDegree,
  };
}
