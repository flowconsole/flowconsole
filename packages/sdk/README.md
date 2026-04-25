# FlowConsole SDK

FlowConsole SDK provides a typed, declarative API for describing software architecture as code. Define elements, flows, and deployments in TypeScript — the SDK infers relationships automatically and builds a `ModelSnapshot` for the FlowConsole engine.

Built with [jsii](https://github.com/aws/jsii), so the same API is available in TypeScript, Python, C#, Java, and Go.

## Install

- **npm**: `npm install @flowconsole/sdk`
- **Python**: `pip install flowconsole-sdk`
- **.NET**: `dotnet add package FlowConsole.Sdk`
- **Java (Maven)**:
  ```xml
  <dependency>
    <groupId>io.github.flowconsole</groupId>
    <artifactId>flowconsole-sdk</artifactId>
    <version>2.0.0</version>
  </dependency>
  ```
- **Go**: `go get github.com/flowconsole/go-flowconsole/flowconsole/v2`

## Quick Start (TypeScript)

The SDK has three layers: Topology, Flows, and Deployment.

```typescript
import {
  User, SoftwareSystem, Container, RestApi, Postgres, Redis, Kafka, Topic, External,
  Gateway, K8sCluster, ManagedDatabase, Ingress, buildSnapshot, getRuntime
} from "@flowconsole/sdk";

// ── Layer 1: Topology ──
const customer = new User({ name: "Customer", role: "Buyer" });
const shop = new SoftwareSystem({ name: "eShop", domain: "e-commerce" });
const gateway = new Gateway({ name: "API Gateway", belongsTo: shop });
const web = new Container({ name: "Web App", technology: "Blazor", belongsTo: shop });
const ordersApi = new RestApi({
  name: "Orders API",
  technology: "ASP.NET Core",
  baseUrl: "/api/v1/orders",
  belongsTo: shop
});
const db = new Postgres({ name: "Ledger", belongsTo: shop });
const cache = new Redis({ name: "Session", belongsTo: shop });
const kafka = new Kafka({ name: "Event Bus", belongsTo: shop });
const orderEvents = new Topic({ name: "order.events", partitions: 12, belongsTo: kafka });
const stripe = new External({ name: "Stripe", vendor: "Stripe Inc.", belongsTo: shop });

// ── Layer 2: Flows ──
customer.opens(web, "Opens shop")
  .then(web).sendsRequest(gateway, "Browse catalog")
  .then(gateway).sendsRequest(ordersApi, "GET /products")
  .then(ordersApi).reads(cache, "Check cache")
  .then(ordersApi).reads(db, "Query products")
  .scenario("Browse catalog");

customer.opens(web, "Place order")
  .then(web).sendsRequest(ordersApi, "POST /orders")
  .then(ordersApi).writes(db, "Save order")
  .then(ordersApi).sendsRequest(stripe, "Charge card")
  .then(ordersApi).publishes(orderEvents, "OrderPlaced")
  .scenario("Customer purchase");

// ── Layer 3: Deployment ──
const prodCluster = new K8sCluster({ name: "prod-eu", region: "eu-west-1" });
const rdsMain = new ManagedDatabase({ name: "RDS prod", provider: "AWS RDS" });
const publicIngress = new Ingress({ name: "Public", host: "shop.example.com" });
web.deployedOn(prodCluster, { replicas: 3 });
ordersApi.deployedOn(prodCluster, { replicas: 5 });
db.deployedOn(rdsMain);
cache.deployedOn(prodCluster, { replicas: 1 });
publicIngress.routesTo(gateway);
gateway.exposes(ordersApi, { path: "/api/orders" });

// Build snapshot (validates and infers relationships)
const entities = [
  customer, shop, gateway, web, ordersApi, db, cache, kafka, orderEvents, stripe,
  prodCluster, rdsMain, publicIngress,
];
const snapshot = buildSnapshot(entities);
```

## Quick Start (C#)

```csharp
using FlowConsole;

var customer = new User(new UserArgs { Name = "Customer", Role = "Buyer" });
var shop = new SoftwareSystem(new SoftwareSystemArgs { Name = "eShop", Domain = "e-commerce" });
var ordersApi = new RestApi(new RestApiArgs {
    Name = "Orders API",
    Technology = "ASP.NET Core",
    BaseUrl = "/api/v1/orders",
    BelongsTo = shop
});
var web = new Container(new ComponentArgs { Name = "Web App", Technology = "Blazor", BelongsTo = shop });
var db = new Postgres(new DatabaseArgs { Name = "Ledger", BelongsTo = shop });
var kafka = new Kafka(new BrokerArgs { Name = "Event Bus", BelongsTo = shop });
var orderEvents = new Topic(new TopicArgs {
    Name = "order.events", Partitions = 12, BelongsTo = kafka
});

customer.Opens(web, "Place order")
    .Then(web).SendsRequest(ordersApi, "POST /orders")
    .Then(ordersApi).Writes(db, "Save order")
    .Then(ordersApi).Publishes(orderEvents, "OrderPlaced")
    .Scenario("Customer purchase");

var prodCluster = new K8sCluster(new K8sClusterArgs { Name = "prod-eu", Region = "eu-west-1" });
ordersApi.DeployedOn(prodCluster, new DeploymentOptions { Replicas = 5 });
```

## Elements

### Base Elements (13 classes)

| Class | Backend ElementKind | Layer | Extra Fields |
|-------|-------------------|-------|-------------|
| `User` | External | Architecture | `role` |
| `SoftwareSystem` | Service | Architecture | `domain` |
| `Namespace` | Namespace | Architecture | — |
| `Container` | Application | Architecture | — |
| `Module` | Module | Architecture | — |
| `External` | External | Architecture | `vendor` |
| `Gateway` | Gateway | Architecture | — |
| `Worker` | Worker | Architecture | — |
| `Database` | Database | Infra | `engine` |
| `Cache` | Cache | Infra | `engine` |
| `Queue` | Queue | Infra | `engine` |
| `Broker` | Broker | Infra | — |
| `Topic` | Topic | Infra | `partitions` |

### Convenience Classes (23 classes)

Thin wrappers that set default `technology` or `engine`. User-supplied values always override defaults.

**API patterns** (extend Container):
- `RestApi` — technology="REST API", fields: `baseUrl`, `openapi`
- `GrpcApi` — technology="gRPC", field: `proto`
- `GraphqlApi` — technology="GraphQL", field: `schema`

**Web/Mobile/Desktop** (extend Container):
- `ReactApp` (React), `NextApp` (Next.js), `VueApp` (Vue.js), `AngularApp` (Angular), `SvelteApp` (Svelte), `BlazorApp` (Blazor)
- `IosApp` (iOS), `AndroidApp` (Android), `DesktopApp` (Desktop)

**Databases** (extend Database):
- `Postgres` (PostgreSQL), `Mysql` (MySQL), `Mongo` (MongoDB), `Clickhouse` (ClickHouse)

**Caches** (extend Cache):
- `Redis`, `Memcached`

**Queues** (extend Queue):
- `Rabbit` (RabbitMQ), `Sqs` (AWS SQS)

**Brokers** (extend Broker):
- `Kafka`, `Nats` (NATS), `Pulsar` (Apache Pulsar)

### Deployment Classes (6 classes)

| Class | Backend ElementKind | Extra Fields |
|-------|-------------------|-------------|
| `K8sCluster` | Deployment | `region`, `version` |
| `ManagedDatabase` | Deployment | `provider`, `engine` |
| `Serverless` | Deployment | `runtime`, `provider` |
| `Vm` | Deployment | `os`, `provider` |
| `Cdn` | Deployment | `provider` |
| `Ingress` | Ingress | `host`, `tls` |

## Flow Methods

Flows describe runtime interactions between components using a fluent chain API.

### Base Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `sendsRequest(target, label?, options?)` | Generic request | FlowBuilder |
| `sendsRequestTo(target, label?, options?)` | Alias for sendsRequest | FlowBuilder |
| `getDataFrom(target, label?, options?)` | Read data | FlowBuilder |
| `calls(target, label?, options?)` | Explicit Calls relationship | FlowBuilder |
| `uses(target, label?, options?)` | Explicit Uses relationship | FlowBuilder |
| `dependsOn(target, label?, options?)` | Explicit DependsOn relationship | FlowBuilder |
| `produces(target, label?, options?)` | Explicit Produces relationship | FlowBuilder |
| `consumes(target, label?, options?)` | Explicit Consumes relationship | FlowBuilder |
| `executesRequest(label?)` | Internal action (no relationship) | FlowBuilder |
| `then(next)` | Switch source in chain | FlowBuilder |
| `inParallel(...branches)` | Parallel branches | FlowBuilder |

### Convenience Wrappers

| Method | Equivalent | Typical Target | Semantics |
|--------|-----------|---------------|-----------|
| `opens(target, label?)` | sendsRequest + kind:'sync' | Container/Gateway | User opens UI |
| `publishes(target, label?)` | sendsRequest + kind:'event' | Topic/Queue | Publish event |
| `emits(target, label?)` | alias for publishes | Topic/Queue | Same as publishes |
| `subscribes(target, label?)` | getDataFrom | Topic/Queue | Subscribe to events |
| `reads(target, label?)` | getDataFrom | Database/Cache | Read data |
| `writes(target, label?)` | sendsRequest + kind:'sync' | Database/Cache | Write data |
| `runs(label?)` | executesRequest | — | Internal action |

### Scenario

Terminate a flow chain with `.scenario(name)` to group it for diagram rendering:

```typescript
user.opens(web, "Login")
  .then(web).sendsRequest(api, "POST /auth")
  .scenario("User login");
```

## Deployment

Deployment methods link architecture elements to infrastructure targets.

| Method | Relationship |
|--------|-------------|
| `component.deployedOn(target, options?)` | DeployedOn |
| `ingress.routesTo(target)` | RoutesTo |
| `gateway.exposes(target, options?)` | Exposes |

`DeploymentOptions`: `replicas`, `cpu`, `memory`.
`ExposeOptions`: `path`.

```typescript
const cluster = new K8sCluster({ name: "prod", region: "us-east-1" });
api.deployedOn(cluster, { replicas: 3 });

const ingress = new Ingress({ name: "Public", host: "api.example.com" });
ingress.routesTo(gateway);
gateway.exposes(api, { path: "/api" });
```

## Relationship Inference

The SDK does not require explicit relationship declarations. Relationships are inferred from flows and deployment calls using these rules:

| Flow Method | kind | Target Type | Inferred RelationKind |
|------------|------|------------|----------------------|
| `sendsRequest` | sync (default) | Container/Gateway/External | **Calls** |
| `sendsRequest` | sync | Database/Cache | **Uses** |
| `sendsRequest` | async | any | **Calls** (async flag) |
| `sendsRequest` | event | Topic/Queue | **Produces** |
| `sendsRequest` | dependency | any | **DependsOn** |
| `getDataFrom` | — | Database/Cache | **Uses** |
| `getDataFrom` | — | Topic/Queue | **Consumes** |
| `getDataFrom` | — | Container/External | **Calls** (read flag) |
| `calls` | sync (default) | any | **Calls** |
| `uses` | dependency (default) | any | **Uses** |
| `dependsOn` | dependency (default) | any | **DependsOn** |
| `produces` | event (default) | any | **Produces** |
| `consumes` | dependency (default) | any | **Consumes** |
| `executesRequest` | — | — | (no relationship) |
| (implicit `belongsTo`) | — | — | **Contains** |

**Deduplication**: One (source, target, relationKind) tuple produces one relationship. Labels from all matching calls are merged into a `labels` array. Different relationKinds between the same pair (e.g., Calls + DependsOn) produce separate relationships.

**No transitive inference**: If A publishes to a Topic and B subscribes to it, no A→B relationship is created. The graph path A→Topic→B is visible through the model.

### Deployment Relationships

| Call | Inferred RelationKind |
|------|----------------------|
| `component.deployedOn(target)` | **DeployedOn** |
| `ingress.routesTo(target)` | **RoutesTo** |
| `gateway.exposes(target)` | **Exposes** |

## Styles

Each element accepts an optional `style` field for visual customization.

```typescript
interface ComponentStyle {
  preset?: StylePreset;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: string;
  shape?: ShapeKind;
}
```

### Presets

| Preset | Purpose |
|--------|---------|
| `default` | Normal node |
| `highlighted` | Accent color for discussion |
| `critical` | Red — problem/critical |
| `deprecated` | Gray — outdated |
| `new` | Green — newly added |
| `external` | Dashed border, muted color |

### Shapes

`rectangle`, `circle`, `hexagon`, `cylinder`, `pipe`, `person`, `cloud`.

Default shapes by element kind:
- `User` → person
- `Database`, `Cache` → cylinder
- `Queue`, `Topic` → pipe
- `External` → cloud
- `Gateway`, `Ingress` → hexagon
- Everything else → rectangle

### Icons

The `style.icon` field accepts:
- `data:...;base64,...` — inline base64 data URL
- `http://...` / `https://...` — external URL
- `/...` / `./...` — relative file path
- Otherwise — name from the built-in icon library

Built-in icons: `user`, `system`, `database`, `queue`, `topic`, `cache`, `api`, `gateway`, `worker`, `cloud`, `deployment`, `kubernetes`, `aws`, `browser`, `mobile`.

Default icons are auto-assigned by element kind when `style.icon` is not set.

### Example with Styles

```typescript
const legacy = new Container({
  name: "Legacy Service",
  style: { preset: StylePreset.DEPRECATED, shape: ShapeKind.RECTANGLE }
});

const critical = new Database({
  name: "Core DB",
  style: { preset: StylePreset.CRITICAL, icon: "database" }
});
```

## belongsTo Validation

| Element | Allowed `belongsTo` | Required? |
|---------|---------------------|-----------|
| `User`, `SoftwareSystem` | — (top-level) | No |
| `Namespace` | SoftwareSystem | Optional |
| `Container` | SoftwareSystem, Namespace | Optional |
| `Module` | Container, SoftwareSystem | Optional |
| `Gateway` | SoftwareSystem, Container | Optional |
| `Worker` | SoftwareSystem, Container | Optional |
| `External` | SoftwareSystem, Container | Optional |
| `Database` | SoftwareSystem, Container | Optional |
| `Cache` | SoftwareSystem, Container | Optional |
| `Queue` | SoftwareSystem, Container | Optional |
| `Broker` | SoftwareSystem, Container | Optional |
| `Topic` | **Broker** | **Yes** |

`buildSnapshot()` validates these rules and throws on violations.

## Building ModelSnapshot

```typescript
import { buildSnapshot, getRuntime } from "@flowconsole/sdk";

// After defining elements, flows, and deployments:
const entities = [customer, shop, api, db, kafka, orderEvents];
const snapshot = buildSnapshot(entities);

// snapshot.entities — all components
// snapshot.relationships — inferred relationships (Contains, Calls, Uses, Produces, etc.)
// snapshot.scenarios — named flow scenarios
```

## Building Multi-Language Packages

1. Install dependencies: `pnpm install`
2. Build TypeScript: `pnpm --filter @flowconsole/sdk build`
3. Generate packages: `pnpm --filter @flowconsole/sdk package`

Artifacts are written to `packages/sdk/dist/` with language-specific subdirectories (dotnet, java, python, go).

## Python Package

- Package: `flowconsole-sdk`, import: `flowconsole`
- Generated via `jsii-pacmak`; property names mirror TypeScript definitions
- Ships the DSL types; use alongside the FlowConsole engine

## License

Apache-2.0 — see [LICENSE](../../LICENSE) in the repository root.
