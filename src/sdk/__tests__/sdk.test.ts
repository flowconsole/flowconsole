import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Enums
  ElementKind,
  RelationKind,
  StylePreset,
  ShapeKind,
  // Style functions
  getDefaultIconForKind,
  getDefaultShapeForKind,
  // Types
  ComponentStyle,
  ComponentArgs,
  // Base classes
  Component,
  User,
  SoftwareSystem,
  Namespace,
  Container,
  Module,
  External,
  Gateway,
  Worker,
  Database,
  Cache,
  Queue,
  Broker,
  Topic,
  // Deployment classes
  K8sCluster,
  ManagedDatabase,
  Serverless,
  Vm,
  Cdn,
  Ingress,
  // Convenience classes
  RestApi,
  GrpcApi,
  GraphqlApi,
  ReactApp,
  NextApp,
  VueApp,
  AngularApp,
  SvelteApp,
  BlazorApp,
  IosApp,
  AndroidApp,
  DesktopApp,
  Postgres,
  Mysql,
  Mongo,
  Clickhouse,
  Redis,
  Memcached,
  Rabbit,
  Sqs,
  Kafka,
  Nats,
  Pulsar,
  // Runtime and inference
  FlowRuntime,
  FlowBuilder,
  inferRelationships,
  validateBelongsTo,
  buildSnapshot,
  getRuntime,
  // Types
  FlowStep,
  DeploymentRecord,
  InferredRelationship,
} from '../flowconsole-sdk';

// ── Base element classes (13) ──

describe('Base element classes', () => {
  it('User has kind EXTERNAL and role', () => {
    const u = new User({ name: 'Alice', role: 'Admin' });
    expect(u.kind).toBe(ElementKind.EXTERNAL);
    expect(u.name).toBe('Alice');
    expect(u.role).toBe('Admin');
  });

  it('SoftwareSystem has kind SERVICE and domain', () => {
    const s = new SoftwareSystem({ name: 'MySystem', domain: 'e-commerce' });
    expect(s.kind).toBe(ElementKind.SERVICE);
    expect(s.domain).toBe('e-commerce');
  });

  it('Namespace has kind NAMESPACE', () => {
    const n = new Namespace({ name: 'orders-ns' });
    expect(n.kind).toBe(ElementKind.NAMESPACE);
    expect(n.name).toBe('orders-ns');
  });

  it('Container has kind APPLICATION', () => {
    const c = new Container({ name: 'Web App', technology: 'React' });
    expect(c.kind).toBe(ElementKind.APPLICATION);
    expect(c.technology).toBe('React');
  });

  it('Module has kind MODULE', () => {
    const m = new Module({ name: 'Auth Module' });
    expect(m.kind).toBe(ElementKind.MODULE);
  });

  it('External has kind EXTERNAL and vendor', () => {
    const e = new External({ name: 'Stripe', vendor: 'Stripe Inc.' });
    expect(e.kind).toBe(ElementKind.EXTERNAL);
    expect(e.vendor).toBe('Stripe Inc.');
  });

  it('Gateway has kind GATEWAY', () => {
    const g = new Gateway({ name: 'API Gateway' });
    expect(g.kind).toBe(ElementKind.GATEWAY);
  });

  it('Worker has kind WORKER', () => {
    const w = new Worker({ name: 'Email Worker' });
    expect(w.kind).toBe(ElementKind.WORKER);
  });

  it('Database has kind DATABASE and engine', () => {
    const d = new Database({ name: 'Main DB', engine: 'PostgreSQL' });
    expect(d.kind).toBe(ElementKind.DATABASE);
    expect(d.engine).toBe('PostgreSQL');
  });

  it('Cache has kind CACHE and engine', () => {
    const c = new Cache({ name: 'Session Cache', engine: 'Redis' });
    expect(c.kind).toBe(ElementKind.CACHE);
    expect(c.engine).toBe('Redis');
  });

  it('Queue has kind QUEUE and engine', () => {
    const q = new Queue({ name: 'Task Queue', engine: 'RabbitMQ' });
    expect(q.kind).toBe(ElementKind.QUEUE);
    expect(q.engine).toBe('RabbitMQ');
  });

  it('Broker has kind BROKER', () => {
    const b = new Broker({ name: 'Event Bus' });
    expect(b.kind).toBe(ElementKind.BROKER);
  });

  it('Topic has kind TOPIC and partitions', () => {
    const broker = new Broker({ name: 'Kafka' });
    const t = new Topic({ name: 'order.events', partitions: 12, belongsTo: broker });
    expect(t.kind).toBe(ElementKind.TOPIC);
    expect(t.partitions).toBe(12);
    expect(t.belongsTo).toBe(broker);
  });

  it('Component stores all common args', () => {
    const parent = new SoftwareSystem({ name: 'Parent' });
    const style: ComponentStyle = { preset: StylePreset.HIGHLIGHTED, color: '#ff0000' };
    const c = new Container({
      id: 'test-id',
      name: 'Test',
      description: 'A test component',
      technology: 'Node.js',
      properties: { env: 'prod' },
      belongsTo: parent,
      tags: ['important'],
      badge: 'v2',
      tone: 'warning',
      style,
    });
    expect(c.id).toBe('test-id');
    expect(c.description).toBe('A test component');
    expect(c.properties).toEqual({ env: 'prod' });
    expect(c.belongsTo).toBe(parent);
    expect(c.tags).toEqual(['important']);
    expect(c.badge).toBe('v2');
    expect(c.tone).toBe('warning');
    expect(c.style).toEqual(style);
  });
});

