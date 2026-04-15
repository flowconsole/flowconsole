import type { ElementTone, StylePreset, ElementNodeTypeName, ArchitectureDiagramModel, ArchitectureNode, ArchitectureEdge, FlowDefinition } from '../../diagram/types';
import type { ConnectionRecord, DeploymentRecord, DiagramIntermediateModel, EntityRecord, EntityTypeName, ShapeKind } from './diagramRuntime';

type NodeRenderConfig = {
  nodeType: ElementNodeTypeName | 'container';
  tone?: ElementTone;
  icon?: string;
  customColor?: string;
  customBackgroundColor?: string;
  customBorderColor?: string;
  preset?: StylePreset;
};

/** Container-like types render as containers (grouping nodes). */
const CONTAINER_TYPES = new Set<EntityTypeName>(['SoftwareSystem', 'Namespace']);

/** Map ShapeKind from runtime style to ReactFlow nodeType name. */
const SHAPE_MAP: Record<ShapeKind, ElementNodeTypeName> = {
  rectangle: 'element',
  circle: 'circle',
  hexagon: 'hexagon',
  cylinder: 'database',
  pipe: 'queue',
  person: 'person',
  cloud: 'cloud',
};

function resolveRenderConfig(entity: EntityRecord): NodeRenderConfig {
  const style = entity.style;

  if (CONTAINER_TYPES.has(entity.type)) {
    return {
      nodeType: 'container',
      customColor: style?.color,
      customBackgroundColor: style?.backgroundColor,
      customBorderColor: style?.borderColor,
      preset: style?.preset as StylePreset | undefined,
    };
  }

  const nodeType: ElementNodeTypeName = style?.shape ? (SHAPE_MAP[style.shape] ?? 'element') : 'element';
  const icon = style?.icon;

  return {
    nodeType,
    icon,
    customColor: style?.color,
    customBackgroundColor: style?.backgroundColor,
    customBorderColor: style?.borderColor,
    preset: style?.preset as StylePreset | undefined,
  };
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
        ...(renderConfig.customColor ? { customColor: renderConfig.customColor } : {}),
        ...(renderConfig.customBackgroundColor ? { customBackgroundColor: renderConfig.customBackgroundColor } : {}),
        ...(renderConfig.customBorderColor ? { customBorderColor: renderConfig.customBorderColor } : {}),
        ...(renderConfig.preset && renderConfig.preset !== 'default' ? { preset: renderConfig.preset } : {}),
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
    type: renderConfig.nodeType,
    data: {
      title: entity.name,
      subtitle,
      description: entity.description,
      tags: entity.tags,
      badge: entity.badge,
      tone: (entity.tone as ElementTone | undefined) ?? renderConfig.tone,
      icon: renderConfig.icon,
      ...(renderConfig.customColor ? { customColor: renderConfig.customColor } : {}),
      ...(renderConfig.customBackgroundColor ? { customBackgroundColor: renderConfig.customBackgroundColor } : {}),
      ...(renderConfig.customBorderColor ? { customBorderColor: renderConfig.customBorderColor } : {}),
      ...(renderConfig.preset && renderConfig.preset !== 'default' ? { preset: renderConfig.preset } : {}),
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
