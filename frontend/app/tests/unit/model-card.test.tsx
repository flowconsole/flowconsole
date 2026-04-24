// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ModelCard, ModelListRow } from "@/components/model/model-card";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) =>
    React.createElement("div", { "data-testid": "card", className }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "card-header" }, children),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("h3", { className }, children),
  CardDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("p", { className }, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
    "data-testid"?: string;
  }) =>
    React.createElement("span", { "data-testid": "badge", ...props }, children),
}));

const mockModel = {
  id: "model-abc",
  name: "Core Services",
  description: "Backend services graph",
};

describe("ModelCard", () => {
  it("renders model name", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ModelCard, { model: mockModel }),
      ),
    );
    expect(screen.getByText("Core Services")).toBeTruthy();
  });

  it("renders model description", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ModelCard, { model: mockModel }),
      ),
    );
    expect(screen.getByText("Backend services graph")).toBeTruthy();
  });

  it("links to /models/[id]", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ModelCard, { model: mockModel }),
      ),
    );
    const link = screen.getByTestId("model-card-model-abc");
    expect(link.getAttribute("href")).toBe("/models/model-abc");
  });

  it("renders status chips when provided", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ModelCard, {
          model: mockModel,
          status: {
            sourceFreshness: "fresh",
            drift: "clean",
            validation: "passing",
          },
        }),
      ),
    );
    expect(screen.getByTestId("source-freshness-fresh")).toBeTruthy();
    expect(screen.getByTestId("drift-status-clean")).toBeTruthy();
    expect(screen.getByTestId("validation-status-passing")).toBeTruthy();
  });

  it("does not render chip section when status is omitted", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ModelCard, { model: mockModel }),
      ),
    );
    expect(screen.queryByTestId("source-freshness-fresh")).toBeNull();
  });
});

describe("ModelListRow", () => {
  it("renders model name in row", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ModelListRow, { model: mockModel }),
      ),
    );
    expect(screen.getByText("Core Services")).toBeTruthy();
  });

  it("links to /models/[id] in row", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ModelListRow, { model: mockModel }),
      ),
    );
    const link = screen.getByTestId("model-row-model-abc");
    expect(link.getAttribute("href")).toBe("/models/model-abc");
  });
});
