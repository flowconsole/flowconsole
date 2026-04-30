import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Enums
  ElementKind,
  RelationKind,
  // DTO types
  ElementDto,
  ModelSnapshotDto,
  FlowDto,
  FlowStepDto,
  // Classes
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
  K8sCluster,
  ManagedDatabase,
  Serverless,
  Vm,
  Cdn,
  Ingress,
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
  // Functions
  buildSnapshot,
  resetRuntime,
  getRuntime,
  computeRelationshipId,
  relationKindToConventionString,
} from '../flowconsole-sdk';

beforeEach(() => {
  resetRuntime();
});

// ── Per-ElementKind round-trip tests ──

describe('Per-ElementKind round-trip', () => {
  const kindTests: Array<{ name: string; create: () => Component; expectedKind: ElementKind }> = [
    // Code layer
    { name: 'Class', create: () => new Component(ElementKind.CLASS, { id: 'my-class', name: 'MyClass' }), expectedKind: ElementKind.CLASS },
    { name: 'Interface', create: () => new Component(ElementKind.INTERFACE, { id: 'my-iface', name: 'MyInterface' }), expectedKind: ElementKind.INTERFACE },
    { name: 'Endpoint', create: () => new Component(ElementKind.ENDPOINT, { id: 'my-ep', name: 'MyEndpoint', properties: { httpMethod: 'GET' } }), expectedKind: ElementKind.ENDPOINT },
    { name: 'Function', create: () => new Component(ElementKind.FUNCTION, { id: 'my-fn', name: 'MyFunction' }), expectedKind: ElementKind.FUNCTION },
    { name: 'Producer', create: () => new Component(ElementKind.PRODUCER, { id: 'my-prod', name: 'MyProducer' }), expectedKind: ElementKind.PRODUCER },
    { name: 'Consumer', create: () => new Component(ElementKind.CONSUMER, { id: 'my-cons', name: 'MyConsumer' }), expectedKind: ElementKind.CONSUMER },
    // Infra layer
    { name: 'Deployment (K8sCluster)', create: () => new K8sCluster({ id: 'k8s', name: 'K8sCluster' }), expectedKind: ElementKind.DEPLOYMENT },
    { name: 'Database', create: () => new Database({ id: 'db', name: 'MainDB', engine: 'PostgreSQL' }), expectedKind: ElementKind.DATABASE },
    { name: 'Queue', create: () => new Queue({ id: 'q', name: 'TaskQueue', engine: 'RabbitMQ' }), expectedKind: ElementKind.QUEUE },
    { name: 'Cache', create: () => new Cache({ id: 'cache', name: 'AppCache', engine: 'Redis' }), expectedKind: ElementKind.CACHE },
    { name: 'Ingress', create: () => new Ingress({ id: 'ing', name: 'MainIngress', host: 'api.example.com', properties: { host: 'api.example.com' } }), expectedKind: ElementKind.INGRESS },
    { name: 'Namespace', create: () => new Namespace({ id: 'ns', name: 'DefaultNS' }), expectedKind: ElementKind.NAMESPACE },
    { name: 'Broker', create: () => new Broker({ id: 'broker', name: 'EventBroker' }), expectedKind: ElementKind.BROKER },
    {
      name: 'Topic',
      create: () => {
        const broker = new Broker({ id: 'topic-broker', name: 'TopicBroker' });
        return new Topic({ id: 'topic', name: 'EventTopic', partitions: 12, belongsTo: broker, properties: { partitions: '12' } });
      },
      expectedKind: ElementKind.TOPIC,
    },
    // Architecture layer
    { name: 'Service (SoftwareSystem)', create: () => new SoftwareSystem({ id: 'svc', name: 'UserService' }), expectedKind: ElementKind.SERVICE },
    { name: 'Application (Container)', create: () => new Container({ id: 'app', name: 'WebApp' }), expectedKind: ElementKind.APPLICATION },
    { name: 'Module', create: () => new Module({ id: 'mod', name: 'AuthModule' }), expectedKind: ElementKind.MODULE },
    { name: 'External', create: () => new External({ id: 'ext', name: 'Stripe' }), expectedKind: ElementKind.EXTERNAL },
    { name: 'Gateway', create: () => new Gateway({ id: 'gw', name: 'APIGateway' }), expectedKind: ElementKind.GATEWAY },
    { name: 'Worker', create: () => new Worker({ id: 'wrk', name: 'BackgroundWorker' }), expectedKind: ElementKind.WORKER },
  ];

  it.each(kindTests)('$name round-trips through toDto()', ({ create, expectedKind }) => {
    const comp = create();
    const dto = comp.toDto();

    expect(dto.id).toBe(comp.id);
    expect(dto.kind).toBe(expectedKind);
    expect(dto.name).toBe(comp.name ?? comp.id);
    if (comp.description) expect(dto.description).toBe(comp.description);
    if (comp.technology) expect(dto.technology).toBe(comp.technology);
    if (comp.belongsTo) expect(dto.parentId).toBe(comp.belongsTo.id);
    if (comp.properties && Object.keys(comp.properties).length > 0) expect(dto.properties).toEqual(comp.properties);
    if (comp.tags && comp.tags.length > 0) expect(dto.tags).toEqual(comp.tags);
  });

  it.each(kindTests)('$name round-trips through _toModelSnapshotDto()', ({ create, expectedKind }) => {
    const comp = create();
    // Collect all entities needed (including parents)
    const entities: Component[] = [];
    if (comp.belongsTo) entities.push(comp.belongsTo);
    entities.push(comp);

    const snapshot = buildSnapshot(entities);
    const snapshotDto = snapshot._toModelSnapshotDto();

    expect(snapshotDto.$schema).toBe('https://flowconsole.tech/contracts/model-snapshot/v1/schema.json');
    expect(snapshotDto.schemaVersion).toBe('1.1.0');
    expect(snapshotDto.source).toBe('Git');

    const matchingElement = snapshotDto.elements.find(e => e.id === comp.id);
    expect(matchingElement).toBeDefined();
    expect(matchingElement!.kind).toBe(expectedKind);
  });
});

