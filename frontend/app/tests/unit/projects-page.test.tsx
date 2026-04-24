// @vitest-environment jsdom
import React from "react";
import { ProjectsPage } from "@/product/pages/projects-page";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateProject,
  mockRefetch,
  mockUseCreateProjectMutation,
  mockUseListProjectsQuery,
} = vi.hoisted(() => ({
  mockCreateProject: vi.fn(),
  mockRefetch: vi.fn(),
  mockUseCreateProjectMutation: vi.fn(),
  mockUseListProjectsQuery: vi.fn(),
}));

vi.mock("@/lib/api/rtk/projects-models-api", () => ({
  useListProjectsQuery: (...args: unknown[]) =>
    mockUseListProjectsQuery(...args),
  useCreateProjectMutation: (...args: unknown[]) =>
    mockUseCreateProjectMutation(...args),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "data-testid"?: string;
  }) =>
    React.createElement(
      "button",
      { onClick, disabled, "data-testid": testId },
      children,
    ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children?: React.ReactNode;
    open?: boolean;
  }) =>
    open
      ? React.createElement("div", { "data-testid": "dialog" }, children)
      : null,
  DialogContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "dialog-content" }, children),
  DialogHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "dialog-header" }, children),
  DialogTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("h2", { "data-testid": "dialog-title" }, children),
  DialogFooter: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "dialog-footer" }, children),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", props),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children?: React.ReactNode;
    htmlFor?: string;
  }) => React.createElement("label", { htmlFor }, children),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
    React.createElement("textarea", props),
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
      React.createElement("h1", { "data-testid": "page-heading" }, heading),
      children,
    ),
}));

vi.mock("@/components/shared/empty-placeholder", () => ({
  EmptyPlaceholder: Object.assign(
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        "div",
        { "data-testid": "empty-placeholder" },
        children,
      ),
    {
      Icon: ({ name }: { name: string }) =>
        React.createElement("span", {
          "data-testid": `placeholder-icon-${name}`,
        }),
      Title: ({ children }: { children?: React.ReactNode }) =>
        React.createElement(
          "h3",
          { "data-testid": "placeholder-title" },
          children,
        ),
      Description: ({ children }: { children?: React.ReactNode }) =>
        React.createElement(
          "p",
          { "data-testid": "placeholder-description" },
          children,
        ),
    },
  ),
}));

vi.mock("@/components/api-error-message", () => ({
  ApiErrorMessage: ({
    error,
    onRetry,
  }: {
    error: unknown;
    onRetry?: () => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "api-error" },
      React.createElement("span", {}, String(error)),
      onRetry &&
        React.createElement(
          "button",
          { "data-testid": "retry-btn", onClick: onRetry },
          "Retry",
        ),
    ),
}));

vi.mock("@/components/project/project-card", () => ({
  ProjectCard: ({ project }: { project: { id: string; name: string } }) =>
    React.createElement(
      "div",
      { "data-testid": `project-card-${project.id}` },
      project.name,
    ),
}));

vi.mock("@/components/project/project-list-skeleton", () => ({
  ProjectListSkeleton: () =>
    React.createElement("div", { "data-testid": "project-list-skeleton" }),
}));

const mockProject = {
  id: "proj-1",
  name: "Order Service Platform",
  description: "Microservices architecture project",
  ownerId: "user-1",
  defaultMetaSchemaId: "c4",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseListProjectsQuery.mockReturnValue({
      data: {
        data: [mockProject],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
      },
      error: undefined,
      isLoading: false,
      refetch: mockRefetch,
    });
    mockUseCreateProjectMutation.mockReturnValue([
      mockCreateProject,
      { isLoading: false },
    ]);
    mockCreateProject.mockResolvedValue(mockProject);
  });

  it("shows loading skeleton initially", () => {
    mockUseListProjectsQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });

    render(React.createElement(ProjectsPage));
    expect(screen.getByTestId("project-list-skeleton")).toBeTruthy();
  });

  it("renders loaded projects", async () => {
    render(React.createElement(ProjectsPage));
    await waitFor(() => {
      expect(screen.getByTestId("project-card-proj-1").textContent).toContain(
        "Order Service Platform",
      );
    });
  });

  it("shows empty state when no projects are returned", async () => {
    mockUseListProjectsQuery.mockReturnValue({
      data: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasMore: false,
      },
      error: undefined,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(React.createElement(ProjectsPage));

    await waitFor(() => {
      expect(screen.getByTestId("empty-placeholder")).toBeTruthy();
    });
  });

  it("calls generated create mutation from the dialog", async () => {
    render(React.createElement(ProjectsPage));
    fireEvent.click(screen.getByTestId("new-project-btn"));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Project" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Optional description" },
    });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        createProjectRequest: {
          name: "New Project",
          description: "Optional description",
          defaultMetaSchemaId: null,
        },
      });
    });
  });

  it("shows validation error when creating a project with an empty name", async () => {
    render(React.createElement(ProjectsPage));
    fireEvent.click(screen.getByTestId("new-project-btn"));
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeTruthy();
    });
  });

  it("shows error state and retry button on query failure", async () => {
    mockUseListProjectsQuery.mockReturnValue({
      data: undefined,
      error: new Error("Network error"),
      isLoading: false,
      refetch: mockRefetch,
    });

    render(React.createElement(ProjectsPage));

    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeTruthy();
      expect(screen.getByTestId("retry-btn")).toBeTruthy();
    });
  });
});
