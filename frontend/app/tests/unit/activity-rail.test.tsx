// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityJob } from "@/lib/api/activity-types";
import { ActivityRail } from "@/components/activity/activity-rail";

// Mock next-intl
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        heading: "Activity",
        showRail: "Show activity rail",
        hideRail: "Hide activity rail",
        noActivity: "No recent background operations.",
        job: "job",
        jobs: "jobs",
        andMore: "… and {count} more",
        openDetails: "Open details",
        expandErrors: "Expand errors",
        collapseErrors: "Collapse errors",
      };
      if (params) {
        return (map[key] ?? key).replace(/\{(\w+)\}/g, (_, k) =>
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

// Mock i18n/navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
  usePathname: () => "/models/model-1",
}));

// Mock lucide icons
vi.mock("lucide-react", () => ({
  ChevronDown: (p: object) =>
    React.createElement("span", { "data-icon": "chevron-down", ...p }),
  ChevronUp: (p: object) =>
    React.createElement("span", { "data-icon": "chevron-up", ...p }),
  ChevronRight: (p: object) =>
    React.createElement("span", { "data-icon": "chevron-right", ...p }),
  CheckCircle2: (p: object) =>
    React.createElement("span", { "data-icon": "check", ...p }),
  XCircle: (p: object) =>
    React.createElement("span", { "data-icon": "x-circle", ...p }),
  Loader2: (p: object) =>
    React.createElement("span", { "data-icon": "loader2", ...p }),
  Clock: (p: object) =>
    React.createElement("span", { "data-icon": "clock", ...p }),
  Ban: (p: object) => React.createElement("span", { "data-icon": "ban", ...p }),
  RefreshCw: (p: object) =>
    React.createElement("span", { "data-icon": "refresh", ...p }),
  GitBranch: (p: object) =>
    React.createElement("span", { "data-icon": "git-branch", ...p }),
  ScanLine: (p: object) =>
    React.createElement("span", { "data-icon": "scan-line", ...p }),
  Upload: (p: object) =>
    React.createElement("span", { "data-icon": "upload", ...p }),
  Cpu: (p: object) => React.createElement("span", { "data-icon": "cpu", ...p }),
  ExternalLink: (p: object) =>
    React.createElement("span", { "data-icon": "external-link", ...p }),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild
      ? React.createElement(React.Fragment, null, children)
      : React.createElement("div", null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "tooltip" }, children),
}));

const COMPLETED_JOB: ActivityJob = {
  id: "job-1",
  modelId: "model-1",
  type: "sync",
  label: "Git sync",
  status: "completed",
  startedAt: "2026-03-18T10:00:00Z",
  completedAt: "2026-03-18T10:01:00Z",
  correlationMeta: "3 files changed",
  deepLink: "/models/model-1",
  errors: [],
};

const RUNNING_JOB: ActivityJob = {
  id: "job-2",
  modelId: "model-1",
  type: "scan",
  label: "typescript scan",
  status: "running",
  startedAt: "2026-03-18T10:02:00Z",
  completedAt: null,
  progress: 45,
  errors: [],
};

const FAILED_JOB: ActivityJob = {
  id: "job-3",
  modelId: "model-1",
  type: "scan",
  label: "kubernetes scan",
  status: "failed",
  startedAt: "2026-03-18T09:00:00Z",
  completedAt: "2026-03-18T09:01:00Z",
  errors: [{ message: "kubectl: connection refused — cluster unreachable" }],
};

const PENDING_JOB: ActivityJob = {
  id: "job-4",
  modelId: "model-1",
  type: "graph_rebuild",
  label: "Graph rebuild",
  status: "pending",
  startedAt: null,
  completedAt: null,
  errors: [],
};

