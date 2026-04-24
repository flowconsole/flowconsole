// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { SourceBadge, SourceLegend, SOURCE_LABELS, SOURCE_CLASSES } from "@/components/explorer/source-badge";
import { ALL_ELEMENT_SOURCES } from "@/lib/api/view-models";
import type { ElementSource } from "@/lib/api/view-models";

describe("SourceBadge", () => {
  it("renders with data-testid containing the source", () => {
    render(React.createElement(SourceBadge, { source: "Git" }));
    expect(screen.getByTestId("source-badge-Git")).toBeTruthy();
  });

  it("renders the human-readable label, not the raw key", () => {
    render(React.createElement(SourceBadge, { source: "CodeScan" }));
    const badge = screen.getByTestId("source-badge-CodeScan");
    expect(badge.textContent).toBe("Code");
  });

  it("renders 'Infra' for InfraScan", () => {
    render(React.createElement(SourceBadge, { source: "InfraScan" }));
    expect(screen.getByTestId("source-badge-InfraScan").textContent).toBe("Infra");
  });

  it("renders 'Traces' for Observability", () => {
    render(React.createElement(SourceBadge, { source: "Observability" }));
    expect(screen.getByTestId("source-badge-Observability").textContent).toBe("Traces");
  });

  it("renders 'Import' for Import source", () => {
    render(React.createElement(SourceBadge, { source: "Import" }));
    expect(screen.getByTestId("source-badge-Import").textContent).toBe("Import");
  });

  it("applies className prop", () => {
    render(
      React.createElement(SourceBadge, { source: "Git", className: "test-cls" }),
    );
    const el = screen.getByTestId("source-badge-Git");
    expect(el.className).toContain("test-cls");
  });
});

describe("SourceLegend", () => {
  it("renders one badge per source", () => {
    render(React.createElement(SourceLegend, null));
    const legend = screen.getByTestId("source-legend");
    for (const src of ALL_ELEMENT_SOURCES) {
      expect(legend.querySelector(`[data-testid="source-badge-${src}"]`)).toBeTruthy();
    }
  });

  it("renders all 5 source badges", () => {
    render(React.createElement(SourceLegend, null));
    expect(ALL_ELEMENT_SOURCES.length).toBe(5);
    const badges = screen.getAllByTestId(/^source-badge-/);
    expect(badges.length).toBe(5);
  });
});

describe("SOURCE_LABELS", () => {
  it("has a label for every ElementSource", () => {
    for (const src of ALL_ELEMENT_SOURCES) {
      expect(SOURCE_LABELS[src]).toBeTruthy();
    }
  });
});

describe("SOURCE_CLASSES", () => {
  it("has classes for every ElementSource", () => {
    for (const src of ALL_ELEMENT_SOURCES) {
      expect(SOURCE_CLASSES[src]).toBeTruthy();
    }
  });

  it("each class string includes bg- and text- tokens", () => {
    for (const src of ALL_ELEMENT_SOURCES) {
      const cls = SOURCE_CLASSES[src];
      expect(cls).toContain("bg-");
      expect(cls).toContain("text-");
    }
  });
});
