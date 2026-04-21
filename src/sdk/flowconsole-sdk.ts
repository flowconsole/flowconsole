// ── Existing types (kept unchanged) ──

/**
 * Describes the synchronization style of a connection between components.
 * @example

 * svc.calls(api, 'HTTP', { kind: 'sync' });

 */
export type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';

/**
 * Visual tone hint for a component on diagrams.
 * @example

 * new SoftwareSystem({ id: 'svc', name: 'Svc', tone: 'danger' });

 */
export type ComponentTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';

// ── Wire-format DTO interfaces (matches backend ModelSnapshotDto) ──

/**
 * Wire-format element DTO matching backend schema.
 */
export interface ElementDto {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly description?: string;
  readonly technology?: string;
  readonly parentId?: string;
  readonly properties?: { [key: string]: string };
  readonly tags?: string[];
}

/**
 * Wire-format relationship DTO matching backend schema.
 */
export interface RelationshipDto {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly kind: string;
  readonly label?: string;
  readonly technology?: string;
  readonly properties?: { [key: string]: string };
}

/**
 * Wire-format flow step DTO. RelationshipId null = action step (per C3).
 * @internal
 */
export interface FlowStepDto {
  readonly sourceElementId: string;
  readonly relationshipId: string | null;
  readonly label?: string;
  readonly properties?: { [key: string]: string };
}

/**
 * Wire-format flow DTO with ordered steps.
 * @internal
 */
export interface FlowDto {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly steps: FlowStepDto[];
}

/**
 * Complete wire-format model snapshot DTO matching schema v1.1.0.
 * @internal
 */
export interface ModelSnapshotDto {
  readonly $schema: string;
  readonly schemaVersion: string;
  readonly source: string;
  readonly elements: ElementDto[];
  readonly relationships: RelationshipDto[];
  readonly flows: FlowDto[] | null;
}

/**
 * Options for connection styling and behavior on diagrams.
 * @example

 * svc.calls(api, 'REST', { kind: 'sync', detail: '/api/v1' });

 */
export interface ConnectionOptions {
  /** Additional detail text shown near the connection arrow. */
  readonly detail?: string;
  /** Synchronization style of the connection. */
  readonly kind?: ConnectionKind;
  /** Icon identifier rendered on the connection. */
  readonly icon?: string;
  /** If true, the connection is visually muted on diagrams. */
  readonly muted?: boolean;
}

// ── Enums aligned with backend ──

/**
 * Element kinds matching the backend ElementKind enum.
 * SDK exposes all 20 values (6 Code + 8 Infra + 6 Architecture).
 *
 * @example

 * const svc = new Component(ElementKind.SERVICE, { id: 'api', name: 'API' });

 */
export enum ElementKind {
  // Code layer
  /** Class or struct in source code. */
  CLASS = 'Class',
  /** Interface or protocol in source code. */
  INTERFACE = 'Interface',
  /** HTTP/gRPC/GraphQL endpoint. */
  ENDPOINT = 'Endpoint',
  /** Standalone function (Lambda, Cloud Function). */
  FUNCTION = 'Function',
  /** Event producer component. */
  PRODUCER = 'Producer',
  /** Event consumer component. */
  CONSUMER = 'Consumer',
  // Infra layer
  /** Deployment target (K8s cluster, VM, serverless). */
  DEPLOYMENT = 'Deployment',
  /** Relational or document database. */
  DATABASE = 'Database',
  /** Message queue (RabbitMQ, SQS). */
  QUEUE = 'Queue',
  /** In-memory cache (Redis, Memcached). */
  CACHE = 'Cache',
  /** Network ingress point (load balancer, API gateway). */
  INGRESS = 'Ingress',
  /** Logical grouping (K8s namespace). */
  NAMESPACE = 'Namespace',
  /** Event streaming broker (Kafka, NATS, Pulsar). */
  BROKER = 'Broker',
  /** Topic within a broker. */
  TOPIC = 'Topic',
  // Architecture layer
  /** Top-level software system or service. */
  SERVICE = 'Service',
  /** Application container within a system. */
  APPLICATION = 'Application',
  /** Logical module within an application. */
  MODULE = 'Module',
  /** External system or third-party integration. */
  EXTERNAL = 'External',
  /** API gateway or reverse proxy. */
  GATEWAY = 'Gateway',
  /** Background worker or job processor. */
  WORKER = 'Worker',
}

/**
 * Relation kinds matching the backend RelationKind enum.
 *
 * @example

 * const id = computeRelationshipId(source, target, RelationKind.CALLS);

 */
export enum RelationKind {
  /** Parent contains child (auto-inferred from belongsTo). */
  CONTAINS = 'Contains',
  /** Component deployed on infrastructure target. */
  DEPLOYED_ON = 'DeployedOn',
  /** Generic usage (typically data stores). */
  USES = 'Uses',
  /** Synchronous call (HTTP, gRPC). */
  CALLS = 'Calls',
  /** Dependency relationship. */
  DEPENDS_ON = 'DependsOn',
  /** Code-level import. */
  IMPORTS = 'Imports',
  /** Interface implementation. */
  IMPLEMENTS = 'Implements',
  /** Event/message production. */
  PRODUCES = 'Produces',
  /** Event/message consumption. */
  CONSUMES = 'Consumes',
  /** Ingress exposes a backend service. */
  EXPOSES = 'Exposes',
  /** Gateway routes traffic to a service. */
  ROUTES_TO = 'RoutesTo',
}

// ── Auto-ID generation (per-slug counters, matches web runtime's slugCounts) ──