// ── toJson() byte-stability ──

describe('toJson() byte-stability', () => {
  it('produces identical output on two calls with same input', () => {
    const svc = new SoftwareSystem({ id: 'svc', name: 'Service' });
    const db = new Database({ id: 'db', name: 'Database' });
    svc.calls(db, 'query').scenario('data-fetch');

    const snapshot = buildSnapshot([svc, db]);
    const json1 = snapshot.toJson();
    const json2 = snapshot.toJson();

    expect(json1).toBe(json2);
  });

  it('canonicalReplacer sorts keys deterministically', () => {
    const svc = new SoftwareSystem({ id: 'svc', name: 'Service', description: 'A service', technology: 'Node.js' });
    const snapshot = buildSnapshot([svc]);
    const json = snapshot.toJson();
    const parsed = JSON.parse(json);

    // Verify keys are sorted at top level
    const topKeys = Object.keys(parsed);
    const sortedTopKeys = [...topKeys].sort();
    expect(topKeys).toEqual(sortedTopKeys);

    // Verify element keys are sorted
    if (parsed.elements.length > 0) {
      const elemKeys = Object.keys(parsed.elements[0]);
      const sortedElemKeys = [...elemKeys].sort();
      expect(elemKeys).toEqual(sortedElemKeys);
    }
  });
});

