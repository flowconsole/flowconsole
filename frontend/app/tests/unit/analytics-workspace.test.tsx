// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace";

const {
  mockUseGetAnalyticsSummaryQuery,
  mockUseGetCouplingQuery,
  mockSummaryRefetch,
  mockCouplingRefetch,
} = vi.hoisted(() => ({
  mockUseGetAnalyticsSummaryQuery: vi.fn(),
  mockUseGetCouplingQuery: vi.fn(),
  mockSummaryRefetch: vi.fn(),
  mockCouplingRefetch: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/lib/api/rtk", () => ({
  useGetAnalyticsSummaryQuery: (...args: unknown[]) =>
    mockUseGetAnalyticsSummaryQuery(...args),
  useGetCouplingQuery: (...args: unknown[]) => mockUseGetCouplingQuery(...args),
  toApiError: (error: unknown) => error,
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
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    "data-testid"?: string;
  }) =>
    React.createElement("button", { onClick, "data-testid": testId }, children),
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

vi.mock("@flowconsole/ui/components/ui/table", () => ({
  Table: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("table", {}, children),
  TableHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("thead", {}, children),
  TableBody: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("tbody", {}, children),
  TableRow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("tr", {}, children),
  TableHead: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("th", {}, children),
  TableCell: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("td", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  TabsList: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  TabsTrigger: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("button", {}, children),
  TabsContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

function renderPage() {
  render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(AnalyticsWorkspace, {
        modelId: "model-123",
        modelName: "Checkout Model",
      }),
    ),
  );
}

describe("AnalyticsWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetAnalyticsSummaryQuery.mockReturnValue({
      data: {
        totalElements: 48,
        totalRelationships: 93,
        avgCoupling: 0.4,
        avgCohesion: 0.6,
        criticalPath: [],
        singlePointsOfFailure: [],
        driftScore: 28,
        validationPassedRules: 0,
        validationFailedRules: 5,
        validationTotalRules: 5,
        communityCount: 3,
        bottleneckCount: 2,
        computedAt: "2026-03-18T10:00:00Z",
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockSummaryRefetch,
    });
    mockUseGetCouplingQuery.mockReturnValue({
      data: {
        elements: [
          {
            elementId: "el-payment",
            afferentCoupling: 8,
            efferentCoupling: 3,
            instability: 0.2,
          },
        ],
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockCouplingRefetch,
    });
  });

  it("renders summary and table content from RTK query data", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("analytics-workspace")).toBeTruthy();
      expect(screen.getByTestId("analytics-heading").textContent).toContain(
        "Checkout Model",
      );
      expect(screen.getByTestId("summary-elements-value").textContent).toBe(
        "48",
      );
      expect(screen.getByTestId("summary-drift-score-value").textContent).toBe(
        "28",
      );
    });
  });

  it("shows loading state while queries are fetching", () => {
    mockUseGetAnalyticsSummaryQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isFetching: true,
      refetch: mockSummaryRefetch,
    });

    renderPage();
    expect(screen.getByTestId("analytics-loading")).toBeTruthy();
  });

  it("shows an error banner when any analytics query fails", () => {
    mockUseGetAnalyticsSummaryQuery.mockReturnValue({
      data: undefined,
      error: new Error("boom"),
      isLoading: false,
      isFetching: false,
      refetch: mockSummaryRefetch,
    });

    renderPage();
    expect(screen.getByTestId("analytics-error")).toBeTruthy();
  });

  it("renders explorer link for coupling entries", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("analytics-workspace")).toBeTruthy(),
    );
    expect(
      screen.getAllByTestId("focus-explorer-el-payment").length,
    ).toBeGreaterThan(0);
  });

  it("refetches analytics queries from the refresh button", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("analytics-workspace")).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId("refresh-button"));

    expect(mockSummaryRefetch).toHaveBeenCalled();
    expect(mockCouplingRefetch).toHaveBeenCalled();
  });
});
