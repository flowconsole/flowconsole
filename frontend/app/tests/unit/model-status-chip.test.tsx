// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    "data-testid": testId,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    "data-testid"?: string;
    className?: string;
  }) =>
    React.createElement(
      "span",
      { "data-testid": testId, "data-variant": variant, ...props },
      children,
    ),
}));

import {
  SourceFreshnessChip,
  DriftStatusChip,
  ValidationStatusChip,
} from "@/components/model/model-status-chip";

describe("SourceFreshnessChip", () => {
  it("renders 'Up to date' for fresh status", () => {
    render(React.createElement(SourceFreshnessChip, { status: "fresh" }));
    expect(screen.getByTestId("source-freshness-fresh").textContent).toBe("Up to date");
  });

  it("renders 'Stale' for stale status", () => {
    render(React.createElement(SourceFreshnessChip, { status: "stale" }));
    expect(screen.getByTestId("source-freshness-stale").textContent).toBe("Stale");
  });

  it("renders 'Syncing' for syncing status", () => {
    render(React.createElement(SourceFreshnessChip, { status: "syncing" }));
    expect(screen.getByTestId("source-freshness-syncing").textContent).toBe("Syncing");
  });

  it("uses destructive variant for stale", () => {
    render(React.createElement(SourceFreshnessChip, { status: "stale" }));
    expect(screen.getByTestId("source-freshness-stale").getAttribute("data-variant")).toBe("destructive");
  });
});

describe("DriftStatusChip", () => {
  it("renders 'No drift' for clean status", () => {
    render(React.createElement(DriftStatusChip, { status: "clean" }));
    expect(screen.getByTestId("drift-status-clean").textContent).toBe("No drift");
  });

  it("renders 'Drift detected' for drifted status", () => {
    render(React.createElement(DriftStatusChip, { status: "drifted" }));
    expect(screen.getByTestId("drift-status-drifted").textContent).toBe("Drift detected");
  });

  it("uses destructive variant for drifted", () => {
    render(React.createElement(DriftStatusChip, { status: "drifted" }));
    expect(screen.getByTestId("drift-status-drifted").getAttribute("data-variant")).toBe("destructive");
  });
});

describe("ValidationStatusChip", () => {
  it("renders 'Passing' for passing status", () => {
    render(React.createElement(ValidationStatusChip, { status: "passing" }));
    expect(screen.getByTestId("validation-status-passing").textContent).toBe("Passing Validation");
  });

  it("renders 'Failing' for failing status", () => {
    render(React.createElement(ValidationStatusChip, { status: "failing" }));
    expect(screen.getByTestId("validation-status-failing").textContent).toBe("Failing Validation");
  });

  it("uses destructive variant for failing", () => {
    render(React.createElement(ValidationStatusChip, { status: "failing" }));
    expect(screen.getByTestId("validation-status-failing").getAttribute("data-variant")).toBe("destructive");
  });
});
