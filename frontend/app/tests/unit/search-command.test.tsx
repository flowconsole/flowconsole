// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard", search: "", hash: "" }),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
    React.createElement("a", { href: String(to), ...rest }, children),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("@/hooks/use-active-model", () => ({
  useActiveModel: () => null,
}));

vi.mock("@/config/dashboard", () => ({
  quickActions: [],
  getModelSidebarLinks: () => [],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => {
    if (key === "noResults") return "No results";
    if (key === "placeholder") return "Search...";
    return key;
  } }),
}));

vi.mock("@/components/shared/icons", () => ({
  Icons: new Proxy(
    {},
    {
      get: () => (props: Record<string, unknown>) =>
        React.createElement("span", { "data-testid": "search-icon", className: props.className }),
    },
  ),
}));

vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (open ? React.createElement("div", { "data-testid": "command-dialog" }, children) : null),
  CommandEmpty: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading: string;
  }) => React.createElement("section", { "data-heading": heading }, children),
  CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", props),
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => React.createElement("button", { onClick: onSelect }, children),
  CommandList: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  CommandSeparator: () => React.createElement("hr", { "data-testid": "command-separator" }),
}));

import { SearchCommand } from "@/components/dashboard/search-command";

describe("SearchCommand", () => {
  it("uses Search... for the top trigger and dialog placeholder", () => {
    render(
      <SearchCommand
        links={[
          {
            title: "Workspace",
            items: [{ title: "Workbench", href: "/dashboard/workbench", icon: "search" }],
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /search/i });
    expect(trigger.textContent).toContain("Search...");

    fireEvent.click(trigger);

    expect(screen.getByTestId("command-dialog")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search...")).toBeTruthy();
  });
});