// ── Convenience classes (23) ──

describe('Convenience classes', () => {
  describe('API patterns (extend Container)', () => {
    it('RestApi defaults technology to REST API', () => {
      const api = new RestApi({ name: 'Orders API', baseUrl: '/api/v1/orders', openapi: 'orders.yaml' });
      expect(api.kind).toBe(ElementKind.APPLICATION);
      expect(api.technology).toBe('REST API');
      expect(api.baseUrl).toBe('/api/v1/orders');
      expect(api.openapi).toBe('orders.yaml');
    });

    it('RestApi allows technology override', () => {
      const api = new RestApi({ name: 'Custom', technology: 'FastAPI' });
      expect(api.technology).toBe('FastAPI');
    });

    it('GrpcApi defaults technology to gRPC', () => {
      const api = new GrpcApi({ name: 'gRPC Service', proto: 'service.proto' });
      expect(api.technology).toBe('gRPC');
      expect(api.proto).toBe('service.proto');
    });

    it('GraphqlApi defaults technology to GraphQL', () => {
      const api = new GraphqlApi({ name: 'GQL API', schema: 'schema.graphql' });
      expect(api.technology).toBe('GraphQL');
      expect(api.schema).toBe('schema.graphql');
    });
  });

  describe('Web/Mobile/Desktop frameworks (extend Container)', () => {
    const cases: Array<[string, new (args: ComponentArgs) => Container, string]> = [
      ['ReactApp', ReactApp, 'React'],
      ['NextApp', NextApp, 'Next.js'],
      ['VueApp', VueApp, 'Vue.js'],
      ['AngularApp', AngularApp, 'Angular'],
      ['SvelteApp', SvelteApp, 'Svelte'],
      ['BlazorApp', BlazorApp, 'Blazor'],
      ['IosApp', IosApp, 'iOS'],
      ['AndroidApp', AndroidApp, 'Android'],
      ['DesktopApp', DesktopApp, 'Desktop'],
    ];

    for (const [className, Cls, expectedTech] of cases) {
      it(`${className} defaults technology to ${expectedTech}`, () => {
        const c = new Cls({ name: `Test ${className}` });
        expect(c.kind).toBe(ElementKind.APPLICATION);
        expect(c.technology).toBe(expectedTech);
      });
    }

    it('framework app allows technology override', () => {
      const app = new ReactApp({ name: 'My App', technology: 'React 19' });
      expect(app.technology).toBe('React 19');
    });
  });

  describe('Database convenience classes (extend Database)', () => {
    it('Postgres defaults engine to PostgreSQL', () => {
      const db = new Postgres({ name: 'Main' });
      expect(db.kind).toBe(ElementKind.DATABASE);
      expect(db.engine).toBe('PostgreSQL');
    });

    it('Mysql defaults engine to MySQL', () => {
      const db = new Mysql({ name: 'Legacy' });
      expect(db.engine).toBe('MySQL');
    });

    it('Mongo defaults engine to MongoDB', () => {
      const db = new Mongo({ name: 'Documents' });
      expect(db.engine).toBe('MongoDB');
    });

    it('Clickhouse defaults engine to ClickHouse', () => {
      const db = new Clickhouse({ name: 'Analytics' });
      expect(db.engine).toBe('ClickHouse');
    });

    it('DB engine can be overridden', () => {
      const db = new Postgres({ name: 'Custom', engine: 'CockroachDB' });
      expect(db.engine).toBe('CockroachDB');
    });
  });

  describe('Cache convenience classes (extend Cache)', () => {
    it('Redis defaults engine to Redis', () => {
      const c = new Redis({ name: 'Session' });
      expect(c.kind).toBe(ElementKind.CACHE);
      expect(c.engine).toBe('Redis');
    });

    it('Memcached defaults engine to Memcached', () => {
      const c = new Memcached({ name: 'Hot Cache' });
      expect(c.engine).toBe('Memcached');
    });
  });

  describe('Queue convenience classes (extend Queue)', () => {
    it('Rabbit defaults engine to RabbitMQ', () => {
      const q = new Rabbit({ name: 'Tasks' });
      expect(q.kind).toBe(ElementKind.QUEUE);
      expect(q.engine).toBe('RabbitMQ');
    });

    it('Sqs defaults engine to AWS SQS', () => {
      const q = new Sqs({ name: 'Events' });
      expect(q.engine).toBe('AWS SQS');
    });
  });

  describe('Broker convenience classes (extend Broker)', () => {
    it('Kafka defaults technology to Kafka', () => {
      const b = new Kafka({ name: 'Event Bus' });
      expect(b.kind).toBe(ElementKind.BROKER);
      expect(b.technology).toBe('Kafka');
    });

    it('Nats defaults technology to NATS', () => {
      const b = new Nats({ name: 'NATS' });
      expect(b.technology).toBe('NATS');
    });

    it('Pulsar defaults technology to Apache Pulsar', () => {
      const b = new Pulsar({ name: 'Pulsar' });
      expect(b.technology).toBe('Apache Pulsar');
    });
  });
});

