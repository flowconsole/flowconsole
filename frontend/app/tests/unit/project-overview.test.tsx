// @vitest-environment jsdom
import React from "react";
import { ProjectOverviewPage } from "@/product/pages/project-overview-page";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDispatch,
  mockCreateModel,
  mockCreateModelUnwrap,
  mockDeleteModel,
  mockDeleteModelUnwrap,
  mockUseGetProjectQuery,
  mockUseListModelsQuery,
  mockUseListBuiltinMetaSchemasQuery,
  mockUseListProjectMembersQuery,
  mockUseListProjectMetaSchemasQuery,
  mockHasRtkErrorStatus,
  mockUpdateQueryData,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockCreateModel: vi.fn(),
  mockCreateModelUnwrap: vi.fn(),
  mockDeleteModel: vi.fn(),
  mockDeleteModelUnwrap: vi.fn(),
  mockUseGetProjectQuery: vi.fn(),
  mockUseListModelsQuery: vi.fn(),
  mockUseListBuiltinMetaSchemasQuery: vi.fn(),
  mockUseListProjectMembersQuery: vi.fn(),
  mockUseListProjectMetaSchemasQuery: vi.fn(),
  mockHasRtkErrorStatus: vi.fn(),
  mockUpdateQueryData: vi.fn(() => ({ type: "rtk/updateQueryData" })),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/api/rtk/projects-models-api", () => ({
  projectsModelsApi: {
    util: {
      updateQueryData: mockUpdateQueryData,
    },
  },
  useGetProjectQuery: (...args: unknown[]) => mockUseGetProjectQuery(...args),
  useListModelsQuery: (...args: unknown[]) => mockUseListModelsQuery(...args),
  useCreateModelMutation: () => [
    (...args: unknown[]) => {
      mockCreateModel(...args);
      return { unwrap: mockCreateModelUnwrap };
    },
    { isLoading: false },
  ],
  useDeleteModelMutation: () => [
    (...args: unknown[]) => {
      mockDeleteModel(...args);
      return { unwrap: mockDeleteModelUnwrap };
    },
  ],
}));

vi.mock("@/lib/api/rtk", () => ({
  useListBuiltinMetaSchemasQuery: (...args: unknown[]) =>
    mockUseListBuiltinMetaSchemasQuery(...args),
  useListProjectMembersQuery: (...args: unknown[]) =>
    mockUseListProjectMembersQuery(...args),
  useListProjectMetaSchemasQuery: (...args: unknown[]) =>
    mockUseListProjectMetaSchemasQuery(...args),
}));

vi.mock("@/lib/api/rtk/errors", () => ({
  hasRtkErrorStatus: (...args: unknown[]) => mockHasRtkErrorStatus(...args),
  toApiError: (error: unknown) => error,
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

vi.mock("@flowconsole/ui/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  DialogContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "dialog-content" }, children),
  DialogHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  DialogTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("h2", {}, children),
  DialogFooter: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  AlertDialogContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-testid": "alert-dialog-content" },
      children,
    ),
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("h2", {}, children),
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("p", {}, children),
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  AlertDialogCancel: ({
    children,
    onClick,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    "data-testid"?: string;
  }) =>
    React.createElement("button", { onClick, "data-testid": testId }, children),
  AlertDialogAction: ({
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

vi.mock("@flowconsole/ui/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", props),
}));

vi.mock("@flowconsole/ui/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
    React.createElement("textarea", props),
}));

vi.mock("@flowconsole/ui/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("label", {}, children),
}));

vi.mock("@flowconsole/ui/components/ui/skeleton", () => ({
  Skeleton: () => React.createElement("div", { "data-testid": "skeleton" }),
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
      React.createElement("h1", { "data-testid": "project-heading" }, heading),
      children,
    ),
}));