const _slugCounters = new Map<string, number>();
function generateAutoId(kind: ElementKind, name?: string): string {
  const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
  const base = slug || kind.toLowerCase();
  const count = _slugCounters.get(base) ?? 0;
  _slugCounters.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

// ── Style types ──

/**
 * Predefined visual presets for diagram rendering.
 * @example

 * new SoftwareSystem({ id: 'svc', name: 'Svc', style: { preset: StylePreset.CRITICAL } });

 */
export enum StylePreset {
  DEFAULT = 'default',
  HIGHLIGHTED = 'highlighted',
  CRITICAL = 'critical',
  DEPRECATED = 'deprecated',
  NEW = 'new',
  EXTERNAL = 'external',
}

/**
 * Shape geometry for diagram node rendering.
 * @example

 * new Database({ id: 'db', name: 'DB', style: { shape: ShapeKind.CYLINDER } });

 */
export enum ShapeKind {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  HEXAGON = 'hexagon',
  CYLINDER = 'cylinder',
  PIPE = 'pipe',
  PERSON = 'person',
  CLOUD = 'cloud',
}

/**
 * Custom visual style overrides for a component on diagrams.
 * Style resolution priority: explicit custom colors > preset > tone > default theme.
 */
export interface ComponentStyle {
  /** Apply a named style preset. */
  readonly preset?: StylePreset;
  /** Text/foreground color (CSS). */
  readonly color?: string;
  /** Background fill color (CSS). */
  readonly backgroundColor?: string;
  /** Border color (CSS). */
  readonly borderColor?: string;
  /** Icon identifier. */
  readonly icon?: string;
  /** Shape override for the diagram node. */
  readonly shape?: ShapeKind;
}

/**
 * Returns the default icon name for a given ElementKind.
 */
export function getDefaultIconForKind(kind: ElementKind): string {
  switch (kind) {
    case ElementKind.EXTERNAL:
      return 'cloud';
    case ElementKind.SERVICE:
      return 'system';
    case ElementKind.APPLICATION:
    case ElementKind.ENDPOINT:
    case ElementKind.FUNCTION:
      return 'api';
    case ElementKind.MODULE:
    case ElementKind.NAMESPACE:
    case ElementKind.CLASS:
    case ElementKind.INTERFACE:
      return 'system';
    case ElementKind.GATEWAY:
    case ElementKind.INGRESS:
      return 'gateway';
    case ElementKind.WORKER:
    case ElementKind.PRODUCER:
    case ElementKind.CONSUMER:
      return 'worker';
    case ElementKind.DATABASE:
      return 'database';
    case ElementKind.CACHE:
      return 'cache';
    case ElementKind.QUEUE:
    case ElementKind.BROKER:
      return 'queue';
    case ElementKind.TOPIC:
      return 'topic';
    case ElementKind.DEPLOYMENT:
      return 'deployment';
    default:
      return 'system';
  }
}

/**
 * Returns the default shape for a given ElementKind.
 */
export function getDefaultShapeForKind(kind: ElementKind): ShapeKind {
  switch (kind) {
    case ElementKind.DATABASE:
    case ElementKind.CACHE:
      return ShapeKind.CYLINDER;
    case ElementKind.QUEUE:
    case ElementKind.TOPIC:
    case ElementKind.BROKER:
      return ShapeKind.PIPE;
    case ElementKind.EXTERNAL:
      return ShapeKind.CLOUD;
    case ElementKind.GATEWAY:
    case ElementKind.INGRESS:
      return ShapeKind.HEXAGON;
    default:
      return ShapeKind.RECTANGLE;
  }
}

// ── Component args and base class ──

/**
 * Constructor arguments for Component and its subclasses.
 *
 * @example

 * new SoftwareSystem({ id: 'api', name: 'API Service', technology: 'Node.js' });

 */
export interface ComponentArgs {
  /** Unique identifier. Auto-generated from name if omitted. */
  readonly id?: string;
  /** Human-readable name. */
  readonly name?: string;
  /** Free-text description. */
  readonly description?: string;
  /** Technology stack label (e.g., 'Node.js', 'PostgreSQL'). */
  readonly technology?: string;
  /** Arbitrary key-value metadata. */
  readonly properties?: { [key: string]: string };
  /** Parent component (infers Contains relationship). */
  readonly belongsTo?: Component;
  /** Classification tags for filtering. */
  readonly tags?: string[];
  /** Badge text rendered on the diagram node. */
  readonly badge?: string;
  /** Visual tone hint for diagram rendering. */
  readonly tone?: ComponentTone;
  /** Custom visual style overrides. */
  readonly style?: ComponentStyle;
}

/**
 * Options for deployment relationships.
 * @example

 * api.deployedOn(cluster, { replicas: 3, cpu: '500m', memory: '256Mi' });

 */
export interface DeploymentOptions {
  /** Number of replicas. */
  readonly replicas?: number;
  /** CPU resource request (K8s format, e.g., '500m'). */
  readonly cpu?: string;
  /** Memory resource request (K8s format, e.g., '256Mi'). */
  readonly memory?: string;
}

/**
 * Options for expose relationships (ingress to service).
 */
export interface ExposeOptions {
  /** URL path prefix for the exposed route. */
  readonly path?: string;
}

/**
 * Internal record of a flow step captured by the runtime.
 */
export interface FlowStep {
  readonly source: Component;
  readonly target?: Component;
  readonly label?: string;
  readonly options?: ConnectionOptions;
  readonly method: string;
}

/**
 * Internal record of a deployment relationship.
 */
export interface DeploymentRecord {
  readonly source: Component;
  readonly target: Component;
  readonly relationKind: RelationKind;
  readonly options?: DeploymentOptions | ExposeOptions;
}

/**
 * Fluent builder returned by flow methods. Allows chaining with .then() and .scenario().
 */
export class FlowBuilder {
  private readonly _steps: FlowStep[];
  private readonly _runtime: FlowRuntime;
  private _current: Component;

  constructor(runtime: FlowRuntime, steps: FlowStep[], current: Component) {
    this._steps = steps;
    this._runtime = runtime;
    this._current = current;
  }

  /**
   * Switch the source of the next step in the chain.
   */
  public then(next: Component): FlowBuilder {
    this._current = next;
    return this;
  }

  // ── Base flow methods ──

  public sendsRequest(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({ source: this._current, target, label, options, method: 'sendsRequest' });
    this._current = target;
    return this;
  }

  public sendsRequestTo(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    return this.sendsRequest(target, label, options);
  }

  public calls(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({
      source: this._current,
      target,
      label,
      options: { kind: 'sync', ...options },
      method: 'calls',
    });
    this._current = target;
    return this;
  }

  public getDataFrom(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({ source: this._current, target, label, options, method: 'getDataFrom' });
    // Do NOT advance _current: the reader continues as the actor, not the data source
    return this;
  }

  public uses(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({
      source: this._current,
      target,
      label,
      options: { kind: 'dependency', ...options },
      method: 'uses',
    });
    // Do NOT advance _current: uses/dependency edges describe a supporting dependency.
    return this;
  }

  public dependsOn(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({
      source: this._current,
      target,
      label,
      options: { kind: 'dependency', ...options },
      method: 'dependsOn',
    });
    // Do NOT advance _current: dependency edges describe a supporting dependency.
    return this;
  }

  public produces(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({
      source: this._current,
      target,
      label,
      options: { kind: 'event', ...options },
      method: 'produces',
    });
    // Do NOT advance _current: produce edges describe an output from the current actor.
    return this;
  }

  public consumes(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({
      source: this._current,
      target,
      label,
      options: { kind: 'dependency', ...options },
      method: 'consumes',
    });
    // Do NOT advance _current: consume edges describe an input to the current actor.
    return this;
  }

  public executesRequest(label?: string): FlowBuilder {
    this._steps.push({ source: this._current, target: undefined, label, options: undefined, method: 'executesRequest' });
    return this;
  }

  /**
   * Execute branches in parallel for visualization on diagrams.
   * Steps inside each branch are already captured when the branch expression
   * is evaluated; this method only serves as a visual grouping marker.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public inParallel(...branches: FlowBuilder[]): FlowBuilder {
    return this;
  }

  // ── Convenience flow wrappers ──

  public opens(target: Component, label?: string): FlowBuilder {
    return this.sendsRequest(target, label, { kind: 'sync' });
  }

  public publishes(target: Component, label?: string): FlowBuilder {
    return this.sendsRequest(target, label, { kind: 'event' });
  }

  public emits(target: Component, label?: string): FlowBuilder {
    return this.publishes(target, label);
  }

  public subscribes(target: Component, label?: string): FlowBuilder {
    return this.getDataFrom(target, label);
  }

  public reads(target: Component, label?: string): FlowBuilder {
    return this.getDataFrom(target, label);
  }

  public writes(target: Component, label?: string): FlowBuilder {
    return this.sendsRequest(target, label, { kind: 'sync' });
  }

  public runs(label?: string): FlowBuilder {
    return this.executesRequest(label);
  }

  /**
   * Finalize the flow chain with a scenario name.
   */
  public scenario(name: string): FlowBuilder {
    this._runtime._registerScenario(name, this._steps);
    return this;
  }
}

/**
 * Global flow runtime that collects all flow steps and scenarios.
 */
export class FlowRuntime {
  private readonly _scenarios: { [name: string]: FlowStep[] } = {};
  private readonly _unnamedFlows: FlowStep[][] = [];
  private readonly _deployments: DeploymentRecord[] = [];

  /**
   * Start a new flow chain from a component.
   */
  public startFlow(source: Component): FlowBuilder {
    const steps: FlowStep[] = [];
    this._unnamedFlows.push(steps);
    return new FlowBuilder(this, steps, source);
  }

  /**
   * Register a named scenario. Called by FlowBuilder.scenario().
   * @internal
   */
  public _registerScenario(name: string, steps: FlowStep[]): void {
    if (this._scenarios[name]) {
      throw new Error(`Scenario "${name}" is already registered. Use a unique name for each scenario.`);
    }
    this._scenarios[name] = steps;
    // Remove from unnamed flows
    const idx = this._unnamedFlows.indexOf(steps);
    if (idx >= 0) {
      this._unnamedFlows.splice(idx, 1);
    }
  }

  /**
   * Register a deployment relationship.
   * @internal
   */
  public _registerDeployment(record: DeploymentRecord): void {
    this._deployments.push(record);
  }

  /**
   * Get all registered scenarios.
   */
  public get scenarios(): { [name: string]: FlowStep[] } {
    return { ...this._scenarios };
  }

  /**
   * Get all unnamed flows.
   */
  public get unnamedFlows(): FlowStep[][] {
    return [...this._unnamedFlows];
  }

  /**
   * Get all deployment records.
   */
  public get deployments(): DeploymentRecord[] {
    return [...this._deployments];
  }

  /**
   * Clear all accumulated state (scenarios, unnamed flows, deployments).
   */
  public reset(): void {
    for (const key of Object.keys(this._scenarios)) {
      delete this._scenarios[key];
    }
    this._unnamedFlows.length = 0;
    this._deployments.length = 0;
  }
}

/**
 * Global singleton runtime instance.
 */
const _globalRuntime = new FlowRuntime();

/**
 * Get the global FlowRuntime instance.
 */
export function getRuntime(): FlowRuntime {
  return _globalRuntime;
}

/**
 * Reset the global runtime, clearing all accumulated flows, scenarios, and deployments.
 * Call this before building a new model in the same process.
 */
export function resetRuntime(): void {
  _globalRuntime.reset();
  _slugCounters.clear();
}

/**
 * Base class for all architectural elements.
 */
export class Component {

  public readonly id: string;
  public readonly name?: string;
  public readonly description?: string;
  public readonly technology?: string;
  public readonly properties?: { [key: string]: string };
  public readonly belongsTo?: Component;
  public readonly tags?: string[];
  public readonly badge?: string;
  public readonly tone?: ComponentTone;
  public readonly style?: ComponentStyle;
  public readonly kind: ElementKind;

  constructor(kind: ElementKind, args: ComponentArgs) {
    this.kind = kind;
    this.id = args.id ?? generateAutoId(kind, args.name);
    this.name = args.name;
    this.description = args.description;
    this.technology = args.technology;
    this.properties = args.properties;
    this.belongsTo = args.belongsTo;
    this.tags = args.tags;
    this.badge = args.badge;
    this.tone = args.tone;
    this.style = args.style;
  }

  /**
   * Convert this component to a wire-format ElementDto.
   */
  public toDto(): ElementDto {
    const dto: ElementDto = {
      id: this.id,
      kind: this.kind,
      name: this.name ?? this.id,
    };
    const extras: Record<string, unknown> = {};
    if (this.description) extras['description'] = this.description;
    if (this.technology) extras['technology'] = this.technology;
    if (this.belongsTo) extras['parentId'] = this.belongsTo.id;
    if (this.properties && Object.keys(this.properties).length > 0) extras['properties'] = this.properties;
    if (this.tags && this.tags.length > 0) extras['tags'] = this.tags;
    return Object.keys(extras).length > 0 ? { ...dto, ...extras } as ElementDto : dto;
  }

  // ── Base flow methods ──

  public sendsRequest(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.sendsRequest(target, label, options);
  }

  public sendsRequestTo(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    return this.sendsRequest(target, label, options);
  }

  public calls(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.calls(target, label, options);
  }

  public then(target: Component): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.then(target);
  }

  public getDataFrom(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.getDataFrom(target, label, options);
  }

  public uses(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.uses(target, label, options);
  }

  public dependsOn(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.dependsOn(target, label, options);
  }

  public produces(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.produces(target, label, options);
  }

  public consumes(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.consumes(target, label, options);
  }

  public executesRequest(label?: string): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.executesRequest(label);
  }

  /**
   * Execute branches in parallel starting from this component.
   * Steps inside each branch are already captured at expression evaluation;
   * this method only serves as a visual grouping marker.
   */
  public inParallel(...branches: FlowBuilder[]): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.inParallel(...branches);
  }

  // ── Convenience flow wrappers ──

  public opens(target: Component, label?: string): FlowBuilder {
    return this.sendsRequest(target, label, { kind: 'sync' });
  }

  public publishes(target: Component, label?: string): FlowBuilder {
    return this.sendsRequest(target, label, { kind: 'event' });
  }

  public emits(target: Component, label?: string): FlowBuilder {
    return this.publishes(target, label);
  }

  public subscribes(target: Component, label?: string): FlowBuilder {
    return this.getDataFrom(target, label);
  }

  public reads(target: Component, label?: string): FlowBuilder {
    return this.getDataFrom(target, label);
  }

  public writes(target: Component, label?: string): FlowBuilder {
    return this.sendsRequest(target, label, { kind: 'sync' });
  }

  public runs(label?: string): FlowBuilder {
    return this.executesRequest(label);
  }

  // ── Deployment methods ──

  public deployedOn(target: Component, options?: DeploymentOptions): void {
    const runtime = getRuntime();
    runtime._registerDeployment({
      source: this,
      target,
      relationKind: RelationKind.DEPLOYED_ON,
      options,
    });
  }

  public routesTo(target: Component): void {
    const runtime = getRuntime();
    runtime._registerDeployment({
      source: this,
      target,
      relationKind: RelationKind.ROUTES_TO,
    });
  }

  public exposes(target: Component, options?: ExposeOptions): void {
    const runtime = getRuntime();
    runtime._registerDeployment({
      source: this,
      target,
      relationKind: RelationKind.EXPOSES,
      options,
    });
  }
}

