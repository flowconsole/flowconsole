import type { CodeSample } from '../types';

export const codeSamples: CodeSample[] = [
  {
    id: 'sdk-styles-showcase',
    title: 'SDK Styles Showcase',
    description:
      'All 7 ShapeKind forms + 5 presets + custom colors to verify ReactFlow rendering',
    code: `import {
  Module, SoftwareSystem, Namespace,
  User, RestApi, Postgres, Redis, Kafka, Topic, Worker, External, Ingress,
} from "@flowconsole/sdk";

// ── All 7 shapes ──
const rect = new Module({
  name: "Rectangle",
  description: "default shape",
  style: { shape: "rectangle" },
});
const circle = new Module({
  name: "Circle",
  description: "SVG circle",
  style: { shape: "circle" },
});
const hex = new Module({
  name: "Hexagon",
  description: "SVG polygon",
  style: { shape: "hexagon" },
});
const cloud = new Module({
  name: "Cloud",
  description: "SVG path with bezier",
  style: { shape: "cloud" },
});
const cyl = new Module({
  name: "Cylinder",
  description: "CSS database",
  style: { shape: "cylinder" },
});
const pipe = new Module({
  name: "Pipe",
  description: "CSS queue",
  style: { shape: "pipe" },
});
const person = new Module({
  name: "Person",
  description: "CSS person",
  style: { shape: "person" },
});

// ── 5 presets on rectangles ──
const highlighted = new Module({
  name: "Highlighted",
  description: "glow effect",
  style: { preset: "highlighted" },
});
const critical = new Module({
  name: "Critical",
  description: "red preset",
  style: { preset: "critical" },
});
const deprecated = new Module({
  name: "Deprecated",
  description: "dashed + faded",
  style: { preset: "deprecated" },
});
const fresh = new Module({
  name: "New",
  description: "new preset",
  style: { preset: "new" },
});
const external = new Module({
  name: "External",
  description: "external preset",
  style: { preset: "external" },
});

// ── Custom colors (explicit overrides) ──
const branded = new Module({
  name: "Branded",
  description: "custom bg + border",
  style: { backgroundColor: "#e74c3c", borderColor: "#c0392b" },
});
const overridden = new Module({
  name: "Preset + Override",
  description: "deprecated preset but green border",
  style: { preset: "deprecated", borderColor: "#2ecc71" },
});

// ── Container node (SoftwareSystem + nested Namespace) ──
const system = new SoftwareSystem({ name: "Container Node" });
const ns = new Namespace({ name: "Nested Namespace", belongsTo: system });
const child = new Module({
  name: "Child in Container",
  description: "rendered inside container",
  belongsTo: ns,
});

// ── Convenience classes with automatic shape inference ──
const user = new User({ name: "Customer" });
const api = new RestApi({ name: "API Service", baseUrl: "/v1" });
const db = new Postgres({ name: "Main DB" });
const cache = new Redis({ name: "Session Cache" });
const broker = new Kafka({ name: "Event Bus" });
const auditTopic = new Topic({ name: "Audit", belongsTo: broker });
const reportJob = new Worker({ name: "Reporter" });
const fraud = new External({ name: "Fraud Guard", vendor: "FraudCo" });
const ingress = new Ingress({ name: "Public Ingress", host: "app.example.com" });

// ── A few connections so the diagram renders edges too ──
rect.sendsRequest(circle, "step 1")
  .then(circle).sendsRequest(hex, "step 2")
  .then(hex).sendsRequest(cloud, "step 3")
  .scenario("Shapes chain");

cyl.sendsRequest(pipe, "write")
  .then(pipe).sendsRequest(person, "notify")
  .scenario("Legacy shapes");

highlighted.sendsRequest(critical, "alert")
  .then(critical).sendsRequest(deprecated, "fallback")
  .then(deprecated).sendsRequest(fresh, "replace")
  .then(fresh).sendsRequest(external, "external link")
  .scenario("Preset chain");

branded.sendsRequest(overridden, "custom styling")
  .scenario("Custom colors");

// ── Icon formats (per SDK spec) ──
// Built-in library name → resolves to Tabler SVG icon
const iconNamed = new Module({
  name: "Named Icon",
  description: "icon: 'aws'",
  style: { icon: "aws" },
});
// Short literal (≤4 chars) → rendered as text/emoji
const iconEmoji = new Module({
  name: "Emoji Icon",
  description: "icon: '🔥'",
  style: { icon: "🔥" },
});
const iconAbbr = new Module({
  name: "Text Icon",
  description: "icon: 'v2'",
  style: { icon: "v2" },
});
// data: URL → inline SVG (tiny purple star)
const iconData = new Module({
  name: "Inline Data URL",
  description: "icon: 'data:image/svg+xml;base64,...'",
  style: {
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzhiNWNmNiI+PHBhdGggZD0iTTEyIDJsMyA3aDdsLTUuNSA0LjUgMiA3LTYuNS00LjUtNi41IDQuNSAyLTctNS41LTQuNWg3eiIvPjwvc3ZnPg==",
  },
});
// External URL → loaded as <img>
const iconUrl = new Module({
  name: "External URL",
  description: "icon: 'https://...'",
  style: { icon: "https://api.iconify.design/logos:postgresql.svg" },
});

iconNamed.sendsRequest(iconEmoji, "named → emoji")
  .then(iconEmoji).sendsRequest(iconAbbr, "emoji → text")
  .then(iconAbbr).sendsRequest(iconData, "text → data url")
  .then(iconData).sendsRequest(iconUrl, "data url → http url")
  .scenario("Icon formats");

// ── Convenience chain: automatic shape inference ──
ingress.sendsRequest(api, "route")
  .then(api).sendsRequest(fraud, "score")
  .inParallel(
    api.reads(cache, "session"),
    api.reads(db, "account"),
  )
  .then(api).publishes(auditTopic, "audit event")
  .scenario("Convenience classes");

user.opens(api, "login")
  .scenario("User flow");

reportJob.reads(db, "load data")
  .then(reportJob).publishes(auditTopic, "report ready")
  .scenario("Worker flow");

child.sendsRequest(api, "call parent")
  .scenario("Container children");
`,
  },
  {
    id: 'eshop',
    title: 'E-Shop Architecture',
    description:
      'E-commerce platform with auth, catalog, cart, checkout, payments, inventory worker',
    code: `import {
  User, SoftwareSystem, NextApp, ReactApp, RestApi,
  Postgres, Redis, Kafka, Topic, Worker,
  External, Ingress, Cdn, K8sCluster,
} from "@flowconsole/sdk";

// ── Actors ──
const customer = new User({ name: "Customer", description: "Shops online" });
const admin = new User({ name: "Admin", description: "Manages catalog" });

// ── Top-level system grouping ──
const shop = new SoftwareSystem({ name: "E-Shop Platform" });

// ── Edge layer (hexagons via Ingress/Gateway) ──
const publicIngress = new Ingress({
  name: "Public Ingress",
  host: "shop.example.com",
  tls: true,
});
const edgeCdn = new Cdn({
  name: "Edge CDN",
  provider: "CloudFront",
  description: "Static assets & images",
});

// ── Frontends ──
const storefront = new NextApp({
  name: "Storefront",
  description: "Customer-facing web",
  belongsTo: shop,
});
const adminApp = new ReactApp({
  name: "Admin Panel",
  description: "Product & order management",
  belongsTo: shop,
  style: { preset: "highlighted" },
});

// ── Core APIs ──
const authApi = new RestApi({
  name: "Auth API",
  description: "Sign-in, tokens, sessions",
  belongsTo: shop,
});
const catalogApi = new RestApi({
  name: "Catalog API",
  description: "Products, search, pricing",
  belongsTo: shop,
});
const cartApi = new RestApi({
  name: "Cart API",
  description: "Shopping cart state",
  belongsTo: shop,
});
const checkoutApi = new RestApi({
  name: "Checkout API",
  description: "Order placement",
  belongsTo: shop,
  style: { preset: "critical" },
});

// ── Data stores ──
const productsDb = new Postgres({ name: "Products DB", belongsTo: shop });
const ordersDb = new Postgres({ name: "Orders DB", belongsTo: shop });
const sessionCache = new Redis({ name: "Session Cache", belongsTo: shop });
const inventoryDb = new Postgres({ name: "Inventory DB", belongsTo: shop });

// ── Messaging ──
const eventBus = new Kafka({ name: "Event Bus", belongsTo: shop });
const orderPlaced = new Topic({
  name: "order.placed",
  belongsTo: eventBus,
});

// ── Async workers ──
const inventoryWorker = new Worker({
  name: "Inventory Worker",
  description: "Reserves stock on order",
  belongsTo: shop,
});

// ── Third-party ──
const paymentGateway = new External({
  name: "Payment Gateway",
  description: "Stripe / 3-DS",
  vendor: "Stripe",
  style: { preset: "highlighted" },
});
const emailProvider = new External({
  name: "Email Provider",
  vendor: "SendGrid",
});

// ── Deprecated legacy ──
const legacyReports = new RestApi({
  name: "Legacy Reports",
  description: "Old reporting API, being sunset",
  belongsTo: shop,
  style: { preset: "deprecated" },
});

// ── Flows ──
customer.opens(storefront, "browse shop")
  .then(storefront).sendsRequest(edgeCdn, "load assets")
  .then(storefront).sendsRequest(publicIngress, "api requests")
  .then(publicIngress).sendsRequest(authApi, "sign in")
  .then(authApi).writes(sessionCache, "store session")
  .scenario("Customer sign-in");

storefront.sendsRequest(catalogApi, "browse products")
  .then(catalogApi).reads(productsDb, "products + search")
  .then(catalogApi).reads(sessionCache, "personalize")
  .scenario("Catalog browsing");

storefront.sendsRequest(cartApi, "add to cart")
  .then(cartApi).writes(sessionCache, "cart items")
  .scenario("Add to cart");

storefront.sendsRequest(checkoutApi, "place order")
  .inParallel(
    checkoutApi.reads(sessionCache, "cart snapshot"),
    checkoutApi.writes(ordersDb, "create order"),
  )
  .then(checkoutApi).sendsRequest(paymentGateway, "charge card")
  .then(checkoutApi).publishes(orderPlaced, "order.placed")
  .scenario("Checkout + payment");

inventoryWorker.subscribes(orderPlaced, "claim order")
  .then(inventoryWorker).writes(inventoryDb, "reserve stock")
  .then(inventoryWorker).sendsRequest(emailProvider, "send confirmation")
  .scenario("Inventory + notification");

admin.opens(adminApp, "manage shop")
  .then(adminApp).sendsRequest(catalogApi, "edit products")
  .then(catalogApi).writes(productsDb, "update catalog")
  .scenario("Admin workflow");

// ── Deployment ──
const cluster = new K8sCluster({ name: "prod-eu", region: "eu-west-1" });
storefront.deployedOn(cluster, { replicas: 4 });
authApi.deployedOn(cluster, { replicas: 3 });
catalogApi.deployedOn(cluster, { replicas: 4 });
cartApi.deployedOn(cluster, { replicas: 3 });
checkoutApi.deployedOn(cluster, { replicas: 2 });
inventoryWorker.deployedOn(cluster, { replicas: 2 });
publicIngress.routesTo(storefront);
`,
  },
  {
    id: 'test-sample',
    title: 'SDK Test Sample',
    description:
      'Test sample demonstrating User, ReactApp convenience class, and scenario',
    code: `
import { User, ReactApp } from "@flowconsole/sdk";

const user = new User({
  name: "Alice",
  role: "admin",
  description: "Administrator user",
  tags: ["admin", "user"],
  badge: "gold",
  tone: "muted",
});

const app = new ReactApp({ name: "Dashboard" });

user.opens(app, "Launch app")
  .scenario("User opens dashboard");

    `
  },
  {
    id: 'simple-arch',
    title: 'Simple Architecture',
    description:
      'Minimal REST API with database reads and writes',
    code: `
import { User, RestApi, Postgres } from "@flowconsole/sdk";

const user = new User({ name: "Developer" });
const api = new RestApi({ name: "API Service", baseUrl: "/api/v1" });
const db = new Postgres({ name: "PostgreSQL" });

user.opens(api, "Call API")
  .then(api).reads(db, "Query data")
  .then(api).writes(db, "Save result")
  .scenario("CRUD operations");
    `
  }
];


export const defaultSampleId = codeSamples[0]?.id ?? 'test-sample';
