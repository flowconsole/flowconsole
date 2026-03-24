import type {
  ArchitectureDiagramModel,
  ArchitectureEdge,
  ArchitectureNode,
  ContainerNodeData,
} from '../../types';
import type { LayoutDirection, LayoutViewState } from '../types';

export type LayoutViewStateBuildOptions = {
  scopeId?: string;
  notation?: string;
  preset?: string;
  direction?: LayoutDirection;
};

export type ScopeAwareTarget = {
  scopeId?: string;
  focusId: string;
  representativeId?: string;
};

type DiagramIndex = {
  byId: Map<string, ArchitectureNode>;
  childrenByParent: Map<string, ArchitectureNode[]>;
};

const DEFAULT_DIRECTION: LayoutDirection = 'LR';
const DEFAULT_NOTATION = 'architecture';
const DEFAULT_PRESET = 'c4-like';

function buildIndex(model: ArchitectureDiagramModel): DiagramIndex {
  const byId = new Map<string, ArchitectureNode>();
  const childrenByParent = new Map<string, ArchitectureNode[]>();

  model.nodes.forEach((node) => {
    byId.set(node.id, node);
    if (!node.parentId) {
      return;
    }

    const bucket = childrenByParent.get(node.parentId) ?? [];
    bucket.push(node);
    childrenByParent.set(node.parentId, bucket);
  });

  return { byId, childrenByParent };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${key}:${stableStringify(nested)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function isDescendant(nodeId: string, ancestorId: string, byId: Map<string, ArchitectureNode>) {
  let current = byId.get(nodeId);

  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = byId.get(current.parentId);
  }

  return false;
}

function findClosestContainerAncestor(nodeId: string, byId: Map<string, ArchitectureNode>) {
  let current = byId.get(nodeId);

  while (current?.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) {
      break;
    }
    if (parent.type === 'container') {
      return parent.id;
    }
    current = parent;
  }

  return undefined;
}

function resolveRepresentativeNodeId(
  nodeId: string,
  scopeId: string | undefined,
  byId: Map<string, ArchitectureNode>,
  cache: Map<string, string | undefined>
) {
  if (cache.has(nodeId)) {
    return cache.get(nodeId);
  }

  const node = byId.get(nodeId);
  if (!node) {
    cache.set(nodeId, undefined);
    return undefined;
  }

  if (scopeId && nodeId === scopeId) {
    cache.set(nodeId, nodeId);
    return nodeId;
  }

  if (!scopeId) {
    let current = node;
    while (current.parentId && byId.has(current.parentId)) {
      current = byId.get(current.parentId)!;
    }
    cache.set(nodeId, current.id);
    return current.id;
  }

  if (isDescendant(nodeId, scopeId, byId)) {
    let current = node;
    while (current.parentId && current.parentId !== scopeId) {
      const parent = byId.get(current.parentId);
      if (!parent) {
        break;
      }
      current = parent;
    }
    cache.set(nodeId, current.id);
    return current.id;
  }

  const scopeParent = byId.get(scopeId)?.parentId;
  if (scopeParent) {
    let current = node;
    while (current.parentId && current.parentId !== scopeParent) {
      const parent = byId.get(current.parentId);
      if (!parent) {
        break;
      }
      current = parent;
    }
    if (current.parentId === scopeParent) {
      cache.set(nodeId, current.id);
      return current.id;
    }
  }

  let current = node;
  while (current.parentId && byId.has(current.parentId)) {
    current = byId.get(current.parentId)!;
  }
  cache.set(nodeId, current.id);
  return current.id;
}

function normalizeParentIds(nodes: ArchitectureNode[], visibleNodeIds: ReadonlySet<string>) {
  return nodes.map((node) => {
    if (!node.parentId || visibleNodeIds.has(node.parentId)) {
      return node;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { parentId: _parentId, extent: _extent, expandParent: _expandParent, ...rest } = node;
    return rest as ArchitectureNode;
  });
}

function buildChildCounts(model: ArchitectureDiagramModel) {
  const counts = new Map<string, number>();
  model.nodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }
    counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
  });
  return counts;
}

function cloneFlows(model: ArchitectureDiagramModel) {
  return model.flows?.map((flow) => ({
    ...flow,
    steps: flow.steps.map((step) => ({ ...step })),
  }));
}

function buildScopeTrailFromIndex(byId: Map<string, ArchitectureNode>, scopeId?: string) {
  if (!scopeId) {
    return [];
  }

  const trail: ArchitectureNode[] = [];
  let current = byId.get(scopeId);

  while (current) {
    trail.unshift(current);
    if (!current.parentId) {
      break;
    }
    current = byId.get(current.parentId);
  }

  return trail;
}

export function hashDiagramModel(model: ArchitectureDiagramModel) {
  return stableStringify({
    nodes: model.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      parentId: node.parentId,
      data: node.data,
    })),
    edges: model.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data,
    })),
    flows: model.flows ?? [],
  });
}