// ── Args interfaces for element classes ──

export interface UserArgs extends ComponentArgs {
  readonly role?: string;
}

export interface SoftwareSystemArgs extends ComponentArgs {
  readonly domain?: string;
}

export interface ExternalArgs extends ComponentArgs {
  readonly vendor?: string;
}

export interface DatabaseArgs extends ComponentArgs {
  readonly engine?: string;
}

export interface CacheArgs extends ComponentArgs {
  readonly engine?: string;
}

export interface QueueArgs extends ComponentArgs {
  readonly engine?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BrokerArgs extends ComponentArgs {
}

export interface TopicArgs extends ComponentArgs {
  readonly partitions?: number;
}

// ── Deployment args ──

export interface K8sClusterArgs extends ComponentArgs {
  readonly region?: string;
  readonly version?: string;
}

export interface ManagedDatabaseArgs extends ComponentArgs {
  readonly provider?: string;
  readonly engine?: string;
}

export interface ServerlessArgs extends ComponentArgs {
  readonly runtime?: string;
  readonly provider?: string;
}

export interface VmArgs extends ComponentArgs {
  readonly os?: string;
  readonly provider?: string;
}

export interface CdnArgs extends ComponentArgs {
  readonly provider?: string;
}

export interface IngressArgs extends ComponentArgs {
  readonly host?: string;
  readonly tls?: boolean;
}

// ── Convenience args ──

export interface RestApiArgs extends ComponentArgs {
  readonly baseUrl?: string;
  readonly openapi?: string;
}

export interface GrpcApiArgs extends ComponentArgs {
  readonly proto?: string;
}

export interface GraphqlApiArgs extends ComponentArgs {
  readonly schema?: string;
}

// ── Base element classes (13) ──

/**
 * Human actor or external user. Maps to ElementKind.EXTERNAL.
 * @example

 * const admin = new User({ id: 'admin', name: 'Admin', role: 'administrator' });

 */
export class User extends Component {
  public readonly role?: string;

