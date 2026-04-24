import type {
  ArchitectureDiagramModel,
  ArchitectureEdge,
  ArchitectureNode,
  ElementTone,
} from "@flowconsole/web";

import type { Element, Relationship } from "@/lib/api/view-models";

const SOURCE_TONE: Record<string, ElementTone> = {
  Git: "primary",
  CodeScan: "success",
  InfraScan: "warning",
  Import: "muted",
  Observability: "danger",
};

/**
 * Map backend ElementKind → ReactFlow node type (matches SDK/runtime
 * `TYPE_SHAPE_OVERRIDE` + `DEFAULT_SHAPE` semantics).
 */
function mapKindToNodeType(kind: string): string {
  switch (kind) {
    case "Database":
    case "Cache":
      return "database";
    case "Queue":
    case "Topic":
    case "Broker":
      return "queue";
    case "External":
      return "cloud";
    case "Gateway":
    case "Ingress":
      return "hexagon";
    case "User":
      return "person";
    default:
      return "element";
  }
}

/** Map backend ElementKind → icon identifier consumed by BaseElementNode. */
function mapKindToIcon(kind: string): string | undefined {
  switch (kind) {
    case "Database":
      return "database";
    case "Cache":
      return "cache";
    case "Queue":
    case "Broker":
      return "queue";
    case "Topic":
      return "topic";
    case "External":
      return "cloud";
    case "Gateway":
    case "Ingress":
      return "gateway";
    case "Worker":
    case "Producer":
    case "Consumer":
      return "worker";
    case "User":
      return "user";
    case "Application":
    case "Endpoint":
    case "Function":
      return "api";
    case "Service":
    case "Module":
    case "Namespace":
      return "system";
    default:
      return undefined;
  }
}

function mapRoleHint(kind: string) {
  switch (kind) {
    case "Gateway":
      return "gateway";
    case "Queue":
      return "queue";
    case "Database":
    case "Cache":
      return "store";
    case "Worker":
      return "worker";
    case "External":
      return "entry";
    default:
      return undefined;
  }
}

function mapRelationshipKind(kind: string) {
  switch (kind) {
    case "Produces":
    case "Consumes":
      return "event";
    case "DependsOn":
    case "Imports":
      return "dependency";
    case "Calls":
    case "Uses":
      return "sync";
    default:
      return "sync";
  }
}

/**
 * Maps API Element + Relationship lists to an ArchitectureDiagramModel
 * consumed by @flowconsole/web's ArchitectureDiagram component.
 *
 * Element → ArchitectureNode (positions are zeroed; auto-layout handles placement).
 * Relationship → ArchitectureEdge.
 */
export function mapApiTodiagramModel(
  elements: Element[],
  relationships: Relationship[],
): ArchitectureDiagramModel {
  const parentIds = new Set(elements.map((el) => el.parentId).filter(Boolean));

  const nodes: ArchitectureNode[] = elements.map((el) => {
    const isContainer = parentIds.has(el.id);
    // Shape-aware node type: Database→database, Queue/Topic/Broker→queue,
    // External→cloud, Gateway/Ingress→hexagon, User→person, else→element.
    const nodeType = isContainer ? "container" : mapKindToNodeType(el.kind);
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
        tone: SOURCE_TONE[el.source] ?? ("muted" as ElementTone),
        icon: isContainer ? undefined : mapKindToIcon(el.kind),
        technology: el.technology ?? undefined,
        roleHint: mapRoleHint(el.kind),
        metadata: {
          technology: el.technology ?? undefined,
          source: el.source,
          kind: el.kind,
        },
        properties: el.properties,
      },
    } as ArchitectureNode;
  });

  const edges: ArchitectureEdge[] = relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceElementId,
    target: rel.targetElementId,
    type: "relationship",
    data: {
      label: rel.label ?? rel.kind,
      kind: mapRelationshipKind(rel.kind),
      metadata: {
        technology: rel.technology ?? undefined,
        source: rel.source,
        kind: rel.kind,
      },
      properties: rel.properties,
    },
  }));

  return { nodes, edges };
}
