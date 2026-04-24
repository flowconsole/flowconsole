// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

import { RefreshAffordance } from "@/components/realtime/refresh-affordance";
import type { ModelEvent } from "@/lib/realtime/types";

const baseEvent: ModelEvent = {
  type: "ModelUpdated",
  modelId: "m1",
  projectId: "p1",
  timestamp: "2026-01-01T00:00:00Z",
};

describe("RefreshAffordance", () => {
  it("renders without error", () => {
    const { container } = render(
      React.createElement(RefreshAffordance, {
        event: baseEvent,
        onRefresh: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );
    expect(container).toBeTruthy();
  });

  it("shows 'Model updated' label for ModelUpdated event", () => {
    render(
      React.createElement(RefreshAffordance, {
        event: baseEvent,
        onRefresh: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );
    expect(screen.getByText(/Model updated/)).toBeTruthy();
  });

  it("shows 'IR loaded' label for IRLoaded event", () => {
    render(
      React.createElement(RefreshAffordance, {
        event: { ...baseEvent, type: "IRLoaded" },
        onRefresh: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );
    expect(screen.getByText(/IR loaded/)).toBeTruthy();
  });

  it("shows 'Graph rebuilt' label for GraphRebuilt event", () => {
    render(
      React.createElement(RefreshAffordance, {
        event: { ...baseEvent, type: "GraphRebuilt" },
        onRefresh: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );
    expect(screen.getByText(/Graph rebuilt/)).toBeTruthy();
  });

  it("calls onRefresh when Refresh button clicked", () => {
    const onRefresh = vi.fn();
    render(
      React.createElement(RefreshAffordance, {
        event: baseEvent,
        onRefresh,
        onDismiss: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when dismiss button clicked", () => {
    const onDismiss = vi.fn();
    render(
      React.createElement(RefreshAffordance, {
        event: baseEvent,
        onRefresh: vi.fn(),
        onDismiss,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has role=status and aria-live=polite", () => {
    render(
      React.createElement(RefreshAffordance, {
        event: baseEvent,
        onRefresh: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });

  it("renders with data-testid", () => {
    render(
      React.createElement(RefreshAffordance, {
        event: baseEvent,
        onRefresh: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );
    expect(screen.getByTestId("refresh-affordance")).toBeTruthy();
  });
});
