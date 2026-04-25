/**
 * Discriminated union types for TypeScript autocomplete ergonomics.
 * These types are TS-only and excluded from the jsii assembly.
 * Import via: import { ElementKindUnion, RelationKindUnion } from '@flowconsole/sdk/unions';
 *
 * @example
 * ```typescript
 * import { ElementKindUnion } from '@flowconsole/sdk/unions';
 *
 * function handleElement(el: ElementKindUnion) {
 *   switch (el.kind) {
 *     case 'Database':
 *       console.log(`DB engine: ${el.engine}`);
 *       break;
 *     case 'Topic':
 *       console.log(`Partitions: ${el.partitions}`);
 *       break;
 *   }
 * }
 * ```
 */

import type { ComponentTone, ComponentStyle, Component } from './flowconsole-sdk';

interface ElementBase {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly technology?: string;
  readonly properties?: { [key: string]: string };
  readonly belongsTo?: Component;
  readonly tags?: string[];
  readonly badge?: string;
  readonly tone?: ComponentTone;
  readonly style?: ComponentStyle;
}

/** Code layer element kinds. */
export type CodeElement =
  | { kind: 'Class' } & ElementBase
  | { kind: 'Interface' } & ElementBase
  | { kind: 'Endpoint'; httpMethod?: string } & ElementBase
  | { kind: 'Function' } & ElementBase
  | { kind: 'Producer' } & ElementBase
  | { kind: 'Consumer' } & ElementBase;

/** Infrastructure layer element kinds. */
export type InfraElement =
  | { kind: 'Deployment'; region?: string; version?: string } & ElementBase
  | { kind: 'Database'; engine?: string } & ElementBase
  | { kind: 'Queue'; engine?: string } & ElementBase
  | { kind: 'Cache'; engine?: string } & ElementBase
  | { kind: 'Ingress'; host?: string; tls?: boolean } & ElementBase
  | { kind: 'Namespace' } & ElementBase
  | { kind: 'Broker' } & ElementBase
  | { kind: 'Topic'; partitions?: number } & ElementBase;

/** Architecture layer element kinds. */
export type ArchitectureElement =
  | { kind: 'Service'; domain?: string } & ElementBase
  | { kind: 'Application' } & ElementBase
  | { kind: 'Module' } & ElementBase
  | { kind: 'External'; vendor?: string } & ElementBase
  | { kind: 'Gateway' } & ElementBase
  | { kind: 'Worker' } & ElementBase;

/**
 * Discriminated union of all 20 element kinds.
 * Discriminant field: `kind`.
 * Provides per-kind property visibility for TypeScript autocomplete.
 *
 * @example
 * ```typescript
 * function describeElement(el: ElementKindUnion): string {
 *   switch (el.kind) {
 *     case 'Database': return `DB: ${el.engine ?? 'unknown'}`;
 *     case 'Topic': return `Topic: ${el.partitions ?? 1} partitions`;
 *     default: return el.kind;
 *   }
 * }
 * ```
 */
export type ElementKindUnion = CodeElement | InfraElement | ArchitectureElement;

/**
 * Discriminated union of all 11 relation kinds.
 * Discriminant field: `kind`.
 *
 * @example
 * ```typescript
 * function describeRelation(rel: RelationKindUnion): string {
 *   return `${rel.kind}: ${rel.sourceId} → ${rel.targetId}`;
 * }
 * ```
 */
export type RelationKindUnion =
  | { kind: 'Contains'; sourceId: string; targetId: string }
  | { kind: 'DeployedOn'; sourceId: string; targetId: string }
  | { kind: 'Uses'; sourceId: string; targetId: string }
  | { kind: 'Calls'; sourceId: string; targetId: string }
  | { kind: 'DependsOn'; sourceId: string; targetId: string }
  | { kind: 'Imports'; sourceId: string; targetId: string }
  | { kind: 'Implements'; sourceId: string; targetId: string }
  | { kind: 'Produces'; sourceId: string; targetId: string }
  | { kind: 'Consumes'; sourceId: string; targetId: string }
  | { kind: 'Exposes'; sourceId: string; targetId: string }
  | { kind: 'RoutesTo'; sourceId: string; targetId: string };

/** All possible values for the `kind` discriminant on ElementKindUnion. */
export type ElementKindString = ElementKindUnion['kind'];

/** All possible values for the `kind` discriminant on RelationKindUnion. */
export type RelationKindString = RelationKindUnion['kind'];
