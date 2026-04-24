// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/error";

const {
  mockUseGetModelQuery,
  mockHasRtkErrorStatus,
  mockRefetch,
} = vi.hoisted(() => ({
  mockUseGetModelQuery: vi.fn(),
  mockHasRtkErrorStatus: vi.fn(),
  mockRefetch: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/api/rtk", () => ({
  useGetModelQuery: (...args: unknown[]) => mockUseGetModelQuery(...args),
  hasRtkErrorStatus: (...args: unknown[]) => mockHasRtkErrorStatus(...args),
  toApiError: (error: unknown) => error,
}));

vi.mock("@flowconsole/ui/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement("div", { "data-testid": "skeleton", className }),
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

vi.mock("@/components/editor", () => ({
  ModelEditorShell: ({
    modelId,
    modelName,
    branch,
    modelFiles,
  }: {
    modelId: string;
    modelName: string;
    branch?: string;
    modelFiles?: Array<{ branch?: string; relativePath?: string }>;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "model-editor-shell" },
      React.createElement("span", { "data-testid": "shell-model-id" }, modelId),
      React.createElement(
        "span",
        { "data-testid": "shell-model-name" },
        modelName,
      ),
      React.createElement(
        "span",
        { "data-testid": "shell-branch" },
        branch ?? "",
      ),
      React.createElement(
        "span",
        { "data-testid": "shell-model-files" },
        String(modelFiles?.length ?? 0),
      ),
    ),
}));

import { ModelEditorPage } from "@/product/pages/model-editor-page";

const mockModelId = "model-xyz";
const mockModel = {
  id: mockModelId,
  projectId: "proj-1",
  name: "Production Architecture",
  description: "Main production model",
  defaultMetaSchemaId: "c4",
  version: 3,
  gitConfig: {
    repoUrl: "https://github.com/example/repo",
    branch: "develop",
    pathPatterns: { dsl: [], code: [], infra: [] },
    providerConfig: null,
  },
  modelFiles: [{ branch: "develop", relativePath: "architecture.fc.ts" }],
};

function renderPage() {
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/models/${mockModelId}/editor`] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/models/:modelId/editor",
          element: React.createElement(ModelEditorPage),
        }),
      ),
    ),
  );
}

describe("ModelEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRtkErrorStatus.mockReturnValue(false);
    mockUseGetModelQuery.mockReturnValue({
      data: mockModel,
      error: undefined,
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  it("shows loading skeleton initially", () => {
    mockUseGetModelQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getByTestId("editor-loading")).toBeTruthy();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("model-editor-shell")).toBeNull();
  });

  it("renders editor shell with the RTK-backed model data", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("model-editor-shell")).toBeTruthy();
      expect(screen.getByTestId("shell-model-id").textContent).toBe(mockModelId);
      expect(screen.getByTestId("shell-model-name").textContent).toBe(
        "Production Architecture",
      );
      expect(screen.getByTestId("shell-branch").textContent).toBe("develop");
      expect(screen.getByTestId("shell-model-files").textContent).toBe("1");
    });
  });

  it("defaults to 'main' branch when gitConfig is null", async () => {
    mockUseGetModelQuery.mockReturnValue({
      data: { ...mockModel, gitConfig: null },
      error: undefined,
      isLoading: false,
      refetch: mockRefetch,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("shell-branch").textContent).toBe("main");
    });
  });

  it("shows error state with retry button on non-404 failures", async () => {
    mockUseGetModelQuery.mockReturnValue({
      data: undefined,
      error: new Error("Network error"),
      isLoading: false,
      refetch: mockRefetch,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeTruthy();
      expect(screen.getByTestId("retry-btn")).toBeTruthy();
    });
  });

  it("shows not-found state when model query returns 404", async () => {
    const error = new ApiError(404, { title: "Not Found", status: 404 });
    mockHasRtkErrorStatus.mockImplementation(
      (candidate: unknown, status: number) =>
        candidate === error && status === 404,
    );
    mockUseGetModelQuery.mockReturnValue({
      data: undefined,
      error,
      isLoading: false,
      refetch: mockRefetch,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("placeholder-title")).toBeTruthy();
    });
  });
});
