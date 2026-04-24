// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelEditorShell } from "@/components/editor/editor-shell";

const { mockUseGetGitFileContentQuery } = vi.hoisted(() => ({
  mockUseGetGitFileContentQuery: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@monaco-editor/react", () => ({
  Editor: (props: Record<string, unknown>) =>
    React.createElement("textarea", {
      "data-testid": "monaco-editor",
      value: props.value as string,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        (props.onChange as ((value: string) => void) | undefined)?.(
          event.target.value,
        ),
    }),
}));

vi.mock("@flowconsole/web", () => ({
  ArchitectureDiagram: () =>
    React.createElement("div", { "data-testid": "architecture-diagram" }),
  architectureNodeTypes: {},
  architectureEdgeTypes: {},
  findLanguage: () => ({
    id: "typescript",
    monacoLanguage: "typescript",
    samples: [],
    monacoSetup: undefined,
    evaluate: vi
      .fn()
      .mockResolvedValue({ ok: true, model: { nodes: [], edges: [] } }),
  }),
}));

vi.mock("@/lib/api/rtk/git-operations-api", () => ({
  useGetGitFileContentQuery: (...args: unknown[]) =>
    mockUseGetGitFileContentQuery(...args),
}));

vi.mock("@/components/editor/branch-selector", () => ({
  BranchSelector: ({
    selectedBranch,
    onBranchSelected,
  }: {
    modelId: string;
    selectedBranch?: string;
    onBranchSelected?: (branch: string) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "branch-selector" },
      React.createElement("span", { "data-testid": "branch-selector-value" }, selectedBranch ?? ""),
      React.createElement(
        "button",
        {
          "data-testid": "branch-selector-change",
          onClick: () => onBranchSelected?.("develop"),
        },
        "switch",
      ),
    ),
}));

vi.mock("@/components/editor/file-selector", () => ({
  FileSelector: ({
    selectedFile,
    onFileSelected,
  }: {
    files: Array<{ branch: string; relativePath: string }>;
    selectedFile?: { branch: string; relativePath: string } | null;
    onFileSelected?: (file: { branch: string; relativePath: string }) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "file-selector" },
      React.createElement(
        "span",
        { "data-testid": "file-selector-value" },
        selectedFile?.relativePath ?? "",
      ),
      React.createElement(
        "button",
        {
          "data-testid": "file-selector-change",
          onClick: () =>
            onFileSelected?.({
              branch: "main",
              relativePath: "services.fc.ts",
            }),
        },
        "change file",
      ),
    ),
}));

vi.mock("@/components/editor/new-file-dialog", () => ({
  NewFileDialog: ({
    onCreate,
  }: {
    selectedBranch: string;
    existingPaths: string[];
    onCreate?: (relativePath: string) => void;
  }) =>
    React.createElement(
      "button",
      {
        "data-testid": "new-file-trigger",
        onClick: () => onCreate?.("drafts/new-file.fc.ts"),
      },
      "new file",
    ),
}));

vi.mock("@/components/editor/commit-dialog", () => ({
  CommitDialog: ({
    disabled,
    branch,
    filePath,
  }: {
    disabled?: boolean;
    branch?: string;
    filePath?: string;
  }) =>
    React.createElement("button", {
      "data-testid": "commit-dialog-trigger",
      disabled,
      "data-branch": branch ?? "",
      "data-file-path": filePath ?? "",
    }),
}));

const DEFAULT_PROPS = {
  modelId: "test-model",
  modelName: "Test Model",
  branch: "main",
  modelFiles: [
    { branch: "main", relativePath: "architecture.fc.ts" },
    { branch: "main", relativePath: "services.fc.ts" },
  ],
};