// ── Deployment classes (6) ──

describe('Deployment classes', () => {
  it('K8sCluster has kind DEPLOYMENT with region and version', () => {
    const k = new K8sCluster({ name: 'prod-eu', region: 'eu-west-1', version: '1.28' });
    expect(k.kind).toBe(ElementKind.DEPLOYMENT);
    expect(k.region).toBe('eu-west-1');
    expect(k.version).toBe('1.28');
  });

  it('ManagedDatabase has kind DEPLOYMENT with provider and engine', () => {
    const m = new ManagedDatabase({ name: 'RDS', provider: 'AWS RDS', engine: 'PostgreSQL' });
    expect(m.kind).toBe(ElementKind.DEPLOYMENT);
    expect(m.provider).toBe('AWS RDS');
    expect(m.engine).toBe('PostgreSQL');
  });

  it('Serverless has kind DEPLOYMENT with runtime and provider', () => {
    const s = new Serverless({ name: 'Lambda', runtime: 'nodejs20.x', provider: 'AWS' });
    expect(s.kind).toBe(ElementKind.DEPLOYMENT);
    expect(s.runtime).toBe('nodejs20.x');
    expect(s.provider).toBe('AWS');
  });

  it('Vm has kind DEPLOYMENT with os and provider', () => {
    const v = new Vm({ name: 'web-01', os: 'Ubuntu 22.04', provider: 'AWS EC2' });
    expect(v.kind).toBe(ElementKind.DEPLOYMENT);
    expect(v.os).toBe('Ubuntu 22.04');
    expect(v.provider).toBe('AWS EC2');
  });

  it('Cdn has kind DEPLOYMENT with provider', () => {
    const c = new Cdn({ name: 'CloudFront', provider: 'AWS' });
    expect(c.kind).toBe(ElementKind.DEPLOYMENT);
    expect(c.provider).toBe('AWS');
  });

  it('Ingress has kind INGRESS with host and tls', () => {
    const i = new Ingress({ name: 'Public', host: 'shop.example.com', tls: true });
    expect(i.kind).toBe(ElementKind.INGRESS);
    expect(i.host).toBe('shop.example.com');
    expect(i.tls).toBe(true);
  });
});

// ── Flow API ──

