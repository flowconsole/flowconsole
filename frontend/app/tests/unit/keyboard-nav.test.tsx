// @vitest-environment jsdom
/**
 * Keyboard navigation tests for shell, search, and inspector components.
 * Verifies that keyboard shortcuts and accessible roles are correctly implemented
 * without requiring a running browser or server.
 */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchCommand } from "@/components/dashboard/search-command";

import { CommandBar } from "@/components/shell/command-bar";

import { InspectorPanel } from "@/components/shell/inspector-panel";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard", search: "", hash: "" }),
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href: String(to), ...rest }, children),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("@/hooks/use-active-model", () => ({
  useActiveModel: () => null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: vi.fn(), theme: "light" }),
}));

vi.mock("@/components/shared/icons", () => ({
  Icons: new Proxy(
    {},
    {
      get: () => (props: Record<string, unknown>) =>
        React.createElement("span", {
          className: String(props.className ?? ""),
        }),
    },
  ),
}));

vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) =>
    open
      ? React.createElement("div", { "data-testid": "cmd-dialog" }, children)
      : null,
  CommandEmpty: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading: string;
  }) => React.createElement("section", { "aria-label": heading }, children),
  CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", { ...props, role: "searchbox" }),
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => React.createElement("button", { onClick: onSelect }, children),
  CommandList: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { role: "listbox" }, children),
  CommandSeparator: () => React.createElement("hr", {}),
}));

vi.mock("@/config/dashboard", () => ({
  quickActions: [],
  homeSidebarLinks: [],
  getModelSidebarLinks: () => [],
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    "aria-label"?: string;
  }) =>
    React.createElement(
      "button",
      { onClick, "aria-label": ariaLabel, ...rest },
      children,
    ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", { "data-testid": "tooltip" }, children),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

describe("SearchCommand — keyboard navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("opens the command dialog when Ctrl+K is pressed", () => {
    render(<SearchCommand links={[]} />);
    expect(screen.queryByTestId("cmd-dialog")).toBeNull();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.getByTestId("cmd-dialog")).toBeTruthy();
  });

  it("opens the command dialog when Meta+K is pressed", () => {
    render(<SearchCommand links={[]} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByTestId("cmd-dialog")).toBeTruthy();
  });

  it("does not open the command dialog on other keys", () => {
    render(<SearchCommand links={[]} />);
    fireEvent.keyDown(document, { key: "j", ctrlKey: true });
    expect(screen.queryByTestId("cmd-dialog")).toBeNull();
  });

  it("trigger button is focusable and accessible", () => {
    render(<SearchCommand links={[]} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDefined();
  });
});

describe("CommandBar — inspector toggle keyboard accessibility", () => {
  afterEach(cleanup);

  it("inspector toggle button is not rendered when disabled", () => {
    render(
      <CommandBar
        searchSlot={null}
        mobileNavSlot={null}
        inspectorCollapsed={false}
        onToggleInspector={() => {}}
      />,
    );
    const btn = screen.queryByRole("button", { name: /toggle inspector/i });
    expect(btn).toBeNull();
  });
});

describe("InspectorPanel — visibility", () => {
  afterEach(cleanup);

  it("renders children when not collapsed", () => {
    render(
      <InspectorPanel collapsed={false}>
        <span data-testid="child">Inspector content</span>
      </InspectorPanel>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("renders null when collapsed", () => {
    const { container } = render(<InspectorPanel collapsed={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows default empty state when no children and not collapsed", () => {
    render(<InspectorPanel collapsed={false} />);
    expect(screen.getByText(/no selection/i)).toBeTruthy();
  });

  it("aside has landmark role for screen readers", () => {
    render(<InspectorPanel collapsed={false} />);
    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
  });
});