describe('computeRelationshipId', () => {
  const testCases = [
    { srcId: 'webapp', tgtId: 'api', kind: RelationKind.CALLS, expected: 'webapp_calls_api' },
    { srcId: 'api', tgtId: 'db', kind: RelationKind.USES, expected: 'api_uses_db' },
    { srcId: 'api', tgtId: 'redis', kind: RelationKind.DEPENDS_ON, expected: 'api_dependsOn_redis' },
    { srcId: 'chart', tgtId: 'wkld', kind: RelationKind.CONTAINS, expected: 'chart_contains_wkld' },
    { srcId: 'svc', tgtId: 'wkld', kind: RelationKind.DEPLOYED_ON, expected: 'svc_deployedOn_wkld' },
    { srcId: 'root', tgtId: 'api', kind: RelationKind.EXPOSES, expected: 'root_exposes_api' },
    { srcId: 'app', tgtId: 'events', kind: RelationKind.PRODUCES, expected: 'app_produces_events' },
    { srcId: 'worker', tgtId: 'queue', kind: RelationKind.CONSUMES, expected: 'worker_consumes_queue' },
    { srcId: 'mod', tgtId: 'iface', kind: RelationKind.IMPLEMENTS, expected: 'mod_implements_iface' },
    { srcId: 'app', tgtId: 'lib', kind: RelationKind.IMPORTS, expected: 'app_imports_lib' },
    { srcId: 'gw', tgtId: 'svc', kind: RelationKind.ROUTES_TO, expected: 'gw_routesTo_svc' },
  ];

  it.each(testCases)(
    '$srcId --$kind--> $tgtId = $expected',
    ({ srcId, tgtId, kind, expected }) => {
      const source = new Component(ElementKind.SERVICE, { id: srcId, name: srcId });
      const target = new Component(ElementKind.SERVICE, { id: tgtId, name: tgtId });
      expect(computeRelationshipId(source, target, kind)).toBe(expected);
    },
  );
});

describe('relationKindToConventionString', () => {
  it('lowercases single-word kinds', () => {
    expect(relationKindToConventionString(RelationKind.CALLS)).toBe('calls');
    expect(relationKindToConventionString(RelationKind.USES)).toBe('uses');
    expect(relationKindToConventionString(RelationKind.CONTAINS)).toBe('contains');
    expect(relationKindToConventionString(RelationKind.EXPOSES)).toBe('exposes');
    expect(relationKindToConventionString(RelationKind.PRODUCES)).toBe('produces');
    expect(relationKindToConventionString(RelationKind.CONSUMES)).toBe('consumes');
    expect(relationKindToConventionString(RelationKind.IMPORTS)).toBe('imports');
    expect(relationKindToConventionString(RelationKind.IMPLEMENTS)).toBe('implements');
  });

  it('preserves camelCase for multi-word kinds', () => {
    expect(relationKindToConventionString(RelationKind.DEPENDS_ON)).toBe('dependsOn');
    expect(relationKindToConventionString(RelationKind.DEPLOYED_ON)).toBe('deployedOn');
    expect(relationKindToConventionString(RelationKind.ROUTES_TO)).toBe('routesTo');
  });
});

// ── Flow emission: scenarios → flows array ──