describe('Flow API', () => {
  let runtime: FlowRuntime;

  beforeEach(() => {
    runtime = new FlowRuntime();
  });

  it('sendsRequest creates a flow step', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const builder = runtime.startFlow(a);
    builder.sendsRequest(b, 'call B');
    expect(runtime.unnamedFlows).toHaveLength(1);
    expect(runtime.unnamedFlows[0]).toHaveLength(1);
    expect(runtime.unnamedFlows[0][0].source).toBe(a);
    expect(runtime.unnamedFlows[0][0].target).toBe(b);
    expect(runtime.unnamedFlows[0][0].label).toBe('call B');
    expect(runtime.unnamedFlows[0][0].method).toBe('sendsRequest');
  });

  it('sendsRequestTo is alias for sendsRequest', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const builder = runtime.startFlow(a);
    builder.sendsRequestTo(b, 'alias');
    expect(runtime.unnamedFlows[0][0].method).toBe('sendsRequest');
  });

  it('getDataFrom creates a flow step', () => {
    const a = new Container({ name: 'A' });
    const db = new Postgres({ name: 'DB' });
    const builder = runtime.startFlow(a);
    builder.getDataFrom(db, 'query');
    expect(runtime.unnamedFlows[0][0].method).toBe('getDataFrom');
    expect(runtime.unnamedFlows[0][0].target).toBe(db);
  });

  it('executesRequest creates a step with no target', () => {
    const a = new Container({ name: 'A' });
    const builder = runtime.startFlow(a);
    builder.executesRequest('process');
    expect(runtime.unnamedFlows[0][0].method).toBe('executesRequest');
    expect(runtime.unnamedFlows[0][0].target).toBeUndefined();
  });

  it('then switches the current source', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const c = new Container({ name: 'C' });
    const builder = runtime.startFlow(a);
    builder.sendsRequest(b, 'A->B');
    builder.then(b).sendsRequest(c, 'B->C');
    const steps = runtime.unnamedFlows[0];
    expect(steps).toHaveLength(2);
    expect(steps[0].source).toBe(a);
    expect(steps[0].target).toBe(b);
    expect(steps[1].source).toBe(b);
    expect(steps[1].target).toBe(c);
  });

  it('inParallel returns builder for chaining', () => {
    const a = new Container({ name: 'A' });
    const builder = runtime.startFlow(a);
    const result = builder.inParallel();
    expect(result).toBe(builder);
  });

  describe('Convenience flow wrappers', () => {
    it('opens delegates to sendsRequest with sync kind', () => {
      const a = new User({ name: 'User' });
      const b = new ReactApp({ name: 'Web' });
      const builder = runtime.startFlow(a);
      builder.opens(b, 'open app');
      const step = runtime.unnamedFlows[0][0];
      expect(step.method).toBe('sendsRequest');
      expect(step.options?.kind).toBe('sync');
    });

    it('publishes delegates to sendsRequest with event kind', () => {
      const a = new Container({ name: 'A' });
      const broker = new Kafka({ name: 'Bus' });
      const topic = new Topic({ name: 'events', belongsTo: broker });
      const builder = runtime.startFlow(a);
      builder.publishes(topic, 'emit event');
      const step = runtime.unnamedFlows[0][0];
      expect(step.method).toBe('sendsRequest');
      expect(step.options?.kind).toBe('event');
    });

    it('emits is alias for publishes', () => {
      const a = new Container({ name: 'A' });
      const broker = new Kafka({ name: 'Bus' });
      const topic = new Topic({ name: 'events', belongsTo: broker });
      const builder = runtime.startFlow(a);
      builder.emits(topic, 'emit');
      const step = runtime.unnamedFlows[0][0];
      expect(step.options?.kind).toBe('event');
    });

    it('subscribes delegates to getDataFrom', () => {
      const a = new Container({ name: 'A' });
      const broker = new Kafka({ name: 'Bus' });
      const topic = new Topic({ name: 'events', belongsTo: broker });
      const builder = runtime.startFlow(a);
      builder.subscribes(topic, 'consume');
      const step = runtime.unnamedFlows[0][0];
      expect(step.method).toBe('getDataFrom');
    });

    it('reads delegates to getDataFrom', () => {
      const a = new Container({ name: 'A' });
      const db = new Postgres({ name: 'DB' });
      const builder = runtime.startFlow(a);
      builder.reads(db, 'query');
      const step = runtime.unnamedFlows[0][0];
      expect(step.method).toBe('getDataFrom');
    });

    it('writes delegates to sendsRequest with sync kind', () => {
      const a = new Container({ name: 'A' });
      const db = new Postgres({ name: 'DB' });
      const builder = runtime.startFlow(a);
      builder.writes(db, 'insert');
      const step = runtime.unnamedFlows[0][0];
      expect(step.method).toBe('sendsRequest');
      expect(step.options?.kind).toBe('sync');
    });

    it('runs delegates to executesRequest', () => {
      const a = new Container({ name: 'A' });
      const builder = runtime.startFlow(a);
      builder.runs('process data');
      const step = runtime.unnamedFlows[0][0];
      expect(step.method).toBe('executesRequest');
      expect(step.target).toBeUndefined();
    });
  });

  describe('Component flow methods use global runtime', () => {
    it('Component.sendsRequest creates flow on global runtime', () => {
      const a = new Container({ name: 'A' });
      const b = new Container({ name: 'B' });
      a.sendsRequest(b, 'test');
      const rt = getRuntime();
      expect(rt.unnamedFlows.length).toBeGreaterThan(0);
    });

    it('Component convenience methods work', () => {
      const user = new User({ name: 'U' });
      const web = new ReactApp({ name: 'Web' });
      user.opens(web, 'opens web');
      const rt = getRuntime();
      const lastFlow = rt.unnamedFlows[rt.unnamedFlows.length - 1];
      expect(lastFlow[0].method).toBe('sendsRequest');
      expect(lastFlow[0].options?.kind).toBe('sync');
    });
  });
});

// ── Scenario ──