  constructor(args: UserArgs) {
    super(ElementKind.EXTERNAL, args);
    this.role = args.role;
  }
}

/**
 * Top-level software system. Maps to ElementKind.SERVICE.
 * Named SoftwareSystem (not System) because 'System' is reserved in C#.
 * @example

 * const api = new SoftwareSystem({ id: 'api', name: 'API', technology: 'Node.js' });

 */
export class SoftwareSystem extends Component {
  public readonly domain?: string;

  constructor(args: SoftwareSystemArgs) {
    super(ElementKind.SERVICE, args);
    this.domain = args.domain;
  }
}

/**
 * Logical grouping (K8s namespace). Maps to ElementKind.NAMESPACE.
 */
export class Namespace extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.NAMESPACE, args);
  }
}

/**
 * Application container within a system. Maps to ElementKind.APPLICATION.
 * @example

 * const web = new Container({ id: 'web', name: 'Web App', belongsTo: system });

 */
export class Container extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.APPLICATION, args);
  }
}

/**
 * Logical module within an application. Maps to ElementKind.MODULE.
 */
export class Module extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.MODULE, args);
  }
}

/**
 * External system or third-party integration. Maps to ElementKind.EXTERNAL.
 * @example

 * const stripe = new External({ id: 'stripe', name: 'Stripe', vendor: 'Stripe Inc.' });

 */
