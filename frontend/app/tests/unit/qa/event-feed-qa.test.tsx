// @vitest-environment jsdom
/**
 * QA: Event feed rendering — targeted coverage for Task 7.
 * Validates key rendering scenarios for the project event feed.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { ProjectEventFeed } from "@/components/realtime/project-event-feed";
import type { ProjectEvent } from "@/lib/realtime/types";

function evt(
  type: ProjectEvent["type"],
  extra: Partial<ProjectEvent> = {},
): ProjectEvent {
  return { type, modelId: "m-qa", occurredAt: "2026-03-19T09:00:00Z", ...extra };
}

// All event types that should render without throwing
const ALL_EVENT_TYPES: ProjectEvent["type"][] = [
  "DriftDetected",
  "ValidationFailed",
  "ValidationPassed",
  "ScanStarted",
  "ScanCompleted",
  "ScanFailed",
  "ImportCompleted",
  "MetricsComputed",
];

describe("Event feed QA — all event types render", () => {
  it.each(ALL_EVENT_TYPES)("renders %s without throwing", (type) => {
    const { container } = render(
      React.createElement(ProjectEventFeed, { events: [evt(type)] }),
    );
    expect(container).toBeTruthy();
    // Each event type must have at least one list item
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(1);
  });
});

describe("Event feed QA — DriftDetected details", () => {
  it("shows drift score when present", () => {
    render(
      React.createElement(ProjectEventFeed, {
        events: [evt("DriftDetected", { driftScore: 1 })],
      }),
    );
    expect(screen.getByText(/Drift detected: score 1/)).toBeTruthy();
  });

  it("shows drift score with decimals", () => {
    render(
      React.createElement(ProjectEventFeed, {
        events: [evt("DriftDetected", { driftScore: 0.42 })],
      }),
    );
    expect(screen.getByText(/Drift detected: score 0.42/)).toBeTruthy();
  });

  it("shows base label when driftScore is absent", () => {
    render(
      React.createElement(ProjectEventFeed, {
        events: [evt("DriftDetected")],
      }),
    );
    // Should show "Drift detected" base label (without count)
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(1);
    expect(items[0].textContent).toMatch(/Drift detected/);
  });
});

describe("Event feed QA — ScanFailed details", () => {
  it("shows error message when error is present", () => {
    render(
      React.createElement(ProjectEventFeed, {
        events: [evt("ScanFailed", { error: "Docker socket unreachable" })],
      }),
    );
    expect(screen.getByText(/Scan failed: Docker socket unreachable/)).toBeTruthy();
  });

  it("shows base label when errorMessage is absent", () => {
    render(
      React.createElement(ProjectEventFeed, {
        events: [evt("ScanFailed")],
      }),
    );
    expect(screen.getByText("Scan failed")).toBeTruthy();
  });
});

describe("Event feed QA — ImportCompleted details", () => {
  it("shows format in parentheses when format is present", () => {
    render(
      React.createElement(ProjectEventFeed, {
        events: [evt("ImportCompleted", { format: "Backstage" })],
      }),
    );
    expect(screen.getByText(/Import completed \(Backstage\)/)).toBeTruthy();
  });

  it("shows link to import history for ImportCompleted events", () => {
    render(
      React.createElement(ProjectEventFeed, {
        events: [evt("ImportCompleted", { format: "CMDB" })],
      }),
    );
    const link = screen.getByTestId("import-event-link");
    expect(link.getAttribute("href")).toContain("/dashboard/imports");
  });
});

describe("Event feed QA — rendering limits", () => {
  it("shows up to maxVisible events (default 20)", () => {
    const events = Array.from({ length: 25 }, (_, i) =>
      evt("MetricsComputed", { occurredAt: `2026-03-01T${String(i).padStart(2, "0")}:00:00Z` }),
    );
    render(React.createElement(ProjectEventFeed, { events }));
    // default maxVisible is 20
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeLessThanOrEqual(20);
  });

  it("custom maxVisible caps the list", () => {
    const events = Array.from({ length: 10 }, () => evt("ScanCompleted"));
    render(
      React.createElement(ProjectEventFeed, { events, maxVisible: 3 }),
    );
    expect(screen.getAllByRole("listitem").length).toBe(3);
  });
});

describe("Event feed QA — empty and list state", () => {
  it("shows empty state with testid", () => {
    render(React.createElement(ProjectEventFeed, { events: [] }));
    expect(screen.getByTestId("project-event-feed-empty")).toBeTruthy();
  });

  it("shows feed with testid when events exist", () => {
    render(
      React.createElement(ProjectEventFeed, { events: [evt("ScanCompleted")] }),
    );
    expect(screen.getByTestId("project-event-feed")).toBeTruthy();
  });

  it("renders timestamps as <time> elements with dateTime attribute", () => {
    render(
      React.createElement(ProjectEventFeed, { events: [evt("ValidationPassed")] }),
    );
    const time = screen.getByRole("list").querySelector("time");
    expect(time).toBeTruthy();
    expect(time?.getAttribute("dateTime")).toBe("2026-03-19T09:00:00Z");
  });
});