describe('Scenario', () => {
  let runtime: FlowRuntime;

  beforeEach(() => {
    runtime = new FlowRuntime();
  });

  it('scenario names and registers a flow', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const builder = runtime.startFlow(a);
    builder.sendsRequest(b, 'call');
    builder.scenario('test-scenario');
    expect(runtime.scenarios['test-scenario']).toBeDefined();
    expect(runtime.scenarios['test-scenario']).toHaveLength(1);
    expect(runtime.unnamedFlows).toHaveLength(0);
  });

  it('multiple scenarios can coexist', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });

    const builder1 = runtime.startFlow(a);
    builder1.sendsRequest(b, 'first');
    builder1.scenario('scenario-1');

    const builder2 = runtime.startFlow(a);
    builder2.sendsRequest(b, 'second');
    builder2.scenario('scenario-2');

    expect(Object.keys(runtime.scenarios)).toHaveLength(2);
    expect(runtime.scenarios['scenario-1'][0].label).toBe('first');
    expect(runtime.scenarios['scenario-2'][0].label).toBe('second');
  });

  it('flow chain with then and scenario', () => {
    const user = new User({ name: 'Customer' });
    const web = new ReactApp({ name: 'Web' });
    const api = new RestApi({ name: 'API' });
    const db = new Postgres({ name: 'DB' });

    const builder = runtime.startFlow(user);
    builder.opens(web, 'opens');
    builder.then(web).sendsRequest(api, 'GET /items');
    builder.then(api).reads(db, 'query items');
    builder.scenario('browse');

    const steps = runtime.scenarios['browse'];
    expect(steps).toHaveLength(3);
    expect(steps[0].source).toBe(user);
    expect(steps[0].target).toBe(web);
    expect(steps[1].source).toBe(web);
    expect(steps[1].target).toBe(api);
    expect(steps[2].source).toBe(api);
    expect(steps[2].target).toBe(db);
  });
});

// ── Inference of relationships ──

