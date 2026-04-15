export const ENTITY_TYPE_NAMES = [
  // Base elements (13)
  'User',
  'SoftwareSystem',
  'Namespace',
  'Container',
  'Module',
  'External',
  'Gateway',
  'Worker',
  'Database',
  'Cache',
  'Queue',
  'Broker',
  'Topic',
  // Deployment elements (6)
  'K8sCluster',
  'ManagedDatabase',
  'Serverless',
  'Vm',
  'Cdn',
  'Ingress',
  // Convenience: API patterns (3)
  'RestApi',
  'GrpcApi',
  'GraphqlApi',
  // Convenience: Web/Mobile/Desktop (9)
  'ReactApp',
  'NextApp',
  'VueApp',
  'AngularApp',
  'SvelteApp',
  'BlazorApp',
  'IosApp',
  'AndroidApp',
  'DesktopApp',
  // Convenience: Databases (4)
  'Postgres',
  'Mysql',
  'Mongo',
  'Clickhouse',
  // Convenience: Caches (2)
  'Redis',
  'Memcached',
  // Convenience: Queues (2)
  'Rabbit',
  'Sqs',
  // Convenience: Brokers (3)
  'Kafka',
  'Nats',
  'Pulsar',
] as const;

export type EntityTypeName = (typeof ENTITY_TYPE_NAMES)[number];

export type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';

export type StylePreset = 'default' | 'highlighted' | 'critical' | 'deprecated' | 'new' | 'external';
export type ShapeKind = 'rectangle' | 'circle' | 'hexagon' | 'cylinder' | 'pipe' | 'person' | 'cloud';

export type ComponentStyleRecord = {
  preset?: StylePreset;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: string;
  shape?: ShapeKind;
};

export type ConnectionRecord = {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  detail?: string;
  kind: ConnectionKind;
  relationKind?: string;
  icon?: string;
  muted?: boolean;
};

export type EntityRecord = {
  id: string;
  type: EntityTypeName;
  name: string;
  description?: string;
  parentId?: string;
  tags?: string[];
  badge?: string;
  tone?: string;
  kind?: string;
  style?: ComponentStyleRecord;
  metadata: Record<string, unknown>;
};

export type DeploymentRecord = {
  id: string;
  sourceId: string;
  targetId: string;
  relationKind: string;
  options?: Record<string, unknown>;
};

export type DiagramIntermediateModel = {
  entities: EntityRecord[];
  relationships: ConnectionRecord[];
  flows: FlowRecord[];
  deployments: DeploymentRecord[];
};

export type FlowStepRecord = {
  id: string;
  edgeId: string;
  sourceId: string;
  targetId: string;
  label?: string;
};

export type FlowRecord = {
  id: string;
  name?: string;
  steps: FlowStepRecord[];
};

const ENTITY_META = Symbol('diagram-entity-meta');

type EntityHandle = Record<string, unknown> & {
  [ENTITY_META]: {
    id: string;
    type: EntityTypeName;
    kind: string;
  };
};

type ConnectionOptions = {
  detail?: string;
  kind?: ConnectionKind;
  icon?: string;
  muted?: boolean;
};

type DeploymentOptions = {
  replicas?: number;
  cpu?: string;
  memory?: string;
};

type ExposeOptions = {
  path?: string;
};

/**
 * Maps SDK class name to backend ElementKind string.
 */