vi.mock("@/components/model/model-card", () => ({
  ModelCard: ({
    model,
    onDelete,
  }: {
    model: { id: string; name: string };
    onDelete?: (id: string) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": `model-card-${model.id}` },
      model.name,
      onDelete &&
        React.createElement(
          "button",
          {
            "data-testid": `delete-model-${model.id}`,
            onClick: () => onDelete(model.id),
          },
          "delete",
        ),
    ),
}));

vi.mock("@/components/project/project-members-list", () => ({
  ProjectMembersList: ({ members }: { members: Array<{ userId: string }> }) =>
    React.createElement("div", {
      "data-testid": "members-list",
      "data-count": members.length,
    }),
}));

vi.mock("@/components/api-error-message", () => ({
  ApiErrorMessage: () =>
    React.createElement("div", { "data-testid": "api-error" }),
}));

const projectId = "proj-1";

function renderPage() {
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/projects/${projectId}`] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/projects/:projectId",
          element: React.createElement(ProjectOverviewPage),
        }),
      ),
    ),
  );
}

describe("ProjectOverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRtkErrorStatus.mockReturnValue(false);
    mockCreateModelUnwrap.mockResolvedValue({});
    mockDeleteModelUnwrap.mockResolvedValue(undefined);
    mockUseGetProjectQuery.mockReturnValue({
      data: {
        id: projectId,
        name: "Payments Platform",
        description: "Project description",
        defaultMetaSchemaId: "c4",
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseListModelsQuery.mockReturnValue({
      data: {
        data: [{ id: "model-1", name: "Core Model", description: null }],
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseListProjectMembersQuery.mockReturnValue({
      data: [
        { userId: "u-1", role: "owner", createdAt: "2026-01-01T00:00:00Z" },
      ],
    });
    mockUseListBuiltinMetaSchemasQuery.mockReturnValue({
      data: [{ id: "c4", name: "C4", isBuiltin: true }],
    });
    mockUseListProjectMetaSchemasQuery.mockReturnValue({
      data: [],
    });
  });

  it("renders project heading and models from RTK queries", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("project-heading").textContent).toBe(
        "Payments Platform",
      );
      expect(screen.getByTestId("model-card-model-1")).toBeTruthy();
    });
  });

  it("creates a model through the generated mutation", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("new-model-btn"));
    fireEvent.change(screen.getByTestId("model-name-input"), {
      target: { value: "New Model" },
    });
    fireEvent.change(screen.getByTestId("model-git-repo-url-input"), {
      target: { value: "https://github.com/acme/repo.git" },
    });
    fireEvent.change(screen.getByTestId("model-drift-threshold-input"), {
      target: { value: "75" },
    });
    fireEvent.click(screen.getByTestId("create-model-btn"));

    await waitFor(() => {
      expect(mockCreateModel).toHaveBeenCalledWith({
        projectId,
        createModelRequest: {
          name: "New Model",
          description: null,
          metaSchemaId: "c4",
          gitConfig: {
            repoUrl: "https://github.com/acme/repo.git",
            branch: "main",
            pathPatterns: {
              dsl: [],
              code: [],
              infra: [],
            },
            providerConfig: null,
          },
          driftConfig: {
            autoEnabled: false,
            sources: [],
            threshold: 75,
            notifyOnScoreBelow: 80,
          },
        },
      });
    });
  });

  it("shows built-in c4 in meta-schema select when project schemas are empty", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("new-model-btn"));

    const select = screen.getByTestId(
      "model-meta-schema-select",
    ) as HTMLSelectElement;

    expect(select.value).toBe("c4");
    expect(screen.getByRole("option", { name: "C4" })).toBeTruthy();
    expect(
      (screen.getByTestId("model-git-repo-url-input") as HTMLInputElement)
        .value,
    ).toBe("https://github.com/dotnet/eShop.git");
    expect(
      (screen.getByTestId("model-drift-threshold-input") as HTMLInputElement)
        .value,
    ).toBe("80");
    expect(
      (screen.getByTestId("model-drift-notify-input") as HTMLInputElement)
        .value,
    ).toBe("80");
  });

  it("deletes a model through confirmation and updates cached list", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("delete-model-model-1"));

    expect(mockDeleteModel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-delete-model-btn"));

    await waitFor(() => {
      expect(mockDeleteModel).toHaveBeenCalledWith({ id: "model-1" });
      expect(mockUpdateQueryData).toHaveBeenCalledWith(
        "listModels",
        { projectId },
        expect.any(Function),
      );
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  it("shows not-found placeholder for 404 project errors", () => {
    mockHasRtkErrorStatus.mockReturnValue(true);
    mockUseGetProjectQuery.mockReturnValueOnce({
      data: undefined,
      error: { status: 404 },
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByTestId("empty-placeholder")).toBeTruthy();
  });
});
