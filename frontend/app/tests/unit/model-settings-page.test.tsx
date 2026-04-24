// @vitest-environment jsdom
import React from "react";
import { ModelSettingsPage } from "@/product/pages/model-settings-page";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDispatch,
  mockUpdateModel,
  mockUpdateModelUnwrap,
  mockCreateSync,
  mockCreateSyncUnwrap,
  mockUseGetModelQuery,
  mockUseListScansQuery,
  mockUpsertQueryData,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockUpdateModel: vi.fn(),
  mockUpdateModelUnwrap: vi.fn(),
  mockCreateSync: vi.fn(),
  mockCreateSyncUnwrap: vi.fn(),
  mockUseGetModelQuery: vi.fn(),
  mockUseListScansQuery: vi.fn(),
  mockUpsertQueryData: vi.fn(() => ({ type: "rtk/upsertQueryData" })),
}));

vi.mock("@/lib/store", () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/api/rtk", () => ({
  projectsModelsApi: {
    util: {
      upsertQueryData: mockUpsertQueryData,
    },
  },
  useGetModelQuery: (...args: unknown[]) => mockUseGetModelQuery(...args),
  useListScansQuery: (...args: unknown[]) => mockUseListScansQuery(...args),
  useUpdateModelMutation: () => [
    (...args: unknown[]) => {
      mockUpdateModel(...args);
      return { unwrap: mockUpdateModelUnwrap };
    },
  ],
  useCreateSyncMutation: () => [
    (...args: unknown[]) => {
      mockCreateSync(...args);
      return { unwrap: mockCreateSyncUnwrap };
    },
    { isLoading: false },
  ],
}));

vi.mock("@/components/sources/git-config-form", () => ({
  GitConfigForm: ({
    onSave,
  }: {
    onSave: (request: unknown) => Promise<void>;
  }) =>
    React.createElement(
      "button",
      {
        "data-testid": "save-config-btn",
        onClick: () =>
          void onSave({
            repoUrl: "https://github.com/test/repo.git",
            branch: "main",
            pathPatterns: { dsl: [], code: [], infra: [] },
          }),
      },
      "save",
    ),
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

const modelId = "model-xyz";
const model = {
  id: modelId,
  projectId: "proj-1",
  name: "My Model",
  description: null,
  version: 1,
  gitConfig: {
    repoUrl: "https://github.com/org/repo.git",
    branch: "main",
    pathPatterns: { dsl: [], code: [], infra: [] },
    providerConfig: null,
  },
  driftConfig: null,
};

function renderPage() {
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/models/${modelId}/settings`] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/models/:modelId/settings",
          element: React.createElement(ModelSettingsPage),
        }),
      ),
    ),
  );
}

describe("ModelSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateModelUnwrap.mockResolvedValue(model);
    mockCreateSyncUnwrap.mockResolvedValue({ id: "sync-1" });
    mockUseGetModelQuery.mockReturnValue({
      data: model,
      error: undefined,
      isLoading: false,
    });
    mockUseListScansQuery.mockReturnValue({
      data: { items: [] },
      error: undefined,
      isLoading: false,
    });
  });

  it("renders git config form and trigger sync button", () => {
    renderPage();

    expect(screen.getByTestId("model-settings")).toBeTruthy();
    expect(screen.getByTestId("save-config-btn")).toBeTruthy();
    expect(screen.getByTestId("trigger-sync-button")).toBeTruthy();
  });

  it("updates git config with If-Match and writes returned model into cache", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("save-config-btn"));

    await waitFor(() => {
      expect(mockUpdateModel).toHaveBeenCalledWith({
        id: modelId,
        "If-Match": "1",
        updateModelRequest: expect.objectContaining({
          name: "My Model",
          gitConfig: expect.objectContaining({
            repoUrl: "https://github.com/test/repo.git",
          }),
        }),
      });
      expect(mockUpsertQueryData).toHaveBeenCalledWith(
        "getModel",
        { id: modelId },
        model,
      );
    });
  });

  it("triggers sync through RTK mutation", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("trigger-sync-button"));

    await waitFor(() => {
      expect(mockCreateSync).toHaveBeenCalledWith({ id: modelId });
    });
  });
});
