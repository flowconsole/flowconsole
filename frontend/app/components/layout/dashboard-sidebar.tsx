import { Suspense, useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { type SidebarNavItem } from "@/types";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import { Button } from "@flowconsole/ui/components/ui/button";
import { FlowConsoleBrand } from "@flowconsole/ui/components/ui/flowconsole-brand";
import { ScrollArea } from "@flowconsole/ui/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@flowconsole/ui/components/ui/sheet";
import { ArrowLeft, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams as useRRSearchParams } from "react-router-dom";

import { getModelSidebarLinks, homeSidebarLinks } from "@/config/dashboard";
import { cn } from "@/lib/utils";
import { useActiveModel } from "@/hooks/use-active-model";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { UserAccountNav } from "@/components/layout/user-account-nav";

function useSidebarLinks() {
  const { t } = useTranslation("nav");
  const activeModel = useActiveModel();

  return useMemo(() => {
    if (!activeModel) return { links: homeSidebarLinks(t), model: null };
    return {
      links: getModelSidebarLinks(activeModel.modelId, t),
      model: activeModel,
    };
  }, [activeModel, t]);
}

function isLinkActive(
  path: string,
  searchParams: URLSearchParams,
  href: string,
): boolean {
  const [hrefPath, hrefQuery] = href.split("?");
  if (path !== hrefPath && !path.startsWith(hrefPath + "/")) return false;
  if (!hrefQuery) return true;
  const hrefParams = new URLSearchParams(hrefQuery);
  for (const [key, value] of hrefParams) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

function MobileSidebarNav({
  links,
  model,
  path,
  searchParams,
}: {
  links: SidebarNavItem[];
  model: { modelId: string; modelTitle: string } | null;
  path: string;
  searchParams: URLSearchParams;
}) {
  return (
    <>
      {model && (
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span>Dashboard</span>
          </Link>
          <div className="rounded-md border bg-muted/50 px-3 py-2">
            <p className="text-sm font-semibold leading-tight">
              {model.modelTitle}
            </p>
          </div>
        </div>
      )}

      {links.map((section) => (
        <section key={section.title} className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">{section.title}</p>
          {section.items.map((item) => {
            const Icon = Icons[item.icon || "arrowRight"];
            const active = isLinkActive(path, searchParams, item.href);
            return (
              item.href && (
                <Link
                  key={`mobile-link-${item.title}`}
                  href={item.disabled ? "#" : item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted",
                    active
                      ? "bg-muted"
                      : "text-muted-foreground hover:text-accent-foreground",
                    item.disabled &&
                      "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {item.title}
                  {item.badge && (
                    <Badge className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            );
          })}
        </section>
      ))}
    </>
  );
}

function MobileSheetSidebarInner() {
  const path = usePathname();
  const [searchParams] = useRRSearchParams();
  const { links, model } = useSidebarLinks();
  const [open, setOpen] = useState(false);
  const { isSm, isMobile } = useMediaQuery();

  if (isSm || isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 md:hidden"
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <ScrollArea className="h-full overflow-y-auto">
            <div className="flex h-screen flex-col">
              <nav className="flex flex-1 flex-col gap-y-8 p-6 text-lg font-medium">
                <FlowConsoleBrand showText />

                <MobileSidebarNav
                  links={links}
                  model={model}
                  path={path}
                  searchParams={searchParams}
                />

                <div className="mt-auto border-t pt-4">
                  <div className="flex items-center gap-2">
                    <ModeToggle />
                    <UserAccountNav />
                  </div>
                </div>
              </nav>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex size-9 animate-pulse rounded-lg bg-muted md:hidden" />
  );
}

export function MobileSheetSidebar() {
  return (
    <Suspense
      fallback={<div className="flex size-9 rounded-lg bg-muted md:hidden" />}
    >
      <MobileSheetSidebarInner />
    </Suspense>
  );
}
