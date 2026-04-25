import { describe, it, expect } from 'vitest';
import { DiagramRuntime, ENTITY_TYPE_NAMES } from '../../languages/typescript/diagramRuntime';

function createEntity(runtime: DiagramRuntime, type: Parameters<DiagramRuntime['createEntityInvoker']>[0], value: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return runtime.createEntityInvoker(type, value) as any;
}

describe('DiagramRuntime', () => {
  describe('ENTITY_TYPE_NAMES', () => {
    it('contains all 42 entity type names', () => {
      expect(ENTITY_TYPE_NAMES).toHaveLength(42);
    });

    it('includes all 13 base elements', () => {
      const base = ['User', 'SoftwareSystem', 'Namespace', 'Container', 'Module', 'External', 'Gateway', 'Worker', 'Database', 'Cache', 'Queue', 'Broker', 'Topic'];
      for (const name of base) {
        expect(ENTITY_TYPE_NAMES).toContain(name);
      }
    });

    it('includes all 6 deployment elements', () => {
      const deploy = ['K8sCluster', 'ManagedDatabase', 'Serverless', 'Vm', 'Cdn', 'Ingress'];
      for (const name of deploy) {
        expect(ENTITY_TYPE_NAMES).toContain(name);
      }
    });

    it('includes all 23 convenience classes', () => {
      const convenience = [
        'RestApi', 'GrpcApi', 'GraphqlApi',
        'ReactApp', 'NextApp', 'VueApp', 'AngularApp', 'SvelteApp', 'BlazorApp', 'IosApp', 'AndroidApp', 'DesktopApp',
        'Postgres', 'Mysql', 'Mongo', 'Clickhouse',
        'Redis', 'Memcached',
        'Rabbit', 'Sqs',
        'Kafka', 'Nats', 'Pulsar',
      ];
      for (const name of convenience) {
        expect(ENTITY_TYPE_NAMES).toContain(name);
      }
    });

    it('does not include old type names', () => {
      const old = ['ComputerSystem', 'KafkaTopic', 'MessageQueue', 'ExternalService', 'BackgroundJob'];
      for (const name of old) {
        expect(ENTITY_TYPE_NAMES).not.toContain(name);
      }
    });
  });

  describe('entity creation and kind mapping', () => {
    it('creates User with kind External', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'User', { name: 'Customer' });
      const snapshot = runtime.snapshot();
      expect(snapshot.entities[0].kind).toBe('External');
    });

    it('creates SoftwareSystem with kind Service', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'SoftwareSystem', { name: 'eShop' });
      const snapshot = runtime.snapshot();
      expect(snapshot.entities[0].kind).toBe('Service');
    });

    it('creates Container with kind Application', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Container', { name: 'Web' });
      expect(runtime.snapshot().entities[0].kind).toBe('Application');
    });

    it('creates Database with kind Database', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Database', { name: 'DB' });
      expect(runtime.snapshot().entities[0].kind).toBe('Database');
    });

    it('creates Broker with kind Broker', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Broker', { name: 'Bus' });
      expect(runtime.snapshot().entities[0].kind).toBe('Broker');
    });

    it('creates Topic with kind Topic', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Topic', { name: 'events' });
      expect(runtime.snapshot().entities[0].kind).toBe('Topic');
    });

    it('creates K8sCluster with kind Deployment', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'K8sCluster', { name: 'prod' });
      expect(runtime.snapshot().entities[0].kind).toBe('Deployment');
    });

    it('creates Ingress with kind Ingress', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Ingress', { name: 'public' });
      expect(runtime.snapshot().entities[0].kind).toBe('Ingress');
    });
  });

  describe('convenience class kind mapping', () => {
    it('RestApi maps to Application', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'RestApi', { name: 'API' });
      expect(runtime.snapshot().entities[0].kind).toBe('Application');
    });

    it('Postgres maps to Database', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Postgres', { name: 'DB' });
      expect(runtime.snapshot().entities[0].kind).toBe('Database');
    });

    it('Redis maps to Cache', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Redis', { name: 'Cache' });
      expect(runtime.snapshot().entities[0].kind).toBe('Cache');
    });

    it('Rabbit maps to Queue', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Rabbit', { name: 'MQ' });
      expect(runtime.snapshot().entities[0].kind).toBe('Queue');
    });

    it('Kafka maps to Broker', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Kafka', { name: 'Bus' });
      expect(runtime.snapshot().entities[0].kind).toBe('Broker');
    });

    it('ReactApp maps to Application', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'ReactApp', { name: 'Frontend' });
      expect(runtime.snapshot().entities[0].kind).toBe('Application');
    });
  });

  describe('style defaults', () => {
    it('User gets person shape and user icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'User', { name: 'Actor' });
      const style = runtime.snapshot().entities[0].style;
      expect(style?.shape).toBe('person');
      expect(style?.icon).toBe('user');
    });

    it('Database gets cylinder shape and database icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Database', { name: 'DB' });
      const style = runtime.snapshot().entities[0].style;
      expect(style?.shape).toBe('cylinder');
      expect(style?.icon).toBe('database');
    });

    it('Queue gets pipe shape and queue icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Queue', { name: 'MQ' });
      const style = runtime.snapshot().entities[0].style;
      expect(style?.shape).toBe('pipe');
      expect(style?.icon).toBe('queue');
    });

    it('Gateway gets hexagon shape and gateway icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Gateway', { name: 'GW' });
      const style = runtime.snapshot().entities[0].style;
      expect(style?.shape).toBe('hexagon');
      expect(style?.icon).toBe('gateway');
    });

    it('External gets cloud shape and cloud icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'External', { name: 'Stripe' });
      const style = runtime.snapshot().entities[0].style;
      expect(style?.shape).toBe('cloud');
      expect(style?.icon).toBe('cloud');
    });

    it('ReactApp gets browser icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'ReactApp', { name: 'Web' });
      expect(runtime.snapshot().entities[0].style?.icon).toBe('browser');
    });

    it('IosApp gets mobile icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'IosApp', { name: 'App' });
      expect(runtime.snapshot().entities[0].style?.icon).toBe('mobile');
    });

    it('K8sCluster gets kubernetes icon', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'K8sCluster', { name: 'Prod' });
      expect(runtime.snapshot().entities[0].style?.icon).toBe('kubernetes');
    });

    it('user style overrides defaults', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Database', { name: 'DB', style: { icon: 'custom-db', shape: 'hexagon', preset: 'critical', color: '#ff0000' } });
      const style = runtime.snapshot().entities[0].style;
      expect(style?.icon).toBe('custom-db');
      expect(style?.shape).toBe('hexagon');
      expect(style?.preset).toBe('critical');
      expect(style?.color).toBe('#ff0000');
    });

    it('icon supports URL format', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Container', { name: 'App', style: { icon: 'https://example.com/icon.svg' } });
      expect(runtime.snapshot().entities[0].style?.icon).toBe('https://example.com/icon.svg');
    });

    it('icon supports base64 data URL', () => {
      const runtime = new DiagramRuntime();
      const dataUrl = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
      createEntity(runtime, 'Container', { name: 'App', style: { icon: dataUrl } });
      expect(runtime.snapshot().entities[0].style?.icon).toBe(dataUrl);
    });

    it('icon supports relative path', () => {
      const runtime = new DiagramRuntime();
      createEntity(runtime, 'Container', { name: 'App', style: { icon: './icons/custom.svg' } });
      expect(runtime.snapshot().entities[0].style?.icon).toBe('./icons/custom.svg');
    });
  });

  describe('base flow methods', () => {
    it('registers entities, parents, and relationships', () => {
      const runtime = new DiagramRuntime();
      const system = createEntity(runtime, 'SoftwareSystem', { name: 'Core Platform' });
      const backend = createEntity(runtime, 'Container', { name: 'Services', system });
      createEntity(runtime, 'Container', { name: 'Services', system });
      const api = createEntity(runtime, 'RestApi', { name: 'Accounts API', belongsTo: backend });
      const user = createEntity(runtime, 'User', { name: 'Customer' });

      user.sendsRequestTo?.(api, 'login');
      api.getDataFrom?.(backend, 'query');

      const snapshot = runtime.snapshot();
      expect(snapshot.entities).toHaveLength(5);
      const containerRecords = snapshot.entities.filter((entity) => entity.name === 'Services');
      expect(containerRecords.map((record) => record.id)).toContain('services-2');
      const apiRecord = snapshot.entities.find((entity) => entity.name === 'Accounts API');
      const systemRecord = snapshot.entities.find((entity) => entity.name === 'Core Platform');
      expect(apiRecord?.parentId).toBe(containerRecords[0]?.id);
      expect(systemRecord?.id).toBeDefined();

      expect(snapshot.relationships).toHaveLength(2);
      const firstConnection = snapshot.relationships[0];
      expect(firstConnection.label).toBe('login');
    });

    it('supports chained flows with executesRequest and parallel branches', () => {
      const runtime = new DiagramRuntime();
      const system = createEntity(runtime, 'SoftwareSystem', { name: 'Workflow' });
      const worker = createEntity(runtime, 'Worker', { name: 'Worker', belongsTo: system });
      const queue = createEntity(runtime, 'Queue', { name: 'Queue', belongsTo: system });

      worker
        .sendsRequestTo?.(queue, 'enqueue', { kind: 'event' })
        ?.executesRequest?.('process')
        ?.inParallel?.(
          worker.getDataFrom?.(queue, 'poll'),
          worker.sendsRequestTo?.(queue, 'ack')
        );

      const snapshot = runtime.snapshot();
      expect(snapshot.relationships.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.relationships[0]?.kind).toBe('event');
    });

    it('validates entities and preserves explicit ids/tags', () => {
      const runtime = new DiagramRuntime();
      const entity = runtime.createEntityInvoker('User', {
        id: 'custom-id',
        name: '  Alice ',
        tags: ['a', 1, 'b'],
      });
      const snapshot = runtime.snapshot();
      expect(snapshot.entities[0]?.id).toBe('custom-id');
      expect(snapshot.entities[0]?.tags).toEqual(['a', 'b']);
      expect(entity).toHaveProperty('sendsRequestTo');
    });

    it('throws when entity value is not an object', () => {
      const runtime = new DiagramRuntime();
      expect(() => runtime.createEntityInvoker('User', null as unknown as Record<string, unknown>)).toThrow();
    });

    it('returns empty id when adding connection without meta', () => {
      const runtime = new DiagramRuntime();
      // @ts-expect-error testing invalid handle
      const id = runtime.addConnection({}, {}, 'login', 'sync');
      expect(id).toBe('');
      expect(runtime.snapshot().relationships).toHaveLength(0);
    });

    it('keeps flow name from first hint and ignores later updates', () => {
      const runtime = new DiagramRuntime();
      runtime.addFlowStep('flow-1', { edgeId: 'e1', sourceId: 'a', targetId: 'b', label: 'first' });
      runtime.addFlowStep('flow-1', { edgeId: 'e2', sourceId: 'a', targetId: 'b', label: 'second' });
      const flow = runtime.snapshot().flows.find((f) => f.id === 'flow-1');
      expect(flow?.name).toBe('first');
      expect(flow?.steps).toHaveLength(2);
    });

    it('accepts pre-evaluated parallel branch builders', () => {
      const runtime = new DiagramRuntime();
      const worker = createEntity(runtime, 'Worker', { name: 'Worker' });
      const mainFlow = worker.executesRequest?.('start');
      const branchFlow = worker.executesRequest?.('noop');

      mainFlow?.inParallel?.(branchFlow);

      const snapshot = runtime.snapshot();
      expect(snapshot.relationships.map((relationship) => relationship.label)).toEqual([
        'start',
        'noop',
      ]);
      expect(snapshot.flows).toHaveLength(2);
    });
  });

  describe('convenience flow wrappers', () => {
    it('opens delegates to sendsRequest with kind sync', () => {
      const runtime = new DiagramRuntime();
      const user = createEntity(runtime, 'User', { name: 'Customer' });
      const web = createEntity(runtime, 'ReactApp', { name: 'Web' });
      user.opens?.(web, 'Browse');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships).toHaveLength(1);
      expect(snapshot.relationships[0].kind).toBe('sync');
      expect(snapshot.relationships[0].label).toBe('Browse');
    });

    it('opens uses default label when none provided', () => {
      const runtime = new DiagramRuntime();
      const user = createEntity(runtime, 'User', { name: 'Customer' });
      const web = createEntity(runtime, 'ReactApp', { name: 'Web' });
      user.opens?.(web);
      expect(runtime.snapshot().relationships[0].label).toBe('opens');
    });

    it('publishes delegates to sendsRequest with kind event', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const topic = createEntity(runtime, 'Topic', { name: 'events' });
      api.publishes?.(topic, 'OrderPlaced');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships[0].kind).toBe('event');
      expect(snapshot.relationships[0].label).toBe('OrderPlaced');
    });

    it('emits is alias for publishes', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const topic = createEntity(runtime, 'Topic', { name: 'events' });
      api.emits?.(topic, 'OrderPlaced');
      expect(runtime.snapshot().relationships[0].kind).toBe('event');
    });

    it('subscribes delegates to getDataFrom', () => {
      const runtime = new DiagramRuntime();
      const worker = createEntity(runtime, 'Worker', { name: 'Consumer' });
      const topic = createEntity(runtime, 'Topic', { name: 'events' });
      worker.subscribes?.(topic, 'Listen');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships).toHaveLength(1);
      expect(snapshot.relationships[0].kind).toBe('dependency');
      expect(snapshot.relationships[0].label).toBe('Listen');
    });

    it('reads delegates to getDataFrom', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Postgres', { name: 'DB' });
      api.reads?.(db, 'Query users');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships).toHaveLength(1);
      expect(snapshot.relationships[0].label).toBe('Query users');
    });

    it('uses creates a dependency-style Uses relationship', () => {
      const runtime = new DiagramRuntime();
      const cart = createEntity(runtime, 'Container', { name: 'Cart' });
      const catalog = createEntity(runtime, 'RestApi', { name: 'Catalog' });
      cart.uses?.(catalog, 'lookup products');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships).toHaveLength(1);
      expect(snapshot.relationships[0].kind).toBe('dependency');
      expect(snapshot.relationships[0].relationKind).toBe('Uses');
      expect(snapshot.relationships[0].label).toBe('lookup products');
    });

    it('explicit relation methods create their matching relationship kinds', () => {
      const runtime = new DiagramRuntime();
      const orders = createEntity(runtime, 'Container', { name: 'Orders' });
      const payments = createEntity(runtime, 'RestApi', { name: 'Payments' });
      const topic = createEntity(runtime, 'Topic', { name: 'orders.events' });
      orders.calls?.(payments, 'charge card');
      orders.dependsOn?.(payments, 'requires payments');
      orders.produces?.(topic, 'OrderPlaced');
      orders.consumes?.(topic, 'OrderAccepted');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships.map((relationship) => relationship.relationKind)).toEqual([
        'Calls',
        'DependsOn',
        'Produces',
        'Consumes',
      ]);
      expect(snapshot.relationships.map((relationship) => relationship.kind)).toEqual([
        'sync',
        'dependency',
        'event',
        'dependency',
      ]);
    });

    it('writes delegates to sendsRequest with kind sync', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Postgres', { name: 'DB' });
      api.writes?.(db, 'Save order');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships).toHaveLength(1);
      expect(snapshot.relationships[0].kind).toBe('sync');
    });

    it('runs delegates to executesRequest', () => {
      const runtime = new DiagramRuntime();
      const worker = createEntity(runtime, 'Worker', { name: 'Job' });
      worker.runs?.('Process batch');
      const snapshot = runtime.snapshot();
      expect(snapshot.relationships).toHaveLength(1);
      expect(snapshot.relationships[0].label).toBe('Process batch');
    });
  });

  describe('scenario', () => {
    it('sets flow name via scenario()', () => {
      const runtime = new DiagramRuntime();
      const user = createEntity(runtime, 'User', { name: 'Customer' });
      const web = createEntity(runtime, 'ReactApp', { name: 'Web' });
      const api = createEntity(runtime, 'RestApi', { name: 'API' });

      user.opens?.(web, 'Browse')
        ?.then?.(web)?.sendsRequest?.(api, 'GET /products')
        ?.scenario?.('Browse catalog');

      const snapshot = runtime.snapshot();
      expect(snapshot.flows).toHaveLength(1);
      expect(snapshot.flows[0].name).toBe('Browse catalog');
    });

    it('flow chain works without scenario', () => {
      const runtime = new DiagramRuntime();
      const a = createEntity(runtime, 'Container', { name: 'A' });
      const b = createEntity(runtime, 'Container', { name: 'B' });
      a.sendsRequest?.(b, 'call');
      const snapshot = runtime.snapshot();
      expect(snapshot.flows).toHaveLength(1);
      expect(snapshot.flows[0].steps).toHaveLength(1);
    });
  });

  describe('relationKind inference', () => {
    it('sendsRequest to Container infers Calls', () => {
      const runtime = new DiagramRuntime();
      const a = createEntity(runtime, 'Container', { name: 'A' });
      const b = createEntity(runtime, 'Container', { name: 'B' });
      a.sendsRequest?.(b, 'call');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Calls');
    });

    it('sendsRequest to Database infers Uses', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Database', { name: 'DB' });
      api.sendsRequest?.(db, 'write');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Uses');
    });

    it('sendsRequest to Cache infers Uses', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const cache = createEntity(runtime, 'Redis', { name: 'Cache' });
      api.sendsRequest?.(cache, 'set');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Uses');
    });

    it('sendsRequest with kind event infers Produces', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const topic = createEntity(runtime, 'Topic', { name: 'events' });
      api.sendsRequest?.(topic, 'emit', { kind: 'event' });
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Produces');
    });

    it('sendsRequest with kind dependency infers DependsOn', () => {
      const runtime = new DiagramRuntime();
      const a = createEntity(runtime, 'Container', { name: 'A' });
      const b = createEntity(runtime, 'Container', { name: 'B' });
      a.sendsRequest?.(b, 'depends', { kind: 'dependency' });
      expect(runtime.snapshot().relationships[0].relationKind).toBe('DependsOn');
    });

    it('getDataFrom Database infers Uses', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Postgres', { name: 'DB' });
      api.getDataFrom?.(db, 'query');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Uses');
    });

    it('getDataFrom Topic infers Consumes', () => {
      const runtime = new DiagramRuntime();
      const worker = createEntity(runtime, 'Worker', { name: 'Consumer' });
      const topic = createEntity(runtime, 'Topic', { name: 'events' });
      worker.getDataFrom?.(topic, 'poll');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Consumes');
    });

    it('getDataFrom Queue infers Consumes', () => {
      const runtime = new DiagramRuntime();
      const worker = createEntity(runtime, 'Worker', { name: 'Consumer' });
      const queue = createEntity(runtime, 'Queue', { name: 'tasks' });
      worker.getDataFrom?.(queue, 'poll');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Consumes');
    });

    it('getDataFrom Container infers Calls', () => {
      const runtime = new DiagramRuntime();
      const a = createEntity(runtime, 'Container', { name: 'A' });
      const b = createEntity(runtime, 'Container', { name: 'B' });
      a.getDataFrom?.(b, 'fetch');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Calls');
    });

    it('uses infers Uses for non-data-store targets', () => {
      const runtime = new DiagramRuntime();
      const cart = createEntity(runtime, 'Container', { name: 'Cart' });
      const catalog = createEntity(runtime, 'RestApi', { name: 'Catalog' });
      cart.uses?.(catalog, 'product data');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Uses');
    });

    it('calls infers Calls even for data-store targets', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Postgres', { name: 'DB' });
      api.calls?.(db, 'explicit call');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Calls');
    });

    it('dependsOn infers DependsOn for non-data-store targets', () => {
      const runtime = new DiagramRuntime();
      const cart = createEntity(runtime, 'Container', { name: 'Cart' });
      const catalog = createEntity(runtime, 'RestApi', { name: 'Catalog' });
      cart.dependsOn?.(catalog, 'catalog dependency');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('DependsOn');
    });

    it('produces infers Produces for non-messaging targets', () => {
      const runtime = new DiagramRuntime();
      const orders = createEntity(runtime, 'Container', { name: 'Orders' });
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      orders.produces?.(api, 'result');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Produces');
    });

    it('consumes infers Consumes for non-messaging targets', () => {
      const runtime = new DiagramRuntime();
      const worker = createEntity(runtime, 'Worker', { name: 'Worker' });
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      worker.consumes?.(api, 'input');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Consumes');
    });

    it('publishes infers Produces', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const topic = createEntity(runtime, 'Topic', { name: 'events' });
      api.publishes?.(topic, 'OrderPlaced');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Produces');
    });

    it('subscribes to Topic infers Consumes', () => {
      const runtime = new DiagramRuntime();
      const worker = createEntity(runtime, 'Worker', { name: 'Consumer' });
      const topic = createEntity(runtime, 'Topic', { name: 'events' });
      worker.subscribes?.(topic, 'Listen');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Consumes');
    });

    it('reads from Database infers Uses', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Postgres', { name: 'DB' });
      api.reads?.(db, 'Query');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Uses');
    });

    it('writes to Database infers Uses', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Postgres', { name: 'DB' });
      api.writes?.(db, 'Insert');
      expect(runtime.snapshot().relationships[0].relationKind).toBe('Uses');
    });
  });

  describe('deployment methods', () => {
    it('deployedOn creates a deployment record', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const cluster = createEntity(runtime, 'K8sCluster', { name: 'prod' });
      api.deployedOn?.(cluster, { replicas: 3 });
      const snapshot = runtime.snapshot();
      expect(snapshot.deployments).toHaveLength(1);
      expect(snapshot.deployments[0].relationKind).toBe('DeployedOn');
      expect(snapshot.deployments[0].sourceId).toBe('api');
      expect(snapshot.deployments[0].targetId).toBe('prod');
      expect(snapshot.deployments[0].options).toEqual({ replicas: 3 });
    });

    it('routesTo creates a deployment record', () => {
      const runtime = new DiagramRuntime();
      const ingress = createEntity(runtime, 'Ingress', { name: 'Public' });
      const gateway = createEntity(runtime, 'Gateway', { name: 'GW' });
      ingress.routesTo?.(gateway);
      const snapshot = runtime.snapshot();
      expect(snapshot.deployments).toHaveLength(1);
      expect(snapshot.deployments[0].relationKind).toBe('RoutesTo');
    });

    it('exposes creates a deployment record', () => {
      const runtime = new DiagramRuntime();
      const gateway = createEntity(runtime, 'Gateway', { name: 'GW' });
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      gateway.exposes?.(api, { path: '/api/orders' });
      const snapshot = runtime.snapshot();
      expect(snapshot.deployments).toHaveLength(1);
      expect(snapshot.deployments[0].relationKind).toBe('Exposes');
      expect(snapshot.deployments[0].options).toEqual({ path: '/api/orders' });
    });

    it('multiple deployments are tracked', () => {
      const runtime = new DiagramRuntime();
      const api = createEntity(runtime, 'RestApi', { name: 'API' });
      const db = createEntity(runtime, 'Postgres', { name: 'DB' });
      const cluster = createEntity(runtime, 'K8sCluster', { name: 'prod' });
      const rds = createEntity(runtime, 'ManagedDatabase', { name: 'RDS' });
      api.deployedOn?.(cluster, { replicas: 5 });
      db.deployedOn?.(rds);
      expect(runtime.snapshot().deployments).toHaveLength(2);
    });
  });

  describe('snapshot structure', () => {
    it('includes entities, relationships, flows, and deployments', () => {
      const runtime = new DiagramRuntime();
      const snapshot = runtime.snapshot();
      expect(snapshot).toHaveProperty('entities');
      expect(snapshot).toHaveProperty('relationships');
      expect(snapshot).toHaveProperty('flows');
      expect(snapshot).toHaveProperty('deployments');
      expect(Array.isArray(snapshot.deployments)).toBe(true);
    });
  });

  describe('full integration scenario', () => {
    it('eShop example with all layers', () => {
      const runtime = new DiagramRuntime();
      const customer = createEntity(runtime, 'User', { name: 'Customer', role: 'Buyer' });
      const shop = createEntity(runtime, 'SoftwareSystem', { name: 'eShop', domain: 'e-commerce' });
      const web = createEntity(runtime, 'ReactApp', { name: 'Web App', belongsTo: shop });
      const api = createEntity(runtime, 'RestApi', { name: 'Orders API', belongsTo: shop });
      const db = createEntity(runtime, 'Postgres', { name: 'Ledger', belongsTo: shop });
      const cache = createEntity(runtime, 'Redis', { name: 'Session', belongsTo: shop });
      const kafka = createEntity(runtime, 'Kafka', { name: 'Event Bus', belongsTo: shop });
      const topic = createEntity(runtime, 'Topic', { name: 'order.events', belongsTo: kafka });
      const stripe = createEntity(runtime, 'External', { name: 'Stripe', belongsTo: shop });

      // Flow: browse
      customer.opens?.(web, 'Opens shop')
        ?.then?.(web)?.sendsRequest?.(api, 'GET /products')
        ?.then?.(api)?.reads?.(cache, 'Check cache')
        ?.then?.(api)?.reads?.(db, 'Query products')
        ?.scenario?.('Browse catalog');

      // Flow: purchase
      customer.opens?.(web, 'Place order')
        ?.then?.(web)?.sendsRequest?.(api, 'POST /orders')
        ?.then?.(api)?.writes?.(db, 'Save order')
        ?.then?.(api)?.sendsRequest?.(stripe, 'Charge card')
        ?.then?.(api)?.publishes?.(topic, 'OrderPlaced')
        ?.scenario?.('Customer purchase');

      // Deployment
      const cluster = createEntity(runtime, 'K8sCluster', { name: 'prod-eu', region: 'eu-west-1' });
      const rds = createEntity(runtime, 'ManagedDatabase', { name: 'RDS prod', provider: 'AWS RDS' });
      const ingress = createEntity(runtime, 'Ingress', { name: 'Public', host: 'shop.example.com' });
      const gw = createEntity(runtime, 'Gateway', { name: 'API Gateway', belongsTo: shop });

      web.deployedOn?.(cluster, { replicas: 3 });
      api.deployedOn?.(cluster, { replicas: 5 });
      db.deployedOn?.(rds);
      ingress.routesTo?.(gw);
      gw.exposes?.(api, { path: '/api/orders' });

      const snapshot = runtime.snapshot();

      // Entities
      expect(snapshot.entities.length).toBeGreaterThanOrEqual(12);

      // Flows with scenarios
      expect(snapshot.flows).toHaveLength(2);
      expect(snapshot.flows[0].name).toBe('Browse catalog');
      expect(snapshot.flows[1].name).toBe('Customer purchase');

      // Relationships (connections from flows)
      expect(snapshot.relationships.length).toBeGreaterThanOrEqual(8);

      // Deployments
      expect(snapshot.deployments).toHaveLength(5);

      // Kind on entities
      expect(snapshot.entities.find(e => e.name === 'Customer')?.kind).toBe('External');
      expect(snapshot.entities.find(e => e.name === 'eShop')?.kind).toBe('Service');
      expect(snapshot.entities.find(e => e.name === 'Web App')?.kind).toBe('Application');
      expect(snapshot.entities.find(e => e.name === 'Ledger')?.kind).toBe('Database');
      expect(snapshot.entities.find(e => e.name === 'Session')?.kind).toBe('Cache');
      expect(snapshot.entities.find(e => e.name === 'Event Bus')?.kind).toBe('Broker');
      expect(snapshot.entities.find(e => e.name === 'order.events')?.kind).toBe('Topic');
      expect(snapshot.entities.find(e => e.name === 'Stripe')?.kind).toBe('External');
    });
  });
});
