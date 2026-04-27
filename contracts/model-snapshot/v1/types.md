# ModelSnapshot DTO Types — v1

This document describes the DTO fields and per-kind required properties for the ModelSnapshot wire format.

## Top-level ModelSnapshot

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string (const URI) | yes | Must be `"https://flowconsole.tech/contracts/model-snapshot/v1/schema.json"` |
| `schemaVersion` | string (semver) | yes | Schema version, e.g. `"1.1.0"` |
| `source` | string | yes | Origin source: `"CodeScan"`, `"InfraScan"`, `"Git"`, `"Import"` |
| `elements` | array of Element | yes | All elements in the snapshot |
| `relationships` | array of Relationship | yes | All relationships between elements |
| `flows` | array of Flow or null | no | Sequence flows describing interactions (added in 1.1.0). Only allowed when `source` is `"Git"` |

## Element

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier within the snapshot |
| `kind` | ElementKind enum | yes | Element type discriminator |
| `name` | string | yes | Human-readable name |
| `description` | string | no | Optional description |
| `technology` | string | no | Technology, framework, or language |
| `parentId` | string | no | Parent element ID for hierarchy |
| `source` | string | no | Per-element source override |
| `canonicalId` | string | no | Stable ID for drift detection |
| `aliases` | array of string | no | Alternative identifiers |
| `properties` | object (string values) | conditional | Kind-specific and custom key-value pairs |
| `tags` | array of string | no | Classification tags |

## ElementKind enum

### Code layer
- `Class` — class definition
- `Interface` — interface definition
- `Endpoint` — HTTP/gRPC endpoint
- `Function` — standalone function
- `Producer` — message producer
- `Consumer` — message consumer

### Architecture layer
- `Service` — microservice or bounded context
- `Application` — deployable application
- `Module` — logical module within an application
- `External` — external system
- `Gateway` — API gateway
- `Worker` — background worker

### Infra layer
- `Deployment` — deployment unit (container, pod)
- `Database` — database instance
- `Queue` — message queue
- `Cache` — cache instance
- `Ingress` — ingress/load balancer
- `Namespace` — namespace or cluster partition
- `Broker` — event streaming host (Kafka, NATS, Pulsar)
- `Topic` — topic within a Broker

## Per-kind required Properties

When an element has one of the following kinds, its `properties` object MUST contain the listed keys:

| Kind | Required properties key | Description |
|------|------------------------|-------------|
| `Endpoint` | `httpMethod` | HTTP method (GET, POST, PUT, DELETE, PATCH, etc.) |
| `Topic` | `partitions` | Number of partitions (as string) |
| `Ingress` | `host` | Hostname or domain |

All other kinds have no required properties keys (the `properties` field itself is optional).

## Relationship

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier within the snapshot |
| `sourceId` | string | yes | Source element ID |
| `targetId` | string | yes | Target element ID |
| `kind` | RelationKind enum | yes | Relationship type |
| `label` | string | no | Human-readable label |
| `technology` | string | no | Protocol or transport technology |
| `source` | string | no | Per-relationship source override |
| `properties` | object (string values) | no | Custom key-value pairs |

## RelationKind enum

- `Contains` — parent contains child
- `DeployedOn` — element is deployed on target
- `Uses` — generic usage relationship
- `Calls` — synchronous call (HTTP, gRPC)
- `DependsOn` — compile/runtime dependency
- `Imports` — code import
- `Implements` — interface implementation
- `Produces` — produces messages to target
- `Consumes` — consumes messages from target
- `Exposes` — exposes functionality via target
- `RoutesTo` — routes traffic to target

## Flow (added in schema 1.1.0)

A flow describes an ordered sequence of interactions between elements, typically representing a user journey, API call chain, or data pipeline.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique flow identifier within the snapshot |
| `name` | string | yes | Human-readable flow name |
| `description` | string | no | Optional flow description |
| `steps` | array of FlowStep | yes | Ordered sequence of steps (array index = order) |

Flows are only allowed in snapshots with `source: "Git"`. Non-Git source pushes with non-empty flows are rejected with `SNAPSHOT_FLOW_NOT_ALLOWED_FOR_SOURCE`.

## FlowStep

Each step in a flow represents either an edge step (traversing a relationship) or an action step (an action within a single element).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceElementId` | string | yes | Source element ID — must exist in elements array |
| `relationshipId` | string or null | no | Relationship ID for edge steps; `null` or absent for action steps |
| `label` | string | no | Optional step label |
| `properties` | object (string values) | no | Custom key-value properties for this step |

### Edge steps vs action steps

- **Edge step**: `relationshipId` is a non-null string referencing a relationship in the `relationships` array. The target element is derived from the relationship — no explicit `targetElementId` field. The `relationshipId` follows the convention `{sourceId}--{kindLowercase}-->{targetId}` (e.g., `webapp--calls-->api`).
- **Action step**: `relationshipId` is `null` (or absent). Represents an action performed within the source element (e.g., `executesRequest()`, `processPayment()`). The `sourceElementId` must still exist in the elements array (`SNAPSHOT_FLOW_ACTION_STEP_INVALID` if not).

There is no explicit `Order` field — the position in the `steps` array determines execution order.
