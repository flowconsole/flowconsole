// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/components/shared/icons", () => {
  const factory = (name: string) => (props: Record<string, unknown>) =>
    React.createElement("span", {
      "data-testid": `icon-${name}`,
      className: props.className as string,
    });
  return {
    Icons: new Proxy({}, { get: (_t, prop: string) => factory(prop) }),
  };
});

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    variant?: string;
    "data-testid"?: string;
  }) =>
    React.createElement(
      "span",
      { "data-testid": testId ?? "badge", "data-variant": variant },
      children,
    ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    "data-testid": testId,
    ...rest
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    "data-testid"?: string;
    className?: string;
    variant?: string;
    size?: string;
  }) => {
    // When asChild=true the child (<a>) is the real element; render a wrapper
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        "data-testid": testId,
      });
    }
    return React.createElement(
      "button",
      { onClick, disabled, "data-testid": testId },
      children,
    );
  },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open
      ? React.createElement(
          "div",
          {
            "data-testid": "sheet-root",
            onClick: () => onOpenChange && onOpenChange(false),
          },
          children,
        )
      : null,
  SheetContent: ({
    children,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    "data-testid"?: string;
    className?: string;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": testId ?? "sheet-content",
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      },
      children,
    ),
  SheetHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet-header" }, children),
  SheetTitle: ({
    children,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    "data-testid"?: string;
  }) =>
    React.createElement(
      "h2",
      { "data-testid": testId ?? "sheet-title" },
      children,
    ),
  SheetDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(
      "p",
      { "data-testid": "sheet-description" },
      children,
    ),
}));

import {
  buildExplorerFocusUrl,
  buildDriftUrl,
  buildValidationUrl,
  buildAnalyticsUrl,
  type InsightRef,
} from "@/lib/intelligence/insight";

import { InsightSidePanel } from "@/components/intelligence/insight-side-panel";

const makeInsight = (overrides: Partial<InsightRef> = {}): InsightRef => ({
  source: "analytics",
  modelId: "model-abc",
  entityId: "el-api-gw",
  entityName: "api-gateway",
  entityType: "Service",
  label: "High Coupling",
  context: "Coupling score: 72",
  ...overrides,
});

// insight.ts — URL builder functions

describe("buildExplorerFocusUrl", () => {
  it("produces the expected path with model and element IDs", () => {
    expect(buildExplorerFocusUrl("m1", "el-foo")).toBe(
      "/models/m1/explorer?element=el-foo",
    );
  });

  it("URL-encodes model ID with spaces", () => {
    const url = buildExplorerFocusUrl("my model", "el-1");
    expect(url).toContain("my%20model");
  });

  it("URL-encodes entity ID with special chars", () => {
    const url = buildExplorerFocusUrl("m1", "el foo/bar");
    expect(url).toContain("el%20foo%2Fbar");
  });
});

describe("buildDriftUrl", () => {
  it("returns base drift path when no snapshot given", () => {
    expect(buildDriftUrl("m1")).toBe("/models/m1/drift");
  });

  it("appends snapshot param when provided", () => {
    expect(buildDriftUrl("m1", "snap-3")).toBe("/models/m1/drift?snapshot=snap-3");
  });
});

describe("buildValidationUrl", () => {
  it("returns base validation path when no run given", () => {
    expect(buildValidationUrl("m1")).toBe("/models/m1/validations");
  });

  it("appends run param when provided", () => {
    expect(buildValidationUrl("m1", "run-2")).toBe(
      "/models/m1/validations?run=run-2",
    );
  });
});

describe("buildAnalyticsUrl", () => {
  it("returns base analytics path when no tab given", () => {
    expect(buildAnalyticsUrl("m1")).toBe("/models/m1/analytics");
  });

  it("appends tab param when provided", () => {
    expect(buildAnalyticsUrl("m1", "spof")).toBe("/models/m1/analytics?tab=spof");
  });
});

// InsightSidePanel — component rendering

describe("InsightSidePanel — closed state", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      React.createElement(InsightSidePanel, {
        insight: makeInsight(),
        open: false,
        onClose: () => {},
      }),
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("InsightSidePanel — open state with insight", () => {
  const insight = makeInsight();

  it("renders the panel when open=true", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-side-panel")).toBeTruthy();
  });

  it("renders panel title key", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-panel-title")).toBeTruthy();
  });

  it("renders entity name", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-entity-name").textContent).toBe(
      "api-gateway",
    );
  });

  it("renders entity type", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-entity-type").textContent).toBe(
      "Service",
    );
  });

  it("renders source badge", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-source-badge")).toBeTruthy();
  });

  it("renders label", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-label").textContent).toBe("High Coupling");
  });

  it("renders context", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-context").textContent).toBe(
      "Coupling score: 72",
    );
  });

  it("renders actions container", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-actions")).toBeTruthy();
  });

  it("renders focus-explorer link with correct href", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    const link = screen.getByTestId("insight-focus-explorer") as HTMLAnchorElement;
    expect(link.href).toContain("model-abc");
    expect(link.href).toContain("explorer");
    expect(link.href).toContain("el-api-gw");
  });

  it("renders close button", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-close")).toBeTruthy();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose,
      }),
    );
    fireEvent.click(screen.getByTestId("insight-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("InsightSidePanel — optional fields", () => {
  it("does not render entity type when absent", () => {
    const insight = makeInsight({ entityType: undefined });
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.queryByTestId("insight-entity-type")).toBeNull();
  });

  it("does not render label when absent", () => {
    const insight = makeInsight({ label: undefined });
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.queryByTestId("insight-label")).toBeNull();
  });

  it("does not render context when absent", () => {
    const insight = makeInsight({ context: undefined });
    render(
      React.createElement(InsightSidePanel, {
        insight,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.queryByTestId("insight-context")).toBeNull();
  });
});

describe("InsightSidePanel — open=true but insight=null", () => {
  it("renders panel shell but no entity info block", () => {
    render(
      React.createElement(InsightSidePanel, {
        insight: null,
        open: true,
        onClose: () => {},
      }),
    );
    expect(screen.getByTestId("insight-side-panel")).toBeTruthy();
    expect(screen.queryByTestId("insight-entity-name")).toBeNull();
  });
});
