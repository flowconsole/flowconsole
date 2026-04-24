// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseListBranchesQuery = vi.fn();
const mockCreateBranch = vi.fn();
const mockCreateBranchUnwrap = vi.fn();

vi.mock("@/lib/api/rtk/git-operations-api", () => ({
  useListBranchesQuery: (...args: unknown[]) =>
    mockUseListBranchesQuery(...args),
  useCreateBranchMutation: () => [
    (...args: unknown[]) => {
      mockCreateBranch(...args);
      return { unwrap: mockCreateBranchUnwrap };
    },
    { isLoading: false },
  ],
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@flowconsole/ui/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "button",
      { onClick, disabled, "data-testid": rest["data-testid"] },
      children,
    ),
}));

vi.mock("@flowconsole/ui/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement("input", {
      ...props,
      onChange: props.onChange,
      onKeyDown: props.onKeyDown,
    }),
}));

vi.mock("@flowconsole/ui/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "popover", "data-open": open },
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ onOpenChange?: (open: boolean) => void }>,
            { onOpenChange },
          );
        }

        return child;
      }),
    ),
  PopoverTrigger: ({
    children,
    asChild,
    onOpenChange,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<{ onClick?: () => void }>,
        { onClick: () => onOpenChange?.(true) },
      );
    }

    return React.createElement("span", null, children);
  },
  PopoverContent: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "div",
      { "data-testid": rest["data-testid"] },
      children,
    ),
}));

import { BranchSelector } from "@/components/editor/branch-selector";

const BRANCHES = [
  { name: "main", isCurrent: true, isRemote: false },
  { name: "feature/test", isCurrent: false, isRemote: false },
  { name: "origin/develop", isCurrent: false, isRemote: true },
  { name: "origin/main", isCurrent: false, isRemote: true },
];

describe("BranchSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseListBranchesQuery.mockReturnValue({
      data: BRANCHES,
      isLoading: false,
    });
    mockCreateBranchUnwrap.mockResolvedValue({ name: "new-branch" });
  });

  it("renders the trigger with selected branch name", () => {
    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
      }),
    );

    expect(screen.getByTestId("branch-selector-trigger")).toBeTruthy();
    expect(screen.getByTestId("branch-selector-trigger").textContent).toContain("main");
  });

  it("shows canonicalized and deduplicated branch names in the list", () => {
    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
      }),
    );

    expect(screen.getByTestId("branch-selector-popover")).toBeTruthy();
    expect(screen.getByTestId("branch-item-main")).toBeTruthy();
    expect(screen.getByTestId("branch-item-feature/test")).toBeTruthy();
    expect(screen.getByTestId("branch-item-develop")).toBeTruthy();
    expect(screen.queryByTestId("branch-item-origin/main")).toBeNull();
    expect(screen.queryByTestId("branch-item-origin/develop")).toBeNull();
  });

  it("shows remote label for remote-only branches", () => {
    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
      }),
    );

    const remoteBranch = screen.getByTestId("branch-item-develop");
    expect(remoteBranch.textContent).toContain("remote");
  });

  it("filters canonical branch names by search input", () => {
    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
      }),
    );

    const searchInput = screen.getByTestId("branch-search-input");
    fireEvent.change(searchInput, { target: { value: "develop" } });

    expect(screen.getByTestId("branch-item-develop")).toBeTruthy();
    expect(screen.queryByTestId("branch-item-main")).toBeNull();
  });

  it("calls onBranchSelected with canonical branch name when a branch is clicked", async () => {
    const onBranchSelected = vi.fn();

    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
        onBranchSelected,
      }),
    );

    fireEvent.click(screen.getByTestId("branch-item-develop"));

    await waitFor(() => {
      expect(onBranchSelected).toHaveBeenCalledWith("develop");
    });
  });

  it("does not emit selection when clicking the already-selected branch", () => {
    const onBranchSelected = vi.fn();

    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
        onBranchSelected,
      }),
    );

    fireEvent.click(screen.getByTestId("branch-item-main"));

    expect(onBranchSelected).not.toHaveBeenCalled();
  });

  it("shows new branch form when new branch button clicked", () => {
    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
      }),
    );

    fireEvent.click(screen.getByTestId("new-branch-button"));

    expect(screen.getByTestId("new-branch-form")).toBeTruthy();
    expect(screen.getByTestId("new-branch-input")).toBeTruthy();
  });

  it("creates a branch and selects it locally", async () => {
    const onBranchSelected = vi.fn();

    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
        onBranchSelected,
      }),
    );

    fireEvent.click(screen.getByTestId("new-branch-button"));
    fireEvent.change(screen.getByTestId("new-branch-input"), {
      target: { value: "new-branch" },
    });
    fireEvent.click(screen.getByTestId("create-branch-submit"));

    await waitFor(() => {
      expect(mockCreateBranch).toHaveBeenCalledWith({
        id: "m1",
        createBranchRequest: { name: "new-branch" },
      });
      expect(onBranchSelected).toHaveBeenCalledWith("new-branch");
    });
  });

  it("shows noBranch text when no selectedBranch is provided", () => {
    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
      }),
    );

    expect(screen.getByText("noBranch")).toBeTruthy();
  });

  it("shows empty state when no branches match search", () => {
    render(
      React.createElement(BranchSelector, {
        modelId: "m1",
        selectedBranch: "main",
      }),
    );

    fireEvent.change(screen.getByTestId("branch-search-input"), {
      target: { value: "missing" },
    });

    expect(screen.getByTestId("branch-empty-state")).toBeTruthy();
  });
});
