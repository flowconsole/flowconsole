/**
 * Wire-format types for FlowConsole ModelSnapshot v1.
 * Derived from contracts/model-snapshot/v1/schema.json.
 *
 * Re-generate after schema changes:
 *   pnpm --filter @flowconsole/web generate:snapshot-types
 */

export type ElementKind =
  | 'Class'
  | 'Interface'
  | 'Endpoint'
  | 'Function'
  | 'Producer'
  | 'Consumer'
  | 'Deployment'
  | 'Database'
  | 'Queue'
  | 'Cache'
  | 'Ingress'
  | 'Namespace'
  | 'Broker'
  | 'Topic'
  | 'Service'
  | 'Application'
  | 'Module'
  | 'External'
  | 'Gateway'
  | 'Worker'
  | 'User';

export type RelationKind =
  | 'Contains'
  | 'DeployedOn'
  | 'Uses'
  | 'Calls'
  | 'DependsOn'
  | 'Imports'
  | 'Implements'
  | 'Produces'
  | 'Consumes'
  | 'Exposes'
  | 'RoutesTo';

export type SnapshotElement = {
  id: string;
  kind: ElementKind;
  name: string;
  description?: string;
  technology?: string;
  parentId?: string;
  source?: string;
  canonicalId?: string;
  aliases?: string[];
  properties?: Record<string, string>;
  tags?: string[];
};

export type SnapshotRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: RelationKind;
  label?: string;
  technology?: string;
  source?: string;
  properties?: Record<string, string>;
};

export type SnapshotFlowStep = {
  sourceElementId: string;
  relationshipId?: string | null;
  label?: string;
  properties?: Record<string, string>;
};

export type SnapshotFlow = {
  id: string;
  name: string;
  description?: string;
  steps: SnapshotFlowStep[];
};

export type ModelSnapshotWire = {
  $schema: string;
  schemaVersion: string;
  source: string;
  elements: SnapshotElement[];
  relationships: SnapshotRelationship[];
  flows?: SnapshotFlow[] | null;
};
