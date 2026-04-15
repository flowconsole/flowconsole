import type { CodeSample } from '../types';

export const codeSamples: CodeSample[] = [
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

export const codeSamplesOld: CodeSample[] = [
  {
    id: 'retail-banking',
    title: 'Retail Banking Platform',
    description:
      'Customer-facing banking stack with SPA frontend, backend APIs, caches, databases, and audit streams.',
    code: `import {
  User, SoftwareSystem, Container, ReactApp, RestApi,
  Redis, Postgres, Kafka, Topic, External,
  K8sCluster, ManagedDatabase, Ingress
} from "@flowconsole/sdk";

const user = new User({ name: "Customer", description: "Retail banking customer" });

const system = new SoftwareSystem({ name: "Cloud Banking" });
const storage = new Container({ name: "Data Store", belongsTo: system });
const backend = new Container({ name: "Core Services", belongsTo: system });

const frontApp = new ReactApp({
  name: "Customer Dashboard",
  description: "Browser Single-page Application",
  belongsTo: system
});
const authApi = new RestApi({
  name: "Authentication",
  description: "Self-Hosted Authentication Service",
  belongsTo: backend
});

const accountsApi = new RestApi({
  name: "Accounts API",
  description: "Java Spring service for balances and payments",
  belongsTo: backend
});

const cache = new Redis({
  name: "Session Cache",
  description: "Stores customer session payloads",
  belongsTo: storage
});

const db = new Postgres({
  name: "Ledger DB",
  description: "Persistent customer and transaction data",
  belongsTo: storage
});

const eventBus = new Kafka({
  name: "Event Bus",
  description: "Audit event streaming",
  belongsTo: backend
});
const auditTopic = new Topic({
  name: "Audit Events",
  description: "Every request produces an audit record",
  belongsTo: eventBus
});

const fraudService = new External({
  name: "Fraud Guard",
  description: "3rd-party fraud scoring",
  vendor: "FraudCo"
});

// ── Flows ──
user.opens(frontApp, "launch app")
  .then(frontApp).sendsRequest(authApi, "login")
  .then(frontApp).sendsRequest(accountsApi, "load dashboard")
  .inParallel(
    () => accountsApi.reads(cache, "session context"),
    () => accountsApi.reads(db, "account snapshot")
  )
  .sendsRequest(authApi, "validate token")
  .then(accountsApi)
  .inParallel(
    () => accountsApi.publishes(auditTopic, "emit audit"),
    () => accountsApi.sendsRequest(fraudService, "score transaction", { kind: 'async' })
  )
  .scenario("Customer login and dashboard");

// ── Deployment ──
const prodCluster = new K8sCluster({ name: "prod-eu", region: "eu-west-1" });
const rdsMain = new ManagedDatabase({ name: "RDS prod", provider: "AWS RDS", engine: "PostgreSQL" });
const publicIngress = new Ingress({ name: "Public", host: "bank.example.com", tls: true });

frontApp.deployedOn(prodCluster, { replicas: 2 });
authApi.deployedOn(prodCluster, { replicas: 3 });
accountsApi.deployedOn(prodCluster, { replicas: 5 });
db.deployedOn(rdsMain);
publicIngress.routesTo(frontApp);
`,
  },
  {
    id: 'enterprise-erp',
    title: 'Global ERP & Supply Chain',
    description:
      'Corporate ERP with employee portal, integration hub, planning services, background schedulers, and supplier APIs.',
    code: `import {
  User, SoftwareSystem, Container, NextApp, RestApi,
  Postgres, Rabbit, Worker, External
} from "@flowconsole/sdk";

const employee = new User({ name: "Regional Planner", description: "Creates purchase orders" });
const supplier = new External({ name: "Supplier API", description: "Partner integration", vendor: "SupplyCo" });

const atlas = new SoftwareSystem({ name: "Atlas ERP" });
const portal = new NextApp({
  name: "Planner Portal",
  description: "Next.js dashboard for procurement team",
  belongsTo: atlas
});

const integrationHub = new Container({
  name: "Integration Hub",
  description: "Async orchestrations + adapters",
  belongsTo: atlas
});

const planningApi = new RestApi({
  name: "Planning Service",
  description: "Handles demand & supply planning",
  belongsTo: integrationHub
});

const inventoryApi = new RestApi({
  name: "Inventory Service",
  description: "Tracks warehouse stock",
  belongsTo: integrationHub
});

const workflowQueue = new Rabbit({
  name: "Workflow Queue",
  description: "Commands for async processing",
  belongsTo: integrationHub
});

const reportingJob = new Worker({
  name: "Nightly Reconciliation",
  description: "Produces compliance extracts",
  belongsTo: integrationHub
});

const erpDb = new Postgres({
  name: "ERP Database",
  description: "Orders, forecasts, contracts",
  belongsTo: integrationHub
});

// ── Flows ──
employee.opens(portal, "create purchase order")
  .then(portal).sendsRequest(planningApi, "submit plan")
  .then(planningApi).sendsRequest(inventoryApi, "reserve stock")
  .inParallel(
    () => planningApi.reads(erpDb, "fetch demand"),
    () => inventoryApi.reads(erpDb, "current stock")
  )
  .then(planningApi).publishes(workflowQueue, "publish workflow")
  .then(planningApi).sendsRequest(supplier, "send order")
  .scenario("Purchase order creation");

reportingJob.reads(erpDb, "load data")
  .then(reportingJob).runs("generate nightly reports")
  .then(reportingJob).publishes(workflowQueue, "notify portal")
  .scenario("Nightly reconciliation");
`,
  },
  {
    id: 'oss-collab',
    title: 'OSS Collaboration Platform',
    description:
      'Architecture of a large open-source dev platform with contributors, Git service, CI runners, and observability.',
    code: `import {
  User, SoftwareSystem, Container, ReactApp, RestApi, GraphqlApi,
  Worker, Postgres, Kafka, Topic
} from "@flowconsole/sdk";

const contributor = new User({ name: "Contributor", description: "Sends pull requests" });
const maintainer = new User({ name: "Maintainer", description: "Reviews and deploys" });

const helios = new SoftwareSystem({ name: "Helios OSS" });
const gitGateway = new Container({ name: "Git Gateway", belongsTo: helios });
const ciCluster = new Container({ name: "CI Cluster", belongsTo: helios });
const observability = new Container({ name: "Observability", belongsTo: helios });

const webApp = new ReactApp({
  name: "Helios Web",
  description: "Next.js UI for issues, merge requests, pipelines",
  belongsTo: helios
});

const gitHttp = new RestApi({
  name: "Git HTTP",
  description: "Clone & push over HTTPS",
  belongsTo: gitGateway
});

const apiGateway = new GraphqlApi({
  name: "GraphQL API",
  description: "Issues, projects, releases",
  belongsTo: gitGateway
});

const ciRunner = new Worker({
  name: "CI Runner",
  description: "Executes pipelines from queue",
  belongsTo: ciCluster
});

const eventBus = new Kafka({
  name: "Event Bus",
  description: "Platform-wide event streaming",
  belongsTo: observability
});
const pipelineTopic = new Topic({
  name: "Pipeline Events",
  description: "Jobs waiting for runners",
  belongsTo: eventBus
});
const activityTopic = new Topic({
  name: "Activity Stream",
  description: "Push events, comments, deployments",
  belongsTo: eventBus
});

const metricsStore = new Postgres({
  name: "Metrics Store",
  description: "Usage, billing, analytics",
  belongsTo: observability
});

// ── Flows ──
contributor.opens(webApp, "open MR")
  .then(webApp).sendsRequest(apiGateway, "create merge request")
  .then(apiGateway).sendsRequest(gitHttp, "push commits")
  .then(apiGateway).publishes(pipelineTopic, "enqueue pipeline")
  .then(apiGateway).publishes(activityTopic, "publish activity")
  .scenario("Contributor opens merge request");

ciRunner.subscribes(pipelineTopic, "claim job")
  .then(ciRunner).runs("run tests")
  .then(ciRunner).sendsRequest(apiGateway, "update status")
  .then(ciRunner).publishes(activityTopic, "emit pipeline events")
  .scenario("CI pipeline execution");

maintainer.opens(webApp, "review & deploy")
  .then(webApp).sendsRequest(apiGateway, "approve merge")
  .then(apiGateway).writes(metricsStore, "record deployment")
  .then(apiGateway).publishes(activityTopic, "log deployment")
  .scenario("Maintainer deploys");
`,
  },
  {
    id: 'media-streaming',
    title: 'Global Media Streaming Platform',
    description:
      'Consumer streaming service with device apps, control plane, data plane, recommendations, and CDN edge nodes.',
    code: `import {
  User, SoftwareSystem, Container, DesktopApp, IosApp,
  RestApi, Worker, External, Postgres, Kafka, Topic,
  K8sCluster, CDN, Ingress
} from "@flowconsole/sdk";

const viewer = new User({ name: "Subscriber", description: "Streams movies" });
const operator = new User({ name: "Ops Engineer", description: "Monitors health" });

const streamly = new SoftwareSystem({ name: "Streamly" });
const deviceApps = new Container({ name: "Device Apps", belongsTo: streamly });
const controlPlane = new Container({ name: "Control Plane", belongsTo: streamly });
const dataPlane = new Container({ name: "Data Plane", belongsTo: streamly });
const observability = new Container({ name: "Observability", belongsTo: streamly });

const tvApp = new DesktopApp({
  name: "TV App",
  description: "Smart TV + set-top box UI",
  belongsTo: deviceApps,
});

const mobileApp = new IosApp({
  name: "Mobile App",
  description: "iOS client",
  belongsTo: deviceApps,
});

const authService = new RestApi({
  name: "Identity",
  description: "Login, entitlements",
  belongsTo: controlPlane,
});

const catalogService = new RestApi({
  name: "Catalog",
  description: "Metadata, search, personalization",
  belongsTo: controlPlane,
});

const playbackService = new RestApi({
  name: "Playback Service",
  description: "Session tokens, DRM",
  belongsTo: controlPlane,
});

const ingestPipeline = new Worker({
  name: "Content Ingest",
  description: "Transcodes uploads",
  belongsTo: dataPlane,
});

const edgeCache = new External({
  name: "Global CDN",
  description: "Edge delivery network",
  vendor: "CloudFront"
});

const profilesStore = new Postgres({
  name: "Profiles DB",
  description: "Viewer profiles, settings",
  belongsTo: controlPlane,
});

const recommendationService = new RestApi({
  name: "Recommendations",
  description: "ML ranking service",
  belongsTo: controlPlane,
});

const eventBus = new Kafka({
  name: "Telemetry Bus",
  description: "Streaming telemetry",
  belongsTo: observability,
});
const watchEvents = new Topic({
  name: "Watch Events",
  description: "View, pause, seek telemetry",
  belongsTo: eventBus,
});

const metricsApi = new RestApi({
  name: "Metrics API",
  description: "Real-time health",
  belongsTo: observability,
});

// ── Flows ──
viewer.opens(tvApp, "open app")
  .then(tvApp).sendsRequest(authService, "login")
  .then(tvApp).sendsRequest(catalogService, "browse catalog")
  .then(catalogService).sendsRequest(recommendationService, "personal picks")
  .then(tvApp).sendsRequest(playbackService, "start playback")
  .inParallel(
    () => playbackService.reads(profilesStore, "profile rights"),
    () => playbackService.sendsRequest(edgeCache, "issue token")
  )
  .then(playbackService).publishes(watchEvents, "emit play")
  .scenario("Viewer watches content");

mobileApp.sendsRequest(playbackService, "resume session")
  .inParallel(
    () => playbackService.reads(profilesStore, "device list"),
    () => playbackService.sendsRequest(edgeCache, "refresh CDN token", { kind: 'async' })
  )
  .scenario("Mobile resume");

ingestPipeline.sendsRequest(edgeCache, "push renditions", { kind: 'async' })
  .then(ingestPipeline).publishes(watchEvents, "publish ingest status")
  .scenario("Content ingest");

operator.opens(metricsApi, "check SLOs")
  .then(operator).subscribes(watchEvents, "trace anomalies")
  .scenario("Ops monitoring");

// ── Deployment ──
const prodCluster = new K8sCluster({ name: "prod-us", region: "us-east-1" });
const cdnEdge = new CDN({ name: "CloudFront", provider: "AWS" });
const publicIngress = new Ingress({ name: "Public", host: "streamly.tv", tls: true });

playbackService.deployedOn(prodCluster, { replicas: 10 });
catalogService.deployedOn(prodCluster, { replicas: 5 });
authService.deployedOn(prodCluster, { replicas: 3 });
publicIngress.routesTo(tvApp);
`,
  },
  {
    id: 'opensource-observability',
    title: 'Open-Source Observability Stack',
    description:
      'Community project similar to Kubernetes monitoring suites with control plane, agents, dashboards, storage tiers, and alerting.',
    code: `import {
  User, SoftwareSystem, Container, ReactApp, RestApi,
  Worker, Postgres, Clickhouse, Kafka, Topic
} from "@flowconsole/sdk";

const platformEngineer = new User({ name: "Platform Engineer", description: "Owns monitoring" });
const contributor = new User({ name: "Community Dev", description: "Extends plugins" });

const skyline = new SoftwareSystem({ name: "Skyline Observability" });
const controlPlane = new Container({ name: "Control Plane", belongsTo: skyline });
const dataLake = new Container({ name: "Data Lake", belongsTo: skyline });
const dashboards = new Container({ name: "Dashboards", belongsTo: skyline });
const edgeAgents = new Container({ name: "Cluster Agents", belongsTo: skyline });

const kubeAgent = new Worker({
  name: "Kube Agent",
  description: "Collects metrics + logs",
  belongsTo: edgeAgents,
});

const serviceMap = new RestApi({
  name: "Service Map API",
  description: "Topology + traces",
  belongsTo: controlPlane,
});

const alertManager = new RestApi({
  name: "Alert Manager",
  description: "Rules, paging, webhooks",
  belongsTo: controlPlane,
});

const ingestGateway = new RestApi({
  name: "Ingest Gateway",
  description: "OpenTelemetry collector",
  belongsTo: controlPlane,
});

const timeseriesDb = new Postgres({
  name: "TSDB",
  description: "PromQL-compatible store",
  belongsTo: dataLake,
});

const logStore = new Clickhouse({
  name: "Log Store",
  description: "Columnar logs",
  belongsTo: dataLake,
});

const eventBus = new Kafka({
  name: "Events Bus",
  description: "Platform events",
  belongsTo: controlPlane,
});
const alertsTopic = new Topic({
  name: "Alerts",
  description: "Alerts, deploy hooks",
  belongsTo: eventBus,
});

const pluginRegistry = new RestApi({
  name: "Plugin Registry",
  description: "Hosts visualization plugins",
  belongsTo: dashboards,
});

const explorerUi = new ReactApp({
  name: "Explorer UI",
  description: "Dashboards + alerts",
  belongsTo: dashboards,
});

// ── Flows ──
platformEngineer.opens(explorerUi, "inspect cluster")
  .then(explorerUi).sendsRequest(serviceMap, "fetch topology")
  .then(explorerUi).sendsRequest(alertManager, "list alerts")
  .then(explorerUi).sendsRequest(pluginRegistry, "load plugin")
  .then(explorerUi).publishes(alertsTopic, "audit view")
  .scenario("Engineer inspects cluster");

kubeAgent.sendsRequest(ingestGateway, "ship metrics", { kind: 'async' })
  .then(ingestGateway).writes(timeseriesDb, "store metrics")
  .then(ingestGateway).writes(logStore, "store logs")
  .then(ingestGateway).publishes(alertsTopic, "emit anomalies")
  .scenario("Agent telemetry ingest");

serviceMap.reads(timeseriesDb, "metrics")
  .then(serviceMap).reads(logStore, "logs")
  .then(serviceMap).sendsRequest(alertManager, "fire alerts", { kind: 'event' })
  .scenario("Service map analysis");

contributor.sendsRequest(pluginRegistry, "publish plugin")
  .then(contributor).publishes(alertsTopic, "announce release")
  .scenario("Plugin contribution");
`,
  },
];

export const defaultSampleId = codeSamples[0]?.id ?? 'test-sample';