export class External extends Component {
  public readonly vendor?: string;

  constructor(args: ExternalArgs) {
    super(ElementKind.EXTERNAL, args);
    this.vendor = args.vendor;
  }
}

/**
 * API gateway or reverse proxy. Maps to ElementKind.GATEWAY.
 */
export class Gateway extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.GATEWAY, args);
  }
}

/**
 * Background worker or job processor. Maps to ElementKind.WORKER.
 */
export class Worker extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.WORKER, args);
  }
}

/**
 * Relational or document database. Maps to ElementKind.DATABASE.
 * @example

 * const db = new Database({ id: 'pg', name: 'PostgreSQL', engine: 'PostgreSQL' });

 */
export class Database extends Component {
  /** Database engine name (e.g., 'PostgreSQL', 'MongoDB'). */
  public readonly engine?: string;

  constructor(args: DatabaseArgs) {
    super(ElementKind.DATABASE, args);
    this.engine = args.engine;
  }
}

/**
 * In-memory cache. Maps to ElementKind.CACHE.
 * @example

 * const cache = new Cache({ id: 'redis', name: 'Redis', engine: 'Redis' });

 */
export class Cache extends Component {
  /** Cache engine name. */
  public readonly engine?: string;

  constructor(args: CacheArgs) {
    super(ElementKind.CACHE, args);
    this.engine = args.engine;
  }
}

/**
 * Message queue (RabbitMQ, SQS). Maps to ElementKind.QUEUE.
 * @example

 * const q = new Queue({ id: 'tasks', name: 'Task Queue', engine: 'RabbitMQ' });

 */
export class Queue extends Component {
  /** Queue engine name. */
  public readonly engine?: string;

  constructor(args: QueueArgs) {
    super(ElementKind.QUEUE, args);
    this.engine = args.engine;
  }
}

/**
 * Event streaming broker (Kafka, NATS, Pulsar). Maps to ElementKind.BROKER.
 * @example

 * const broker = new Broker({ id: 'kafka', name: 'Kafka' });

 */
export class Broker extends Component {
  constructor(args: BrokerArgs) {
    super(ElementKind.BROKER, args);
  }
}

/**
 * Topic within a broker. Maps to ElementKind.TOPIC.
 * Must have a Broker as belongsTo parent.
 * @example

 * const topic = new Topic({ id: 'events', name: 'Events', partitions: 12, belongsTo: broker });

 */
export class Topic extends Component {
  /** Number of topic partitions. */
  public readonly partitions?: number;

  constructor(args: TopicArgs) {
    super(ElementKind.TOPIC, args);
    this.partitions = args.partitions;
  }
}

// ── Deployment classes (6) ──

/**
 * Kubernetes cluster deployment target. Maps to ElementKind.DEPLOYMENT.
 * @example

 * const cluster = new K8sCluster({ id: 'prod', name: 'Production', region: 'us-east-1' });
 * api.deployedOn(cluster, { replicas: 3 });

 */
export class K8sCluster extends Component {
  public readonly region?: string;
  public readonly version?: string;

  constructor(args: K8sClusterArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.region = args.region;
    this.version = args.version;
  }
}

/** Managed database service (RDS, Cloud SQL). Maps to ElementKind.DEPLOYMENT. */
export class ManagedDatabase extends Component {
  public readonly provider?: string;
  public readonly engine?: string;

  constructor(args: ManagedDatabaseArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.provider = args.provider;
    this.engine = args.engine;
  }
}

/** Serverless compute target (Lambda, Cloud Functions). Maps to ElementKind.DEPLOYMENT. */
export class Serverless extends Component {
  public readonly runtime?: string;
  public readonly provider?: string;

  constructor(args: ServerlessArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.runtime = args.runtime;
    this.provider = args.provider;
  }
}

/** Virtual machine deployment target. Maps to ElementKind.DEPLOYMENT. */
export class Vm extends Component {
  public readonly os?: string;
  public readonly provider?: string;

  constructor(args: VmArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.os = args.os;
    this.provider = args.provider;
  }
}

/** Content delivery network. Maps to ElementKind.DEPLOYMENT. */
export class Cdn extends Component {
  public readonly provider?: string;

  constructor(args: CdnArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.provider = args.provider;
  }
}

/** Network ingress point (load balancer). Maps to ElementKind.INGRESS. */
export class Ingress extends Component {
  public readonly host?: string;
  public readonly tls?: boolean;

  constructor(args: IngressArgs) {
    super(ElementKind.INGRESS, args);
    this.host = args.host;
    this.tls = args.tls;
  }
}

// ── Convenience classes (23) ──

// API patterns (extend Container → kind=Application)

/**
 * REST API container. Pre-sets technology='REST API'.
 * @example

 * const api = new RestApi({ id: 'api', name: 'User API', baseUrl: '/api/v1' });

 */
export class RestApi extends Container {
  public readonly baseUrl?: string;
  public readonly openapi?: string;

  constructor(args: RestApiArgs) {
    super({ technology: 'REST API', ...args });
    this.baseUrl = args.baseUrl;
    this.openapi = args.openapi;
  }
}

/** gRPC API container. Pre-sets technology='gRPC'. */
export class GrpcApi extends Container {
  public readonly proto?: string;

  constructor(args: GrpcApiArgs) {
    super({ technology: 'gRPC', ...args });
    this.proto = args.proto;
  }
}

/** GraphQL API container. Pre-sets technology='GraphQL'. */
export class GraphqlApi extends Container {
  public readonly schema?: string;

