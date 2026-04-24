// @vitest-environment jsdom
/**
 * Scan status rendering tests — focused coverage for every ScanOperationStatus
 * variant across the ScanList component (status icons, labels, actions, styling).
 */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UiScanOperationStatus as ScanOperationStatus, UiScanRecord as ScanRecord } from "@/components/sources/scan-types";
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

function makeScan(
  status: ScanOperationStatus,
  overrides: Partial<ScanRecord> = {},
): ScanRecord {
  return {
    id: `scan-${status}`,
    modelId: "model-1",
    scanType: "CodeScan",
    scannerType: "typescript",
    status,
    startedAt: "2026-03-18T10:00:00Z",
    completedAt:
      status === "running" || status === "pending"
        ? null
        : "2026-03-18T10:01:00Z",
    path: "src/",
    affectedElementsCount: status === "completed" ? 10 : null,
    errors:
      status === "failed"
        ? [
            {
              message: "Parse error in index.ts",
              file: "index.ts",
              line: 1,
              source: "parse",
            },
          ]
        : [],
    isLocked: false,
    isStale: false,
    ...overrides,
  };
}

const ALL_STATUSES: ScanOperationStatus[] = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
];

const STATUS_LABELS: Record<ScanOperationStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_ICONS: Record<ScanOperationStatus, string> = {
  pending: "clock",
  running: "loader2",
  completed: "check",
  failed: "x-circle",
  cancelled: "ban",
};

const defaultProps = {
  onCancel: vi.fn(),
  onRetry: vi.fn(),
  onOpenDetail: vi.fn(),
};

describe("Scan status rendering — one row per status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const status of ALL_STATUSES) {
    it(`renders row with data-testid=scan-row-${status}`, () => {
      render(
        React.createElement(ScanList, {
          ...defaultProps,
          records: [makeScan(status)],
        }),
      );
      expect(screen.getByTestId(`scan-row-${status}`)).toBeTruthy();
    });

    it(`shows "${STATUS_LABELS[status]}" label for status=${status}`, () => {
      render(
        React.createElement(ScanList, {
          ...defaultProps,
          records: [makeScan(status)],
        }),
      );
      // Status label appears in both filter pills and the row; verify it appears
      // at least once inside the scan row itself.
      const row = screen.getByTestId(`scan-row-${status}`);
      expect(within(row).getByText(STATUS_LABELS[status])).toBeTruthy();
    });

    it(`renders icon data-icon="${STATUS_ICONS[status]}" for status=${status}`, () => {
      const { container } = render(
        React.createElement(ScanList, {
          ...defaultProps,
          records: [makeScan(status)],
        }),
      );
      const icon = container.querySelector(
        `[data-icon="${STATUS_ICONS[status]}"]`,
      );
      expect(icon).toBeTruthy();
    });
  }
});

describe("Scan status rendering — action buttons per status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows cancel button for pending scan", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [makeScan("pending")],
      }),
    );
    expect(screen.getByTestId("scan-cancel-button")).toBeTruthy();
  });

  it("shows cancel button for running scan", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [makeScan("running")],
      }),
    );
    expect(screen.getByTestId("scan-cancel-button")).toBeTruthy();
  });

  it("shows retry button for failed scan", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [makeScan("failed")],
      }),
    );
    expect(screen.getByTestId("scan-retry-button")).toBeTruthy();
  });

  it("shows no action buttons for completed scan", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [makeScan("completed")],
      }),
    );
    expect(screen.queryByTestId("scan-cancel-button")).toBeNull();
    expect(screen.queryByTestId("scan-retry-button")).toBeNull();
  });

  it("shows no action buttons for cancelled scan", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [makeScan("cancelled")],
      }),
    );
    expect(screen.queryByTestId("scan-cancel-button")).toBeNull();
    expect(screen.queryByTestId("scan-retry-button")).toBeNull();
  });
});

describe("Scan status rendering — stale and locked messaging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows stale message when isStale=true after expanding row", () => {
    const staleScan = makeScan("completed", { isStale: true, id: "stale-1" });
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [staleScan],
      }),
    );
    fireEvent.click(screen.getByTestId("scan-row-toggle"));
    expect(screen.getByTestId("scan-stale-message")).toBeTruthy();
    expect(screen.getByText("This scan result is stale.")).toBeTruthy();
  });

  it("does not show stale message when isStale=false", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [makeScan("completed")],
      }),
    );
    fireEvent.click(screen.getByTestId("scan-row-toggle"));
    expect(screen.queryByTestId("scan-stale-message")).toBeNull();
  });

  it("shows locked message when isLocked=true and failed row is expanded", () => {
    // locked message renders in the expanded detail section; only completed/failed
    // rows have an expand toggle, so use a failed scan with isLocked=true.
    const lockedScan = makeScan("failed", { isLocked: true, id: "locked-1" });
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: [lockedScan],
      }),
    );
    fireEvent.click(screen.getByTestId("scan-row-toggle"));
    expect(screen.getByTestId("scan-locked-row-message")).toBeTruthy();
    expect(screen.getByText("Parallel scans are not allowed.")).toBeTruthy();
  });
});

describe("Scan status rendering — multi-status list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all five statuses simultaneously", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: ALL_STATUSES.map(makeScan),
      }),
    );
    for (const status of ALL_STATUSES) {
      expect(screen.getByTestId(`scan-row-${status}`)).toBeTruthy();
    }
  });

  it("each status row shows its own status label inside the row", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: ALL_STATUSES.map(makeScan),
      }),
    );
    for (const [status, label] of Object.entries(STATUS_LABELS)) {
      const row = screen.getByTestId(`scan-row-${status}`);
      expect(within(row).getByText(label)).toBeTruthy();
    }
  });

  it("element count only appears for completed scan", () => {
    render(
      React.createElement(ScanList, {
        ...defaultProps,
        records: ALL_STATUSES.map(makeScan),
      }),
    );
    const counts = screen.queryAllByTestId("scan-element-count");
    // Only one scan is completed, only one count badge should appear
    expect(counts.length).toBe(1);
  });
});
