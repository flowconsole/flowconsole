// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GitConfig } from "@/lib/api/view-models";
import { GitConfigForm } from "@/components/sources/git-config-form";

// Mock next-intl
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        repoUrl: "Repository URL",
        repoUrlHint: "HTTPS or SSH URL",
        branch: "Branch",
        pathPatterns: "Path Patterns",
        pathPatternsHint: "One glob per line",
        provider: "Git Provider",
        providerDirect: "Direct Git",
        providerGitHub: "GitHub",
        providerGitLab: "GitLab",
        providerBitbucket: "Bitbucket",
        comingSoon: "coming soon",
        username: "Username",
        usernamePlaceholder: "git-user",
        password: "Password / Token",
        passwordPlaceholder: "Personal access token or password",
        passwordHint: "Used for HTTPS authentication.",
        saving: "Saving…",
        saved: "Saved",
        saveConfig: "Save Config",
        configSaved: "Configuration saved",
        saveError: "Failed to save configuration",
      };
      if (params) {
        return (map[key] ?? key).replace(/\{(\w+)\}/g, (_, k) =>
          String(params[k] ?? ""),
        );
      }
      return map[key] ?? key;
    },
  }),
}));

// Mock cn
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "button",
      {
        onClick,
        disabled,
        type: type ?? "button",
        "data-testid": props["data-testid"],
      },
      children,
    ),
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
    children: React.ReactNode;
    htmlFor?: string;
  }) => React.createElement("label", { htmlFor }, children),
}));

// Mock lucide icons
vi.mock("lucide-react", () => ({
  Link2: () => React.createElement("span", { "data-icon": "link2" }),
  GitBranch: () => React.createElement("span", { "data-icon": "git-branch" }),
  FolderSearch: () =>
    React.createElement("span", { "data-icon": "folder-search" }),
  KeyRound: () => React.createElement("span", { "data-icon": "key-round" }),
  Save: () => React.createElement("span", { "data-icon": "save" }),
  Loader2: () => React.createElement("span", { "data-icon": "loader2" }),
  User: () => React.createElement("span", { "data-icon": "user" }),
}));

const SAMPLE_CONFIG: GitConfig = {
  repoUrl: "https://github.com/org/repo.git",
  branch: "main",
  pathPatterns: {
    dsl: ["src/**/*.ts", "architecture/**"],
    code: [],
    infra: [],
  },
  providerConfig: { type: "direct", username: "myuser", password: "mypass" },
};

const SAMPLE_CONFIG_NO_CREDS: GitConfig = {
  repoUrl: "https://github.com/org/repo.git",
  branch: "main",
  pathPatterns: {
    dsl: ["src/**/*.ts"],
    code: [],
    infra: [],
  },
  providerConfig: null,
};

