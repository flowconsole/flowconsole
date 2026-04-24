import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  _resetRealtimeClients,
  FlowConsoleRealtimeClient,
  getRealtimeClient,
} from "@/lib/realtime/signalr-client";

// Shared mock connection state - must be defined before vi.mock hoisting
const mockConn = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  invoke: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  onreconnecting: vi.fn(),
  onreconnected: vi.fn(),
  onclose: vi.fn(),
};

// Mock @microsoft/signalr before importing the client
vi.mock("@microsoft/signalr", () => {
  class MockHubConnectionBuilder {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return mockConn;
    }
  }

  return {
    HubConnectionBuilder: MockHubConnectionBuilder,
    HttpTransportType: { WebSockets: 1, LongPolling: 4 },
    LogLevel: { Warning: 1 },
  };
});

beforeEach(() => {
  _resetRealtimeClients();
  vi.clearAllMocks();
  mockConn.start.mockResolvedValue(undefined);
  mockConn.stop.mockResolvedValue(undefined);
  mockConn.invoke.mockResolvedValue(undefined);
});

afterEach(() => {
  _resetRealtimeClients();
});

describe("FlowConsoleRealtimeClient", () => {
  it("starts in disconnected state", () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    expect(client.getState()).toBe("disconnected");
  });

  it("transitions to connected after start()", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    expect(client.getState()).toBe("connected");
  });

  it("calls connection.start() once", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    expect(mockConn.start).toHaveBeenCalledTimes(1);
  });

  it("does not call start() twice if already connected", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    await client.start();
    expect(mockConn.start).toHaveBeenCalledTimes(1);
  });

  it("notifies state change handlers", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const handler = vi.fn();
    client.onStateChange(handler);
    await client.start();
    expect(handler).toHaveBeenCalledWith("connecting");
    expect(handler).toHaveBeenCalledWith("connected");
  });

  it("unsubscribes state change handler", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const handler = vi.fn();
    const unsub = client.onStateChange(handler);
    unsub();
    await client.start();
    expect(handler).not.toHaveBeenCalled();
  });

  it("transitions to disconnected after stop()", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    await client.stop();
    expect(client.getState()).toBe("disconnected");
  });

  it("invokes JoinModel when connected", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    await client.joinModelRoom("model-abc");
    expect(mockConn.invoke).toHaveBeenCalledWith("JoinModel", "model-abc");
  });

  it("does not invoke JoinModel when disconnected", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.joinModelRoom("model-abc");
    expect(mockConn.invoke).not.toHaveBeenCalled();
  });

  it("invokes JoinProject when connected", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    await client.joinProjectRoom("project-xyz");
    expect(mockConn.invoke).toHaveBeenCalledWith("JoinProject", "project-xyz");
  });

  it("registers model event handlers on the connection", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    const registeredEvents = mockConn.on.mock.calls.map(
      (c: [string, unknown]) => c[0],
    );
    expect(registeredEvents).toContain("modelUpdated");
    expect(registeredEvents).toContain("irLoaded");
    expect(registeredEvents).toContain("graphRebuilt");
  });

  it("registers all project event handlers on the connection", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    const registeredEvents = mockConn.on.mock.calls.map(
      (c: [string, unknown]) => c[0],
    );
    expect(registeredEvents).toContain("driftDetected");
    expect(registeredEvents).toContain("validationFailed");
    expect(registeredEvents).toContain("validationPassed");
    expect(registeredEvents).toContain("scanStarted");
    expect(registeredEvents).toContain("scanCompleted");
    expect(registeredEvents).toContain("scanFailed");
    expect(registeredEvents).toContain("importCompleted");
    expect(registeredEvents).toContain("metricsComputed");
    expect(registeredEvents).toContain("adrViolationDetected");
  });

  it("handles connection.start() failure gracefully", async () => {
    mockConn.start.mockRejectedValueOnce(new Error("Network error"));
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const handler = vi.fn();
    client.onStateChange(handler);
    await client.start();
    expect(client.getState()).toBe("disconnected");
    expect(handler).toHaveBeenCalledWith("disconnected");
  });

  it("notifies model event handler", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const handler = vi.fn();
    client.onModelEvent(handler);
    await client.start();

    // Simulate modelUpdated event from the hub (camelCase wire name)
    const onCall = mockConn.on.mock.calls.find(
      (c: [string, unknown]) => c[0] === "modelUpdated",
    );
    expect(onCall).toBeTruthy();
    const eventCallback = onCall![1] as (data: object) => void;
    eventCallback({
      modelId: "m1",
      source: "git",
      occurredAt: "2026-01-01T00:00:00Z",
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ModelUpdated", modelId: "m1" }),
    );
  });

  it("unsubscribes model event handler", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const handler = vi.fn();
    const unsub = client.onModelEvent(handler);
    unsub();
    await client.start();

    const onCall = mockConn.on.mock.calls.find(
      (c: [string, unknown]) => c[0] === "modelUpdated",
    );
    const eventCallback = onCall![1] as (data: object) => void;
    eventCallback({
      modelId: "m1",
      source: "git",
      occurredAt: "2026-01-01T00:00:00Z",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("notifies project event handler", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const handler = vi.fn();
    client.onProjectEvent(handler);
    await client.start();

    // Simulate driftDetected event (camelCase wire name)
    const onCall = mockConn.on.mock.calls.find(
      (c: [string, unknown]) => c[0] === "driftDetected",
    );
    expect(onCall).toBeTruthy();
    const eventCallback = onCall![1] as (data: object) => void;
    eventCallback({
      modelId: "m1",
      occurredAt: "2026-01-01T00:00:00Z",
      driftScore: 0.75,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "DriftDetected", driftScore: 0.75 }),
    );
  });
});

describe("getRealtimeClient singleton", () => {
  it("returns same instance for same hubUrl", () => {
    const a = getRealtimeClient({ hubUrl: "http://hub/1" });
    const b = getRealtimeClient({ hubUrl: "http://hub/1" });
    expect(a).toBe(b);
  });

  it("returns different instances for different hubUrls", () => {
    const a = getRealtimeClient({ hubUrl: "http://hub/1" });
    const b = getRealtimeClient({ hubUrl: "http://hub/2" });
    expect(a).not.toBe(b);
  });
});
