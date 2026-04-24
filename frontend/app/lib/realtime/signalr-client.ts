import * as signalR from "@microsoft/signalr";

import { getAccessToken } from "@/lib/api/auth/token";

import type {
  ConnectionState,
  ModelEvent,
  ProjectEvent,
  RealtimeConfig,
} from "./types";

export type ConnectionStateHandler = (state: ConnectionState) => void;
export type ModelEventHandler = (event: ModelEvent) => void;
export type ProjectEventHandler = (event: ProjectEvent) => void;

// Lag threshold: if roundtrip time exceeds this, we consider the connection lagging
const LAG_THRESHOLD_MS = 5000;
// How often to check connection health
const HEALTH_CHECK_INTERVAL_MS = 15000;

export class FlowConsoleRealtimeClient {
  private connection: signalR.HubConnection | null = null;
  private stateHandlers: Set<ConnectionStateHandler> = new Set();
  private modelHandlers: Set<ModelEventHandler> = new Set();
  private projectHandlers: Set<ProjectEventHandler> = new Set();
  private currentState: ConnectionState = "disconnected";
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;
  private config: RealtimeConfig;

  constructor(config: RealtimeConfig) {
    this.config = config;
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      this.isOnline = navigator.onLine;
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    if (this.currentState === "offline") {
      void this.start();
    }
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.setConnectionState("offline");
  };

  private setConnectionState(state: ConnectionState) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateHandlers.forEach((h) => h(state));
  }

  private buildConnection(): signalR.HubConnection {
    const builder = new signalR.HubConnectionBuilder()
      .withUrl(this.config.hubUrl, {
        accessTokenFactory:
          this.config.accessToken ??
          (() => getAccessToken().then((t) => t ?? "")),
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds(ctx) {
          // Exponential backoff: 0, 2s, 10s, 30s, 60s, then 60s
          const delays = [0, 2000, 10000, 30000, 60000];
          return delays[Math.min(ctx.previousRetryCount, delays.length - 1)];
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    builder.onreconnecting(() => this.setConnectionState("reconnecting"));
    builder.onreconnected(() => {
      this.setConnectionState("connected");
      this.startHealthCheck();
    });
    builder.onclose(() => {
      this.stopHealthCheck();
      if (this.isOnline) {
        this.setConnectionState("disconnected");
      } else {
        this.setConnectionState("offline");
      }
    });

    // Model-level events (backend sends camelCase method names)
    builder.on("modelUpdated", (data: Omit<ModelEvent, "type">) =>
      this.modelHandlers.forEach((h) => h({ ...data, type: "ModelUpdated" })),
    );
    builder.on("irLoaded", (data: Omit<ModelEvent, "type">) =>
      this.modelHandlers.forEach((h) => h({ ...data, type: "IRLoaded" })),
    );
    builder.on("graphRebuilt", (data: Omit<ModelEvent, "type">) =>
      this.modelHandlers.forEach((h) => h({ ...data, type: "GraphRebuilt" })),
    );

    // Project-level events (backend sends camelCase, we normalize to PascalCase for internal use)
    const projectEventMap: Record<string, ProjectEvent["type"]> = {
      driftDetected: "DriftDetected",
      validationFailed: "ValidationFailed",
      validationPassed: "ValidationPassed",
      scanStarted: "ScanStarted",
      scanCompleted: "ScanCompleted",
      scanFailed: "ScanFailed",
      importCompleted: "ImportCompleted",
      metricsComputed: "MetricsComputed",
      adrViolationDetected: "AdrViolationDetected",
    };
    Object.entries(projectEventMap).forEach(([wireEvent, internalType]) => {
      builder.on(wireEvent, (data: Omit<ProjectEvent, "type">) =>
        this.projectHandlers.forEach((h) => h({ ...data, type: internalType })),
      );
    });

    return builder;
  }

  async start(): Promise<void> {
    if (!this.isOnline) {
      this.setConnectionState("offline");
      return;
    }
    if (
      this.currentState === "connecting" ||
      this.currentState === "connected" ||
      this.currentState === "reconnecting"
    ) {
      return;
    }

    this.setConnectionState("connecting");
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    try {
      await this.connection.start();
      this.setConnectionState("connected");
      this.startHealthCheck();
    } catch {
      this.setConnectionState("disconnected");
    }
  }

  async stop(): Promise<void> {
    this.stopHealthCheck();
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    this.setConnectionState("disconnected");
  }

  async joinModelRoom(modelId: string): Promise<void> {
    if (this.currentState !== "connected" || !this.connection) return;
    try {
      await this.connection.invoke("JoinModel", modelId);
    } catch {
      // room join is best-effort
    }
  }

  async leaveModelRoom(modelId: string): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke("LeaveModel", modelId);
    } catch {
      // best-effort
    }
  }

  async joinProjectRoom(projectId: string): Promise<void> {
    if (this.currentState !== "connected" || !this.connection) return;
    try {
      await this.connection.invoke("JoinProject", projectId);
    } catch {
      // best-effort
    }
  }

  async leaveProjectRoom(projectId: string): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke("LeaveProject", projectId);
    } catch {
      // best-effort
    }
  }

  private startHealthCheck() {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(async () => {
      if (
        !this.connection ||
        (this.currentState !== "connected" &&
          this.currentState !== "reconnecting")
      )
        return;
      const start = Date.now();
      try {
        await this.connection.invoke("Ping");
        const elapsed = Date.now() - start;
        if (elapsed > LAG_THRESHOLD_MS) {
          // Still technically connected but lagging — surface as reconnecting
          // to prompt the UI to show a lagging state. Revert once healthy.
          this.setConnectionState("reconnecting");
        } else if (this.currentState === "reconnecting") {
          this.setConnectionState("connected");
        }
      } catch {
        // Ping failure — connection will handle reconnect via signalR retry
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  onStateChange(handler: ConnectionStateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  onModelEvent(handler: ModelEventHandler): () => void {
    this.modelHandlers.add(handler);
    return () => this.modelHandlers.delete(handler);
  }

  onProjectEvent(handler: ProjectEventHandler): () => void {
    this.projectHandlers.add(handler);
    return () => this.projectHandlers.delete(handler);
  }

  getState(): ConnectionState {
    return this.currentState;
  }

  dispose() {
    this.stopHealthCheck();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    void this.stop();
  }
}

// Singleton factory — creates one client per hub URL
const clients = new Map<string, FlowConsoleRealtimeClient>();

export function getRealtimeClient(
  config: RealtimeConfig,
): FlowConsoleRealtimeClient {
  const existing = clients.get(config.hubUrl);
  if (existing) {
    return existing;
  }
  const client = new FlowConsoleRealtimeClient(config);
  clients.set(config.hubUrl, client);
  return client;
}

// For testing only — clears the singleton registry
export function _resetRealtimeClients() {
  clients.clear();
}
