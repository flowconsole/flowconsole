// ── Existing types (kept unchanged) ──

export type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';
export type ComponentTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';

export class ConnectionOptions {
  detail?: string;
  kind?: ConnectionKind;
  icon?: string;
  muted?: boolean;
};

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

export interface UserArgs extends ComponentArgs {
  readonly role?: string;
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

  public getDataFrom(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    this._steps.push({ source: this._current, target, label, options, method: 'getDataFrom' });
    this._current = target;
    return this;
  }

  public executesRequest(label?: string): FlowBuilder {
    this._steps.push({ source: this._current, target: undefined, label, options: undefined, method: 'executesRequest' });
    return this;
  }

  public inParallel(...branches: FlowBuilder[]): FlowBuilder {
    // Parallel branches are tracked by the runtime; steps already captured in each branch
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
  public scenario(name: string): void {
    this._runtime._registerScenario(name, this._steps);
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
 * Base class for all architectural elements.
 */
export class Component {

  public readonly id?: string;
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
    this.id = args.id;
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

  // ── Base flow methods ──

  public sendsRequest(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.sendsRequest(target, label, options);
  }

  public sendsRequestTo(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder {
    return this.sendsRequest(target, label, options);
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

  public executesRequest(label?: string): FlowBuilder {
    const runtime = getRuntime();
    const builder = runtime.startFlow(this);
    return builder.executesRequest(label);
  }

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

// ── User class ──

export class User extends Component {
  public readonly role?: string;

  constructor(args: UserArgs) {
    super(ElementKind.EXTERNAL, args);
    this.role = args.role;
  }
}
