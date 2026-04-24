// @vitest-environment jsdom
/**
 * Unit tests for UserAuthForm — backend JWT auth mode.
 */
import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Module-level mocks ---

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

const mockAuthLogin = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    login: (...args: unknown[]) => mockAuthLogin(...args),
    state: "anonymous",
    user: null,
    isLoading: false,
    isAuthenticated: false,
    hasRole: () => false,
    logout: vi.fn(),
  }),
}));

const mockLogin = vi.fn();
const mockRegister = vi.fn();
vi.mock("@/lib/api/rtk", () => ({
  useLoginMutation: () => [
    (...args: unknown[]) => {
      const result = mockLogin(...args);
      return { unwrap: () => result };
    },
  ],
  useRegisterMutation: () => [
    (...args: unknown[]) => {
      const result = mockRegister(...args);
      return { unwrap: () => result };
    },
  ],
  toApiError: (error: unknown) => error,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/button", () => ({
  buttonVariants: () => "btn",
  Button: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("button", props, children),
}));

vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef(
    (
      {
        "data-testid": testId,
        ...props
      }: { "data-testid"?: string; [key: string]: unknown },
      ref: React.Ref<HTMLInputElement>,
    ) => React.createElement("input", { "data-testid": testId, ...props, ref }),
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("label", props, children),
}));

vi.mock("@/components/shared/icons", () => ({
  Icons: {
    spinner: () => React.createElement("span", { "data-testid": "spinner" }),
    logo: () => React.createElement("span", { "data-testid": "logo" }),
  },
}));

async function importForm() {
  const mod = await import("@/components/forms/user-auth-form");
  return mod.UserAuthForm;
}

describe("UserAuthForm — backend JWT auth mode (VITE_BACKEND_URL set)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_BACKEND_URL", "http://backend.test:5000");
    mockNavigate.mockClear();
    mockLogin.mockClear();
    mockRegister.mockClear();
    mockAuthLogin.mockClear();
    mockToastError.mockClear();
    mockToastSuccess.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls auth context login with accessToken and refreshToken on valid credentials", async () => {
    mockLogin.mockResolvedValueOnce({
      accessToken: "access-abc",
      refreshToken: "refresh-xyz",
      expiresIn: 3600,
    });

    const UserAuthForm = await importForm();
    render(React.createElement(UserAuthForm, { type: "login" }));

    await act(async () => {
      fireEvent.change(screen.getByTestId("email-input"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "secret123" },
      });
      fireEvent.click(screen.getByTestId("submit-button"));
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        loginRequest: {
          email: "user@example.com",
          password: "secret123",
        },
      });
      expect(mockAuthLogin).toHaveBeenCalledWith("access-abc", "refresh-xyz");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows invalidCredentials error toast on 401 and does NOT call login", async () => {
    const { ApiError } = await import("@/lib/api/error");
    mockLogin.mockRejectedValueOnce(
      new ApiError(401, { title: "Unauthorized", status: 401 }),
    );

    const UserAuthForm = await importForm();
    render(React.createElement(UserAuthForm, { type: "login" }));

    await act(async () => {
      fireEvent.change(screen.getByTestId("email-input"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "wrongpassword123" },
      });
      fireEvent.click(screen.getByTestId("submit-button"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "invalidCredentials",
        expect.objectContaining({
          description: "invalidCredentialsDescription",
        }),
      );
    });

    expect(mockAuthLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows generic error toast on non-401 errors", async () => {
    const { ApiError } = await import("@/lib/api/error");
    mockLogin.mockRejectedValueOnce(
      new ApiError(500, { title: "Internal Server Error", status: 500 }),
    );

    const UserAuthForm = await importForm();
    render(React.createElement(UserAuthForm, { type: "login" }));

    await act(async () => {
      fireEvent.change(screen.getByTestId("email-input"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByTestId("submit-button"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "signInError",
        expect.objectContaining({ description: "signInErrorDescription" }),
      );
    });

    expect(mockAuthLogin).not.toHaveBeenCalled();
  });

  it("calls register endpoint and auth context login when type is 'register'", async () => {
    mockRegister.mockResolvedValueOnce({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      expiresIn: 3600,
    });

    const UserAuthForm = await importForm();
    render(React.createElement(UserAuthForm, { type: "register" }));

    await act(async () => {
      fireEvent.change(screen.getByTestId("email-input"), {
        target: { value: "newuser@example.com" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(screen.getByTestId("submit-button"));
    });

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        registerRequest: {
          email: "newuser@example.com",
          password: "newpassword123",
        },
      });
      expect(mockAuthLogin).toHaveBeenCalledWith("access-new", "refresh-new");
    });
  });
});