const TYPE_TO_KIND: Record<EntityTypeName, string> = {
  // Base elements
  User: 'External',
  SoftwareSystem: 'Service',
  Namespace: 'Namespace',
  Container: 'Application',
  Module: 'Module',
  External: 'External',
  Gateway: 'Gateway',
  Worker: 'Worker',
  Database: 'Database',
  Cache: 'Cache',
  Queue: 'Queue',
  Broker: 'Broker',
  Topic: 'Topic',
  // Deployment
  K8sCluster: 'Deployment',
  ManagedDatabase: 'Deployment',
  Serverless: 'Deployment',
  Vm: 'Deployment',
  Cdn: 'Deployment',
  Ingress: 'Ingress',
  // Convenience: API (→ Application)
  RestApi: 'Application',
  GrpcApi: 'Application',
  GraphqlApi: 'Application',
  // Convenience: Web/Mobile/Desktop (→ Application)
  ReactApp: 'Application',
  NextApp: 'Application',
  VueApp: 'Application',
  AngularApp: 'Application',
  SvelteApp: 'Application',
  BlazorApp: 'Application',
  IosApp: 'Application',
  AndroidApp: 'Application',
  DesktopApp: 'Application',
  // Convenience: Databases (→ Database)
  Postgres: 'Database',
  Mysql: 'Database',
  Mongo: 'Database',
  Clickhouse: 'Database',
  // Convenience: Caches (→ Cache)
  Redis: 'Cache',
  Memcached: 'Cache',
  // Convenience: Queues (→ Queue)
  Rabbit: 'Queue',
  Sqs: 'Queue',
  // Convenience: Brokers (→ Broker)
  Kafka: 'Broker',
  Nats: 'Broker',
  Pulsar: 'Broker',
};

/**
 * Default icons by ElementKind.
 */
const DEFAULT_ICON: Record<string, string> = {
  External: 'cloud',
  Service: 'system',
  Application: 'api',
  Module: 'system',
  Namespace: 'system',
  Gateway: 'gateway',
  Ingress: 'gateway',
  Worker: 'worker',
  Database: 'database',
  Cache: 'cache',
  Queue: 'queue',
  Broker: 'queue',
  Topic: 'topic',
  Deployment: 'deployment',
};

/**
 * Override default icon by SDK class name (more specific than kind).
 */
const TYPE_ICON_OVERRIDE: Partial<Record<EntityTypeName, string>> = {
  User: 'user',
  ReactApp: 'browser',
  NextApp: 'browser',
  VueApp: 'browser',
  AngularApp: 'browser',
  SvelteApp: 'browser',
  BlazorApp: 'browser',
  DesktopApp: 'browser',
  IosApp: 'mobile',
  AndroidApp: 'mobile',
  K8sCluster: 'kubernetes',
  Serverless: 'cloud',
  Vm: 'cloud',
  Cdn: 'cloud',
  ManagedDatabase: 'database',
};

/**
 * Default shapes by ElementKind.
 */
const DEFAULT_SHAPE: Record<string, ShapeKind> = {
  Database: 'cylinder',
  Cache: 'cylinder',
  Queue: 'pipe',
  Topic: 'pipe',
  Broker: 'pipe',
  External: 'cloud',
  Gateway: 'hexagon',
  Ingress: 'hexagon',
};

/**
 * Override default shape by SDK class name.
 */
const TYPE_SHAPE_OVERRIDE: Partial<Record<EntityTypeName, ShapeKind>> = {
  User: 'person',
};

/** Data store kinds for inference */
const DATA_STORE_KINDS = new Set(['Database', 'Cache']);
/** Messaging kinds for inference */
const MESSAGING_KINDS = new Set(['Topic', 'Queue']);

function resolveStyle(typeName: EntityTypeName, kind: string, userStyle?: Record<string, unknown>): ComponentStyleRecord {
  const defaultIcon = TYPE_ICON_OVERRIDE[typeName] ?? DEFAULT_ICON[kind] ?? 'system';
  const defaultShape = TYPE_SHAPE_OVERRIDE[typeName] ?? DEFAULT_SHAPE[kind] ?? 'rectangle';

  const resolved: ComponentStyleRecord = {
    icon: defaultIcon,
    shape: defaultShape,
  };

  if (userStyle) {
    if (typeof userStyle.preset === 'string') resolved.preset = userStyle.preset as StylePreset;
    if (typeof userStyle.color === 'string') resolved.color = userStyle.color;
    if (typeof userStyle.backgroundColor === 'string') resolved.backgroundColor = userStyle.backgroundColor;
    if (typeof userStyle.borderColor === 'string') resolved.borderColor = userStyle.borderColor;
    if (typeof userStyle.icon === 'string') resolved.icon = userStyle.icon;
    if (typeof userStyle.shape === 'string') resolved.shape = userStyle.shape as ShapeKind;
  }

  return resolved;
}

/**
 * Infer relationKind string from flow method, connection kind, and target element kind.
 */
