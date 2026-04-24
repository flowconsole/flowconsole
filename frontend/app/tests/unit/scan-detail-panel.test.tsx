// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UiScanRecord as ScanRecord } from "@/components/sources/scan-types";
import { ScanDetailPanel } from "@/components/sources/scan-detail-panel";

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
        scanTypeCode: "Code",
        scanTypeInfra: "Infrastructure",
        detailHeading: "Scan Detail",
        closeDetail: "Close detail",
        scanId: "Scan",
        startedAt: "Started",
        completedAt: "Completed",
        scope: "Scope",
        affectedElements: "{{count}} elements affected",
        noElementData: "Element count unavailable.",
        staleMessage: "This scan result is stale.",
        lockedMessage: "Parallel scans are not allowed.",
        parallelConstraintHint: "Only one scan may run at a time.",
        cancelScan: "Cancel",
        retryScan: "Retry",
        noErrorDetails: "No error details available.",
        noErrorsCompleted: "Scan completed without errors.",
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
    variant,
    size,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "button",
      { onClick, disabled, "data-testid": props["data-testid"] },
      children,
    ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "div",
      { "data-testid": props["data-testid"] },
      children,
    ),
}));

vi.mock("lucide-react", () => ({
  XCircle: (p: object) =>
    React.createElement("span", { "data-icon": "x-circle", ...p }),
  FileCode: (p: object) =>
    React.createElement("span", { "data-icon": "file-code", ...p }),
  AlertTriangle: (p: object) =>
    React.createElement("span", { "data-icon": "alert", ...p }),
  Info: (p: object) =>
    React.createElement("span", { "data-icon": "info", ...p }),
  X: (p: object) => React.createElement("span", { "data-icon": "x", ...p }),
  RefreshCw: (p: object) =>
    React.createElement("span", { "data-icon": "refresh", ...p }),
  Ban: (p: object) => React.createElement("span", { "data-icon": "ban", ...p }),
  CheckCircle2: (p: object) =>
    React.createElement("span", { "data-icon": "check", ...p }),
  Clock: (p: object) =>
    React.createElement("span", { "data-icon": "clock", ...p }),
  Loader2: (p: object) =>
    React.createElement("span", { "data-icon": "loader2", ...p }),
  Code2: (p: object) =>
    React.createElement("span", { "data-icon": "code2", ...p }),
  Server: (p: object) =>
    React.createElement("span", { "data-icon": "server", ...p }),
}));

const COMPLETED_SCAN: ScanRecord = {
  id: "scan-abc-123",
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
  id: "scan-def-456",
  modelId: "model-1",
  scanType: "InfraScan",
  scannerType: "kubernetes",
  status: "failed",
  startedAt: "2026-03-18T11:00:00Z",
  completedAt: "2026-03-18T11:00:05Z",
  path: null,
  affectedElementsCount: null,
  errors: [
    {
      message: "Connection refused",
      file: undefined,
      line: undefined,
      source: "network",
    },
    { message: "Parse error", file: "deploy.yaml", line: 5, source: "parse" },
  ],
  isLocked: false,
  isStale: false,
};

const RUNNING_SCAN: ScanRecord = {
  id: "scan-ghi-789",
  modelId: "model-1",
  scanType: "CodeScan",
  scannerType: "go",
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
  id: "scan-jkl-012",
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

describe("ScanDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when record is null", () => {
    const { container } = render(
      React.createElement(ScanDetailPanel, {
        record: null,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the detail panel for a completed scan", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: COMPLETED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-panel")).toBeTruthy();
    expect(screen.getByTestId("scan-detail-type")).toBeTruthy();
    expect(screen.getByText("Code")).toBeTruthy();
    expect(screen.getByTestId("scan-detail-scanner")).toBeTruthy();
    expect(screen.getByText("typescript")).toBeTruthy();
  });

  it("shows scan ID (first 8 chars)", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: COMPLETED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-id")).toBeTruthy();
    expect(screen.getByText(/scan-abc/)).toBeTruthy();
  });

  it("shows scope when present", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: COMPLETED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-scope")).toBeTruthy();
    expect(screen.getByText(/src\//)).toBeTruthy();
  });

  it("shows affected elements count for completed scan", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: COMPLETED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-summary")).toBeTruthy();
    expect(screen.getByText("42 elements affected")).toBeTruthy();
  });

  it("shows no-errors message for completed scan with no errors", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: COMPLETED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByText("Scan completed without errors.")).toBeTruthy();
  });

  it("renders error list for failed scan", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: FAILED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    const errorItems = screen.getAllByTestId("scan-error-item");
    expect(errorItems.length).toBe(2);
    expect(screen.getByText("Connection refused")).toBeTruthy();
    expect(screen.getByText("Parse error")).toBeTruthy();
  });

  it("shows retry button for failed scan", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: FAILED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-retry")).toBeTruthy();
  });

  it("calls onRetry when retry button clicked", () => {
    const onRetry = vi.fn();
    render(
      React.createElement(ScanDetailPanel, {
        record: FAILED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry,
      }),
    );
    fireEvent.click(screen.getByTestId("scan-detail-retry"));
    expect(onRetry).toHaveBeenCalledWith(FAILED_SCAN);
  });

  it("shows cancel button for running scan", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: RUNNING_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-cancel")).toBeTruthy();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      React.createElement(ScanDetailPanel, {
        record: RUNNING_SCAN,
        onClose: vi.fn(),
        onCancel,
        onRetry: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByTestId("scan-detail-cancel"));
    expect(onCancel).toHaveBeenCalledWith("scan-ghi-789");
  });

  it("shows locked constraint message for locked scan", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: RUNNING_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-constraint-message")).toBeTruthy();
    expect(screen.getByTestId("scan-detail-locked")).toBeTruthy();
    expect(screen.getByText("Parallel scans are not allowed.")).toBeTruthy();
  });

  it("shows stale constraint message for stale scan", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: STALE_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-detail-stale")).toBeTruthy();
    expect(screen.getByText("This scan result is stale.")).toBeTruthy();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      React.createElement(ScanDetailPanel, {
        record: COMPLETED_SCAN,
        onClose,
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByTestId("scan-detail-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows infra scan type for infra scanner", () => {
    render(
      React.createElement(ScanDetailPanel, {
        record: FAILED_SCAN,
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(screen.getByText("Infrastructure")).toBeTruthy();
    expect(screen.getByText("kubernetes")).toBeTruthy();
  });
});
