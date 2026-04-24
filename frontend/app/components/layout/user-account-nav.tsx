import { useState } from "react";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flowconsole/ui/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Drawer as DrawerPrimitive } from "vaul";

import { clearTokens } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth";
import { useMediaQuery } from "@/hooks/use-media-query";

// React 19 compat: cast vaul Drawer components to include children/className
const DrawerRoot = DrawerPrimitive.Root as React.ComponentType<
  React.ComponentProps<typeof DrawerPrimitive.Root> & {
    children?: React.ReactNode;
  }
>;
const DrawerPortal = DrawerPrimitive.Portal as React.ComponentType<
  React.ComponentProps<typeof DrawerPrimitive.Portal> & {
    children?: React.ReactNode;
  }
>;
const DrawerOverlay = DrawerPrimitive.Overlay as React.ComponentType<{
  className?: string;
  onClick?: () => void;
}>;
const DrawerTrigger = DrawerPrimitive.Trigger as React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  asChild?: boolean;
}>;
const DrawerContent = DrawerPrimitive.Content as React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;
const Drawer = {
  Root: DrawerRoot,
  Portal: DrawerPortal,
  Overlay: DrawerOverlay,
  Trigger: DrawerTrigger,
  Content: DrawerContent,
};

const ACCOUNT_ICON_MAP = {
  settings: Settings,
} as const;

type AccountLink = {
  href: string;
  icon: keyof typeof ACCOUNT_ICON_MAP;
  label: string;
  adminOnly?: boolean;
  /** True for links that navigate outside the SPA (e.g. to the marketing website) */
  external?: boolean;
};

const ACCOUNT_LINKS: AccountLink[] = [
  { href: "/dashboard/settings", icon: "settings", label: "settings" },
];

const AccountTriggerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="ghost"
    size="sm"
    className="size-8 px-0"
    aria-label="Open account menu"
    {...props}
  >
    <User className="size-4" />
  </Button>
));
AccountTriggerButton.displayName = "AccountTriggerButton";

export function UserAccountNav() {
  const { user } = useAuth();
  const { t } = useTranslation("userAccountNav");

  const [open, setOpen] = useState(false);
  const closeDrawer = () => setOpen(false);

  const { isMobile } = useMediaQuery();

  if (!user)
    return (
      <div className="size-8 animate-pulse rounded-full border bg-muted" />
    );

  const visibleLinks = ACCOUNT_LINKS.filter(
    (link) => !link.adminOnly || user.role === "admin",
  );

  if (isMobile) {
    return (
      <Drawer.Root open={open} onClose={closeDrawer}>
        <Drawer.Trigger asChild>
          <AccountTriggerButton onClick={() => setOpen(true)} />
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay
            className="fixed inset-0 z-40 h-full bg-background/80 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 overflow-hidden rounded-t-[10px] border bg-background px-3 text-sm">
            <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-inherit">
              <div className="my-3 h-1.5 w-16 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col">
                {user.name && <p className="font-medium">{user.name}</p>}
                {user.email && (
                  <p className="w-[200px] truncate text-muted-foreground">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            <ul role="list" className="mb-14 mt-1 w-full text-muted-foreground">
              {visibleLinks.map((link) => {
                const Icon = ACCOUNT_ICON_MAP[link.icon];
                const linkContent = (
                  <>
                    <Icon className="size-4" />
                    <p className="text-sm">{t(link.label)}</p>
                  </>
                );
                return (
                  <li
                    key={link.href}
                    className="rounded-lg text-foreground hover:bg-muted"
                  >
                    {link.external ? (
                      <a
                        href={link.href}
                        onClick={closeDrawer}
                        className="flex w-full items-center gap-3 px-2.5 py-2"
                      >
                        {linkContent}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={closeDrawer}
                        className="flex w-full items-center gap-3 px-2.5 py-2"
                      >
                        {linkContent}
                      </Link>
                    )}
                  </li>
                );
              })}

              <li
                className="rounded-lg text-foreground hover:bg-muted"
                onClick={(event) => {
                  event.preventDefault();
                  clearTokens();
                  window.location.href = "/login";
                }}
              >
                <div className="flex w-full items-center gap-3 px-2.5 py-2">
                  <LogOut className="size-4" />
                  <p className="text-sm">{t("logOut")}</p>
                </div>
              </li>
            </ul>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <AccountTriggerButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user.name && <p className="font-medium">{user.name}</p>}
            {user.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        {visibleLinks.map((link) => {
          const Icon = ACCOUNT_ICON_MAP[link.icon];
          return (
            <DropdownMenuItem key={link.href} asChild>
              {link.external ? (
                <a href={link.href} className="flex items-center space-x-2.5">
                  <Icon className="size-4" />
                  <p className="text-sm">{t(link.label)}</p>
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="flex items-center space-x-2.5"
                >
                  <Icon className="size-4" />
                  <p className="text-sm">{t(link.label)}</p>
                </Link>
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(event) => {
            event.preventDefault();
            clearTokens();
            window.location.href = "/";
          }}
        >
          <div className="flex items-center space-x-2.5">
            <LogOut className="size-4" />
            <p className="text-sm">{t("logOut")}</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
