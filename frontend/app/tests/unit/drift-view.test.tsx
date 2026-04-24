// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock @/lib/utils to avoid env validation
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

// Mock Icons
vi.mock("@/components/shared/icons", () => {
  const iconFactory = (name: string) => (props: Record<string, unknown>) => {
    return React.createElement("span", {
      "data-testid": `icon-${name}`,
      className: props.className,
    });
  };
  return {
    Icons: new Proxy({}, {
      get: (_target, prop: string) => iconFactory(prop),
    }),
  };
});

// Mock Badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; variant?: string; className?: string }) => {
    return React.createElement("span", {
      "data-testid": "badge",
      className: props.className,
    }, children);
  },
}));

// Mock Button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; variant?: string; className?: string; disabled?: boolean }) => {
    return React.createElement("button", {
      "data-testid": "button",
      disabled: props.disabled,
      className: props.className,
    }, children);
  },
  buttonVariants: () => "mock-btn",
}));

// Mock Card components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "card" }, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "card-content" }, children),
  CardDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", { "data-testid": "card-description" }, children),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("div", { "data-testid": "card-header", className }, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("h3", { "data-testid": "card-title", className }, children),
}));

// Mock Table components
vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) =>
    React.createElement("table", { "data-testid": "table" }, children),
  TableBody: ({ children }: { children: React.ReactNode }) =>
    React.createElement("tbody", {}, children),
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("td", { className }, children),
  TableHead: ({ children }: { children: React.ReactNode }) =>
    React.createElement("th", {}, children),
  TableHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement("thead", {}, children),
  TableRow: ({ children }: { children: React.ReactNode }) =>
    React.createElement("tr", {}, children),
}));

// Mock Tabs components
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string; className?: string }) =>
    React.createElement("div", { "data-testid": "tabs", "data-value": defaultValue }, children),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement("div", { "data-testid": `tab-content-${value}` }, children),
  TabsList: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "tabs-list" }, children),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement("button", { "data-testid": `tab-trigger-${value}` }, children),
}));

import { render, screen } from "@testing-library/react";
import DriftView from "@/components/dashboard/drift-view";

describe("DriftView", () => {
  it("renders without errors", () => {
    const { container } = render(React.createElement(DriftView));
    expect(container).toBeTruthy();
  });

  it("renders the header with project name", () => {
    render(React.createElement(DriftView));
    expect(screen.getByText("MSA Platform")).toBeTruthy();
  });

  it("renders the header with branch badge and scan time", () => {
    render(React.createElement(DriftView));
    expect(screen.getByText("main")).toBeTruthy();
    expect(screen.getByText("2 minutes ago")).toBeTruthy();
  });

  it("renders the Run Scan button (disabled)", () => {
    render(React.createElement(DriftView));
    const button = screen.getByText("Run Scan");
    expect(button).toBeTruthy();
    expect(button.closest("button")?.disabled).toBe(true);
  });

  it("renders summary cards with correct values", () => {
    render(React.createElement(DriftView));
    expect(screen.getByText("32")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("renders summary card titles", () => {
    render(React.createElement(DriftView));
    expect(screen.getByText("Total Elements")).toBeTruthy();
    expect(screen.getByText("Drift Detected")).toBeTruthy();
    expect(screen.getByText("Validation Passed")).toBeTruthy();
    expect(screen.getByText("Violations")).toBeTruthy();
  });

  it("renders drift table with infra deviation examples only", () => {
    render(React.createElement(DriftView));
    expect(screen.getByText("payment-service")).toBeTruthy();
    expect(screen.getByText("geo-tracker")).toBeTruthy();
    expect(screen.getByText("notification-service")).toBeTruthy();
    expect(screen.getByText("geo-tracker:1.2.0")).toBeTruthy();
    expect(screen.queryByText("API Gateway")).toBeNull();
    expect(screen.queryByText("Search Service")).toBeNull();
    expect(screen.queryByText("Payment Service")).toBeNull();
    expect(screen.queryByText("Restaurant Service")).toBeNull();
    expect(screen.queryByText("pricing-cache")).toBeNull();
  });

  it("does not render the Status column in drift results", () => {
    render(React.createElement(DriftView));
    expect(screen.queryByText("Status")).toBeNull();
    expect(screen.queryByText("Severity")).toBeNull();
    expect(screen.getByText("Level")).toBeTruthy();
    expect(screen.getByText("Source")).toBeTruthy();
    expect(screen.getAllByText("Review").length).toBeGreaterThan(0);
  });

  it("renders review buttons and level icons for drift rows", () => {
    render(React.createElement(DriftView));
    expect(screen.getAllByRole("button", { name: "Review" }).length).toBe(3);
    expect(screen.getAllByTestId("icon-warning").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-close").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Infra").length).toBe(3);
    expect(screen.queryByText("Code")).toBeNull();
  });

  it("renders validation table with 12 entries", () => {
    render(React.createElement(DriftView));
    expect(screen.getByText("No sync calls to external services")).toBeTruthy();
    expect(screen.getByText("Database in same namespace")).toBeTruthy();
    expect(screen.getByText("Max 3 hops to database")).toBeTruthy();
    expect(screen.getByText("No circular dependencies")).toBeTruthy();
    expect(screen.getByText("All services have health check")).toBeTruthy();
    expect(screen.getByText("Single point of failure check")).toBeTruthy();
    expect(screen.getByText("Connection pool limit")).toBeTruthy();
    expect(screen.getByText("Circuit breaker configured")).toBeTruthy();
    expect(screen.getByText("Service mesh sidecar present")).toBeTruthy();
    expect(screen.getByText("Response time SLO")).toBeTruthy();
    expect(screen.getByText("Event schema validation")).toBeTruthy();
    expect(screen.getByText("Cross-domain dependency limit")).toBeTruthy();
  });

  it("renders Drift Detection and Validations tabs", () => {
    render(React.createElement(DriftView));
    expect(screen.getByTestId("tab-trigger-drift")).toBeTruthy();
    expect(screen.getByTestId("tab-trigger-validation")).toBeTruthy();
  });

  it("renders drift header section", () => {
    render(React.createElement(DriftView));
    expect(screen.getByTestId("drift-header")).toBeTruthy();
  });
});
