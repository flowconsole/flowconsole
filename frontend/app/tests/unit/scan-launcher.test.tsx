// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next-intl
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      scanType: "Scan Type",
      scanTypeCode: "Code",
      scanTypeInfra: "Infrastructure",
      scannerType: "Scanner",
      scanPath: "Path",
      scanPathPlaceholder: "src/ or leave empty",
      scanPathHint: "Optional directory path.",
      launchScan: "Launch Scan",
      launching: "Launching\u2026",
      launchError: "Failed to launch scan",
      scanLockedMessage: "A scan is already running.",
    };
    if (params) {
      return (map[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
    }
    return map[key] ?? key;
  } }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

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
      { onClick, disabled, type: type ?? "button", "data-testid": props["data-testid"] },
      children,
    ),
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

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", props),
}));

vi.mock("lucide-react", () => ({
  Play: () => React.createElement("span", { "data-icon": "play" }),
  Loader2: () => React.createElement("span", { "data-icon": "loader2" }),
  Code2: () => React.createElement("span", { "data-icon": "code2" }),
  Server: () => React.createElement("span", { "data-icon": "server" }),
}));

import { ScanLauncher } from "@/components/sources/scan-launcher";

describe("ScanLauncher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the launcher", () => {
    render(
      React.createElement(ScanLauncher, {
        onLaunch: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-launcher")).toBeTruthy();
  });

  it("shows code and infra type buttons", () => {
    render(
      React.createElement(ScanLauncher, {
        onLaunch: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scan-type-CodeScan")).toBeTruthy();
    expect(screen.getByTestId("scan-type-InfraScan")).toBeTruthy();
  });

  it("shows only csharp scanner by default (v1)", () => {
    render(
      React.createElement(ScanLauncher, {
        onLaunch: vi.fn(),
      }),
    );
    expect(screen.getByTestId("scanner-type-csharp")).toBeTruthy();
    expect(screen.queryByTestId("scanner-type-typescript")).toBeNull();
    expect(screen.queryByTestId("scanner-type-go")).toBeNull();
    expect(screen.queryByTestId("scanner-type-python")).toBeNull();
  });

  it("shows only helm scanner when infra type is selected (v1)", () => {
    render(
      React.createElement(ScanLauncher, {
        onLaunch: vi.fn(),
      }),
    );
    const infraBtn = screen.getByTestId("scan-type-InfraScan");
    fireEvent.click(infraBtn);
    expect(screen.getByTestId("scanner-type-helm")).toBeTruthy();
    expect(screen.queryByTestId("scanner-type-kubernetes")).toBeNull();
    expect(screen.queryByTestId("scanner-type-openapi")).toBeNull();
  });

  it("calls onLaunch with selected params when launch button clicked", async () => {
    const onLaunch = vi.fn().mockResolvedValue(undefined);
    render(
      React.createElement(ScanLauncher, {
        onLaunch,
      }),
    );
    const launchBtn = screen.getByTestId("scan-launch-button");
    fireEvent.click(launchBtn);
    await waitFor(() => {
      expect(onLaunch).toHaveBeenCalledWith(
        expect.objectContaining({
          scanType: "CodeScan",
          scannerType: "csharp",
          path: "",
        }),
      );
    });
  });

  it("shows locked message and disables launch when isRunning=true", () => {
    render(
      React.createElement(ScanLauncher, {
        onLaunch: vi.fn(),
        isRunning: true,
      }),
    );
    const launchBtn = screen.getByTestId("scan-launch-button") as HTMLButtonElement;
    expect(launchBtn.disabled).toBe(true);
    expect(screen.getByTestId("scan-locked-message")).toBeTruthy();
    expect(screen.getByText("A scan is already running.")).toBeTruthy();
  });

  it("shows error message when onLaunch rejects", async () => {
    const onLaunch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(
      React.createElement(ScanLauncher, {
        onLaunch,
      }),
    );
    const launchBtn = screen.getByTestId("scan-launch-button");
    fireEvent.click(launchBtn);
    await waitFor(() => {
      expect(screen.getByTestId("scan-launch-error")).toBeTruthy();
    });
  });

  it("passes path to onLaunch when set", async () => {
    const onLaunch = vi.fn().mockResolvedValue(undefined);
    render(
      React.createElement(ScanLauncher, {
        onLaunch,
      }),
    );
    const pathInput = screen.getByTestId("scan-path");
    fireEvent.change(pathInput, { target: { value: "src/" } });
    const launchBtn = screen.getByTestId("scan-launch-button");
    fireEvent.click(launchBtn);
    await waitFor(() => {
      expect(onLaunch).toHaveBeenCalledWith(
        expect.objectContaining({ path: "src/" }),
      );
    });
  });
});
