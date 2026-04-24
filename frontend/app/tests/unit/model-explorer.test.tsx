// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDispatch,
  mockInitiateElements,
  mockInitiateRelationships,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockInitiateElements: vi.fn(),
  mockInitiateRelationships: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/store", () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock("@/lib/api/error", () => ({
  ApiError: class ApiError extends Error {
    constructor(public readonly status: number) {
      super(String(status));
    }

    get isNotFound() {
      return this.status === 404;
    }
  },
}));

vi.mock("@/lib/api/rtk", () => ({
  graphApi: {
    endpoints: {
      listElements: {
        initiate: (...args: unknown[]) => mockInitiateElements(...args),
      },
      listRelationships: {
        initiate: (...args: unknown[]) => mockInitiateRelationships(...args),
      },
    },
  },
  toApiError: (error: unknown) => error,
  toGraphElements: (elements: unknown[]) => elements,
  toGraphRelationships: (relationships: unknown[]) => relationships,
}));

vi.mock("@/components/explorer", () => ({
  ExplorerLoader: () =>
    React.createElement("div", { "data-testid": "explorer-loader" }),
  ExplorerToolbar: () =>
    React.createElement("div", { "data-testid": "explorer-toolbar" }),
  ElementInspector: () =>
    React.createElement("div", { "data-testid": "element-inspector" }),
  mapApiTodiagramModel: () => ({ nodes: [], edges: [] }),
}));

vi.mock("@flowconsole/web", () => ({
  ArchitectureDiagram: () =>
    React.createElement("div", { "data-testid": "architecture-diagram" }),
  architectureNodeTypes: {},
  architectureEdgeTypes: {},
}));

vi.mock("@flowconsole/ui/components/shared/empty-placeholder", () => ({
  EmptyPlaceholder: Object.assign(
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "empty-placeholder" }, children),
    {
      Icon: () => React.createElement("span"),
      Title: ({ children }: { children?: React.ReactNode }) =>
        React.createElement("h3", {}, children),
      Description: ({ children }: { children?: React.ReactNode }) =>
        React.createElement("p", {}, children),
    },
  ),
}));

vi.mock("@/components/api-error-message", () => ({
  ApiErrorMessage: () =>
    React.createElement("div", { "data-testid": "api-error" }),
}));

import { ModelExplorerPage } from "@/product/pages/model-explorer-page";

const modelId = "model-abc";

function createInitiateResult(data: unknown) {
  return {
    unwrap: vi.fn().mockResolvedValue(data),
    unsubscribe: vi.fn(),
  };
}

function renderPage() {
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/models/${modelId}/explorer`] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/models/:modelId/explorer",
          element: React.createElement(ModelExplorerPage),
        }),
      ),
    ),
  );
}

describe("ModelExplorerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiateElements.mockReturnValue(
      createInitiateResult({
        data: [{ id: "el-1", name: "Auth Service", source: "Git", kind: "Service" }],
        hasMore: false,
      }),
    );
    mockInitiateRelationships.mockReturnValue(
      createInitiateResult({
        data: [{ id: "rel-1" }],
        hasMore: false,
      }),
    );
    mockDispatch.mockImplementation((request) => request);
  });

  it("loads explorer data through RTK endpoint initiation", async () => {
    renderPage();

    await waitFor(() => {
      expect(mockInitiateElements).toHaveBeenCalledWith({
        modelId,
        limit: 500,
        page: 1,
      });
      expect(mockInitiateRelationships).toHaveBeenCalledWith({
        modelId,
        limit: 500,
        page: 1,
      });
      expect(screen.getByTestId("model-explorer")).toBeTruthy();
    });
  });

  it("shows not-found placeholder for 404 API errors", async () => {
    const { ApiError } = await import("@/lib/api/error");
    mockInitiateElements.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue(new ApiError(404)),
      unsubscribe: vi.fn(),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("empty-placeholder")).toBeTruthy();
    });
  });

  it("shows retryable error state for non-404 failures", async () => {
    mockInitiateElements.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue(new Error("boom")),
      unsubscribe: vi.fn(),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeTruthy();
    });
  });
});