function inferRelationKind(method: string, connectionKind: ConnectionKind | undefined, targetKind: string | undefined): string | undefined {
  if (method === 'executesRequest') return undefined;

  if (method === 'sendsRequest') {
    if (connectionKind === 'event') return 'Produces';
    if (connectionKind === 'dependency') return 'DependsOn';
    if (targetKind && DATA_STORE_KINDS.has(targetKind)) return 'Uses';
    return 'Calls';
  }

  if (method === 'getDataFrom') {
    if (targetKind && MESSAGING_KINDS.has(targetKind)) return 'Consumes';
    if (targetKind && DATA_STORE_KINDS.has(targetKind)) return 'Uses';
    return 'Calls';
  }

  return 'Calls';
}

export class DiagramRuntime {
  private readonly entities = new Map<string, EntityRecord>();
  private readonly entityOrder: EntityRecord[] = [];
  private readonly connections: ConnectionRecord[] = [];
  private readonly deploymentRecords: DeploymentRecord[] = [];
  private readonly slugCounts = new Map<string, number>();
  private edgeCounter = 0;
  private deploymentCounter = 0;
  private readonly flows: FlowRecord[] = [];
  private flowCounter = 0;
  private activeFlowStack: string[] = [];

  get createEntityInvoker() {
    return (typeName: EntityTypeName, value: unknown) => this.createEntity(typeName, value);
  }

  private ensureFlow(flowId: string, nameHint?: string) {
    let flow = this.flows.find((f) => f.id === flowId);
    if (!flow) {
      flow = { id: flowId, name: nameHint, steps: [] };
      this.flows.push(flow);
    } else if (!flow.name && nameHint) {
      flow.name = nameHint;
    }
    return flow;
  }

  private nextFlowId() {
    this.flowCounter += 1;
    return `flow-${this.flowCounter}`;
  }

  withActiveFlow(flowId: string, fn: () => void) {
    this.activeFlowStack.push(flowId);
    try {
      fn();
    } finally {
      this.activeFlowStack.pop();
    }
  }

  private getActiveFlowId() {
    return this.activeFlowStack[this.activeFlowStack.length - 1];
  }

  createFlowBuilder(current: EntityHandle) {
    const flowId = this.getActiveFlowId() ?? this.nextFlowId();
    this.ensureFlow(flowId);
    return new FlowBuilder(this, current, flowId);
  }

  setFlowName(flowId: string, name: string) {
    const flow = this.flows.find((f) => f.id === flowId);
    if (flow) {
      flow.name = name;
    }
  }