describe('inferRelationships', () => {
  it('sendsRequest to Container → Calls', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const steps: FlowStep[] = [
      { source: a, target: b, label: 'call', method: 'sendsRequest' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels).toHaveLength(1);
    expect(rels[0].relationKind).toBe(RelationKind.CALLS);
    expect(rels[0].labels).toEqual(['call']);
  });

  it('sendsRequest to Database → Uses', () => {
    const a = new Container({ name: 'A' });
    const db = new Postgres({ name: 'DB' });
    const steps: FlowStep[] = [
      { source: a, target: db, label: 'write', method: 'sendsRequest', options: { kind: 'sync' } },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels).toHaveLength(1);
    expect(rels[0].relationKind).toBe(RelationKind.USES);
  });

  it('sendsRequest to Cache → Uses', () => {
    const a = new Container({ name: 'A' });
    const cache = new Redis({ name: 'Cache' });
    const steps: FlowStep[] = [
      { source: a, target: cache, label: 'check', method: 'sendsRequest', options: { kind: 'sync' } },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.USES);
  });

  it('sendsRequest with event kind → Produces', () => {
    const a = new Container({ name: 'A' });
    const broker = new Kafka({ name: 'Bus' });
    const topic = new Topic({ name: 'events', belongsTo: broker });
    const steps: FlowStep[] = [
      { source: a, target: topic, label: 'emit', method: 'sendsRequest', options: { kind: 'event' } },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.PRODUCES);
  });

  it('sendsRequest with dependency kind → DependsOn', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const steps: FlowStep[] = [
      { source: a, target: b, method: 'sendsRequest', options: { kind: 'dependency' } },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.DEPENDS_ON);
  });

  it('sendsRequest with async kind → Calls', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const steps: FlowStep[] = [
      { source: a, target: b, label: 'async call', method: 'sendsRequest', options: { kind: 'async' } },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.CALLS);
  });

  it('getDataFrom Database → Uses', () => {
    const a = new Container({ name: 'A' });
    const db = new Postgres({ name: 'DB' });
    const steps: FlowStep[] = [
      { source: a, target: db, label: 'read', method: 'getDataFrom' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.USES);
  });

  it('getDataFrom Cache → Uses', () => {
    const a = new Container({ name: 'A' });
    const cache = new Redis({ name: 'Cache' });
    const steps: FlowStep[] = [
      { source: a, target: cache, label: 'get', method: 'getDataFrom' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.USES);
  });

  it('getDataFrom Topic → Consumes', () => {
    const a = new Container({ name: 'A' });
    const broker = new Kafka({ name: 'Bus' });
    const topic = new Topic({ name: 'events', belongsTo: broker });
    const steps: FlowStep[] = [
      { source: a, target: topic, label: 'subscribe', method: 'getDataFrom' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.CONSUMES);
  });

  it('getDataFrom Queue → Consumes', () => {
    const a = new Container({ name: 'A' });
    const queue = new Rabbit({ name: 'Tasks' });
    const steps: FlowStep[] = [
      { source: a, target: queue, label: 'dequeue', method: 'getDataFrom' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.CONSUMES);
  });

  it('getDataFrom Container → Calls', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const steps: FlowStep[] = [
      { source: a, target: b, label: 'fetch', method: 'getDataFrom' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels[0].relationKind).toBe(RelationKind.CALLS);
  });

  it('executesRequest creates no relationship', () => {
    const a = new Container({ name: 'A' });
    const steps: FlowStep[] = [
      { source: a, target: undefined, label: 'process', method: 'executesRequest' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels).toHaveLength(0);
  });

  it('belongsTo generates Contains relationship', () => {
    const sys = new SoftwareSystem({ name: 'Shop' });
    const api = new RestApi({ name: 'API', belongsTo: sys });
    const rels = inferRelationships([sys, api], [], []);
    expect(rels).toHaveLength(1);
    expect(rels[0].source).toBe(sys);
    expect(rels[0].target).toBe(api);
    expect(rels[0].relationKind).toBe(RelationKind.CONTAINS);
  });

  it('deduplicates same source/target/kind and merges labels', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const steps: FlowStep[] = [
      { source: a, target: b, label: 'first call', method: 'sendsRequest' },
      { source: a, target: b, label: 'second call', method: 'sendsRequest' },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels).toHaveLength(1);
    expect(rels[0].relationKind).toBe(RelationKind.CALLS);
    expect(rels[0].labels).toEqual(['first call', 'second call']);
  });

  it('different relationKind between same pair creates separate relationships', () => {
    const a = new Container({ name: 'A' });
    const b = new Container({ name: 'B' });
    const steps: FlowStep[] = [
      { source: a, target: b, label: 'call', method: 'sendsRequest' },
      { source: a, target: b, label: 'depends', method: 'sendsRequest', options: { kind: 'dependency' } },
    ];
    const rels = inferRelationships([], [steps], []);
    expect(rels).toHaveLength(2);
    const kinds = rels.map(r => r.relationKind).sort();
    expect(kinds).toEqual([RelationKind.CALLS, RelationKind.DEPENDS_ON]);
  });

  it('deployment records are included', () => {
    const api = new RestApi({ name: 'API' });
    const cluster = new K8sCluster({ name: 'prod' });
    const deployments: DeploymentRecord[] = [{
      source: api,
      target: cluster,
      relationKind: RelationKind.DEPLOYED_ON,
      options: { replicas: 3 },
    }];
    const rels = inferRelationships([], [], deployments);
    expect(rels).toHaveLength(1);
    expect(rels[0].relationKind).toBe(RelationKind.DEPLOYED_ON);
    expect(rels[0].source).toBe(api);
    expect(rels[0].target).toBe(cluster);
  });
});

// ── Validation of belongsTo ──

describe('validateBelongsTo', () => {
  it('Topic without Broker throws', () => {
    const topic = new Topic({ name: 'orphan', partitions: 1 });
    expect(() => validateBelongsTo([topic])).toThrow('Topic "orphan" must have a Broker as belongsTo parent');
  });

  it('Topic with non-Broker parent throws', () => {
    const sys = new SoftwareSystem({ name: 'Shop' });
    const topic = new Topic({ name: 'bad', belongsTo: sys as any });
    expect(() => validateBelongsTo([topic])).toThrow('Topic "bad" must have a Broker as belongsTo parent');
  });

  it('Topic with Broker parent passes', () => {
    const broker = new Kafka({ name: 'Bus' });
    const topic = new Topic({ name: 'good', belongsTo: broker });
    expect(() => validateBelongsTo([topic])).not.toThrow();
  });

  it('SoftwareSystem with parent throws', () => {
    const parent = new SoftwareSystem({ name: 'Parent' });
    const child = new SoftwareSystem({ name: 'Child', belongsTo: parent as any });
    expect(() => validateBelongsTo([child])).toThrow('SoftwareSystem "Child" cannot have a parent');
  });

  it('Container with SoftwareSystem parent passes', () => {
    const sys = new SoftwareSystem({ name: 'Shop' });
    const c = new Container({ name: 'API', belongsTo: sys });
    expect(() => validateBelongsTo([c])).not.toThrow();
  });

  it('Container with invalid parent throws', () => {
    const db = new Database({ name: 'DB' });
    const c = new Container({ name: 'API', belongsTo: db });
    expect(() => validateBelongsTo([c])).toThrow('cannot belong to');
  });

  it('Module can belong to Container', () => {
    const container = new Container({ name: 'App' });
    const mod = new Module({ name: 'Auth', belongsTo: container });
    expect(() => validateBelongsTo([mod])).not.toThrow();
  });

  it('Module can belong to SoftwareSystem', () => {
    const sys = new SoftwareSystem({ name: 'Shop' });
    const mod = new Module({ name: 'Auth', belongsTo: sys });
    expect(() => validateBelongsTo([mod])).not.toThrow();
  });

  it('Namespace can belong to SoftwareSystem', () => {
    const sys = new SoftwareSystem({ name: 'Shop' });
    const ns = new Namespace({ name: 'orders', belongsTo: sys });
    expect(() => validateBelongsTo([ns])).not.toThrow();
  });

  it('Elements without belongsTo pass validation', () => {
    const entities = [
      new User({ name: 'Alice' }),
      new SoftwareSystem({ name: 'Shop' }),
      new Container({ name: 'Web' }),
      new Database({ name: 'DB' }),
    ];
    expect(() => validateBelongsTo(entities)).not.toThrow();
  });
});

// ── Deployment methods ──

describe('Deployment methods', () => {
  it('deployedOn registers DeployedOn relationship', () => {
    const api = new RestApi({ name: 'API' });
    const cluster = new K8sCluster({ name: 'prod' });
    const rt = getRuntime();
    const beforeCount = rt.deployments.length;
    api.deployedOn(cluster, { replicas: 3 });
    const after = rt.deployments;
    const dep = after[after.length - 1];
    expect(dep.source).toBe(api);
    expect(dep.target).toBe(cluster);
    expect(dep.relationKind).toBe(RelationKind.DEPLOYED_ON);
    expect(dep.options).toEqual({ replicas: 3 });
  });

  it('routesTo registers RoutesTo relationship', () => {
    const ingress = new Ingress({ name: 'Public', host: 'example.com' });
    const gateway = new Gateway({ name: 'GW' });
    const rt = getRuntime();
    ingress.routesTo(gateway);
    const dep = rt.deployments[rt.deployments.length - 1];
    expect(dep.relationKind).toBe(RelationKind.ROUTES_TO);
    expect(dep.source).toBe(ingress);
    expect(dep.target).toBe(gateway);
  });

  it('exposes registers Exposes relationship', () => {
    const gateway = new Gateway({ name: 'GW' });
    const api = new RestApi({ name: 'API' });
    const rt = getRuntime();
    gateway.exposes(api, { path: '/api/orders' });
    const dep = rt.deployments[rt.deployments.length - 1];
    expect(dep.relationKind).toBe(RelationKind.EXPOSES);
    expect(dep.options).toEqual({ path: '/api/orders' });
  });
});

// ── Style defaults ──

describe('Style functions', () => {
  describe('getDefaultIconForKind', () => {
    const iconCases: [ElementKind, string][] = [
      [ElementKind.EXTERNAL, 'cloud'],
      [ElementKind.SERVICE, 'system'],
      [ElementKind.APPLICATION, 'api'],
      [ElementKind.ENDPOINT, 'api'],
      [ElementKind.FUNCTION, 'api'],
      [ElementKind.MODULE, 'system'],
      [ElementKind.NAMESPACE, 'system'],
      [ElementKind.CLASS, 'system'],
      [ElementKind.INTERFACE, 'system'],
      [ElementKind.GATEWAY, 'gateway'],
      [ElementKind.INGRESS, 'gateway'],
      [ElementKind.WORKER, 'worker'],
      [ElementKind.PRODUCER, 'worker'],
      [ElementKind.CONSUMER, 'worker'],
      [ElementKind.DATABASE, 'database'],
      [ElementKind.CACHE, 'cache'],
      [ElementKind.QUEUE, 'queue'],
      [ElementKind.BROKER, 'queue'],
      [ElementKind.TOPIC, 'topic'],
      [ElementKind.DEPLOYMENT, 'deployment'],
    ];

    for (const [kind, expected] of iconCases) {
      it(`${kind} → ${expected}`, () => {
        expect(getDefaultIconForKind(kind)).toBe(expected);
      });
    }
  });

  describe('getDefaultShapeForKind', () => {
    it('DATABASE → cylinder', () => {
      expect(getDefaultShapeForKind(ElementKind.DATABASE)).toBe(ShapeKind.CYLINDER);
    });

    it('CACHE → cylinder', () => {
      expect(getDefaultShapeForKind(ElementKind.CACHE)).toBe(ShapeKind.CYLINDER);
    });

    it('QUEUE → pipe', () => {
      expect(getDefaultShapeForKind(ElementKind.QUEUE)).toBe(ShapeKind.PIPE);
    });

    it('TOPIC → pipe', () => {
      expect(getDefaultShapeForKind(ElementKind.TOPIC)).toBe(ShapeKind.PIPE);
    });

    it('EXTERNAL → cloud', () => {
      expect(getDefaultShapeForKind(ElementKind.EXTERNAL)).toBe(ShapeKind.CLOUD);
    });

    it('GATEWAY → hexagon', () => {
      expect(getDefaultShapeForKind(ElementKind.GATEWAY)).toBe(ShapeKind.HEXAGON);
    });

    it('INGRESS → hexagon', () => {
      expect(getDefaultShapeForKind(ElementKind.INGRESS)).toBe(ShapeKind.HEXAGON);
    });

    it('APPLICATION → rectangle (default)', () => {
      expect(getDefaultShapeForKind(ElementKind.APPLICATION)).toBe(ShapeKind.RECTANGLE);
    });

    it('SERVICE → rectangle (default)', () => {
      expect(getDefaultShapeForKind(ElementKind.SERVICE)).toBe(ShapeKind.RECTANGLE);
    });
  });

  describe('Style on component', () => {
    it('preset is stored on component', () => {
      const c = new Container({
        name: 'C',
        style: { preset: StylePreset.CRITICAL, color: '#ff0000' },
      });
      expect(c.style?.preset).toBe(StylePreset.CRITICAL);
      expect(c.style?.color).toBe('#ff0000');
    });

    it('icon formats are accepted', () => {
      // Built-in name
      const c1 = new Container({ name: 'A', style: { icon: 'database' } });
      expect(c1.style?.icon).toBe('database');

      // URL
      const c2 = new Container({ name: 'B', style: { icon: 'https://example.com/icon.svg' } });
      expect(c2.style?.icon).toBe('https://example.com/icon.svg');

      // Relative path
      const c3 = new Container({ name: 'C', style: { icon: './icons/my.svg' } });
      expect(c3.style?.icon).toBe('./icons/my.svg');

      // Base64 data URL
      const dataUrl = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
      const c4 = new Container({ name: 'D', style: { icon: dataUrl } });
      expect(c4.style?.icon).toBe(dataUrl);
    });

    it('shape override is stored', () => {
      const c = new Container({ name: 'C', style: { shape: ShapeKind.HEXAGON } });
      expect(c.style?.shape).toBe(ShapeKind.HEXAGON);
    });

    it('backgroundColor and borderColor stored', () => {
      const c = new Container({
        name: 'C',
        style: { backgroundColor: '#000', borderColor: '#fff' },
      });
      expect(c.style?.backgroundColor).toBe('#000');
      expect(c.style?.borderColor).toBe('#fff');
    });
  });
});

// ── buildSnapshot ──

describe('buildSnapshot', () => {
  it('builds a complete snapshot with entities, relationships, and scenarios', () => {
    const runtime = new FlowRuntime();
    const sys = new SoftwareSystem({ name: 'Shop' });
    const api = new RestApi({ name: 'API', belongsTo: sys });
    const db = new Postgres({ name: 'DB', belongsTo: sys });
    const broker = new Kafka({ name: 'Bus', belongsTo: sys });
    const topic = new Topic({ name: 'events', belongsTo: broker });
    const cluster = new K8sCluster({ name: 'prod' });

    // Flow
    const builder = runtime.startFlow(api);
    builder.reads(db, 'query');
    builder.then(api).publishes(topic, 'emit');
    builder.scenario('process-order');

    // Deployment
    runtime._registerDeployment({
      source: api,
      target: cluster,
      relationKind: RelationKind.DEPLOYED_ON,
    });

    const entities = [sys, api, db, broker, topic, cluster];
    const snapshot = buildSnapshot(entities, runtime);

    expect(snapshot.entities).toBe(entities);
    expect(snapshot.scenarios['process-order']).toBeDefined();

    // Contains: sys->api, sys->db, sys->broker, broker->topic = 4
    // Flow: api->db (Uses), api->topic (Produces) = 2
    // Deployment: api->cluster (DeployedOn) = 1
    // Total = 7
    expect(snapshot.relationships).toHaveLength(7);

    const kinds = snapshot.relationships.map(r => r.relationKind).sort();
    expect(kinds).toEqual([
      RelationKind.CONTAINS,
      RelationKind.CONTAINS,
      RelationKind.CONTAINS,
      RelationKind.CONTAINS,
      RelationKind.DEPLOYED_ON,
      RelationKind.PRODUCES,
      RelationKind.USES, // api reads db → getDataFrom on Database → Uses
    ].sort());
  });

  it('throws on invalid belongsTo', () => {
    const runtime = new FlowRuntime();
    const topic = new Topic({ name: 'orphan' });
    expect(() => buildSnapshot([topic], runtime)).toThrow('Broker');
  });
});