describe("ActivityRail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the toggle strip", () => {
    render(React.createElement(ActivityRail, { jobs: [] }));
    expect(screen.getByTestId("activity-rail")).toBeTruthy();
    expect(screen.getByTestId("activity-rail-toggle")).toBeTruthy();
  });

  it("shows heading text in toggle strip", () => {
    render(React.createElement(ActivityRail, { jobs: [] }));
    expect(screen.getByText("Activity")).toBeTruthy();
  });

  it("is collapsed by default — content not visible", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    expect(screen.queryByTestId("activity-rail-content")).toBeNull();
  });

  it("expands on toggle click", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-rail-content")).toBeTruthy();
  });

  it("collapses again on second toggle click", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    const toggle = screen.getByTestId("activity-rail-toggle");
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.queryByTestId("activity-rail-content")).toBeNull();
  });

  it("shows job count in toggle strip", () => {
    render(
      React.createElement(ActivityRail, { jobs: [COMPLETED_JOB, RUNNING_JOB] }),
    );
    // Job count is rendered as "{count} jobs" - find any element containing that text
    const matches = screen.queryAllByText((_, element) => {
      const tag = element?.tagName?.toLowerCase();
      return (
        tag === "span" &&
        (element?.textContent ?? "").replace(/\s+/g, " ").trim() === "2 jobs"
      );
    });
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows empty state when no jobs and expanded", () => {
    render(React.createElement(ActivityRail, { jobs: [] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-rail-empty")).toBeTruthy();
    expect(screen.getByText("No recent background operations.")).toBeTruthy();
  });

  it("renders job rows for each job when expanded", () => {
    render(
      React.createElement(ActivityRail, {
        jobs: [COMPLETED_JOB, RUNNING_JOB, FAILED_JOB],
      }),
    );
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-job-row-completed")).toBeTruthy();
    expect(screen.getByTestId("activity-job-row-running")).toBeTruthy();
    expect(screen.getByTestId("activity-job-row-failed")).toBeTruthy();
  });

  it("shows job label for each job", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByText("Git sync")).toBeTruthy();
  });

  it("shows correlation metadata when present", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-job-meta")).toBeTruthy();
    expect(screen.getByText("3 files changed")).toBeTruthy();
  });

  it("shows progress bar for running job", () => {
    render(React.createElement(ActivityRail, { jobs: [RUNNING_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-job-progress")).toBeTruthy();
  });

  it("does not show progress bar for completed job", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.queryByTestId("activity-job-progress")).toBeNull();
  });

  it("shows deep link for jobs with deepLink set", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    const link = screen.getByTestId("activity-job-deeplink");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/models/model-1");
  });

  it("shows toggle button for failed job with errors", () => {
    render(React.createElement(ActivityRail, { jobs: [FAILED_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-job-toggle")).toBeTruthy();
  });

  it("expands error detail on job toggle click", () => {
    render(React.createElement(ActivityRail, { jobs: [FAILED_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.queryByTestId("activity-job-errors")).toBeNull();
    fireEvent.click(screen.getByTestId("activity-job-toggle"));
    expect(screen.getByTestId("activity-job-errors")).toBeTruthy();
    expect(
      screen.getByText("kubectl: connection refused — cluster unreachable"),
    ).toBeTruthy();
  });

  it("shows summary badge when there are running jobs", () => {
    render(React.createElement(ActivityRail, { jobs: [RUNNING_JOB] }));
    expect(screen.getByTestId("activity-summary-badge")).toBeTruthy();
  });

  it("shows summary badge when there are failed jobs", () => {
    render(React.createElement(ActivityRail, { jobs: [FAILED_JOB] }));
    expect(screen.getByTestId("activity-summary-badge")).toBeTruthy();
  });

  it("does not show summary badge when only completed jobs", () => {
    render(React.createElement(ActivityRail, { jobs: [COMPLETED_JOB] }));
    expect(screen.queryByTestId("activity-summary-badge")).toBeNull();
  });

  it("respects maxVisible limit", () => {
    const manyJobs: ActivityJob[] = Array.from({ length: 8 }, (_, i) => ({
      ...COMPLETED_JOB,
      id: `job-${i}`,
      label: `Job ${i}`,
    }));
    render(
      React.createElement(ActivityRail, { jobs: manyJobs, maxVisible: 3 }),
    );
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-rail-overflow")).toBeTruthy();
    // 8 jobs with maxVisible=3 → "… and 5 more"
    expect(screen.getByText("… and 5 more")).toBeTruthy();
  });

  it("renders pending job row", () => {
    render(React.createElement(ActivityRail, { jobs: [PENDING_JOB] }));
    fireEvent.click(screen.getByTestId("activity-rail-toggle"));
    expect(screen.getByTestId("activity-job-row-pending")).toBeTruthy();
  });
});