describe('Flow emission', () => {
  it('single named flow with edge steps computes relationshipId correctly', () => {
    const webapp = new SoftwareSystem({ id: 'webapp', name: 'WebApp' });
    const api = new SoftwareSystem({ id: 'api', name: 'API' });
    const db = new Database({ id: 'db', name: 'DB' });

    webapp.calls(api, 'POST /login').sendsRequest(db, 'SELECT user').scenario('login');

    const snapshot = buildSnapshot([webapp, api, db]);
    const dto = snapshot._toModelSnapshotDto();

    expect(dto.flows).not.toBeNull();
    expect(dto.flows!.length).toBe(1);

    const flow = dto.flows![0];
    expect(flow.id.startsWith('login-')).toBe(true);
    expect(flow.name).toBe('login');
    expect(flow.steps.length).toBe(2);

    // First step: webapp calls api
    expect(flow.steps[0].sourceElementId).toBe('webapp');
    expect(flow.steps[0].relationshipId).toBe('webapp_calls_api');
    expect(flow.steps[0].label).toBe('POST /login');

    // Second step: api sendsRequest db (Database target → Uses)
    expect(flow.steps[1].sourceElementId).toBe('api');
    expect(flow.steps[1].relationshipId).toBe('api_uses_db');
    expect(flow.steps[1].label).toBe('SELECT user');
  });

  it('action step (executesRequest) has relationshipId=null and label preserved', () => {
    const api = new SoftwareSystem({ id: 'api', name: 'API' });

    api.executesRequest('validate credentials').scenario('validate');

    const snapshot = buildSnapshot([api]);
    const dto = snapshot._toModelSnapshotDto();

    expect(dto.flows).not.toBeNull();
    const flow = dto.flows![0];
    expect(flow.steps.length).toBe(1);
    expect(flow.steps[0].sourceElementId).toBe('api');
    expect(flow.steps[0].relationshipId).toBeNull();
    expect(flow.steps[0].label).toBe('validate credentials');
  });

  it('multiple scenarios produce multiple FlowDto items sorted by id', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });

    a.calls(b, 'step1').scenario('z-flow');
    a.calls(b, 'step2').scenario('a-flow');

    const snapshot = buildSnapshot([a, b]);
    const dto = snapshot._toModelSnapshotDto();

    expect(dto.flows).not.toBeNull();
    expect(dto.flows!.length).toBe(2);
    // Sorted by name (which seeds the derived id)
    expect(dto.flows![0].name).toBe('a-flow');
    expect(dto.flows![1].name).toBe('z-flow');
    expect(dto.flows![0].id.startsWith('a-flow-')).toBe(true);
    expect(dto.flows![1].id.startsWith('z-flow-')).toBe(true);
  });

  it('empty scenarios produce flows: null', () => {
    const svc = new SoftwareSystem({ id: 'svc', name: 'Svc' });
    const snapshot = buildSnapshot([svc]);
    const dto = snapshot._toModelSnapshotDto();

    expect(dto.flows).toBeNull();
  });
});

// Schema model-snapshot/v1 1.1.0 requires flow.id to satisfy the Identifier
// pattern ^[a-zA-Z0-9_][a-zA-Z0-9_.:-]*$. Human-readable scenario names with
// spaces or Unicode characters violate that, so the SDK must derive id from
// name as `slugify(name) + '-' + fnv1a32(name)`. The hash suffix guarantees
// stability across runs (deterministic from name), schema-validity (hex+slug),
// and uniqueness even when distinct names slugify to the same string.
describe('Flow id derivation (cli-test eShop scenarios)', () => {
  const IDENTIFIER = /^[a-zA-Z0-9_][a-zA-Z0-9_.:-]*$/;

  it('scenario name with spaces produces a schema-valid, stable id and preserves name', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });
    a.calls(b, 'step').scenario('Add to basket');

    const dto1 = buildSnapshot([a, b])._toModelSnapshotDto();
    const flow1 = dto1.flows![0];

    expect(flow1.name).toBe('Add to basket');
    expect(flow1.id).toMatch(IDENTIFIER);
    expect(flow1.id.startsWith('add-to-basket-')).toBe(true);

    // Second build of the identical scenario must produce the same id —
    // otherwise `fcon build --diff-against-live` reports every flow as
    // delete+add on every run.
    resetRuntime();
    const a2 = new SoftwareSystem({ id: 'a', name: 'A' });
    const b2 = new SoftwareSystem({ id: 'b', name: 'B' });
    a2.calls(b2, 'step').scenario('Add to basket');
    const dto2 = buildSnapshot([a2, b2])._toModelSnapshotDto();

    expect(dto2.flows![0].id).toBe(flow1.id);
  });

  it('scenario name with Unicode characters produces a schema-valid id', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });
    a.calls(b, 'step').scenario('Catalog price change → basket update');

    const dto = buildSnapshot([a, b])._toModelSnapshotDto();
    const flow = dto.flows![0];

    expect(flow.name).toBe('Catalog price change → basket update');
    expect(flow.id).toMatch(IDENTIFIER);
  });

  it('distinct names that slugify to the same string get distinct ids via hash suffix', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });

    a.calls(b, 's1').scenario('Foo Bar');
    a.calls(b, 's2').scenario('foo-bar');

    const flows = buildSnapshot([a, b])._toModelSnapshotDto().flows!;
    const ids = flows.map(f => f.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(id).toMatch(IDENTIFIER);
      expect(id.startsWith('foo-bar-')).toBe(true);
    }
  });

  it('throws on empty scenario name', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });

    expect(() => a.calls(b, 's').scenario('')).toThrow();
  });

  it('throws on whitespace-only scenario name', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });

    expect(() => a.calls(b, 's').scenario('   ')).toThrow();
  });
});

