// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UiScanRecord as ScanRecord } from "@/components/sources/scan-types";
import { ScanList } from "@/components/sources/scan-list";

// Mock next-intl
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        statusPending: "Pending",
        statusRunning: "Running",
        statusCompleted: "Completed",
        statusFailed: "Failed",
        statusCancelled: "Cancelled",
        filterAll: "All",
        scanTypeCode: "Code",
        scanTypeInfra: "Infrastructure",
        noScansTitle: "No scans yet",
        noScansDescription: "Launch a scan to populate elements.",
        expandRow: "Expand row",
        collapseRow: "Collapse row",
        affectedElements: "{{count}} elements affected",
        scope: "Scope",
        completedAt: "Completed",
        openErrors: "Open {{count}} errors",
        staleMessage: "This scan result is stale.",
        lockedMessage: "Parallel scans are not allowed.",
        cancelScan: "Cancel",
        retryScan: "Retry",
      };
      if (params) {
        return (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k) =>
          String(params[k] ?? ""),
        );
      }
      return map[key] ?? key;
    },
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "button",
      { onClick, disabled, "data-testid": props["data-testid"] },
      children,
    ),
}));

vi.mock("lucide-react", () => ({
  Clock: (p: object) =>
    React.createElement("span", { "data-icon": "clock", ...p }),
  CheckCircle2: (p: object) =>
    React.createElement("span", { "data-icon": "check", ...p }),
  XCircle: (p: object) =>
    React.createElement("span", { "data-icon": "x-circle", ...p }),
  Loader2: (p: object) =>
    React.createElement("span", { "data-icon": "loader2", ...p }),
  Ban: (p: object) => React.createElement("span", { "data-icon": "ban", ...p }),
  AlertTriangle: (p: object) =>
    React.createElement("span", { "data-icon": "alert", ...p }),
  RefreshCw: (p: object) =>
    React.createElement("span", { "data-icon": "refresh", ...p }),
  X: (p: object) => React.createElement("span", { "data-icon": "x", ...p }),
  ChevronRight: (p: object) =>
    React.createElement("span", { "data-icon": "chevron-right", ...p }),
  ChevronDown: (p: object) =>
    React.createElement("span", { "data-icon": "chevron-down", ...p }),
  Code2: (p: object) =>
    React.createElement("span", { "data-icon": "code2", ...p }),
  Server: (p: object) =>
    React.createElement("span", { "data-icon": "server", ...p }),
}));

const COMPLETED_SCAN: ScanRecord = {
  id: "scan-1",
  modelId: "model-1",
  scanType: "CodeScan",
  scannerType: "typescript",
  status: "completed",
  startedAt: "2026-03-18T10:00:00Z",
  completedAt: "2026-03-18T10:01:30Z",
  path: "src/",
  affectedElementsCount: 42,
  errors: [],
  isLocked: false,
  isStale: false,
};

const FAILED_SCAN: ScanRecord = {
  id: "scan-2",
  modelId: "model-1",
  scanType: "CodeScan",
  scannerType: "go",
  status: "failed",
  startedAt: "2026-03-18T11:00:00Z",
  completedAt: "2026-03-18T11:00:10Z",
  path: null,
  affectedElementsCount: null,
  errors: [
    {
      message: "Parse error in main.go",
      file: "main.go",
      line: 10,
      source: "parse",
    },
  ],
  isLocked: false,
  isStale: false,
};

const RUNNING_SCAN: ScanRecord = {
  id: "scan-3",
  modelId: "model-1",
  scanType: "InfraScan",
  scannerType: "kubernetes",
  status: "running",
  startedAt: "2026-03-18T12:00:00Z",
  completedAt: null,
  path: null,
  affectedElementsCount: null,
  errors: [],
  isLocked: true,
  isStale: false,
};

const STALE_SCAN: ScanRecord = {
  id: "scan-4",
  modelId: "model-1",
  scanType: "CodeScan",
  scannerType: "python",
  status: "completed",
  startedAt: "2026-03-17T09:00:00Z",
  completedAt: "2026-03-17T09:02:00Z",
  path: null,
  affectedElementsCount: 5,
  errors: [],
  isLocked: false,
  isStale: true,
};

