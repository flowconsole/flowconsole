// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", { "data-testid": "badge" }, children),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "scroll-area" }, children),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => React.createElement("hr"),
}));

vi.mock("@/components/shared/empty-placeholder", () => {
  const EP = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "empty-placeholder" }, children);
  EP.Icon = () => React.createElement("div", { "data-testid": "ep-icon" });
  EP.Title = ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", { "data-testid": "ep-title" }, children);
  EP.Description = ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", { "data-testid": "ep-desc" }, children);
  return { EmptyPlaceholder: EP };
});

// Note: SourceBadge is not mocked — it renders a plain <span> with no deps.

import { ElementInspector } from "@/components/explorer/element-inspector";
import type { ArchitectureNode, ArchitectureEdge } from "@flowconsole/web";

const makeNode = (overrides: Partial<ArchitectureNode["data"]> = {}): ArchitectureNode => ({
  id: "node-1",
  type: "service",
  position: { x: 0, y: 0 },
  data: {
    title: "OrderService",
    subtitle: "service",
    description: "Handles order processing",
    tags: ["backend"],
    badge: "Git",
    source: "Git",
    properties: { port: 8080 },
    ...overrides,
  },
});

const makeEdge = (overrides: Record<string, unknown> = {}): ArchitectureEdge => ({
  id: "edge-1",
  source: "node-1",
  target: "node-2",
  type: "default",
  data: {
    kind: "Calls",
    source: "Git",
    ...overrides,
  },
});

describe("ElementInspector — empty selection", () => {
  it("shows no-selection placeholder when selection is null", () => {
    render(React.createElement(ElementInspector, { selection: null }));
    expect(screen.getByTestId("empty-placeholder")).toBeTruthy();
    expect(screen.getByTestId("ep-title").textContent).toBe("noSelectionTitle");
  });
});

describe("ElementInspector — node selection", () => {
  it("renders element heading", () => {
    const node = makeNode();
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
      }),
    );
    expect(screen.getByText("OrderService")).toBeTruthy();
  });

  it("renders subtitle", () => {
    const node = makeNode({ subtitle: "microservice" });
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
      }),
    );
    expect(screen.getByText("microservice")).toBeTruthy();
  });

  it("renders description when present", () => {
    const node = makeNode({ description: "Some description" });
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
      }),
    );
    expect(screen.getByText("Some description")).toBeTruthy();
  });

  it("renders tags as badges", () => {
    const node = makeNode({ tags: ["v1", "critical"] });
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
      }),
    );
    expect(screen.getByText("v1")).toBeTruthy();
    expect(screen.getByText("critical")).toBeTruthy();
  });

  it("renders source badge via SourceBadge for CodeScan — shows label 'Code'", () => {
    const node = makeNode({ source: "CodeScan" } as unknown as Partial<ArchitectureNode["data"]>);
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
      }),
    );
    // SourceBadge renders the label "Code" for CodeScan and has data-testid
    expect(screen.getByTestId("source-badge-CodeScan")).toBeTruthy();
    expect(screen.getByTestId("source-badge-CodeScan").textContent).toBe("Code");
  });

  it("renders source badge for git — shows label 'Git'", () => {
    const node = makeNode();
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
      }),
    );
    expect(screen.getByTestId("source-badge-Git")).toBeTruthy();
    expect(screen.getByTestId("source-badge-Git").textContent).toBe("Git");
  });

  it("does not show conflict indicator when no conflicting canonicalIds provided", () => {
    const node = makeNode();
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
      }),
    );
    expect(screen.queryByTestId("conflict-indicator")).toBeNull();
  });

  it("does not show conflict indicator when canonicalId is null", () => {
    const node = makeNode({ canonicalId: null } as unknown as Partial<ArchitectureNode["data"]>);
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
        conflictingCanonicalIds: new Set(["some-other-id"]),
      }),
    );
    expect(screen.queryByTestId("conflict-indicator")).toBeNull();
  });

  it("shows conflict indicator when element canonicalId is in conflicting set", () => {
    const node = makeNode({
      canonicalId: "canon-123",
    } as unknown as Partial<ArchitectureNode["data"]>);
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
        conflictingCanonicalIds: new Set(["canon-123", "canon-456"]),
      }),
    );
    expect(screen.getByTestId("conflict-indicator")).toBeTruthy();
  });

  it("does not show conflict indicator when canonicalId is not in conflicting set", () => {
    const node = makeNode({
      canonicalId: "canon-unique",
    } as unknown as Partial<ArchitectureNode["data"]>);
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "node", item: node },
        conflictingCanonicalIds: new Set(["canon-123"]),
      }),
    );
    expect(screen.queryByTestId("conflict-indicator")).toBeNull();
  });
});

describe("ElementInspector — edge selection", () => {
  it("renders relationship heading", () => {
    const edge = makeEdge();
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "edge", item: edge },
      }),
    );
    // "Calls" appears in the h3 heading and the type badge
    expect(screen.getAllByText("Calls").length).toBeGreaterThan(0);
  });

  it("renders source → target", () => {
    const edge = makeEdge();
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "edge", item: edge },
      }),
    );
    expect(screen.getByText("node-1 → node-2")).toBeTruthy();
  });

  it("renders source badge for edge via SourceBadge", () => {
    const edge = makeEdge({ source: "InfraScan" });
    render(
      React.createElement(ElementInspector, {
        selection: { kind: "edge", item: edge },
      }),
    );
    expect(screen.getByTestId("source-badge-InfraScan")).toBeTruthy();
    expect(screen.getByTestId("source-badge-InfraScan").textContent).toBe("Infra");
  });
});
