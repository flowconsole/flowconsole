// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

import { ProjectEventFeed } from "@/components/realtime/project-event-feed";
import type { ProjectEvent } from "@/lib/realtime/types";

function makeEvent(
  type: ProjectEvent["type"],
  overrides: Partial<ProjectEvent> = {},
): ProjectEvent {
  return {
    type,
    modelId: "m1",
    occurredAt: "2026-01-01T12:00:00Z",
    ...overrides,
  };
}

describe("ProjectEventFeed", () => {
  it("shows empty state when no events", () => {
    render(React.createElement(ProjectEventFeed, { events: [] }));
    expect(screen.getByTestId("project-event-feed-empty")).toBeTruthy();
    expect(screen.getByText("No recent events")).toBeTruthy();
  });

  it("renders event list when events provided", () => {
    const events = [makeEvent("DriftDetected", { driftScore: 0.42 })];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByTestId("project-event-feed")).toBeTruthy();
  });

  it("renders DriftDetected with score", () => {
    const events = [makeEvent("DriftDetected", { driftScore: 0.42 })];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText(/Drift detected: score 0.42/)).toBeTruthy();
  });

  it("renders ValidationFailed with fail count", () => {
    const events = [makeEvent("ValidationFailed", { failCount: 3 })];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText(/Validation failed: 3 rules/)).toBeTruthy();
  });

  it("renders ValidationFailed singular", () => {
    const events = [makeEvent("ValidationFailed", { failCount: 1 })];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText(/Validation failed: 1 rule$/)).toBeTruthy();
  });

  it("renders ValidationPassed", () => {
    const events = [makeEvent("ValidationPassed")];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText("Validation passed")).toBeTruthy();
  });

  it("renders ScanStarted", () => {
    const events = [makeEvent("ScanStarted")];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText("Scan started")).toBeTruthy();
  });

  it("renders ScanCompleted", () => {
    const events = [makeEvent("ScanCompleted")];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText("Scan completed")).toBeTruthy();
  });

  it("renders ScanFailed with error", () => {
    const events = [makeEvent("ScanFailed", { error: "timeout" })];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText(/Scan failed: timeout/)).toBeTruthy();
  });

  it("renders ImportCompleted with format", () => {
    const events = [makeEvent("ImportCompleted", { format: "Structurizr" })];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText(/Import completed \(Structurizr\)/)).toBeTruthy();
  });

  it("renders MetricsComputed", () => {
    const events = [makeEvent("MetricsComputed")];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByText("Metrics computed")).toBeTruthy();
  });

  it("renders multiple events in order", () => {
    const events = [
      makeEvent("DriftDetected"),
      makeEvent("ValidationPassed"),
      makeEvent("ScanCompleted"),
    ];
    render(React.createElement(ProjectEventFeed, { events }));
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("limits visible events to maxVisible", () => {
    const events = Array.from({ length: 30 }, (_, i) =>
      makeEvent("MetricsComputed", {
        occurredAt: `2026-01-01T${String(i).padStart(2, "0")}:00:00Z`,
      }),
    );
    render(React.createElement(ProjectEventFeed, { events, maxVisible: 5 }));
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
  });

  it("renders event items with correct testid", () => {
    const events = [makeEvent("DriftDetected")];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.getByTestId("project-event-DriftDetected")).toBeTruthy();
  });

  it("renders time element for each event", () => {
    const events = [makeEvent("ScanCompleted")];
    render(React.createElement(ProjectEventFeed, { events }));
    const timeEl = screen.getByRole("list").querySelector("time");
    expect(timeEl).toBeTruthy();
    expect(timeEl?.getAttribute("dateTime")).toBe("2026-01-01T12:00:00Z");
  });

  it("renders ImportCompleted event with link to import history", () => {
    const events = [makeEvent("ImportCompleted", { format: "Structurizr" })];
    render(React.createElement(ProjectEventFeed, { events }));
    const link = screen.getByTestId("import-event-link");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toContain("/dashboard/imports");
  });

  it("does not render import link for non-import events", () => {
    const events = [makeEvent("DriftDetected", { driftScore: 0.5 })];
    render(React.createElement(ProjectEventFeed, { events }));
    expect(screen.queryByTestId("import-event-link")).toBeNull();
  });
});