describe("ModelEditorShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetGitFileContentQuery.mockReturnValue({
      data: {
        path: "architecture.fc.ts",
        content: "// initial code",
      },
      isFetching: false,
      isLoading: false,
    });
  });

  it("renders the shell container", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("model-editor-shell")).toBeTruthy();
  });

  it("shows the model name in the header", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("editor-model-name").textContent).toBe(
      "Test Model",
    );
  });

  it("shows branch selector with selected branch", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("branch-selector")).toBeTruthy();
    expect(screen.getByTestId("branch-selector-value").textContent).toBe("main");
  });

  it("passes the selected branch to commit dialog", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("commit-dialog-trigger").dataset.branch).toBe(
      "main",
    );
    expect(screen.getByTestId("commit-dialog-trigger").dataset.filePath).toBe(
      "architecture.fc.ts",
    );
  });

  it("updates selected branch locally when branch selector changes", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));

    fireEvent.click(screen.getByTestId("branch-selector-change"));

    expect(screen.getByTestId("branch-selector-value").textContent).toBe(
      "develop",
    );
    expect(screen.getByTestId("commit-dialog-trigger").dataset.branch).toBe(
      "develop",
    );
  });

  it("does not show unsaved indicator initially", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.queryByTestId("unsaved-indicator")).toBeNull();
  });

  it("disables commit dialog trigger when no unsaved changes", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    const commitBtn = screen.getByTestId(
      "commit-dialog-trigger",
    ) as HTMLButtonElement;
    expect(commitBtn.disabled).toBe(true);
  });

  it("renders all three view mode buttons", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("view-mode-editor")).toBeTruthy();
    expect(screen.getByTestId("view-mode-split")).toBeTruthy();
    expect(screen.getByTestId("view-mode-preview")).toBeTruthy();
  });

  it("split mode is active by default", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("view-mode-split").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByTestId("view-mode-editor").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("switches to editor-only view when editor mode button clicked", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    fireEvent.click(screen.getByTestId("view-mode-editor"));
    expect(screen.getByTestId("view-mode-editor").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByTestId("view-mode-split").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("switches to preview-only view when preview mode button clicked", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    fireEvent.click(screen.getByTestId("view-mode-preview"));
    expect(screen.getByTestId("view-mode-preview").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("renders diagnostics panel", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("diagnostics-panel")).toBeTruthy();
  });

  it("renders branch selector even when no branch is provided", () => {
    render(
      React.createElement(ModelEditorShell, {
        ...DEFAULT_PROPS,
        branch: undefined,
      }),
    );

    expect(screen.getByTestId("branch-selector")).toBeTruthy();
    expect(screen.getByTestId("branch-selector-value").textContent).toBe("main");
  });

  it("renders commit dialog trigger", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    expect(screen.getByTestId("commit-dialog-trigger")).toBeTruthy();
  });

  it("shows dirty state and enables commit when code changes", async () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));

    await waitFor(() =>
      expect(screen.getByTestId("editor-workbench")).toBeTruthy(),
    );
    await waitFor(() =>
      expect(
        (screen.getByTestId("monaco-editor") as HTMLTextAreaElement).value,
      ).toBe("// initial code"),
    );

    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: "// changed code" },
    });

    expect(screen.getByTestId("unsaved-indicator")).toBeTruthy();
    expect(
      (screen.getByTestId("commit-dialog-trigger") as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("renders editor workbench area", async () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));
    await waitFor(() =>
      expect(screen.getByTestId("editor-workbench")).toBeTruthy(),
    );
  });

  it("shows a blocking loading overlay while the active git file is loading", () => {
    mockUseGetGitFileContentQuery.mockReturnValue({
      data: undefined,
      isFetching: true,
      isLoading: true,
    });

    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));

    expect(screen.getByTestId("editor-file-loading-overlay")).toBeTruthy();
    expect(screen.getByTestId("editor-file-loading-progress")).toBeTruthy();
    expect(screen.getByTestId("model-editor-shell").getAttribute("aria-busy")).toBe(
      "true",
    );
  });

  it("switches active file when file selector changes", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));

    fireEvent.click(screen.getByTestId("file-selector-change"));

    expect(screen.getByTestId("file-selector-value").textContent).toBe(
      "services.fc.ts",
    );
    expect(screen.getByTestId("commit-dialog-trigger").dataset.filePath).toBe(
      "services.fc.ts",
    );
  });

  it("adds a new local file and marks the shell dirty", () => {
    render(React.createElement(ModelEditorShell, DEFAULT_PROPS));

    fireEvent.click(screen.getByTestId("new-file-trigger"));

    expect(screen.getByTestId("commit-dialog-trigger").dataset.filePath).toBe(
      "drafts/new-file.fc.ts",
    );
    expect(screen.getByTestId("unsaved-indicator")).toBeTruthy();
    expect(
      (screen.getByTestId("commit-dialog-trigger") as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