describe("GitConfigForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form", () => {
    render(
      React.createElement(GitConfigForm, {
        config: null,
        onSave: vi.fn(),
      }),
    );
    expect(screen.getByTestId("git-config-form")).toBeTruthy();
  });

  it("populates fields from config with provider credentials", () => {
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG,
        onSave: vi.fn(),
      }),
    );
    const urlInput = screen.getByTestId("git-repo-url") as HTMLInputElement;
    expect(urlInput.value).toBe("https://github.com/org/repo.git");

    const branchInput = screen.getByTestId("git-branch") as HTMLInputElement;
    expect(branchInput.value).toBe("main");

    const usernameInput = screen.getByTestId(
      "git-username",
    ) as HTMLInputElement;
    expect(usernameInput.value).toBe("myuser");

    const passwordInput = screen.getByTestId(
      "git-password",
    ) as HTMLInputElement;
    expect(passwordInput.value).toBe("mypass");
    expect(passwordInput.type).toBe("password");
  });

  it("shows provider selector with Direct selected", () => {
    render(
      React.createElement(GitConfigForm, {
        config: null,
        onSave: vi.fn(),
      }),
    );
    const providerSelect = screen.getByTestId(
      "git-provider",
    ) as HTMLSelectElement;
    expect(providerSelect.value).toBe("direct");
  });

  it("disables non-direct provider options", () => {
    render(
      React.createElement(GitConfigForm, {
        config: null,
        onSave: vi.fn(),
      }),
    );
    const providerSelect = screen.getByTestId(
      "git-provider",
    ) as HTMLSelectElement;
    const options = providerSelect.querySelectorAll("option");
    // Direct should not be disabled
    expect((options[0] as HTMLOptionElement).disabled).toBe(false);
    // GitHub, GitLab, Bitbucket should be disabled
    expect((options[1] as HTMLOptionElement).disabled).toBe(true);
    expect((options[2] as HTMLOptionElement).disabled).toBe(true);
    expect((options[3] as HTMLOptionElement).disabled).toBe(true);
  });

  it("shows username and password fields when direct provider selected", () => {
    render(
      React.createElement(GitConfigForm, {
        config: null,
        onSave: vi.fn(),
      }),
    );
    expect(screen.getByTestId("git-username")).toBeTruthy();
    expect(screen.getByTestId("git-password")).toBeTruthy();
  });

  it("save button is disabled when no changes", () => {
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG,
        onSave: vi.fn(),
      }),
    );
    const btn = screen.getByTestId("git-config-save") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("save button becomes enabled after input change", () => {
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG,
        onSave: vi.fn(),
      }),
    );
    const branchInput = screen.getByTestId("git-branch");
    fireEvent.change(branchInput, { target: { value: "develop" } });
    const btn = screen.getByTestId("git-config-save") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("calls onSave with providerConfig when form is submitted", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG,
        onSave,
      }),
    );
    // Change username
    const usernameInput = screen.getByTestId("git-username");
    fireEvent.change(usernameInput, { target: { value: "newuser" } });

    // Submit
    const form = screen.getByTestId("git-config-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          providerConfig: expect.objectContaining({
            type: "direct",
            username: "newuser",
            password: "mypass",
          }),
        }),
      );
    });
  });

  it("sends null providerConfig fields when credentials are empty", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG_NO_CREDS,
        onSave,
      }),
    );
    // Change branch to make form dirty
    const branchInput = screen.getByTestId("git-branch");
    fireEvent.change(branchInput, { target: { value: "develop" } });

    const form = screen.getByTestId("git-config-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          providerConfig: expect.objectContaining({
            type: "direct",
          }),
        }),
      );
    });
  });

  it("shows error message when onSave rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network error"));
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG,
        onSave,
      }),
    );

    const branchInput = screen.getByTestId("git-branch");
    fireEvent.change(branchInput, { target: { value: "develop" } });

    const form = screen.getByTestId("git-config-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("git-config-error")).toBeTruthy();
    });
  });

  it("renders with null config (no pre-fill)", () => {
    render(
      React.createElement(GitConfigForm, {
        config: null,
        onSave: vi.fn(),
      }),
    );
    const urlInput = screen.getByTestId("git-repo-url") as HTMLInputElement;
    expect(urlInput.value).toBe("");
    const usernameInput = screen.getByTestId(
      "git-username",
    ) as HTMLInputElement;
    expect(usernameInput.value).toBe("");
  });

  it("detects dirty state when username changes", () => {
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG,
        onSave: vi.fn(),
      }),
    );
    const usernameInput = screen.getByTestId("git-username");
    fireEvent.change(usernameInput, { target: { value: "changed" } });
    const btn = screen.getByTestId("git-config-save") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("preserves code and infra patterns on save", async () => {
    const configWithCodeInfra: GitConfig = {
      repoUrl: "https://github.com/org/repo.git",
      branch: "main",
      pathPatterns: {
        dsl: ["src/**/*.ts"],
        code: ["src/**/*.cs", "src/**/*.java"],
        infra: ["k8s/**/*.yaml"],
      },
      providerConfig: { type: "direct", username: "u", password: "p" },
    };
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      React.createElement(GitConfigForm, {
        config: configWithCodeInfra,
        onSave,
      }),
    );
    // Change branch to make form dirty
    const branchInput = screen.getByTestId("git-branch");
    fireEvent.change(branchInput, { target: { value: "develop" } });

    const form = screen.getByTestId("git-config-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          pathPatterns: {
            dsl: ["src/**/*.ts"],
            code: ["src/**/*.cs", "src/**/*.java"],
            infra: ["k8s/**/*.yaml"],
          },
        }),
      );
    });
  });

  it("detects dirty state when password changes", () => {
    render(
      React.createElement(GitConfigForm, {
        config: SAMPLE_CONFIG,
        onSave: vi.fn(),
      }),
    );
    const passwordInput = screen.getByTestId("git-password");
    fireEvent.change(passwordInput, { target: { value: "newpass" } });
    const btn = screen.getByTestId("git-config-save") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
