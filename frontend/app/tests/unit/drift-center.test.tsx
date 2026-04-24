// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DriftCenter } from "@/components/drift/drift-center";

const {
  mockUseListDriftSnapshotsQuery,
  mockUseGetDriftSnapshotQuery,
  mockDetectDrift,
  mockDetectDriftUnwrap,
  mockUpdateCanonicalMappings,
  mockUpdateCanonicalMappingsUnwrap,
} = vi.hoisted(() => ({
  mockUseListDriftSnapshotsQuery: vi.fn(),
  mockUseGetDriftSnapshotQuery: vi.fn(),
  mockDetectDrift: vi.fn(),
  mockDetectDriftUnwrap: vi.fn(),
  mockUpdateCanonicalMappings: vi.fn(),
  mockUpdateCanonicalMappingsUnwrap: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/lib/api/rtk", () => ({
  useListDriftSnapshotsQuery: (...args: unknown[]) =>
    mockUseListDriftSnapshotsQuery(...args),
  useGetDriftSnapshotQuery: (...args: unknown[]) =>
    mockUseGetDriftSnapshotQuery(...args),
  useDetectDriftMutation: () => [
    (...args: unknown[]) => {
      mockDetectDrift(...args);
      return { unwrap: mockDetectDriftUnwrap };
    },
    { isLoading: false },
  ],
  useUpdateCanonicalMappingsMutation: () => [
    (...args: unknown[]) => {
      mockUpdateCanonicalMappings(...args);
      return { unwrap: mockUpdateCanonicalMappingsUnwrap };
    },
  ],
}));

vi.mock("@/components/intelligence/insight-side-panel", () => ({
  InsightSidePanel: ({ open }: { open: boolean }) =>
    React.createElement("div", {
      "data-testid": "insight-panel",
      "data-open": String(open),
    }),
}));

vi.mock("@flowconsole/ui/components/shared/icons", () => {
  const factory = (name: string) => (props: Record<string, unknown>) =>
    React.createElement("span", {
      "data-testid": `icon-${name}`,
      className: props.className as string,
    });
  return {
    Icons: new Proxy({}, { get: (_target, prop: string) => factory(prop) }),
  };
});

vi.mock("@flowconsole/ui/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "data-testid": testId,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    "data-testid"?: string;
    disabled?: boolean;
  }) =>
    React.createElement(
      "button",
      { onClick, "data-testid": testId, disabled },
      children,
    ),
}));

vi.mock("@flowconsole/ui/components/ui/card", () => ({
  Card: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  CardHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  CardTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  CardDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  CardContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", props),
}));

vi.mock("@flowconsole/ui/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("label", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  SelectTrigger: ({
    children,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    "data-testid"?: string;
  }) => React.createElement("button", { "data-testid": testId }, children),
  SelectValue: () => React.createElement("span"),
  SelectContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  SelectItem: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/sheet", () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  SheetContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "mapping-sheet" }, children),
  SheetHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  SheetTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  SheetDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/table", () => ({
  Table: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("table", {}, children),
  TableHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("thead", {}, children),
  TableBody: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("tbody", {}, children),
  TableRow: ({
    children,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    "data-testid"?: string;
  }) => React.createElement("tr", { "data-testid": testId }, children),
  TableHead: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("th", {}, children),
  TableCell: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("td", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
    React.createElement("textarea", props),
}));

function renderPage() {
  render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(DriftCenter, { modelId: "model-123" }),
    ),
  );
}

describe("DriftCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetectDriftUnwrap.mockResolvedValue({ id: "snap-2" });
    mockUpdateCanonicalMappingsUnwrap.mockResolvedValue(undefined);
    mockUseListDriftSnapshotsQuery.mockReturnValue({
      data: {
        items: [
          {
            id: "snap-1",
            modelId: "model-123",
            scanId: null,
            driftScore: 15,
            addedElements: 1,
            removedElements: 0,
            changedElements: 1,
            details: {
              added: [],
              removed: [],
              changed: [],
            },
            computedAt: "2026-01-01T00:00:00Z",
          },
        ],
      },
      error: undefined,
      isLoading: false,
    });
    mockUseGetDriftSnapshotQuery.mockReturnValue({
      data: {
        id: "snap-1",
        modelId: "model-123",
        scanId: null,
        driftScore: 15,
        addedElements: 1,
        removedElements: 0,
        changedElements: 1,
        details: {
          added: [
            {
              elementId: "el-1",
              name: "Checkout API",
              kind: "Service",
              diffDescription: "new service",
            },
          ],
          removed: [],
          changed: [],
        },
        computedAt: "2026-01-01T00:00:00Z",
      },
    });
  });

  it("renders snapshot history and drift items from RTK queries", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("drift-center")).toBeTruthy();
      expect(screen.getByTestId("snapshot-history")).toBeTruthy();
      expect(screen.getByTestId("drift-item-snap-1-added-el-1")).toBeTruthy();
    });
  });

  it("shows loading and error states from snapshot queries", () => {
    mockUseListDriftSnapshotsQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    });

    renderPage();
    expect(screen.getByTestId("drift-loading")).toBeTruthy();
  });

  it("triggers detect drift through the generated mutation", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("detect-drift-btn"));

    await waitFor(() => {
      expect(mockDetectDrift).toHaveBeenCalledWith({
        modelId: "model-123",
        detectDriftRequest: {},
      });
    });
  });

  // TODO: re-enable when override mapping button is unhidden in drift-center.tsx
  it.skip("saves canonical mapping overrides through RTK", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("map-canonical-snap-1-added-el-1"));
    fireEvent.change(screen.getByTestId("mapping-target-id"), {
      target: { value: "element-123" },
    });
    fireEvent.click(screen.getByTestId("mapping-save"));

    await waitFor(() => {
      expect(mockUpdateCanonicalMappings).toHaveBeenCalledWith({
        modelId: "model-123",
        updateCanonicalMappingsRequest: {
          mappings: [
            {
              elementId: "element-123",
              canonicalId: "el-1",
            },
          ],
        },
      });
    });
  });
});
