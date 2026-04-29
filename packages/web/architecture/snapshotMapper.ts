import type {
  ArchitectureDiagramModel,
  ArchitectureEdge,
  ArchitectureNode,
  ElementTone,
  FlowDefinition,
  RelationshipKind,
} from '../diagram/types';

import type { ModelSnapshotWire, SnapshotRelationship } from './snapshotTypes';

const SOURCE_TONE: Record<string, ElementTone> = {
  Git: 'primary',
  CodeScan: 'success',
  InfraScan: 'warning',
  Import: 'muted',
  Observability: 'danger',
};

function mapKindToNodeType(kind: string): string {
  switch (kind) {
    case 'Database':
    case 'Cache':
      return 'database';
    case 'Queue':
    case 'Topic':
    case 'Broker':
      return 'queue';
    case 'External':
      return 'cloud';
    case 'Gateway':
    case 'Ingress':
      return 'hexagon';
    case 'User':
      return 'person';
    default:
      return 'element';
  }
}

function mapKindToIcon(kind: string): string | undefined {
  switch (kind) {
    case 'Database':
      return 'database';
    case 'Cache':
      return 'cache';
    case 'Queue':
    case 'Broker':
      return 'queue';
    case 'Topic':
      return 'topic';
    case 'External':
      return 'cloud';
    case 'Gateway':
    case 'Ingress':
      return 'gateway';
    case 'Worker':
    case 'Producer':
    case 'Consumer':
      return 'worker';
    case 'User':
      return 'user';
    case 'Application':
    case 'Endpoint':
    case 'Function':
      return 'api';
    case 'Service':
    case 'Module':
    case 'Namespace':
      return 'system';
    default:
      return undefined;
  }
}

function mapRoleHint(kind: string): string | undefined {
  switch (kind) {
    case 'Gateway':
      return 'gateway';
    case 'Queue':
      return 'queue';
    case 'Database':
    case 'Cache':
      return 'store';
    case 'Worker':
      return 'worker';
    case 'External':
      return 'entry';
    default:
      return undefined;
  }
}

function mapRelationshipKind(kind: string): RelationshipKind {
  switch (kind) {
    case 'Produces':
    case 'Consumes':
      return 'event';
    case 'DependsOn':
    case 'Imports':
      return 'dependency';
    case 'Calls':
    case 'Uses':
      return 'sync';
    default:
      return 'sync';
  }
}

/**
 * Maps a ModelSnapshot wire-format object to an ArchitectureDiagramModel
 * for rendering by {@link ArchitectureDiagram}.
 *
 * Works directly with the snapshot's `sourceId`/`targetId` fields
 * (no intermediate view-model conversion).
 */
function mapFlows(
  snapshot: ModelSnapshotWire,
  relIndex: Map<string, SnapshotRelationship>,
): FlowDefinition[] | undefined {
  if (!snapshot.flows?.length) return undefined;
  return snapshot.flows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    steps: flow.steps.map((step, idx) => {
      if (step.relationshipId != null) {
        const rel = relIndex.get(step.relationshipId);
        return {
          id: `${flow.id}-step-${idx}`,
          edgeId: step.relationshipId,
          sourceId: step.sourceElementId,
          targetId: rel?.targetId ?? step.sourceElementId,
          label: step.label,
        };
      }
      return {
        id: `${flow.id}-step-${idx}`,
        edgeId: `${flow.id}-action-${idx}`,
        sourceId: step.sourceElementId,
        targetId: step.sourceElementId,
        label: step.label,
      };
    }),
  }));
}

export function mapSnapshotToDiagram(snapshot: ModelSnapshotWire): ArchitectureDiagramModel {
  const { elements, relationships } = snapshot;
  const parentIds = new Set(elements.map((el) => el.parentId).filter(Boolean));

  const nodes: ArchitectureNode[] = elements.map((el) => {
    const isContainer = parentIds.has(el.id);
    const nodeType = isContainer ? 'container' : mapKindToNodeType(el.kind);
    const elSource = el.source ?? snapshot.source;

    return {
      id: el.id,
      type: nodeType,
      position: { x: 0, y: 0 },
      parentId: el.parentId ?? undefined,
      data: {
        title: el.name,
        subtitle: el.kind,
        description: el.description ?? undefined,
        tags: el.tags,
        tone: SOURCE_TONE[elSource] ?? ('muted' as ElementTone),
        icon: isContainer ? undefined : mapKindToIcon(el.kind),
        technology: el.technology ?? undefined,
        roleHint: mapRoleHint(el.kind),
        metadata: {
          technology: el.technology ?? undefined,
          source: elSource,
          kind: el.kind,
        },
        properties: el.properties,
      },
    } as ArchitectureNode;
  });

  const edges: ArchitectureEdge[] = relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceId,
    target: rel.targetId,
    type: 'relationship',
    data: {
      label: rel.label ?? rel.kind,
      kind: mapRelationshipKind(rel.kind),
      metadata: {
        technology: rel.technology ?? undefined,
        source: rel.source ?? snapshot.source,
        kind: rel.kind,
      },
      properties: rel.properties,
    },
  }));

  const relIndex = new Map(relationships.map((r) => [r.id, r]));
  const flows = mapFlows(snapshot, relIndex);

  return { nodes, edges, flows };
}