  constructor(args: GraphqlApiArgs) {
    super({ technology: 'GraphQL', ...args });
    this.schema = args.schema;
  }
}

// Web/Mobile/Desktop frameworks (extend Container → kind=Application)

/** React SPA container. Pre-sets technology='React'. */
export class ReactApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'React', ...args });
  }
}

/** Next.js application container. Pre-sets technology='Next.js'. */
export class NextApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Next.js', ...args });
  }
}

/** Vue.js application container. Pre-sets technology='Vue.js'. */
export class VueApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Vue.js', ...args });
  }
}

/** Angular application container. Pre-sets technology='Angular'. */
export class AngularApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Angular', ...args });
  }
}

/** Svelte application container. Pre-sets technology='Svelte'. */
export class SvelteApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Svelte', ...args });
  }
}

/** Blazor application container. Pre-sets technology='Blazor'. */
export class BlazorApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Blazor', ...args });
  }
}

/** iOS mobile application container. Pre-sets technology='iOS'. */
export class IosApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'iOS', ...args });
  }
}

/** Android mobile application container. Pre-sets technology='Android'. */
export class AndroidApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Android', ...args });
  }
}

/** Desktop application container. Pre-sets technology='Desktop'. */
export class DesktopApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Desktop', ...args });
  }
}

// Database convenience classes (extend Database)

/** PostgreSQL database. Pre-sets engine='PostgreSQL'. */
export class Postgres extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'PostgreSQL', ...args });
  }
}

/** MySQL database. Pre-sets engine='MySQL'. */
export class Mysql extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'MySQL', ...args });
  }
}

/** MongoDB database. Pre-sets engine='MongoDB'. */
export class Mongo extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'MongoDB', ...args });
  }
}

/** ClickHouse analytics database. Pre-sets engine='ClickHouse'. */
export class Clickhouse extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'ClickHouse', ...args });
  }
}

// Cache convenience classes (extend Cache)

/** Redis cache. Pre-sets engine='Redis'. */
export class Redis extends Cache {
  constructor(args: CacheArgs) {
    super({ engine: 'Redis', ...args });
  }
}

/** Memcached cache. Pre-sets engine='Memcached'. */
export class Memcached extends Cache {
  constructor(args: CacheArgs) {
    super({ engine: 'Memcached', ...args });
  }
}

// Queue convenience classes (extend Queue)

/** RabbitMQ message queue. Pre-sets engine='RabbitMQ'. */
export class Rabbit extends Queue {
  constructor(args: QueueArgs) {
    super({ engine: 'RabbitMQ', ...args });
  }
}

/** AWS SQS queue. Pre-sets engine='AWS SQS'. */
export class Sqs extends Queue {
  constructor(args: QueueArgs) {
    super({ engine: 'AWS SQS', ...args });
  }
}

// Broker convenience classes (extend Broker)

/** Apache Kafka broker. Pre-sets technology='Kafka'. */
export class Kafka extends Broker {
  constructor(args: BrokerArgs) {
    super({ technology: 'Kafka', ...args });
  }
}

/** NATS messaging broker. Pre-sets technology='NATS'. */
export class Nats extends Broker {
  constructor(args: BrokerArgs) {
    super({ technology: 'NATS', ...args });
  }
}

/** Apache Pulsar broker. Pre-sets technology='Apache Pulsar'. */
export class Pulsar extends Broker {
  constructor(args: BrokerArgs) {
    super({ technology: 'Apache Pulsar', ...args });
  }
}

// ── Inference and validation ──

/**
 * Represents a single inferred relationship between two components.
 */
export interface InferredRelationship {
  readonly source: Component;
  readonly target: Component;
  readonly relationKind: RelationKind;
  readonly labels: string[];
  readonly options?: ConnectionOptions;
}

/**
 * Allowed parent kinds for each element kind.
 * Topic has a special rule: belongsTo must be a Broker.
 */
const ALLOWED_PARENTS: { [key: string]: ElementKind[] | undefined } = {
  [ElementKind.EXTERNAL]: [ElementKind.SERVICE, ElementKind.APPLICATION],
  [ElementKind.SERVICE]: [],
  [ElementKind.NAMESPACE]: [ElementKind.SERVICE],
  [ElementKind.APPLICATION]: [ElementKind.SERVICE, ElementKind.NAMESPACE],
  [ElementKind.MODULE]: [ElementKind.APPLICATION, ElementKind.SERVICE],
  [ElementKind.GATEWAY]: [ElementKind.SERVICE, ElementKind.APPLICATION],
  [ElementKind.WORKER]: [ElementKind.SERVICE, ElementKind.APPLICATION],
  [ElementKind.DATABASE]: [ElementKind.SERVICE, ElementKind.APPLICATION],
  [ElementKind.CACHE]: [ElementKind.SERVICE, ElementKind.APPLICATION],
  [ElementKind.QUEUE]: [ElementKind.SERVICE, ElementKind.APPLICATION],
  [ElementKind.BROKER]: [ElementKind.SERVICE, ElementKind.APPLICATION],
  [ElementKind.TOPIC]: [ElementKind.BROKER],
};

// ── Deterministic relationship ID computation ──

/**
 * Maps RelationKind enum to backend scanner convention string.
 * Single-word: lowercase ('Calls' → 'calls').
 * Multi-word: camelCase first letter lowered ('DependsOn' → 'dependsOn').
 */
export function relationKindToConventionString(kind: RelationKind): string {
  return kind.charAt(0).toLowerCase() + kind.slice(1);
}

/**
 * Compute deterministic relationship ID matching backend scanner convention.
 * Format: "{srcId}--{kindConvention}-->{tgtId}"
 *
 * MUST match production scanners:
 * - HelmConceptProjector.cs:61   → "{chart}--contains-->{workload}"
 * - CSharpConceptProjector.cs:85 → "{root}--exposes-->{api}"
 */
