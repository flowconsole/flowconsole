// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock @/lib/utils
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "button",
      {
        onClick,
        "data-testid": props["data-testid"],
        "aria-label": props["aria-label"],
      },
      children,
    ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    id,
    ...rest
  }: {
    children: React.ReactNode;
    id?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "div",
      { id, "data-testid": rest["data-testid"] ?? "scroll-area" },
      children,
    ),
}));

import { DiagnosticsPanel } from "@/components/editor/diagnostics-panel";
import type { Diagnostic } from "@/components/editor/types";

const ERROR_DIAGNOSTIC: Diagnostic = {
  id: "1",
  severity: "error",
  message: "Unexpected token at line 5",
  line: 5,
  column: 3,
  source: "parse",
};

const WARNING_DIAGNOSTIC: Diagnostic = {
  id: "2",
  severity: "warning",
  message: "Unused element: MyService",
  line: 12,
  source: "build",
};

const INFO_DIAGNOSTIC: Diagnostic = {
  id: "3",
  severity: "info",
  message: "Model has 3 containers",
};

describe("DiagnosticsPanel", () => {
  const defaultProps = {
    diagnostics: [],
    collapsed: false,
    onToggle: vi.fn(),
    onGoToLine: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the panel container", () => {
    render(React.createElement(DiagnosticsPanel, defaultProps));
    expect(screen.getByTestId("diagnostics-panel")).toBeTruthy();
  });

  it("shows No problems when diagnostics is empty", () => {
    render(React.createElement(DiagnosticsPanel, defaultProps));
    expect(screen.getByText("No problems")).toBeTruthy();
  });

  it("shows no-problems-detected message in expanded empty state", () => {
    render(React.createElement(DiagnosticsPanel, defaultProps));
    expect(screen.getByTestId("diagnostics-content")).toBeTruthy();
    expect(screen.getByText("No problems detected")).toBeTruthy();
  });

  it("shows error count in header when there are errors", () => {
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        diagnostics: [ERROR_DIAGNOSTIC],
      }),
    );
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("renders error diagnostic row", () => {
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        diagnostics: [ERROR_DIAGNOSTIC],
      }),
    );
    expect(
      screen.getByTestId("diagnostic-row-error"),
    ).toBeTruthy();
    expect(screen.getByText(/Unexpected token at line 5/)).toBeTruthy();
  });

  it("renders warning diagnostic row", () => {
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        diagnostics: [WARNING_DIAGNOSTIC],
      }),
    );
    expect(
      screen.getByTestId("diagnostic-row-warning"),
    ).toBeTruthy();
    expect(screen.getByText(/Unused element: MyService/)).toBeTruthy();
  });

  it("shows line information on diagnostic with line number", () => {
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        diagnostics: [ERROR_DIAGNOSTIC],
      }),
    );
    expect(screen.getByText(/Ln 5/)).toBeTruthy();
  });

  it("calls onGoToLine when line button is clicked", () => {
    const onGoToLine = vi.fn();
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        diagnostics: [ERROR_DIAGNOSTIC],
        onGoToLine,
      }),
    );
    fireEvent.click(screen.getByLabelText("Go to line 5"));
    expect(onGoToLine).toHaveBeenCalledWith(5);
  });

  it("hides content when collapsed", () => {
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        collapsed: true,
        diagnostics: [ERROR_DIAGNOSTIC],
      }),
    );
    expect(screen.queryByTestId("diagnostics-content")).toBeNull();
  });

  it("calls onToggle when header is clicked", () => {
    const onToggle = vi.fn();
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        collapsed: true,
        onToggle,
      }),
    );
    // When collapsed=true, the Problems label button says "Expand…"
    const problemsBtn = screen.getByRole("button", { name: /expand problems panel/i });
    fireEvent.click(problemsBtn);
    expect(onToggle).toHaveBeenCalled();
  });

  it("groups errors, warnings, and info in separate sections", () => {
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        diagnostics: [ERROR_DIAGNOSTIC, WARNING_DIAGNOSTIC, INFO_DIAGNOSTIC],
      }),
    );
    expect(screen.getByText(/Errors \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Warnings \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Info \(1\)/)).toBeTruthy();
  });

  it("renders source label when present and no line number", () => {
    const noLineDiag: Diagnostic = {
      id: "4",
      severity: "info",
      message: "Some info message",
      source: "system",
    };
    render(
      React.createElement(DiagnosticsPanel, {
        ...defaultProps,
        diagnostics: [noLineDiag],
      }),
    );
    expect(screen.getByText(/\[system\]/)).toBeTruthy();
  });
});
