import type { ElementShape, ElementTone, ArchitectureDiagramModel, ArchitectureNode, ArchitectureEdge, FlowDefinition } from '../../diagram/types';
import type { ConnectionRecord, DeploymentRecord, DiagramIntermediateModel, EntityRecord, EntityTypeName, ShapeKind } from './diagramRuntime';

type NodeRenderConfig = {
  nodeType: 'element' | 'container';
  shape?: ElementShape;
  tone?: ElementTone;
  icon?: string;
};

/** Container-like types render as containers (grouping nodes). */
const CONTAINER_TYPES = new Set<EntityTypeName>(['SoftwareSystem', 'Namespace']);

/** Map ShapeKind from runtime style to ElementShape used in rendering. */
const SHAPE_MAP: Record<ShapeKind, ElementShape | undefined> = {
  rectangle: 'service',
  circle: 'service',
  hexagon: 'service',
  cylinder: 'database',
  pipe: 'queue',
  person: 'person',
  cloud: 'service',
};

function resolveRenderConfig(entity: EntityRecord): NodeRenderConfig {
  if (CONTAINER_TYPES.has(entity.type)) {
    return { nodeType: 'container' };
  }

  const style = entity.style;
  const shape: ElementShape = style?.shape ? (SHAPE_MAP[style.shape] ?? 'service') : 'service';
  const icon = style?.icon;

  return { nodeType: 'element', shape, icon };
}

export function buildReactFlowModel(intermediate: DiagramIntermediateModel): ArchitectureDiagramModel {
  const nodes: ArchitectureNode[] = intermediate.entities.map((entity) => buildNode(entity));
  const sortedNodes = nodes.sort((a, b) => {
    if (a.type === b.type) return 0;
    if (a.type === 'container') return -1;
    if (b.type === 'container') return 1;
    return 0;
  });

  const edges: ArchitectureEdge[] = intermediate.relationships.map((rel) => buildEdge(rel));

  // Append deployment edges so they are rendered in diagrams
  const deploymentEdges: ArchitectureEdge[] = (intermediate.deployments ?? []).map((dep: DeploymentRecord) => ({
    id: dep.id,
    type: 'relationship' as const,
    source: dep.sourceId,
    target: dep.targetId,
    data: { label: dep.relationKind, kind: 'sync' as const },
  }));
  edges.push(...deploymentEdges);

  const flows: FlowDefinition[] = (intermediate.flows ?? []).map((flow, idx) => ({
    id: flow.id,
    name: flow.name || `Flow ${idx + 1}`,
    steps: flow.steps.map((s) => ({
      id: s.id,
      edgeId: s.edgeId,
      sourceId: s.sourceId,
      targetId: s.targetId,
      label: s.label,
    })),
  }));

  return { nodes: sortedNodes, edges, flows };
}

function buildNode(entity: EntityRecord): ArchitectureNode {
  const renderConfig = resolveRenderConfig(entity);
  const base = {
    id: entity.id,
    position: { x: 0, y: 0 },
    parentId: entity.parentId,
  } as const;

  if (renderConfig.nodeType === 'container') {
    return {
      ...base,
      type: 'container',
      data: {
        title: entity.name,
        description: entity.description,
        tags: entity.tags,
        badge: entity.badge,
        tone: (entity.tone as ElementTone | undefined),
        expanded: true,
      },
    } as ArchitectureNode;
  }

  const metadata = entity.metadata;
  const subtitle =
    pickString(metadata, 'technology') ??
    pickString(metadata, 'framework') ??
    pickString(metadata, 'vendor') ??
    pickString(metadata, 'schedule') ??
    pickString(metadata, 'engine') ??
    undefined;

  return {
    ...base,
    type: 'element',
    data: {
      title: entity.name,
      subtitle,
      description: entity.description,
      tags: entity.tags,
      badge: entity.badge,
      tone: (entity.tone as ElementTone | undefined) ?? renderConfig.tone,
      shape: renderConfig.shape,
      icon: renderConfig.icon,
    },
  } as ArchitectureNode;
}

function buildEdge(rel: ConnectionRecord): ArchitectureEdge {
  return {
    id: rel.id,
    type: 'relationship',
    source: rel.sourceId,
    target: rel.targetId,
    data: {
      label: rel.label,
      detail: rel.detail,
      kind: rel.kind,
      icon: rel.icon,
      muted: rel.muted,
    },
  };
}

function pickString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value : undefined;
}
