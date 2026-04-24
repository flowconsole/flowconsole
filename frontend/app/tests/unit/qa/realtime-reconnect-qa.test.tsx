// @vitest-environment jsdom
/**
 * QA: Realtime reconnect and offline behavior — targeted coverage for Task 7.
 * Validates connection status UI for all states and SignalR client resilience.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

import { ConnectionStatus } from "@/components/realtime/connection-status";
import type { ConnectionState } from "@/lib/realtime/types";

// Connection status component tests

const RECONNECT_STATES: ConnectionState[] = ["reconnecting", "offline", "disconnected"];
const ACTIVE_STATES: ConnectionState[] = ["connected", "connecting"];

describe("ConnectionStatus — reconnect and offline states", () => {
  it.each(RECONNECT_STATES)(
    "renders non-live state '%s' without throwing",
    (state) => {
      const { container } = render(
        React.createElement(ConnectionStatus, { state }),
      );
      expect(container).toBeTruthy();
    },
  );

  it("shows 'Reconnecting…' text for reconnecting state", () => {
    render(React.createElement(ConnectionStatus, { state: "reconnecting" }));
    expect(screen.getByText("Reconnecting…")).toBeTruthy();
  });

  it("shows 'Offline' text for offline state", () => {
    render(React.createElement(ConnectionStatus, { state: "offline" }));
    expect(screen.getByText("Offline")).toBeTruthy();
  });

  it("shows 'Disconnected' text for disconnected state", () => {
    render(React.createElement(ConnectionStatus, { state: "disconnected" }));
    expect(screen.getByText("Disconnected")).toBeTruthy();
  });
});

describe("ConnectionStatus — active states", () => {
  it.each(ACTIVE_STATES)(
    "renders active state '%s' without throwing",
    (state) => {
      const { container } = render(
        React.createElement(ConnectionStatus, { state }),
      );
      expect(container).toBeTruthy();
    },
  );

  it("shows 'Live' for connected state", () => {
    render(React.createElement(ConnectionStatus, { state: "connected" }));
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("shows 'Connecting…' for connecting state", () => {
    render(React.createElement(ConnectionStatus, { state: "connecting" }));
    expect(screen.getByText("Connecting…")).toBeTruthy();
  });
});

describe("ConnectionStatus — data attributes and ARIA", () => {
  it("sets data-state attribute to current state", () => {
    render(React.createElement(ConnectionStatus, { state: "reconnecting" }));
    const el = screen.getByTestId("connection-status");
    expect(el.getAttribute("data-state")).toBe("reconnecting");
  });

  it("sets data-state=offline for offline state", () => {
    render(React.createElement(ConnectionStatus, { state: "offline" }));
    const el = screen.getByTestId("connection-status");
    expect(el.getAttribute("data-state")).toBe("offline");
  });

  it("sets data-state=connected for live state", () => {
    render(React.createElement(ConnectionStatus, { state: "connected" }));
    const el = screen.getByTestId("connection-status");
    expect(el.getAttribute("data-state")).toBe("connected");
  });

  it("accepts custom className", () => {
    render(
      React.createElement(ConnectionStatus, {
        state: "offline",
        className: "test-class",
      }),
    );
    const el = screen.getByTestId("connection-status");
    expect(el.className).toContain("test-class");
  });
});

// SignalR client reconnect behavior tests

const mockConn = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  invoke: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  onreconnecting: vi.fn(),
  onreconnected: vi.fn(),
  onclose: vi.fn(),
};

vi.mock("@microsoft/signalr", () => {
  class MockHubConnectionBuilder {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() { return mockConn; }
  }
  return {
    HubConnectionBuilder: MockHubConnectionBuilder,
    HttpTransportType: { WebSockets: 1, LongPolling: 4 },
    LogLevel: { Warning: 1 },
  };
});

import {
  FlowConsoleRealtimeClient,
  _resetRealtimeClients,
} from "@/lib/realtime/signalr-client";

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

describe("Realtime client — reconnect state transitions", () => {
  it("transitions connecting→connected on start()", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const states: string[] = [];
    client.onStateChange((s) => states.push(s));
    await client.start();
    expect(states).toContain("connecting");
    expect(states).toContain("connected");
  });

  it("transitions to disconnected when start() fails", async () => {
    mockConn.start.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const states: string[] = [];
    client.onStateChange((s) => states.push(s));
    await client.start();
    expect(states).toContain("disconnected");
    expect(client.getState()).toBe("disconnected");
  });

  it("transitions to disconnected after stop()", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    await client.stop();
    expect(client.getState()).toBe("disconnected");
  });

  it("registers onreconnecting callback for auto-reconnect UX", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    expect(mockConn.onreconnecting).toHaveBeenCalled();
  });

  it("registers onreconnected callback for auto-reconnect UX", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    expect(mockConn.onreconnected).toHaveBeenCalled();
  });

  it("registers onclose callback for disconnect UX", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    expect(mockConn.onclose).toHaveBeenCalled();
  });
});

describe("Realtime client — offline resilience", () => {
  it("does not throw when joinModelRoom called while disconnected", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    // Don't call start() — client is disconnected
    await expect(client.joinModelRoom("model-xyz")).resolves.toBeUndefined();
    expect(mockConn.invoke).not.toHaveBeenCalled();
  });

  it("does not throw when joinProjectRoom called while disconnected", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await expect(client.joinProjectRoom("proj-xyz")).resolves.toBeUndefined();
    expect(mockConn.invoke).not.toHaveBeenCalled();
  });

  it("second start() call is a no-op when already connected", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    await client.start();
    await client.start(); // should be idempotent
    expect(mockConn.start).toHaveBeenCalledTimes(1);
  });

  it("state change handlers can be removed without error", async () => {
    const client = new FlowConsoleRealtimeClient({ hubUrl: "http://test/hub" });
    const fn = vi.fn();
    const unsub = client.onStateChange(fn);
    unsub(); // Remove before starting
    await client.start();
    expect(fn).not.toHaveBeenCalled();
  });
});