  snapshot(): DiagramIntermediateModel {
    return {
      entities: [...this.entityOrder],
      relationships: [...this.connections],
      flows: [...this.flows],
      deployments: [...this.deploymentRecords],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createEntity(typeName: EntityTypeName, value: unknown): any {
    if (!value || typeof value !== 'object') {
      throw new Error(`${typeName} must be defined with an object literal`);
    }

    const base = value as Record<string, unknown>;
    const name = typeof base.name === 'string' && base.name.trim() ? base.name.trim() : typeName;
    const description = typeof base.description === 'string' ? base.description : undefined;
    const tone = typeof base.tone === 'string' ? base.tone : undefined;
    const badge = typeof base.badge === 'string' ? base.badge : undefined;
    const tags = Array.isArray(base.tags)
      ? base.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined;

    const parentId = this.resolveParentId(base.belongsTo ?? base.system);
    const metadata = { ...base };
    const id = this.resolveId(typeName, base.id, name);
    const kind = TYPE_TO_KIND[typeName] ?? 'Application';
    const style = resolveStyle(typeName, kind, base.style as Record<string, unknown> | undefined);

    const record: EntityRecord = {
      id,
      type: typeName,
      name,
      description,
      parentId,
      tags,
      badge,
      tone,
      kind,
      style,
      metadata,
    };

    this.entities.set(id, record);
    this.entityOrder.push(record);

    const entityHandle = value as EntityHandle;
    Object.defineProperty(entityHandle, ENTITY_META, {
      value: { id, type: typeName, kind },
      enumerable: false,
    });

    const flowFrom = () => this.createFlowBuilder(entityHandle);
    const addDeploymentFn = this.addDeployment.bind(this);

    Object.defineProperties(entityHandle, {
      // Base flow methods
      sendsRequest: {
        value: (target: EntityHandle, label: string, options?: ConnectionOptions) =>
          flowFrom().sendsRequest(target, label, options),
        enumerable: false,
      },
      sendsRequestTo: {
        value: (target: EntityHandle, label: string, options?: ConnectionOptions) =>
          flowFrom().sendsRequestTo(target, label, options),
        enumerable: false,
      },
      getDataFrom: {
        value: (target: EntityHandle, label: string, options?: ConnectionOptions) =>
          flowFrom().getDataFrom(target, label, options),
        enumerable: false,
      },
      executesRequest: {
        value: (action: string, options?: ConnectionOptions) =>
          flowFrom().executesRequest(action, options),
        enumerable: false,
      },
      // Convenience flow wrappers
      opens: {
        value: (target: EntityHandle, label?: string) =>
          flowFrom().opens(target, label),
        enumerable: false,
      },
      publishes: {
        value: (target: EntityHandle, label?: string) =>
          flowFrom().publishes(target, label),
        enumerable: false,
      },
      emits: {
        value: (target: EntityHandle, label?: string) =>
          flowFrom().emits(target, label),
        enumerable: false,
      },
      subscribes: {
        value: (target: EntityHandle, label?: string) =>
          flowFrom().subscribes(target, label),
        enumerable: false,
      },
      reads: {
        value: (target: EntityHandle, label?: string) =>
          flowFrom().reads(target, label),
        enumerable: false,
      },
      writes: {
        value: (target: EntityHandle, label?: string) =>
          flowFrom().writes(target, label),
        enumerable: false,
      },
      runs: {
        value: (action?: string) =>
          flowFrom().runs(action),
        enumerable: false,
      },
      // Deployment methods
      deployedOn: {
        value: (target: EntityHandle, options?: DeploymentOptions) => {
          addDeploymentFn(entityHandle, target, 'DeployedOn', options);
        },
        enumerable: false,
      },
      routesTo: {
        value: (target: EntityHandle) => {
          addDeploymentFn(entityHandle, target, 'RoutesTo');
        },
        enumerable: false,
      },
      exposes: {
        value: (target: EntityHandle, options?: ExposeOptions) => {
          addDeploymentFn(entityHandle, target, 'Exposes', options);
        },
        enumerable: false,
      },
    });

    return entityHandle;
  }

  private resolveParentId(candidate: unknown): string | undefined {
    if (!candidate || typeof candidate !== 'object') return undefined;
    const handle = candidate as Partial<EntityHandle>;
    return handle[ENTITY_META]?.id;
  }

  private resolveId(typeName: string, explicit: unknown, name: string) {
    if (typeof explicit === 'string' && explicit.trim()) {
      return explicit.trim();
    }

    const slugBase = slugify(name || typeName);
    const count = this.slugCounts.get(slugBase) ?? 0;
    this.slugCounts.set(slugBase, count + 1);
    return count === 0 ? slugBase : `${slugBase}-${count + 1}`;
  }

  addConnection(
    source: EntityHandle,
    target: EntityHandle,
    label: string,
    kind: ConnectionKind,
    detail?: string,
    options?: ConnectionOptions,
    method?: string
  ) {
    const sourceId = source[ENTITY_META]?.id;
    const targetId = target[ENTITY_META]?.id;
    if (!sourceId || !targetId) return '';
    this.edgeCounter += 1;
    const id = `rel-${this.edgeCounter}`;

    const targetKind = target[ENTITY_META]?.kind;
    const relationKind = method ? inferRelationKind(method, options?.kind ?? kind, targetKind) : undefined;

    this.connections.push({
      id,
      sourceId,
      targetId,
      label,
      detail,
      kind,
      relationKind,
      icon: options?.icon,
      muted: options?.muted,
    });
    return id;
  }

  addDeployment(
    source: EntityHandle,
    target: EntityHandle,
    relationKind: string,
    options?: Record<string, unknown>
  ) {
    const sourceId = source[ENTITY_META]?.id;
    const targetId = target[ENTITY_META]?.id;
    if (!sourceId || !targetId) return;
    this.deploymentCounter += 1;
    const id = `dep-${this.deploymentCounter}`;
    this.deploymentRecords.push({
      id,
      sourceId,
      targetId,
      relationKind,
      options,
    });
  }

  addFlowStep(
    flowId: string,
    step: { edgeId: string; sourceId: string; targetId: string; label?: string }
  ) {
    const flow = this.ensureFlow(flowId, step.label);
    const stepId = `${flowId}-step-${flow.steps.length + 1}`;
    flow.steps.push({ id: stepId, ...step });
    return stepId;
  }
}

class FlowBuilder {
  private runtime: DiagramRuntime;
  private current: EntityHandle;
  private flowId: string;

  constructor(runtime: DiagramRuntime, current: EntityHandle, flowId: string) {
    this.runtime = runtime;
    this.current = current;
    this.flowId = flowId;
  }

  then(entity: EntityHandle) {
    this.current = entity;
    return this;
  }

  sendsRequest(target: EntityHandle, label: string, options?: ConnectionOptions) {
    return this.sendsRequestTo(target, label, options);
  }

  sendsRequestTo(target: EntityHandle, label: string, options?: ConnectionOptions) {
    const finalLabel = label ?? 'request';
    const edgeId = this.runtime.addConnection(
      this.current,
      target,
      finalLabel,
      options?.kind ?? 'sync',
      options?.detail,
      options,
      'sendsRequest'
    );
    this.runtime.addFlowStep(this.flowId, {
      edgeId,
      sourceId: this.current[ENTITY_META]?.id ?? '',
      targetId: target[ENTITY_META]?.id ?? '',
      label: finalLabel,
    });
    this.current = target;
    return this;
  }

  getDataFrom(target: EntityHandle, label: string, options?: ConnectionOptions) {
    const finalLabel = label ?? 'data';
    const edgeId = this.runtime.addConnection(
      this.current,
      target,
      finalLabel,
      options?.kind ?? 'dependency',
      options?.detail,
      options,
      'getDataFrom'
    );
    this.runtime.addFlowStep(this.flowId, {
      edgeId,
      sourceId: this.current[ENTITY_META]?.id ?? '',
      targetId: target[ENTITY_META]?.id ?? '',
      label: finalLabel,
    });
    return this;
  }

  executesRequest(action: string, options?: ConnectionOptions) {
    const finalLabel = action ?? 'action';
    const edgeId = this.runtime.addConnection(
      this.current,
      this.current,
      finalLabel,
      options?.kind ?? 'event',
      options?.detail,
      options,
      'executesRequest'
    );
    this.runtime.addFlowStep(this.flowId, {
      edgeId,
      sourceId: this.current[ENTITY_META]?.id ?? '',
      targetId: this.current[ENTITY_META]?.id ?? '',
      label: finalLabel,
    });
    return this;
  }

  inParallel(...branches: Array<() => FlowBuilder | void>) {
    this.runtime.withActiveFlow(this.flowId, () => {
      branches.forEach((branch) => {
        try {
          const result = branch();
          if (result instanceof FlowBuilder) {
            // nothing special right now, but allows chaining for user
          }
        } catch (error) {
          console.warn('Parallel branch failed', error);
        }
      });
    });
    return this;
  }

  // Convenience flow wrappers

  opens(target: EntityHandle, label?: string) {
    return this.sendsRequest(target, label ?? 'opens', { kind: 'sync' });
  }

  publishes(target: EntityHandle, label?: string) {
    return this.sendsRequest(target, label ?? 'publishes', { kind: 'event' });
  }

  emits(target: EntityHandle, label?: string) {
    return this.publishes(target, label);
  }

  subscribes(target: EntityHandle, label?: string) {
    return this.getDataFrom(target, label ?? 'subscribes');
  }

  reads(target: EntityHandle, label?: string) {
    return this.getDataFrom(target, label ?? 'reads');
  }

  writes(target: EntityHandle, label?: string) {
    return this.sendsRequest(target, label ?? 'writes', { kind: 'sync' });
  }

  runs(action?: string) {
    return this.executesRequest(action ?? 'runs');
  }

  scenario(name: string) {
    this.runtime.setFlowName(this.flowId, name);
    return this;
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