export function computeRelationshipId(source: Component, target: Component, kind: RelationKind): string {
  const srcId = source.id ?? source.name ?? '';
  const tgtId = target.id ?? target.name ?? '';
  const relName = relationKindToConventionString(kind);
  return `${srcId}--${relName}-->${tgtId}`;
}

// ── Canonical JSON serialization ──

/**
 * JSON replacer that sorts object keys for byte-stable output.
 */
function canonicalReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = (value as Record<string, unknown>)[k];
      return acc;
    }, {});
  }
  return value;
}

// ── Step-to-DTO mapping ──

/**
 * Map internal FlowStep to wire-format FlowStepDto.
 * Action steps (no target) get relationshipId=null per C3.
 */
function mapStepToDto(step: FlowStep): FlowStepDto {
  const sourceElementId = step.source.id ?? step.source.name ?? '';
  if (!step.target) {
    // Action step
    const result: FlowStepDto = {
      sourceElementId,
      relationshipId: null,
    };
    if (step.label) {
      return { ...result, label: step.label };
    }
    return result;
  }
  const kind = inferRelationKindForStep(step);
  const relationshipId = kind ? computeRelationshipId(step.source, step.target, kind) : null;
  const result: FlowStepDto = {
    sourceElementId,
    relationshipId,
  };
  if (step.label) {
    return { ...result, label: step.label };
  }
  return result;
}

/**
 * Map InferredRelationship to wire-format RelationshipDto.
 */
function mapInferredToDto(rel: InferredRelationship): RelationshipDto {
  const srcId = rel.source.id;
  const tgtId = rel.target.id;
  const kindStr = relationKindToConventionString(rel.relationKind);
  const dto: RelationshipDto = {
    id: `${srcId}--${kindStr}-->${tgtId}`,
    sourceId: srcId,
    targetId: tgtId,
    kind: rel.relationKind,
  };
  if (rel.labels.length > 0) {
    return { ...dto, label: rel.labels.join(', ') };
  }
  return dto;
}

/** Set of ElementKinds considered as Database or Cache for inference */
const DATA_STORE_KINDS = new Set([ElementKind.DATABASE, ElementKind.CACHE]);
/** Set of ElementKinds considered as Topic or Queue for inference */
const MESSAGING_KINDS = new Set([ElementKind.TOPIC, ElementKind.QUEUE]);

/**
 * Infer the RelationKind for a flow step based on method name, options, and target kind.
 */
function inferRelationKindForStep(step: FlowStep): RelationKind | undefined {
  if (step.method === 'executesRequest') {
    return undefined; // Internal action, no relationship created
  }

  const targetKind = step.target?.kind;
  const connectionKind = step.options?.kind;

  if (step.method === 'sendsRequest') {
    if (connectionKind === 'event') {
      if (targetKind && MESSAGING_KINDS.has(targetKind)) {
        return RelationKind.PRODUCES;
      }
      // Non-messaging target: fall through to default logic
    }
    if (connectionKind === 'dependency') {
      return RelationKind.DEPENDS_ON;
    }
    if (connectionKind === 'async') {
      return RelationKind.CALLS;
    }
    // sync or default
    if (targetKind && DATA_STORE_KINDS.has(targetKind)) {
      return RelationKind.USES;
    }
    return RelationKind.CALLS;
  }

  if (step.method === 'getDataFrom') {
    if (targetKind && MESSAGING_KINDS.has(targetKind)) {
      return RelationKind.CONSUMES;
    }
    if (targetKind && DATA_STORE_KINDS.has(targetKind)) {
      return RelationKind.USES;
    }
    return RelationKind.CALLS;
  }

  if (step.method === 'uses') {
    return RelationKind.USES;
  }

  if (step.method === 'dependsOn') {
    return RelationKind.DEPENDS_ON;
  }

  if (step.method === 'produces') {
    return RelationKind.PRODUCES;
  }

  if (step.method === 'consumes') {
    return RelationKind.CONSUMES;
  }

  if (step.method === 'calls') {
    return RelationKind.CALLS;
  }

  return RelationKind.CALLS;
}

/**
 * Build a deduplication key for relationships.
 */
function relationKey(source: Component, target: Component, kind: RelationKind): string {
  const srcId = source.id ?? source.name ?? '';
  const tgtId = target.id ?? target.name ?? '';
  return `${srcId}::${tgtId}::${kind}`;
}

/**
 * Infer relationships from flow steps and deployment records.
 * Deduplicates: one (source, target, relationKind) pair produces one relationship with merged labels.
 */
