export {};

declare global {
  type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';
  type ComponentTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';

  interface ConnectionOptions {
    detail?: string;
    kind?: ConnectionKind;
    icon?: string;
    muted?: boolean;
  }

  interface FlowBuilder {
    then(target: DslEntity): FlowBuilder;
    sendsRequest(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    sendsRequestTo(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    getDataFrom(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    executesRequest(action: string, options?: ConnectionOptions): FlowBuilder;
    inParallel(...branches: Array<() => FlowBuilder | void>): FlowBuilder;
  }

  interface Object {
    sendsRequest(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    sendsRequestTo(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    getDataFrom(target: DslEntity, label: string, options?: ConnectionOptions): FlowBuilder;
    executesRequest(action: string, options?: ConnectionOptions): FlowBuilder;
  }

  type ParentContainer = Container | ComputerSystem;

  interface ComponentShape {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string;
    readonly belongsTo?: ParentContainer;
    readonly system?: ParentContainer;
    readonly tags?: readonly string[];
    readonly badge?: string;
    readonly tone?: ComponentTone;
    [key: string]: unknown;
  }

  interface User extends ComponentShape {
    readonly role?: string;
  }

  interface ComputerSystem extends ComponentShape {
    readonly domain?: string;
  }

  interface Container extends ComponentShape {
    readonly technology?: string;
  }

  interface ReactApp extends ComponentShape {
    readonly framework?: string;
    readonly url?: string;
  }

  interface RestApi extends ComponentShape {
    readonly method?: string;
    readonly endpoint?: string;
  }

  interface Redis extends ComponentShape {
    readonly cluster?: string;
  }

  interface Postgres extends ComponentShape {
    readonly schema?: string;
  }

  interface KafkaTopic extends ComponentShape {
    readonly partitionCount?: number;
  }

  interface MessageQueue extends ComponentShape {
    readonly throughput?: string;
  }

  interface ExternalService extends ComponentShape {
    readonly vendor?: string;
  }

  interface BackgroundJob extends ComponentShape {
    readonly schedule?: string;
  }

  type DslEntity =
    | User
    | ComputerSystem
    | Container
    | ReactApp
    | RestApi
    | Redis
    | Postgres
    | KafkaTopic
    | MessageQueue
    | ExternalService
    | BackgroundJob;
}

declare module '@flowconsole/sdk' {
  export type ConnectionKind = 'sync' | 'async' | 'event' | 'dependency';
  export type ComponentTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';
  export type ParentContainer = Container | ComputerSystem;

  export interface ConnectionOptions {
    detail?: string;
    kind?: ConnectionKind;
    icon?: string;
    muted?: boolean;
  }

  export interface ComponentArgs {
    id?: string;
    name?: string;
    description?: string;
    belongsTo?: ParentContainer;
    system?: ParentContainer;
    tags?: readonly string[];
    badge?: string;
    tone?: ComponentTone;
    [key: string]: unknown;
  }

  export class Component {
    id?: string;
    name?: string;
    description?: string;
    belongsTo?: ParentContainer;
    system?: ParentContainer;
    tags?: readonly string[];
    badge?: string;
    tone?: ComponentTone;

    constructor(args: ComponentArgs);
  }

  export interface UserArgs extends ComponentArgs {
    role?: string;
  }

  export class User extends Component {
    role?: string;
    constructor(args: UserArgs);
  }

  export interface ComputerSystemArgs extends ComponentArgs {
    domain?: string;
  }

  export class ComputerSystem extends Component {
    domain?: string;
    constructor(args: ComputerSystemArgs);
  }

  export interface ContainerArgs extends ComponentArgs {
    technology?: string;
  }

  export class Container extends Component {
    technology?: string;
    constructor(args: ContainerArgs);
  }

  export interface ReactAppArgs extends ComponentArgs {
    framework?: string;
    url?: string;
  }

  export class ReactApp extends Component {
    framework?: string;
    url?: string;
    constructor(args: ReactAppArgs);
  }

  export interface RestApiArgs extends ComponentArgs {
    method?: string;
    endpoint?: string;
  }

  export class RestApi extends Component {
    method?: string;
    endpoint?: string;
    constructor(args: RestApiArgs);
  }

  export interface RedisArgs extends ComponentArgs {
    cluster?: string;
  }

  export class Redis extends Component {
    cluster?: string;
    constructor(args: RedisArgs);
  }

  export interface PostgresArgs extends ComponentArgs {
    schema?: string;
  }

  export class Postgres extends Component {
    schema?: string;
    constructor(args: PostgresArgs);
  }

  export interface KafkaTopicArgs extends ComponentArgs {
    partitionCount?: number;
  }

  export class KafkaTopic extends Component {
    partitionCount?: number;
    constructor(args: KafkaTopicArgs);
  }

  export interface MessageQueueArgs extends ComponentArgs {
    throughput?: string;
  }

  export class MessageQueue extends Component {
    throughput?: string;
    constructor(args: MessageQueueArgs);
  }

  export interface ExternalServiceArgs extends ComponentArgs {
    vendor?: string;
  }

  export class ExternalService extends Component {
    vendor?: string;
    constructor(args: ExternalServiceArgs);
  }

  export interface BackgroundJobArgs extends ComponentArgs {
    schedule?: string;
  }

  export class BackgroundJob extends Component {
    schedule?: string;
    constructor(args: BackgroundJobArgs);
  }
}
