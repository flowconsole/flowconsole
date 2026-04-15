export {};

declare global {
  type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';
  type ComponentTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';
  type StylePreset = 'default' | 'highlighted' | 'critical' | 'deprecated' | 'new' | 'external';
  type ShapeKind = 'rectangle' | 'circle' | 'hexagon' | 'cylinder' | 'pipe' | 'person' | 'cloud';

  interface ConnectionOptions {
    detail?: string;
    kind?: ConnectionKind;
    icon?: string;
    muted?: boolean;
  }

  interface DeploymentOptions {
    replicas?: number;
    cpu?: string;
    memory?: string;
  }

  interface ExposeOptions {
    path?: string;
  }

  interface ComponentStyle {
    preset?: StylePreset;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    icon?: string;
    shape?: ShapeKind;
  }

  interface FlowBuilder {
    then(target: DslEntity): FlowBuilder;
    sendsRequest(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    sendsRequestTo(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    getDataFrom(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    executesRequest(action: string, options?: ConnectionOptions): FlowBuilder;
    inParallel(...branches: Array<() => FlowBuilder | void>): FlowBuilder;
    opens(target: DslEntity, label?: string): FlowBuilder;
    publishes(target: DslEntity, label?: string): FlowBuilder;
    emits(target: DslEntity, label?: string): FlowBuilder;
    subscribes(target: DslEntity, label?: string): FlowBuilder;
    reads(target: DslEntity, label?: string): FlowBuilder;
    writes(target: DslEntity, label?: string): FlowBuilder;
    runs(action?: string): FlowBuilder;
    scenario(name: string): FlowBuilder;
  }

  interface Object {
    sendsRequest(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    sendsRequestTo(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    getDataFrom(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    executesRequest(action: string, options?: ConnectionOptions): FlowBuilder;
    opens(target: DslEntity, label?: string): FlowBuilder;
    publishes(target: DslEntity, label?: string): FlowBuilder;
    emits(target: DslEntity, label?: string): FlowBuilder;
    subscribes(target: DslEntity, label?: string): FlowBuilder;
    reads(target: DslEntity, label?: string): FlowBuilder;
    writes(target: DslEntity, label?: string): FlowBuilder;
    runs(action?: string): FlowBuilder;
    deployedOn(target: DslEntity, options?: DeploymentOptions): void;
    routesTo(target: DslEntity): void;
    exposes(target: DslEntity, options?: ExposeOptions): void;
  }

  // Base component shape
  interface Component {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string;
    readonly technology?: string;
    readonly properties?: Record<string, string>;
    readonly belongsTo?: Component;
    readonly tags?: readonly string[];
    readonly badge?: string;
    readonly tone?: ComponentTone;
    readonly style?: ComponentStyle;
    [key: string]: unknown;
  }

  // Base elements (13)
  interface User extends Component {
    readonly role?: string;
  }

  interface SoftwareSystem extends Component {
    readonly domain?: string;
  }

  interface Namespace extends Component {}

  interface Container extends Component {}

  interface Module extends Component {}

  interface External extends Component {
    readonly vendor?: string;
  }

  interface Gateway extends Component {}

  interface Worker extends Component {}

  interface Database extends Component {
    readonly engine?: string;
  }

  interface Cache extends Component {
    readonly engine?: string;
  }

  interface Queue extends Component {
    readonly engine?: string;
  }

  interface Broker extends Component {}

  interface Topic extends Component {
    readonly partitions?: number;
  }

  // Deployment elements (6)
  interface K8sCluster extends Component {
    readonly region?: string;
    readonly version?: string;
  }

  interface ManagedDatabase extends Component {
    readonly provider?: string;
    readonly engine?: string;
  }

  interface Serverless extends Component {
    readonly runtime?: string;
    readonly provider?: string;
  }

  interface Vm extends Component {
    readonly os?: string;
    readonly provider?: string;
  }

  interface Cdn extends Component {
    readonly provider?: string;
  }

  interface Ingress extends Component {
    readonly host?: string;
    readonly tls?: boolean;
  }

  // Convenience: API patterns (3)
  interface RestApi extends Component {
    readonly baseUrl?: string;
    readonly openapi?: string;
  }

  interface GrpcApi extends Component {
    readonly proto?: string;
  }

  interface GraphqlApi extends Component {
    readonly schema?: string;
  }

  // Convenience: Web/Mobile/Desktop (9)
  interface ReactApp extends Component {}
  interface NextApp extends Component {}
  interface VueApp extends Component {}
  interface AngularApp extends Component {}
  interface SvelteApp extends Component {}
  interface BlazorApp extends Component {}
  interface IosApp extends Component {}
  interface AndroidApp extends Component {}
  interface DesktopApp extends Component {}

  // Convenience: Databases (4)
  interface Postgres extends Database {}
  interface Mysql extends Database {}
  interface Mongo extends Database {}
  interface Clickhouse extends Database {}

  // Convenience: Caches (2)
  interface Redis extends Cache {}
  interface Memcached extends Cache {}

  // Convenience: Queues (2)
  interface Rabbit extends Queue {}
  interface Sqs extends Queue {}

  // Convenience: Brokers (3)
  interface Kafka extends Broker {}
  interface Nats extends Broker {}
  interface Pulsar extends Broker {}

  type DslEntity =
    | User
    | SoftwareSystem
    | Namespace
    | Container
    | Module
    | External
    | Gateway
    | Worker
    | Database
    | Cache
    | Queue
    | Broker
    | Topic
    | K8sCluster
    | ManagedDatabase
    | Serverless
    | Vm
    | Cdn
    | Ingress
    | RestApi
    | GrpcApi
    | GraphqlApi
    | ReactApp
    | NextApp
    | VueApp
    | AngularApp
    | SvelteApp
    | BlazorApp
    | IosApp
    | AndroidApp
    | DesktopApp
    | Postgres
    | Mysql
    | Mongo
    | Clickhouse
    | Redis
    | Memcached
    | Rabbit
    | Sqs
    | Kafka
    | Nats
    | Pulsar;
}

declare module '@flowconsole/sdk' {
  export type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';
  export type ComponentTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';
  export type StylePreset = 'default' | 'highlighted' | 'critical' | 'deprecated' | 'new' | 'external';
  export type ShapeKind = 'rectangle' | 'circle' | 'hexagon' | 'cylinder' | 'pipe' | 'person' | 'cloud';

  export interface ConnectionOptions {
    detail?: string;
    kind?: ConnectionKind;
    icon?: string;
    muted?: boolean;
  }

  export interface DeploymentOptions {
    replicas?: number;
    cpu?: string;
    memory?: string;
  }

  export interface ExposeOptions {
    path?: string;
  }

  export interface ComponentStyle {
    preset?: StylePreset;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    icon?: string;
    shape?: ShapeKind;
  }

  export interface ComponentArgs {
    id?: string;
    name?: string;
    description?: string;
    technology?: string;
    properties?: Record<string, string>;
    belongsTo?: Component;
    tags?: readonly string[];
    badge?: string;
    tone?: ComponentTone;
    style?: ComponentStyle;
  }

  export class Component {
    id?: string;
    name?: string;
    description?: string;
    technology?: string;
    properties?: Record<string, string>;
    belongsTo?: Component;
    tags?: readonly string[];
    badge?: string;
    tone?: ComponentTone;
    style?: ComponentStyle;
    readonly kind: string;

    constructor(args: ComponentArgs);

    sendsRequest(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder;
    sendsRequestTo(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder;
    getDataFrom(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder;
    executesRequest(label?: string): FlowBuilder;
    then(target: Component): FlowBuilder;
    inParallel(...branches: Array<() => FlowBuilder | void>): FlowBuilder;
    opens(target: Component, label?: string): FlowBuilder;
    publishes(target: Component, label?: string): FlowBuilder;
    emits(target: Component, label?: string): FlowBuilder;
    subscribes(target: Component, label?: string): FlowBuilder;
    reads(target: Component, label?: string): FlowBuilder;
    writes(target: Component, label?: string): FlowBuilder;
    runs(label?: string): FlowBuilder;
    deployedOn(target: Component, options?: DeploymentOptions): void;
    routesTo(target: Component): void;
    exposes(target: Component, options?: ExposeOptions): void;
  }

  export class FlowBuilder {
    then(target: Component): FlowBuilder;
    sendsRequest(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder;
    sendsRequestTo(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder;
    getDataFrom(target: Component, label?: string, options?: ConnectionOptions): FlowBuilder;
    executesRequest(label?: string): FlowBuilder;
    inParallel(...branches: Array<() => FlowBuilder | void>): FlowBuilder;
    opens(target: Component, label?: string): FlowBuilder;
    publishes(target: Component, label?: string): FlowBuilder;
    emits(target: Component, label?: string): FlowBuilder;
    subscribes(target: Component, label?: string): FlowBuilder;
    reads(target: Component, label?: string): FlowBuilder;
    writes(target: Component, label?: string): FlowBuilder;
    runs(label?: string): FlowBuilder;
    scenario(name: string): FlowBuilder;
  }

  // Base elements
  export interface UserArgs extends ComponentArgs { role?: string; }
  export class User extends Component { role?: string; constructor(args: UserArgs); }

  export interface SoftwareSystemArgs extends ComponentArgs { domain?: string; }
  export class SoftwareSystem extends Component { domain?: string; constructor(args: SoftwareSystemArgs); }

  export class Namespace extends Component { constructor(args: ComponentArgs); }
  export class Container extends Component { constructor(args: ComponentArgs); }
  export class Module extends Component { constructor(args: ComponentArgs); }

  export interface ExternalArgs extends ComponentArgs { vendor?: string; }
  export class External extends Component { vendor?: string; constructor(args: ExternalArgs); }

  export class Gateway extends Component { constructor(args: ComponentArgs); }
  export class Worker extends Component { constructor(args: ComponentArgs); }

  export interface DatabaseArgs extends ComponentArgs { engine?: string; }
  export class Database extends Component { engine?: string; constructor(args: DatabaseArgs); }

  export interface CacheArgs extends ComponentArgs { engine?: string; }
  export class Cache extends Component { engine?: string; constructor(args: CacheArgs); }

  export interface QueueArgs extends ComponentArgs { engine?: string; }
  export class Queue extends Component { engine?: string; constructor(args: QueueArgs); }

  export interface BrokerArgs extends ComponentArgs {}
  export class Broker extends Component { constructor(args: BrokerArgs); }

  export interface TopicArgs extends ComponentArgs { partitions?: number; }
  export class Topic extends Component { partitions?: number; constructor(args: TopicArgs); }

  // Deployment elements
  export interface K8sClusterArgs extends ComponentArgs { region?: string; version?: string; }
  export class K8sCluster extends Component { region?: string; version?: string; constructor(args: K8sClusterArgs); }

  export interface ManagedDatabaseArgs extends ComponentArgs { provider?: string; engine?: string; }
  export class ManagedDatabase extends Component { provider?: string; engine?: string; constructor(args: ManagedDatabaseArgs); }

  export interface ServerlessArgs extends ComponentArgs { runtime?: string; provider?: string; }
  export class Serverless extends Component { runtime?: string; provider?: string; constructor(args: ServerlessArgs); }

  export interface VmArgs extends ComponentArgs { os?: string; provider?: string; }
  export class Vm extends Component { os?: string; provider?: string; constructor(args: VmArgs); }

  export interface CdnArgs extends ComponentArgs { provider?: string; }
  export class Cdn extends Component { provider?: string; constructor(args: CdnArgs); }

  export interface IngressArgs extends ComponentArgs { host?: string; tls?: boolean; }
  export class Ingress extends Component { host?: string; tls?: boolean; constructor(args: IngressArgs); }

  // Convenience: API patterns
  export interface RestApiArgs extends ComponentArgs { baseUrl?: string; openapi?: string; }
  export class RestApi extends Container { baseUrl?: string; openapi?: string; constructor(args: RestApiArgs); }

  export interface GrpcApiArgs extends ComponentArgs { proto?: string; }
  export class GrpcApi extends Container { proto?: string; constructor(args: GrpcApiArgs); }

  export interface GraphqlApiArgs extends ComponentArgs { schema?: string; }
  export class GraphqlApi extends Container { schema?: string; constructor(args: GraphqlApiArgs); }

  // Convenience: Web/Mobile/Desktop
  export class ReactApp extends Container { constructor(args: ComponentArgs); }
  export class NextApp extends Container { constructor(args: ComponentArgs); }
  export class VueApp extends Container { constructor(args: ComponentArgs); }
  export class AngularApp extends Container { constructor(args: ComponentArgs); }
  export class SvelteApp extends Container { constructor(args: ComponentArgs); }
  export class BlazorApp extends Container { constructor(args: ComponentArgs); }
  export class IosApp extends Container { constructor(args: ComponentArgs); }
  export class AndroidApp extends Container { constructor(args: ComponentArgs); }
  export class DesktopApp extends Container { constructor(args: ComponentArgs); }

  // Convenience: Databases
  export class Postgres extends Database { constructor(args: DatabaseArgs); }
  export class Mysql extends Database { constructor(args: DatabaseArgs); }
  export class Mongo extends Database { constructor(args: DatabaseArgs); }
  export class Clickhouse extends Database { constructor(args: DatabaseArgs); }

  // Convenience: Caches
  export class Redis extends Cache { constructor(args: CacheArgs); }
  export class Memcached extends Cache { constructor(args: CacheArgs); }

  // Convenience: Queues
  export class Rabbit extends Queue { constructor(args: QueueArgs); }
  export class Sqs extends Queue { constructor(args: QueueArgs); }

  // Convenience: Brokers
  export class Kafka extends Broker { constructor(args: BrokerArgs); }
  export class Nats extends Broker { constructor(args: BrokerArgs); }
  export class Pulsar extends Broker { constructor(args: BrokerArgs); }
}
