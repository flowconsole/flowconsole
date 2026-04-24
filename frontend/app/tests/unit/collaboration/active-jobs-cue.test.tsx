// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

import { vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/lib/realtime/types", async () => {
  const actual = await vi.importActual<typeof import("@/lib/realtime/types")>("@/lib/realtime/types");
  return actual;
});

import { ActiveJobsCue } from "@/components/collaboration/active-jobs-cue";
import type { ProjectEvent } from "@/lib/realtime/types";

const now = "2026-03-19T10:00:00Z";

const SCAN_STARTED: ProjectEvent = {
  type: "ScanStarted",
  projectId: "proj-1",
  timestamp: now,
};

const SCAN_COMPLETED: ProjectEvent = {
  type: "ScanCompleted",
  projectId: "proj-1",
  timestamp: now,
};

const SCAN_FAILED: ProjectEvent = {
  type: "ScanFailed",
  projectId: "proj-1",
  timestamp: now,
};

describe("ActiveJobsCue — event-driven mode", () => {
  it("renders nothing when no events", () => {
    const { container } = render(
      React.createElement(ActiveJobsCue, { events: [] }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when ScanCompleted follows ScanStarted (events newest-first)", () => {
    // ScanCompleted is at index 0 (newer), ScanStarted at index 1 (older)
    const events: ProjectEvent[] = [SCAN_COMPLETED, SCAN_STARTED];
    const { container } = render(
      React.createElement(ActiveJobsCue, { events }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when ScanFailed follows ScanStarted", () => {
    const events: ProjectEvent[] = [SCAN_FAILED, SCAN_STARTED];
    const { container } = render(
      React.createElement(ActiveJobsCue, { events }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows cue when ScanStarted is the most recent event", () => {
    // ScanStarted at index 0 (newest), nothing after it
    const events: ProjectEvent[] = [SCAN_STARTED];
    render(React.createElement(ActiveJobsCue, { events }));
    expect(screen.getByTestId("active-jobs-cue")).toBeTruthy();
  });

  it("shows cue when ScanStarted is most recent even with older completed events", () => {
    // Newest first: ScanStarted, then older ScanCompleted from previous run
    const events: ProjectEvent[] = [SCAN_STARTED, SCAN_COMPLETED];
    render(React.createElement(ActiveJobsCue, { events }));
    expect(screen.getByTestId("active-jobs-cue")).toBeTruthy();
  });
});

describe("ActiveJobsCue — direct isActive mode", () => {
  it("renders nothing when isActive is false", () => {
    const { container } = render(
      React.createElement(ActiveJobsCue, { isActive: false }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows cue when isActive is true", () => {
    render(React.createElement(ActiveJobsCue, { isActive: true }));
    expect(screen.getByTestId("active-jobs-cue")).toBeTruthy();
  });

  it("shows custom label when isActive and label provided", () => {
    render(
      React.createElement(ActiveJobsCue, {
        isActive: true,
        label: "Import in progress…",
      }),
    );
    expect(screen.getByTestId("active-jobs-label").textContent).toBe(
      "Import in progress…",
    );
  });

  it("shows status role for accessibility", () => {
    render(React.createElement(ActiveJobsCue, { isActive: true }));
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