export function inferRelationships(
  entities: Component[],
  flows: FlowStep[][],
  deployments: DeploymentRecord[],
): InferredRelationship[] {
  const map = new Map<string, InferredRelationship>();

  // Contains relationships from belongsTo
  for (const entity of entities) {
    if (entity.belongsTo) {
      const key = relationKey(entity.belongsTo, entity, RelationKind.CONTAINS);
      if (!map.has(key)) {
        map.set(key, {
          source: entity.belongsTo,
          target: entity,
          relationKind: RelationKind.CONTAINS,
          labels: [],
        });
      }
    }
  }

  // Flow-inferred relationships
  for (const steps of flows) {
    for (const step of steps) {
      if (!step.target) {
        continue;
      }
      const kind = inferRelationKindForStep(step);
      if (!kind) {
        continue;
      }
      const key = relationKey(step.source, step.target, kind);
      const existing = map.get(key);
      if (existing) {
        if (step.label) {
          map.set(key, { ...existing, labels: [...existing.labels, step.label] });
        }
      } else {
        map.set(key, {
          source: step.source,
          target: step.target,
          relationKind: kind,
          labels: step.label ? [step.label] : [],
          options: step.options,
        });
      }
    }
  }

  // Deployment relationships
  for (const dep of deployments) {
    const key = relationKey(dep.source, dep.target, dep.relationKind);
    if (!map.has(key)) {
      map.set(key, {
        source: dep.source,
        target: dep.target,
        relationKind: dep.relationKind,
        labels: [],
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Validate belongsTo rules for all entities.
 * Throws Error if any entity violates the allowed parent rules.
 */
export function validateBelongsTo(entities: Component[]): void {
  for (const entity of entities) {
    const kind = entity.kind;

    // Topic must have a Broker parent
    if (kind === ElementKind.TOPIC) {
      if (!entity.belongsTo || entity.belongsTo.kind !== ElementKind.BROKER) {
        const name = entity.name ?? entity.id ?? 'unnamed';
        throw new Error(
          `Topic "${name}" must have a Broker as belongsTo parent`,
        );
      }
      continue;
    }

    // User and SoftwareSystem (Service) are top-level — belongsTo must be undefined
    if (kind === ElementKind.SERVICE) {
      if (entity.belongsTo) {
        const name = entity.name ?? entity.id ?? 'unnamed';
        throw new Error(
          `SoftwareSystem "${name}" cannot have a parent (must be top-level)`,
        );
      }
      continue;
    }

    // Check allowed parents
    if (entity.belongsTo) {
      const allowed = ALLOWED_PARENTS[kind];
      if (allowed && allowed.length > 0 && !allowed.includes(entity.belongsTo.kind)) {
        const name = entity.name ?? entity.id ?? 'unnamed';
        const parentName = entity.belongsTo.name ?? entity.belongsTo.id ?? 'unnamed';
        throw new Error(
          `Element "${name}" (${kind}) cannot belong to "${parentName}" (${entity.belongsTo.kind}). Allowed parent kinds: ${allowed.join(', ')}`,
        );
      }
    }
  }
}

/**
 * IModelSnapshot result from buildSnapshot().
 * Includes emitter methods for wire-format serialization.
 */
export interface IModelSnapshot {
  readonly entities: Component[];
  readonly relationships: InferredRelationship[];
  readonly scenarios: { [name: string]: FlowStep[] };
  /** @internal */
  _toModelSnapshotDto(): ModelSnapshotDto;
  /**
   * Serialize to JSON string with canonical key ordering for byte-stable output.
   * @param indent - Number of spaces for indentation (default: 2).
   * @returns JSON string matching schema v1.1.0.
   */
  toJson(indent?: number): string;
}

/**
 * Build a complete IModelSnapshot from the current runtime state.
 * Validates belongsTo rules and infers all relationships.
 * Returns object with data properties and emitter methods.
 */
export function buildSnapshot(entities: Component[], runtime?: FlowRuntime): IModelSnapshot {
  const rt = runtime ?? getRuntime();

  // Validate
  validateBelongsTo(entities);

  // Collect all flow steps
  const allFlows: FlowStep[][] = [];
  for (const name of Object.keys(rt.scenarios)) {
    allFlows.push(rt.scenarios[name]);
  }
  for (const flow of rt.unnamedFlows) {
    allFlows.push(flow);
  }

  // Infer relationships
  const relationships = inferRelationships(entities, allFlows, rt.deployments);
  const scenarios = rt.scenarios;

  const snapshot: IModelSnapshot = {
    entities,
    relationships,
    scenarios,
    _toModelSnapshotDto(): ModelSnapshotDto {
      // Build flows from scenarios, sorted by id for stability
      const scenarioEntries = Object.entries(scenarios).sort(([a], [b]) => a.localeCompare(b));
      const flows: FlowDto[] = scenarioEntries.map(([name, steps]) => {
        const flowDto: FlowDto = {
          id: name,
          name,
          steps: steps.map(s => mapStepToDto(s)),
        };
        return flowDto;
      });

      return {
        $schema: 'https://flowconsole.tech/contracts/model-snapshot/v1/schema.json',
        schemaVersion: '1.1.0',
        source: 'Git',
        elements: entities.map(e => e.toDto()),
        relationships: relationships.map(r => mapInferredToDto(r)),
        flows: flows.length > 0 ? flows : null,
      };
    },
    toJson(indent = 2): string {
      return JSON.stringify(snapshot._toModelSnapshotDto(), canonicalReplacer, indent);
    },
  };

  return snapshot;
}

// ── emit() helper ──

// Ambient declarations for Node.js APIs used by emit().
// Avoids @types/node dependency which would pollute the jsii surface.
declare const process: { stdout: { write(data: string): boolean } };
declare function require(id: string): { promises: { writeFile(path: string, data: string): Promise<void> } };

/**
 * Options for the emit() helper.
 *
 * @example
 *
 * await emit(snapshot, { filePath: 'output.json', indent: 2 });
 *
 */
export interface EmitOptions {
  /**
   * Output target: 'stdout' (default), 'file', or a WritableStream object.
   * When set to 'file', filePath is required.
   */
  readonly to?: string;
  /** File path for 'file' target. Required when to='file'. */
  readonly filePath?: string;
  /** JSON indentation spaces. Default: 2. */
  readonly indent?: number;
}

/**
 * Emit a model snapshot as JSON to stdout, a file, or a writable stream.
 *
 * @example
 *
 * const snapshot = buildSnapshot([svc, db]);
 * await emit(snapshot);                              // stdout
 * await emit(snapshot, { to: 'file', filePath: 'out.json' }); // file
 *
 * @param snapshot - Model snapshot from buildSnapshot().
 * @param opts - Output options (target, filePath, indent).
 */
export async function emit(snapshot: IModelSnapshot, opts?: EmitOptions): Promise<void> {
  const json = snapshot.toJson(opts?.indent ?? 2);
  const output = json + '\n';
  const target = opts?.to ?? 'stdout';

  if (target === 'stdout') {
    process.stdout.write(output);
    return;
  }

  if (target === 'file') {
    if (!opts?.filePath) {
      throw new Error('filePath required when to=file');
    }
    const fs = require('fs');
    await fs.promises.writeFile(opts.filePath, output);
    return;
  }

  // WritableStream (duck-typed: any object with a .write() method)
  if (typeof target === 'object' && target !== null && typeof (target as { write?: unknown }).write === 'function') {
    (target as { write(data: string): void }).write(output);
    return;
  }

  throw new Error(`Unknown emit target: ${String(target)}`);
}