describe("ScanList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no records", () => {
    render(
      React.createElement(ScanList, {
        records: [],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-list-empty")).toBeTruthy();
    expect(screen.getByText("No scans yet")).toBeTruthy();
  });

  it("renders scan rows for all records", () => {
    render(
      React.createElement(ScanList, {
        records: [COMPLETED_SCAN, FAILED_SCAN, RUNNING_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-list-items")).toBeTruthy();
    expect(screen.getByTestId("scan-row-completed")).toBeTruthy();
    expect(screen.getByTestId("scan-row-failed")).toBeTruthy();
    expect(screen.getByTestId("scan-row-running")).toBeTruthy();
  });

  it("shows cancel button for running scan", () => {
    render(
      React.createElement(ScanList, {
        records: [RUNNING_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-cancel-button")).toBeTruthy();
  });

  it("shows retry button for failed scan", () => {
    render(
      React.createElement(ScanList, {
        records: [FAILED_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-retry-button")).toBeTruthy();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      React.createElement(ScanList, {
        records: [RUNNING_SCAN],
        onCancel,
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByTestId("scan-cancel-button"));
    expect(onCancel).toHaveBeenCalledWith("scan-3");
  });

  it("calls onRetry when retry button clicked", () => {
    const onRetry = vi.fn();
    render(
      React.createElement(ScanList, {
        records: [FAILED_SCAN],
        onCancel: vi.fn(),
        onRetry,
        onOpenDetail: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByTestId("scan-retry-button"));
    expect(onRetry).toHaveBeenCalledWith(FAILED_SCAN);
  });

  it("shows filters bar", () => {
    render(
      React.createElement(ScanList, {
        records: [COMPLETED_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-filters")).toBeTruthy();
    expect(screen.getByTestId("scan-status-filter")).toBeTruthy();
    expect(screen.getByTestId("scan-type-filter")).toBeTruthy();
  });

  it("filters scan list by status", () => {
    render(
      React.createElement(ScanList, {
        records: [COMPLETED_SCAN, FAILED_SCAN, RUNNING_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    // Filter to failed only
    const failedFilter = screen.getByTestId("scan-filter-status-failed");
    fireEvent.click(failedFilter);

    expect(screen.getByTestId("scan-row-failed")).toBeTruthy();
    expect(screen.queryByTestId("scan-row-completed")).toBeNull();
    expect(screen.queryByTestId("scan-row-running")).toBeNull();
  });

  it("filters scan list by type", () => {
    render(
      React.createElement(ScanList, {
        records: [COMPLETED_SCAN, RUNNING_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    // COMPLETED_SCAN is code, RUNNING_SCAN is infra
    const infraFilter = screen.getByTestId("scan-filter-type-InfraScan");
    fireEvent.click(infraFilter);

    expect(screen.getByTestId("scan-row-running")).toBeTruthy();
    expect(screen.queryByTestId("scan-row-completed")).toBeNull();
  });

  it("expands completed row to show detail", () => {
    render(
      React.createElement(ScanList, {
        records: [COMPLETED_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    const toggleBtn = screen.getByTestId("scan-row-toggle");
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("scan-scope")).toBeTruthy();
    expect(screen.getByText(/src\//)).toBeTruthy();
  });

  it("shows affected element count for completed scan", () => {
    render(
      React.createElement(ScanList, {
        records: [COMPLETED_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-element-count")).toBeTruthy();
    expect(screen.getByText("42 elements affected")).toBeTruthy();
  });

  it("shows stale message for stale scan when expanded", () => {
    render(
      React.createElement(ScanList, {
        records: [STALE_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    const toggleBtn = screen.getByTestId("scan-row-toggle");
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("scan-stale-message")).toBeTruthy();
  });

  it("calls onOpenDetail when error link clicked on expanded failed row", () => {
    const onOpenDetail = vi.fn();
    render(
      React.createElement(ScanList, {
        records: [FAILED_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail,
      }),
    );
    const toggleBtn = screen.getByTestId("scan-row-toggle");
    fireEvent.click(toggleBtn);
    const openDetailBtn = screen.getByTestId("scan-open-detail");
    fireEvent.click(openDetailBtn);
    expect(onOpenDetail).toHaveBeenCalledWith(FAILED_SCAN);
  });

  it("shows empty state when filter matches nothing", () => {
    render(
      React.createElement(ScanList, {
        records: [COMPLETED_SCAN],
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onOpenDetail: vi.fn(),
      }),
    );
    const failedFilter = screen.getByTestId("scan-filter-status-failed");
    fireEvent.click(failedFilter);
    expect(screen.getByTestId("scan-list-empty")).toBeTruthy();
  });
});