// ── FlowStepDto.sourceElementId always set ──

describe('FlowStepDto.sourceElementId', () => {
  it('is set for edge steps', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });
    a.calls(b, 'call').scenario('test');

    const snapshot = buildSnapshot([a, b]);
    const dto = snapshot._toModelSnapshotDto();
    for (const flow of dto.flows ?? []) {
      for (const step of flow.steps) {
        expect(step.sourceElementId).toBeTruthy();
      }
    }
  });

  it('is set for action steps', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    a.executesRequest('do something').scenario('test');

    const snapshot = buildSnapshot([a]);
    const dto = snapshot._toModelSnapshotDto();
    for (const flow of dto.flows ?? []) {
      for (const step of flow.steps) {
        expect(step.sourceElementId).toBe('a');
      }
    }
  });
});

describe('Discriminated union ergonomics', () => {
  it('ElementKind enum values are string-typed', () => {
    // Compile-time check: ElementKind values are assignable to string
    const kind: string = ElementKind.SERVICE;
    expect(typeof kind).toBe('string');
    expect(kind).toBe('Service');
  });

  it('RelationKind enum values are string-typed', () => {
    const kind: string = RelationKind.CALLS;
    expect(typeof kind).toBe('string');
    expect(kind).toBe('Calls');
  });

  it('ElementKind covers all 20 values', () => {
    const allKinds = Object.values(ElementKind);
    expect(allKinds.length).toBe(20);
  });

  it('RelationKind covers all 11 values', () => {
    const allKinds = Object.values(RelationKind);
    expect(allKinds.length).toBe(11);
  });
});

// ── Cross-source ID compatibility ──

describe('Cross-source ID compatibility', () => {
  it('SDK-emitted relationship IDs use same format as backend scanners', () => {
    // If both SDK and scanner discover the same edge, IDs must be identical
    const webapp = new SoftwareSystem({ id: 'webapp', name: 'WebApp' });
    const api = new SoftwareSystem({ id: 'api', name: 'API' });

    webapp.calls(api, 'HTTP request').scenario('test');

    const snapshot = buildSnapshot([webapp, api]);
    const dto = snapshot._toModelSnapshotDto();

    // Relationship ID in relationships array
    const rel = dto.relationships.find(r => r.sourceId === 'webapp' && r.targetId === 'api');
    expect(rel).toBeDefined();
    expect(rel!.id).toBe('webapp_calls_api');

    // Same ID appears in flow step
    const step = dto.flows![0].steps[0];
    expect(step.relationshipId).toBe('webapp_calls_api');

    // Both IDs match — dedup will work naturally
    expect(rel!.id).toBe(step.relationshipId);
  });
});