export function buildLayoutViewState(
  model: ArchitectureDiagramModel,
  options: LayoutViewStateBuildOptions = {}
): LayoutViewState {
  const { byId } = buildIndex(model);
  const representativeCache = new Map<string, string | undefined>();
  const visibleNodeIds = new Set<string>();
  const representativeNodeIds = new Map<string, string>();

  model.nodes.forEach((node) => {
    const representativeId = resolveRepresentativeNodeId(node.id, options.scopeId, byId, representativeCache);
    if (!representativeId) {
      return;
    }
    visibleNodeIds.add(representativeId);
    representativeNodeIds.set(node.id, representativeId);
  });

  if (options.scopeId && byId.has(options.scopeId)) {
    visibleNodeIds.add(options.scopeId);
    representativeNodeIds.set(options.scopeId, options.scopeId);
  }

  const aggregatedEdgeGroups = new Map<string, readonly string[]>();
  const mutableEdgeGroups = new Map<string, string[]>();

  model.edges.forEach((edge) => {
    const sourceId =
      representativeNodeIds.get(edge.source) ??
      resolveRepresentativeNodeId(edge.source, options.scopeId, byId, representativeCache);
    const targetId =
      representativeNodeIds.get(edge.target) ??
      resolveRepresentativeNodeId(edge.target, options.scopeId, byId, representativeCache);

    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    const edgeGroupKey = `${sourceId}|${targetId}|${edge.data?.kind ?? ''}`;
    const bucket = mutableEdgeGroups.get(edgeGroupKey) ?? [];
    bucket.push(edge.id);
    mutableEdgeGroups.set(edgeGroupKey, bucket);
  });

  mutableEdgeGroups.forEach((edgeIds, edgeGroupKey) => {
    aggregatedEdgeGroups.set(edgeGroupKey, edgeIds);
  });

  const direction = options.direction ?? DEFAULT_DIRECTION;
  const notation = options.notation ?? DEFAULT_NOTATION;
  const preset = options.preset ?? DEFAULT_PRESET;

  return {
    scopeId: options.scopeId,
    visibleNodeIds,
    representativeNodeIds,
    aggregatedEdgeGroups,
    notation,
    preset,
    direction,
    cacheKey: stableStringify({
      scopeId: options.scopeId,
      modelHash: hashDiagramModel(model),
      direction,
      notation,
      preset,
    }),
  };
}

export function buildScopedModelFromViewState(
  model: ArchitectureDiagramModel,
  viewState: LayoutViewState
): ArchitectureDiagramModel {
  const { byId } = buildIndex(model);
  const childCounts = buildChildCounts(model);
  const expandedIds = new Set(buildScopeTrailFromIndex(byId, viewState.scopeId).map((node) => node.id));

  const nodes = Array.from(viewState.visibleNodeIds)
    .map((nodeId) => byId.get(nodeId))
    .filter((node): node is ArchitectureNode => Boolean(node))
    .map((node) => {
      if (node.type !== 'container') {
        return { ...node };
      }

      const data: ContainerNodeData = {
        ...node.data,
        childCount: childCounts.get(node.id) ?? 0,
        expanded: viewState.scopeId ? expandedIds.has(node.id) : false,
        showOpenButton: viewState.scopeId ? node.id !== viewState.scopeId : true,
      };

      return { ...node, data };
    });

  const edges: ArchitectureEdge[] = [];
  viewState.aggregatedEdgeGroups.forEach((originalEdgeIds, edgeGroupKey) => {
    const baseEdge = model.edges.find((edge) => edge.id === originalEdgeIds[0]);
    if (!baseEdge) {
      return;
    }

    const [source, target] = edgeGroupKey.split('|');
    const isAggregate = originalEdgeIds.length > 1;
    const detail = isAggregate
      ? [baseEdge.data?.detail, `${originalEdgeIds.length} links`].filter(Boolean).join(' · ')
      : baseEdge.data?.detail;

    edges.push({
      ...baseEdge,
      id: isAggregate ? `agg:${edgeGroupKey}` : baseEdge.id,
      source,
      target,
      data: {
        ...(baseEdge.data ?? {}),
        detail,
        originalEdgeIds: [...originalEdgeIds],
      },
    });
  });

  return {
    nodes: normalizeParentIds(nodes, viewState.visibleNodeIds),
    edges,
    flows: cloneFlows(model),
  };
}

export function buildScopedModel(
  model: ArchitectureDiagramModel,
  scopeId?: string,
  options: Omit<LayoutViewStateBuildOptions, 'scopeId'> = {}
) {
  return buildScopedModelFromViewState(
    model,
    buildLayoutViewState(model, {
      scopeId,
      ...options,
    })
  );
}

export function resolveVisibleNodeId(viewState: LayoutViewState, nodeId: string | undefined) {
  if (!nodeId) {
    return undefined;
  }
  if (viewState.visibleNodeIds.has(nodeId)) {
    return nodeId;
  }
  return viewState.representativeNodeIds.get(nodeId);
}

export function resolveScopeAwareTarget(
  model: ArchitectureDiagramModel,
  viewState: LayoutViewState,
  nodeId: string
): ScopeAwareTarget | undefined {
  const { byId } = buildIndex(model);
  const targetNode = byId.get(nodeId);
  if (!targetNode) {
    return undefined;
  }

  if (viewState.visibleNodeIds.has(nodeId)) {
    return { scopeId: viewState.scopeId, focusId: nodeId, representativeId: nodeId };
  }

  if (targetNode.type === 'container') {
    return { scopeId: targetNode.id, focusId: targetNode.id, representativeId: nodeId };
  }

  const closestContainerId = findClosestContainerAncestor(nodeId, byId);
  if (closestContainerId && closestContainerId !== viewState.scopeId) {
    return { scopeId: closestContainerId, focusId: nodeId, representativeId: closestContainerId };
  }

  const representativeId = resolveVisibleNodeId(viewState, nodeId);
  if (representativeId) {
    return { scopeId: viewState.scopeId, focusId: representativeId, representativeId };
  }

  return { scopeId: undefined, focusId: nodeId };
}

export function scopeTrail(model: ArchitectureDiagramModel, scopeId?: string) {
  const { byId } = buildIndex(model);
  return buildScopeTrailFromIndex(byId, scopeId);
}
