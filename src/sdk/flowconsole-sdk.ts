// ── Existing types (kept unchanged) ──

export type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';
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
 */
export interface FlowStepDto {
  readonly sourceElementId: string;
  readonly relationshipId: string | null;
  readonly label?: string;
  readonly properties?: { [key: string]: string };
}

/**
 * Wire-format flow DTO with ordered steps.
 */
export interface FlowDto {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly steps: FlowStepDto[];
}

/**
 * Complete wire-format model snapshot DTO matching schema v1.1.0.
 */
export interface ModelSnapshotDto {
  readonly $schema: string;
  readonly schemaVersion: string;
  readonly source: string;
  readonly elements: ElementDto[];
  readonly relationships: RelationshipDto[];
  readonly flows: FlowDto[] | null;
}

export interface ConnectionOptions {
  readonly detail?: string;
  readonly kind?: ConnectionKind;
  readonly icon?: string;
  readonly muted?: boolean;
}

// ── Enums aligned with backend ──

/**
 * Element kinds matching the backend ElementKind enum.
 * SDK exposes all 20 values (6 Code + 8 Infra + 6 Architecture).
 */
export enum ElementKind {
  // Code layer
  CLASS = 'Class',
  INTERFACE = 'Interface',
  ENDPOINT = 'Endpoint',
  FUNCTION = 'Function',
  PRODUCER = 'Producer',
  CONSUMER = 'Consumer',
  // Infra layer
  DEPLOYMENT = 'Deployment',
  DATABASE = 'Database',
  QUEUE = 'Queue',
  CACHE = 'Cache',
  INGRESS = 'Ingress',
  NAMESPACE = 'Namespace',
  BROKER = 'Broker',
  TOPIC = 'Topic',
  // Architecture layer
  SERVICE = 'Service',
  APPLICATION = 'Application',
  MODULE = 'Module',
  EXTERNAL = 'External',
  GATEWAY = 'Gateway',
  WORKER = 'Worker',
}

/**
 * Relation kinds matching the backend RelationKind enum.
 */
export enum RelationKind {
  CONTAINS = 'Contains',
  DEPLOYED_ON = 'DeployedOn',
  USES = 'Uses',
  CALLS = 'Calls',
  DEPENDS_ON = 'DependsOn',
  IMPORTS = 'Imports',
  IMPLEMENTS = 'Implements',
  PRODUCES = 'Produces',
  CONSUMES = 'Consumes',
  EXPOSES = 'Exposes',
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

export enum StylePreset {
  DEFAULT = 'default',
  HIGHLIGHTED = 'highlighted',
  CRITICAL = 'critical',
  DEPRECATED = 'deprecated',
  NEW = 'new',
  EXTERNAL = 'external',
}

export enum ShapeKind {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  HEXAGON = 'hexagon',
  CYLINDER = 'cylinder',
  PIPE = 'pipe',
  PERSON = 'person',
  CLOUD = 'cloud',
}

export interface ComponentStyle {
  readonly preset?: StylePreset;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly borderColor?: string;
  readonly icon?: string;
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

export interface ComponentArgs {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly technology?: string;
  readonly properties?: { [key: string]: string };
  readonly belongsTo?: Component;
  readonly tags?: string[];
  readonly badge?: string;
  readonly tone?: ComponentTone;
  readonly style?: ComponentStyle;
}

export interface DeploymentOptions {
  readonly replicas?: number;
  readonly cpu?: string;
  readonly memory?: string;
}

export interface ExposeOptions {
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

export class User extends Component {
  public readonly role?: string;

  constructor(args: UserArgs) {
    super(ElementKind.EXTERNAL, args);
    this.role = args.role;
  }
}

export class SoftwareSystem extends Component {
  public readonly domain?: string;

  constructor(args: SoftwareSystemArgs) {
    super(ElementKind.SERVICE, args);
    this.domain = args.domain;
  }
}

export class Namespace extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.NAMESPACE, args);
  }
}

export class Container extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.APPLICATION, args);
  }
}

export class Module extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.MODULE, args);
  }
}

export class External extends Component {
  public readonly vendor?: string;

  constructor(args: ExternalArgs) {
    super(ElementKind.EXTERNAL, args);
    this.vendor = args.vendor;
  }
}

export class Gateway extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.GATEWAY, args);
  }
}

export class Worker extends Component {
  constructor(args: ComponentArgs) {
    super(ElementKind.WORKER, args);
  }
}

export class Database extends Component {
  public readonly engine?: string;

  constructor(args: DatabaseArgs) {
    super(ElementKind.DATABASE, args);
    this.engine = args.engine;
  }
}

export class Cache extends Component {
  public readonly engine?: string;

  constructor(args: CacheArgs) {
    super(ElementKind.CACHE, args);
    this.engine = args.engine;
  }
}

export class Queue extends Component {
  public readonly engine?: string;

  constructor(args: QueueArgs) {
    super(ElementKind.QUEUE, args);
    this.engine = args.engine;
  }
}

