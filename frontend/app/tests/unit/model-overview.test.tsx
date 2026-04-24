// @vitest-environment jsdom
import React from "react";
import { ModelOverviewPage } from "@/product/pages/model-overview-page";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDispatch,
  mockUseGetModelQuery,
  mockUseListElementsQuery,
  mockUseListRelationshipsQuery,
  mockUseListScansQuery,
  mockHasRtkErrorStatus,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockUseGetModelQuery: vi.fn(),
  mockUseListElementsQuery: vi.fn(),
  mockUseListRelationshipsQuery: vi.fn(),
  mockUseListScansQuery: vi.fn(),
  mockHasRtkErrorStatus: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/api/rtk", () => ({
  useGetModelQuery: (...args: unknown[]) => mockUseGetModelQuery(...args),
  useListElementsQuery: (...args: unknown[]) =>
    mockUseListElementsQuery(...args),
  useListRelationshipsQuery: (...args: unknown[]) =>
    mockUseListRelationshipsQuery(...args),
  useListScansQuery: (...args: unknown[]) => mockUseListScansQuery(...args),
  toGraphElements: (elements: unknown[]) => elements,
  toGraphRelationships: (relationships: unknown[]) => relationships,
  lifecycleApi: {
    util: { updateQueryData: vi.fn(() => ({ type: "rtk/updateQueryData" })) },
  },
  toCreateScanRequest: (state: unknown) => state,
  useCreateSyncMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn() })),
    { isLoading: false },
  ],
  useCreateScanMutation: () => [vi.fn(() => ({ unwrap: vi.fn() }))],
  useCancelScanMutation: () => [vi.fn(() => ({ unwrap: vi.fn() }))],
  useGetLatestDriftSnapshotQuery: () => ({ data: null }),
  useListValidationRunsQuery: () => ({ data: null }),
}));

vi.mock("@/lib/api/rtk/errors", () => ({
  hasRtkErrorStatus: (...args: unknown[]) => mockHasRtkErrorStatus(...args),
  toApiError: (error: unknown) => error,
}));

vi.mock("@/components/model/model-overview-skeleton", () => ({
  ModelOverviewSkeleton: () =>
    React.createElement("div", { "data-testid": "model-overview-skeleton" }),
}));

vi.mock("@/components/dashboard/header", () => ({
  DashboardHeader: ({
    children,
    heading,
  }: {
    children?: React.ReactNode;
    heading?: string;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "dashboard-header" },
      React.createElement("h1", { "data-testid": "model-heading" }, heading),
      children,
    ),
}));

vi.mock("@/components/api-error-message", () => ({
  ApiErrorMessage: () =>
    React.createElement("div", { "data-testid": "api-error" }),
}));

vi.mock("@/components/model/model-status-chip", () => ({
  SourceFreshnessChip: ({ status }: { status: string }) =>
    React.createElement("span", {
      "data-testid": "source-freshness-chip",
      "data-status": status,
    }),
  DriftStatusChip: () => React.createElement("span"),
  ValidationStatusChip: () => React.createElement("span"),
}));

vi.mock("@flowconsole/ui/components/shared/empty-placeholder", () => ({
  EmptyPlaceholder: Object.assign(
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        "div",
        { "data-testid": "empty-placeholder" },
        children,
      ),
    {
      Icon: () => React.createElement("span"),
      Title: ({ children }: { children?: React.ReactNode }) =>
        React.createElement("h3", {}, children),
      Description: ({ children }: { children?: React.ReactNode }) =>
        React.createElement("p", {}, children),
    },
  ),
}));

vi.mock("@flowconsole/ui/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    "data-testid"?: string;
  }) =>
    React.createElement("button", { onClick, "data-testid": testId }, children),
}));

vi.mock("@flowconsole/ui/components/ui/separator", () => ({
  Separator: () => React.createElement("hr"),
}));

vi.mock("@/components/sources/scan-launcher", () => ({
  ScanLauncher: () =>
    React.createElement("div", { "data-testid": "scan-launcher" }),
}));

vi.mock("@/components/sources/scan-list", () => ({
  ScanList: ({
    records,
    onOpenDetail,
  }: {
    records: Array<{ id: string }>;
    onOpenDetail?: (record: unknown) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "scan-list", "data-count": records.length },
      records.map((r) =>
        React.createElement("button", {
          key: r.id,
          "data-testid": `open-scan-detail-${r.id}`,
          onClick: () => onOpenDetail?.(r),
        }),
      ),
    ),
}));

vi.mock("@/components/sources/scan-detail-panel", () => ({
  ScanDetailPanel: ({ onClose }: { onClose?: () => void }) =>
    React.createElement(
      "div",
      { "data-testid": "scan-detail-panel" },
      React.createElement("button", {
        "data-testid": "close-scan-detail",
        onClick: onClose,
      }),
    ),
}));

