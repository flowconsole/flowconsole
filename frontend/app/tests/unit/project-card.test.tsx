// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ProjectCard } from "@/components/project/project-card";

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
  }) =>
    React.createElement("span", { "data-testid": "badge", ...props }, children),
}));

const mockProject = {
  id: "proj-xyz",
  name: "Order Service Platform",
  description: "Microservices architecture project",
};

const withRouter = (el: React.ReactElement) =>
  React.createElement(MemoryRouter, null, el);

describe("ProjectCard", () => {
  it("renders project name", () => {
    render(
      withRouter(React.createElement(ProjectCard, { project: mockProject })),
    );
    expect(screen.getByText("Order Service Platform")).toBeTruthy();
  });

  it("renders project description", () => {
    render(
      withRouter(React.createElement(ProjectCard, { project: mockProject })),
    );
    expect(screen.getByText("Microservices architecture project")).toBeTruthy();
  });

  it("links to /projects/[id]", () => {
    render(
      withRouter(React.createElement(ProjectCard, { project: mockProject })),
    );
    const link = screen.getByTestId("project-card-proj-xyz");
    expect(link.getAttribute("href")).toBe("/projects/proj-xyz");
  });

  it("renders model count badge when provided", () => {
    render(
      withRouter(
        React.createElement(ProjectCard, {
          project: mockProject,
          modelCount: 3,
        }),
      ),
    );
    const badge = screen.getByTestId("badge");
    expect(badge.textContent).toContain("3");
    expect(badge.textContent).toContain("models");
  });

  it("renders singular model label for count 1", () => {
    render(
      withRouter(
        React.createElement(ProjectCard, {
          project: mockProject,
          modelCount: 1,
        }),
      ),
    );
    const badge = screen.getByTestId("badge");
    expect(badge.textContent).toBe("1 model");
  });

  it("does not render badge when modelCount is not provided", () => {
    render(
      withRouter(React.createElement(ProjectCard, { project: mockProject })),
    );
    expect(screen.queryByTestId("badge")).toBeNull();
  });
});