export class Broker extends Component {
  constructor(args: BrokerArgs) {
    super(ElementKind.BROKER, args);
  }
}

export class Topic extends Component {
  public readonly partitions?: number;

  constructor(args: TopicArgs) {
    super(ElementKind.TOPIC, args);
    this.partitions = args.partitions;
  }
}

// ── Deployment classes (6) ──

export class K8sCluster extends Component {
  public readonly region?: string;
  public readonly version?: string;

  constructor(args: K8sClusterArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.region = args.region;
    this.version = args.version;
  }
}

export class ManagedDatabase extends Component {
  public readonly provider?: string;
  public readonly engine?: string;

  constructor(args: ManagedDatabaseArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.provider = args.provider;
    this.engine = args.engine;
  }
}

export class Serverless extends Component {
  public readonly runtime?: string;
  public readonly provider?: string;

  constructor(args: ServerlessArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.runtime = args.runtime;
    this.provider = args.provider;
  }
}

export class Vm extends Component {
  public readonly os?: string;
  public readonly provider?: string;

  constructor(args: VmArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.os = args.os;
    this.provider = args.provider;
  }
}

export class Cdn extends Component {
  public readonly provider?: string;

  constructor(args: CdnArgs) {
    super(ElementKind.DEPLOYMENT, args);
    this.provider = args.provider;
  }
}

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

export class RestApi extends Container {
  public readonly baseUrl?: string;
  public readonly openapi?: string;

  constructor(args: RestApiArgs) {
    super({ technology: 'REST API', ...args });
    this.baseUrl = args.baseUrl;
    this.openapi = args.openapi;
  }
}

export class GrpcApi extends Container {
  public readonly proto?: string;

  constructor(args: GrpcApiArgs) {
    super({ technology: 'gRPC', ...args });
    this.proto = args.proto;
  }
}

export class GraphqlApi extends Container {
  public readonly schema?: string;

  constructor(args: GraphqlApiArgs) {
    super({ technology: 'GraphQL', ...args });
    this.schema = args.schema;
  }
}

// Web/Mobile/Desktop frameworks (extend Container → kind=Application)

export class ReactApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'React', ...args });
  }
}

export class NextApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Next.js', ...args });
  }
}

export class VueApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Vue.js', ...args });
  }
}

export class AngularApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Angular', ...args });
  }
}

export class SvelteApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Svelte', ...args });
  }
}

export class BlazorApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Blazor', ...args });
  }
}

export class IosApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'iOS', ...args });
  }
}

export class AndroidApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Android', ...args });
  }
}

export class DesktopApp extends Container {
  constructor(args: ComponentArgs) {
    super({ technology: 'Desktop', ...args });
  }
}

// Database convenience classes (extend Database)

export class Postgres extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'PostgreSQL', ...args });
  }
}

export class Mysql extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'MySQL', ...args });
  }
}

export class Mongo extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'MongoDB', ...args });
  }
}

export class Clickhouse extends Database {
  constructor(args: DatabaseArgs) {
    super({ engine: 'ClickHouse', ...args });
  }
}

// Cache convenience classes (extend Cache)

export class Redis extends Cache {
  constructor(args: CacheArgs) {
    super({ engine: 'Redis', ...args });
  }
}

export class Memcached extends Cache {
  constructor(args: CacheArgs) {
    super({ engine: 'Memcached', ...args });
  }
}

// Queue convenience classes (extend Queue)

export class Rabbit extends Queue {
  constructor(args: QueueArgs) {
    super({ engine: 'RabbitMQ', ...args });
  }
}

export class Sqs extends Queue {
  constructor(args: QueueArgs) {
    super({ engine: 'AWS SQS', ...args });
  }
}

// Broker convenience classes (extend Broker)

export class Kafka extends Broker {
  constructor(args: BrokerArgs) {
    super({ technology: 'Kafka', ...args });
  }
}

export class Nats extends Broker {
  constructor(args: BrokerArgs) {
    super({ technology: 'NATS', ...args });
  }
}

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
 * ModelSnapshot result from buildSnapshot().
 * Includes emitter methods for wire-format serialization.
 */
export interface ModelSnapshot {
  readonly entities: Component[];
  readonly relationships: InferredRelationship[];
  readonly scenarios: { [name: string]: FlowStep[] };
  toModelSnapshotDto(): ModelSnapshotDto;
  toJson(indent?: number): string;
}

/**
 * Build a complete ModelSnapshot from the current runtime state.
 * Validates belongsTo rules and infers all relationships.
 * Returns object with data properties and emitter methods.
 */
export function buildSnapshot(entities: Component[], runtime?: FlowRuntime): ModelSnapshot {
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

  const snapshot: ModelSnapshot = {
    entities,
    relationships,
    scenarios,
    toModelSnapshotDto(): ModelSnapshotDto {
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
      return JSON.stringify(snapshot.toModelSnapshotDto(), canonicalReplacer, indent);
    },
  };

  return snapshot;
}
