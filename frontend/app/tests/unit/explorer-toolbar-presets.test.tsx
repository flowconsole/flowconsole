// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ExplorerToolbar,
  PRESET_MODEL,
  PRESET_CODE,
} from "@/components/explorer/explorer-toolbar";
import { ALL_ELEMENT_SOURCES } from "@/lib/api/view-models";
import type { ElementSource } from "@/lib/api/view-models";

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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "data-testid": testId,
    "aria-pressed": pressed,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "data-testid"?: string;
    "aria-pressed"?: boolean;
  }) =>
    React.createElement(
      "button",
      { onClick, "data-testid": testId, "aria-pressed": pressed },
      children,
    ),
}));

function makeProps(overrides: Partial<{
  activeSources: Set<ElementSource>;
  onSetSources: (sources: ElementSource[] | null) => void;
}> = {}) {
  return {
    activeSources: new Set<ElementSource>(ALL_ELEMENT_SOURCES),
    onSetSources: vi.fn(),
    elementCount: 10,
    relationshipCount: 5,
    ...overrides,
  };
}

describe("ExplorerToolbar — PRESET constants", () => {
  it("PRESET_MODEL includes Git and Import", () => {
    expect(PRESET_MODEL).toContain("Git");
    expect(PRESET_MODEL).toContain("Import");
  });

  it("PRESET_MODEL does not include CodeScan or InfraScan", () => {
    expect(PRESET_MODEL).not.toContain("CodeScan");
    expect(PRESET_MODEL).not.toContain("InfraScan");
  });

  it("PRESET_CODE includes CodeScan, InfraScan, Observability", () => {
    expect(PRESET_CODE).toContain("CodeScan");
    expect(PRESET_CODE).toContain("InfraScan");
    expect(PRESET_CODE).toContain("Observability");
  });

  it("PRESET_MODEL and PRESET_CODE together cover all sources", () => {
    const combined = new Set([...PRESET_MODEL, ...PRESET_CODE]);
    for (const src of ALL_ELEMENT_SOURCES) {
      expect(combined.has(src)).toBe(true);
    }
  });
});

describe("ExplorerToolbar — preset buttons", () => {
  it("renders all three preset buttons", () => {
    render(React.createElement(ExplorerToolbar, makeProps()));
    expect(screen.getByTestId("preset-all")).toBeTruthy();
    expect(screen.getByTestId("preset-model")).toBeTruthy();
    expect(screen.getByTestId("preset-code")).toBeTruthy();
  });

  it("'All Sources' button calls onSetSources(null)", () => {
    const onSetSources = vi.fn();
    render(React.createElement(ExplorerToolbar, makeProps({ onSetSources })));
    fireEvent.click(screen.getByTestId("preset-all"));
    expect(onSetSources).toHaveBeenCalledWith(null);
  });

  it("'Model' button calls onSetSources with PRESET_MODEL", () => {
    const onSetSources = vi.fn();
    render(React.createElement(ExplorerToolbar, makeProps({ onSetSources })));
    fireEvent.click(screen.getByTestId("preset-model"));
    expect(onSetSources).toHaveBeenCalledWith(PRESET_MODEL);
  });

  it("'Code' button calls onSetSources with PRESET_CODE", () => {
    const onSetSources = vi.fn();
    render(React.createElement(ExplorerToolbar, makeProps({ onSetSources })));
    fireEvent.click(screen.getByTestId("preset-code"));
    expect(onSetSources).toHaveBeenCalledWith(PRESET_CODE);
  });
});

describe("ExplorerToolbar — preset detection", () => {
  it("all-preset button has aria-pressed=true when all sources active", () => {
    const activeSources = new Set<ElementSource>(ALL_ELEMENT_SOURCES);
    render(
      React.createElement(ExplorerToolbar, makeProps({ activeSources })),
    );
    expect(screen.getByTestId("preset-all").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("model-preset button has aria-pressed=true when only model sources active", () => {
    const activeSources = new Set<ElementSource>(PRESET_MODEL);
    render(
      React.createElement(ExplorerToolbar, makeProps({ activeSources })),
    );
    expect(
      screen.getByTestId("preset-model").getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("code-preset button has aria-pressed=true when only code sources active", () => {
    const activeSources = new Set<ElementSource>(PRESET_CODE);
    render(
      React.createElement(ExplorerToolbar, makeProps({ activeSources })),
    );
    expect(
      screen.getByTestId("preset-code").getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
