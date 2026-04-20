# ModelSnapshot DTO Types — v1

This document describes the DTO fields and per-kind required properties for the ModelSnapshot wire format.

## Top-level ModelSnapshot

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string (const URI) | yes | Must be `"https://flowconsole.tech/contracts/model-snapshot/v1/schema.json"` |
| `schemaVersion` | string (semver) | yes | Schema version, e.g. `"1.0.0"` |
| `source` | string | yes | Origin source: `"CodeScan"`, `"InfraScan"`, `"Git"`, `"Import"` |
| `elements` | array of Element | yes | All elements in the snapshot |
| `relationships` | array of Relationship | yes | All relationships between elements |

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
