// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

import { ConnectionStatus } from "@/components/realtime/connection-status";
import type { ConnectionState } from "@/lib/realtime/types";

describe("ConnectionStatus", () => {
  const states: ConnectionState[] = [
    "connected",
    "connecting",
    "reconnecting",
    "offline",
    "disconnected",
  ];

  it.each(states)("renders for state=%s without error", (state) => {
    render(React.createElement(ConnectionStatus, { state }));
    expect(screen.getByTestId("connection-status")).toBeTruthy();
    expect(screen.getByTestId("connection-status").getAttribute("data-state")).toBe(state);
  });

  it("shows 'Live' when connected", () => {
    render(React.createElement(ConnectionStatus, { state: "connected" }));
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("shows 'Connecting…' when connecting", () => {
    render(React.createElement(ConnectionStatus, { state: "connecting" }));
    expect(screen.getByText("Connecting…")).toBeTruthy();
  });

  it("shows 'Reconnecting…' when reconnecting", () => {
    render(React.createElement(ConnectionStatus, { state: "reconnecting" }));
    expect(screen.getByText("Reconnecting…")).toBeTruthy();
  });

  it("shows 'Offline' when offline", () => {
    render(React.createElement(ConnectionStatus, { state: "offline" }));
    expect(screen.getByText("Offline")).toBeTruthy();
  });

  it("shows 'Disconnected' when disconnected", () => {
    render(React.createElement(ConnectionStatus, { state: "disconnected" }));
    expect(screen.getByText("Disconnected")).toBeTruthy();
  });

  it("sets data-state attribute", () => {
    render(React.createElement(ConnectionStatus, { state: "connected" }));
    const el = screen.getByTestId("connection-status");
    expect(el.getAttribute("data-state")).toBe("connected");
  });

  it("applies custom className", () => {
    render(
      React.createElement(ConnectionStatus, {
        state: "connected",
        className: "my-custom-class",
      }),
    );
    const el = screen.getByTestId("connection-status");
    expect(el.className).toContain("my-custom-class");
  });
});