describe('ModelSnapshotDto structure', () => {
  it('produces valid structure with all required fields', () => {
    const svc = new SoftwareSystem({ id: 'svc', name: 'Service', technology: 'Node.js', description: 'Main service' });
    const db = new Postgres({ id: 'pg', name: 'PostgreSQL', description: 'Primary DB' });

    svc.uses(db, 'SQL queries').scenario('data-access');

    const snapshot = buildSnapshot([svc, db]);
    const dto = snapshot._toModelSnapshotDto();

    expect(dto.$schema).toBe('https://flowconsole.tech/contracts/model-snapshot/v1/schema.json');
    expect(dto.schemaVersion).toBe('1.1.0');
    expect(dto.source).toBe('Git');
    expect(Array.isArray(dto.elements)).toBe(true);
    expect(Array.isArray(dto.relationships)).toBe(true);
    expect(dto.elements.length).toBe(2);
    expect(dto.relationships.length).toBeGreaterThanOrEqual(1);
  });

  it('elements include optional fields when present', () => {
    const svc = new SoftwareSystem({
      id: 'svc',
      name: 'Service',
      description: 'A service',
      technology: 'Go',
      tags: ['backend', 'critical'],
      properties: { team: 'platform' },
    });

    const snapshot = buildSnapshot([svc]);
    const dto = snapshot._toModelSnapshotDto();
    const elem = dto.elements[0];

    expect(elem.description).toBe('A service');
    expect(elem.technology).toBe('Go');
    expect(elem.tags).toEqual(['backend', 'critical']);
    expect(elem.properties).toEqual({ team: 'platform' });
  });

  it('elements omit optional fields when absent', () => {
    const svc = new SoftwareSystem({ id: 'svc', name: 'Service' });

    const snapshot = buildSnapshot([svc]);
    const dto = snapshot._toModelSnapshotDto();
    const elem = dto.elements[0];

    expect(elem.id).toBe('svc');
    expect(elem.kind).toBe('Service');
    expect(elem.name).toBe('Service');
    expect(elem.description).toBeUndefined();
    expect(elem.technology).toBeUndefined();
    expect(elem.parentId).toBeUndefined();
    expect(elem.properties).toBeUndefined();
    expect(elem.tags).toBeUndefined();
  });

  it('relationships use convention-format IDs', () => {
    const a = new SoftwareSystem({ id: 'a', name: 'A' });
    const b = new SoftwareSystem({ id: 'b', name: 'B' });
    a.calls(b, 'rpc');

    const snapshot = buildSnapshot([a, b]);
    const dto = snapshot._toModelSnapshotDto();

    const rel = dto.relationships.find(r => r.sourceId === 'a' && r.targetId === 'b');
    expect(rel).toBeDefined();
    expect(rel!.id).toBe('a_calls_b');
    expect(rel!.kind).toBe('Calls');
  });

  it('parentId set for elements with belongsTo', () => {
    const sys = new SoftwareSystem({ id: 'sys', name: 'System' });
    const app = new Container({ id: 'app', name: 'App', belongsTo: sys });

    const snapshot = buildSnapshot([sys, app]);
    const dto = snapshot._toModelSnapshotDto();

    const appDto = dto.elements.find(e => e.id === 'app');
    expect(appDto).toBeDefined();
    expect(appDto!.parentId).toBe('sys');
  });
});

describe('Mixed edge and action steps in flow', () => {
  it('correctly maps a flow with both edge and action steps', () => {
    const webapp = new SoftwareSystem({ id: 'webapp', name: 'WebApp' });
    const api = new SoftwareSystem({ id: 'api', name: 'API' });
    const db = new Database({ id: 'db', name: 'DB' });

    webapp
      .calls(api, 'POST /auth')
      .executesRequest('validate token')
      .sendsRequest(db, 'fetch user')
      .scenario('auth-flow');

    const snapshot = buildSnapshot([webapp, api, db]);
    const dto = snapshot._toModelSnapshotDto();

    const flow = dto.flows![0];
    expect(flow.steps.length).toBe(3);

    // Edge step: webapp → api
    expect(flow.steps[0].sourceElementId).toBe('webapp');
    expect(flow.steps[0].relationshipId).toBe('webapp_calls_api');

    // Action step: api executes internally
    expect(flow.steps[1].sourceElementId).toBe('api');
    expect(flow.steps[1].relationshipId).toBeNull();
    expect(flow.steps[1].label).toBe('validate token');

    // Edge step: api → db (Database target → Uses)
    expect(flow.steps[2].sourceElementId).toBe('api');
    expect(flow.steps[2].relationshipId).toBe('api_uses_db');
  });
});
