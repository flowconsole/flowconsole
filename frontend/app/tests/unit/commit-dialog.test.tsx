// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCommitToGit = vi.fn();
const mockCommitToGitUnwrap = vi.fn();

vi.mock("@/lib/api/rtk/git-operations-api", () => ({
  useCommitToGitMutation: () => [
    (...args: unknown[]) => {
      mockCommitToGit(...args);
      return { unwrap: mockCommitToGitUnwrap };
    },
    { isLoading: false },
  ],
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

vi.mock("@flowconsole/ui/components/ui/label", () => ({
  Label: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("label", rest, children),
}));

vi.mock("@flowconsole/ui/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "dialog-root", "data-open": open },
      children,
    ),
  DialogTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => (asChild ? children : React.createElement("span", null, children)),
  DialogContent: ({
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
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement("h2", null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children),
}));

import { CommitDialog } from "@/components/editor/commit-dialog";

describe("CommitDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommitToGitUnwrap.mockResolvedValue({ committed: true });
  });

  it("renders the commit trigger button", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
      }),
    );

    expect(screen.getByTestId("commit-button")).toBeTruthy();
    expect(screen.getByText("commit")).toBeTruthy();
  });

  it("disables trigger when disabled prop is true", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        disabled: true,
      }),
    );

    const btn = screen.getByTestId("commit-button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("shows dialog content with commit form and branch field", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "main",
        filePath: "model.ts",
        content: "const x = 1;",
      }),
    );

    expect(screen.getByTestId("commit-dialog")).toBeTruthy();
    expect(screen.getByTestId("commit-branch")).toBeTruthy();
    expect(screen.getByTestId("commit-message-input")).toBeTruthy();
    expect(screen.getByText("commitChanges")).toBeTruthy();
  });

  it("shows branch input pre-filled when provided", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "develop",
      }),
    );

    const branchInput = screen.getByTestId("commit-branch") as HTMLInputElement;
    expect(branchInput.value).toBe("develop");
  });

  it("shows file path input pre-filled when provided", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "main",
        filePath: "src/model.ts",
        content: "code",
      }),
    );

    const fileInput = screen.getByTestId("commit-file-path") as HTMLInputElement;
    expect(fileInput.value).toBe("src/model.ts");
  });

  it("submit button is disabled when message is empty", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "main",
        filePath: "model.dsl",
      }),
    );

    const submitBtn = screen.getByTestId("commit-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("enables submit when branch, message and file path are present", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "main",
        filePath: "model.dsl",
      }),
    );

    fireEvent.change(screen.getByTestId("commit-message-input"), {
      target: { value: "fix: bug" },
    });

    const submitBtn = screen.getByTestId("commit-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });

  it("disables submit when file path is empty", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "main",
      }),
    );

    fireEvent.change(screen.getByTestId("commit-message-input"), {
      target: { value: "fix: bug" },
    });

    const submitBtn = screen.getByTestId("commit-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("disables submit when branch is empty", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        filePath: "model.dsl",
      }),
    );

    fireEvent.change(screen.getByTestId("commit-message-input"), {
      target: { value: "fix: bug" },
    });

    const submitBtn = screen.getByTestId("commit-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("calls commitToGit mutation on submit with branch", async () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "develop",
        filePath: "model.ts",
        content: "code here",
      }),
    );

    fireEvent.change(screen.getByTestId("commit-message-input"), {
      target: { value: "feat: add feature" },
    });
    fireEvent.click(screen.getByTestId("commit-submit"));

    await waitFor(() => {
      expect(mockCommitToGit).toHaveBeenCalledWith({
        id: "m1",
        editorCommitRequest: {
          branch: "develop",
          message: "feat: add feature",
          filePath: "model.ts",
          content: "code here",
        },
      });
    });
  });

  it("submits on Enter key in message input", async () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "main",
        filePath: "model.ts",
        content: "code",
      }),
    );

    const input = screen.getByTestId("commit-message-input");
    fireEvent.change(input, { target: { value: "fix: typo" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockCommitToGit).toHaveBeenCalled();
    });
  });

  it("shows empty file path input when not provided", () => {
    render(
      React.createElement(CommitDialog, {
        modelId: "m1",
        branch: "main",
      }),
    );

    const fileInput = screen.getByTestId("commit-file-path") as HTMLInputElement;
    expect(fileInput.value).toBe("");
  });
});