const modelId = "model-abc";
const model = {
  id: modelId,
  projectId: "proj-1",
  name: "My Architecture Model",
  description: "Test model description",
  metaSchemaId: "c4",
  version: 1,
  gitConfig: null,
  driftConfig: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderPage() {
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/models/${modelId}`] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/models/:modelId",
          element: React.createElement(ModelOverviewPage),
        }),
      ),
    ),
  );
}

describe("ModelOverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRtkErrorStatus.mockReturnValue(false);
    mockUseGetModelQuery.mockReturnValue({
      data: model,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseListElementsQuery.mockReturnValue({
      data: { data: [{ id: "elem-1", name: "Auth Service", source: "git" }] },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseListRelationshipsQuery.mockReturnValue({
      data: { data: [{ id: "rel-1" }] },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseListScansQuery.mockReturnValue({
      data: { items: [] },
      error: undefined,
      isLoading: false,
    });
  });

  it("shows loading skeleton while RTK queries are loading", () => {
    mockUseGetModelQuery.mockReturnValueOnce({
      data: undefined,
      error: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByTestId("model-overview-skeleton")).toBeTruthy();
  });

  it("renders the model heading, stats, and operations section", () => {
    renderPage();

    expect(screen.getByTestId("model-heading").textContent).toBe(
      "My Architecture Model",
    );
    expect(screen.getByTestId("scan-list")).toBeTruthy();
    expect(screen.getByTestId("scan-launcher")).toBeTruthy();
  });

  it("renders not-found state for 404 model errors", () => {
    mockUseGetModelQuery.mockReturnValueOnce({
      data: undefined,
      error: { status: 404 },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockHasRtkErrorStatus.mockImplementation((error, status) => {
      return (
        error === mockUseGetModelQuery.mock.results[0]?.value.error &&
        status === 404
      );
    });

    renderPage();
    expect(screen.getByTestId("empty-placeholder")).toBeTruthy();
  });

  it("shows scan records from backend", () => {
    mockUseListScansQuery.mockReturnValueOnce({
      data: {
        items: [
          {
            id: "scan-1",
            modelId,
            scanType: "CodeScan",
            status: "completed",
            config: { language: "csharp" },
            errorMessage: null,
            startedAt: "2026-01-01T00:00:00Z",
            completedAt: "2026-01-01T00:01:00Z",
          },
        ],
      },
      error: undefined,
      isLoading: false,
    });

    renderPage();
    expect(screen.getByTestId("scan-list").getAttribute("data-count")).toBe(
      "1",
    );
  });

  it("shows sync records in the unified scan list", () => {
    mockUseListScansQuery.mockReturnValueOnce({
      data: {
        items: [
          {
            id: "sync-1",
            modelId,
            scanType: "Git",
            status: "completed",
            config: {},
            errorMessage: null,
            startedAt: "2026-01-01T00:00:00Z",
            completedAt: "2026-01-01T00:01:00Z",
          },
        ],
      },
      error: undefined,
      isLoading: false,
    });

    renderPage();
    expect(screen.getByTestId("scan-list").getAttribute("data-count")).toBe(
      "1",
    );
  });

  it("opens scan detail panel when clicking a scan record", () => {
    const scansData = {
      data: {
        items: [
          {
            id: "scan-1",
            modelId,
            scanType: "CodeScan",
            status: "completed",
            config: { language: "csharp" },
            errorMessage: null,
            startedAt: "2026-01-01T00:00:00Z",
            completedAt: "2026-01-01T00:01:00Z",
          },
        ],
      },
      error: undefined,
      isLoading: false,
    };
    mockUseListScansQuery.mockReturnValue(scansData);

    renderPage();
    expect(screen.queryByTestId("scan-detail-panel")).toBeNull();
    fireEvent.click(screen.getByTestId("open-scan-detail-scan-1"));
    expect(screen.getByTestId("scan-detail-panel")).toBeTruthy();
  });

  it("closes scan detail panel via close button", () => {
    const scansData = {
      data: {
        items: [
          {
            id: "scan-1",
            modelId,
            scanType: "CodeScan",
            status: "completed",
            config: { language: "csharp" },
            errorMessage: null,
            startedAt: "2026-01-01T00:00:00Z",
            completedAt: "2026-01-01T00:01:00Z",
          },
        ],
      },
      error: undefined,
      isLoading: false,
    };
    mockUseListScansQuery.mockReturnValue(scansData);

    renderPage();
    fireEvent.click(screen.getByTestId("open-scan-detail-scan-1"));
    expect(screen.getByTestId("scan-detail-panel")).toBeTruthy();
    fireEvent.click(screen.getByTestId("close-scan-detail"));
    expect(screen.queryByTestId("scan-detail-panel")).toBeNull();
  });

  it("opens scan detail panel for a sync record", () => {
    const scansData = {
      data: {
        items: [
          {
            id: "sync-1",
            modelId,
            scanType: "Git",
            status: "failed",
            config: {},
            errorMessage: "connection refused",
            startedAt: "2026-01-01T00:00:00Z",
            completedAt: "2026-01-01T00:01:00Z",
          },
        ],
      },
      error: undefined,
      isLoading: false,
    };
    mockUseListScansQuery.mockReturnValue(scansData);

    renderPage();
    expect(screen.queryByTestId("scan-detail-panel")).toBeNull();
    fireEvent.click(screen.getByTestId("open-scan-detail-sync-1"));
    expect(screen.getByTestId("scan-detail-panel")).toBeTruthy();
  });
});
