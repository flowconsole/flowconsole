import { Fragment, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { type SidebarNavItem } from "@/types";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import { Button } from "@flowconsole/ui/components/ui/button";
import { FlowConsoleBrand } from "@flowconsole/ui/components/ui/flowconsole-brand";
import { ScrollArea } from "@flowconsole/ui/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@flowconsole/ui/components/ui/tooltip";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  ArrowLeft,
  BookOpen,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams as useRRSearchParams } from "react-router-dom";

import { getModelSidebarLinks, homeSidebarLinks } from "@/config/dashboard";
import { useGetModelQuery } from "@/lib/api/rtk";
import { buildWebsiteUrl } from "@/lib/config/urls";
import { cn } from "@/lib/utils";
import { useActiveModel, useActiveProject } from "@/hooks/use-active-model";
// Inline imports to avoid circular deps — lazy-loaded from layout module
import { LocaleToggle as LocaleToggleInline } from "@/components/layout/locale-toggle";
import { ModeToggle as ModeToggleInline } from "@/components/layout/mode-toggle";
import { UserAccountNav as UserAccountNavInline } from "@/components/layout/user-account-nav";

type BackLink = { href: string; label: string };

function useSidebarLinks() {
  const { t } = useTranslation("nav");
  const activeModel = useActiveModel();
  const activeProject = useActiveProject();
  const { data: modelData } = useGetModelQuery(
    activeModel ? { id: activeModel.modelId } : skipToken,
  );

  return useMemo(() => {
    if (activeModel) {
      const backLink: BackLink = modelData?.projectId
        ? { href: `/projects/${modelData.projectId}`, label: t("nav:projects") }
        : { href: "/projects", label: t("nav:projects") };
      return {
        links: getModelSidebarLinks(activeModel.modelId, t),
        backLink,
      };
    }
    return { links: homeSidebarLinks(t), backLink: null as BackLink | null };
  }, [activeModel, activeProject, modelData?.projectId, t]);
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

function SidebarNav({
  links,
  backLink,
  isSidebarExpanded,
  path,
  searchParams,
}: {
  links: SidebarNavItem[];
  backLink: BackLink | null;
  isSidebarExpanded: boolean;
  path: string;
  searchParams: URLSearchParams;
}) {
  return (
    <>
      {backLink && (
        <div className="flex flex-col gap-2">
          <Link
            href={backLink.href}
            className={cn(
              "flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              !isSidebarExpanded && "justify-center",
            )}
          >
            <ArrowLeft className="size-4 shrink-0" />
            {isSidebarExpanded && <span>{backLink.label}</span>}
          </Link>
        </div>
      )}

      {links.map((section) => (
        <section key={section.title} className="flex flex-col gap-0.5">
          {isSidebarExpanded ? (
            <p className="text-xs text-muted-foreground">{section.title}</p>
          ) : (
            <div className="h-4" />
          )}
          {section.items
            .filter((item) => !item.hidden)
            .map((item) => {
              const Icon = Icons[item.icon || "arrowRight"];
              const active = isLinkActive(path, searchParams, item.href);
              const tooltipLabel = item.disabled
                ? `${item.title} — Coming soon`
                : item.title;
              return (
                item.href && (
                  <Fragment key={`link-fragment-${item.title}`}>
                    {isSidebarExpanded ? (
                      <Link
                        href={item.href}
                        aria-disabled={item.disabled}
                        onClick={
                          item.disabled ? (e) => e.preventDefault() : undefined
                        }
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
                        {item.badgeText && (
                          <Badge
                            variant="outline"
                            className="ml-auto px-1.5 py-0 text-[10px]"
                          >
                            {item.badgeText}
                          </Badge>
                        )}
                      </Link>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            aria-disabled={item.disabled}
                            onClick={
                              item.disabled
                                ? (e) => e.preventDefault()
                                : undefined
                            }
                            className={cn(
                              "flex items-center gap-3 rounded-md py-2 text-sm font-medium hover:bg-muted",
                              active
                                ? "bg-muted"
                                : "text-muted-foreground hover:text-accent-foreground",
                              item.disabled &&
                                "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground",
                            )}
                          >
                            <span className="flex size-full items-center justify-center">
                              <Icon className="size-5" />
                            </span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {tooltipLabel}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </Fragment>
                )
              );
            })}
        </section>
      ))}
    </>
  );
}

function SidebarUtilityDock({
  isSidebarExpanded,
}: {
  isSidebarExpanded: boolean;
}) {
  return (
    <div
      className={cn("border-t px-3 py-4", isSidebarExpanded ? "mx-4" : "mx-2")}
    >
      <div
        className={cn(
          "flex gap-2",
          isSidebarExpanded
            ? "items-center justify-start"
            : "flex-col items-center",
        )}
      >
        <ModeToggleInline />
        <LocaleToggleInline />
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={buildWebsiteUrl("/docs")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 px-0"
                aria-label="Documentation"
              >
                <BookOpen className="size-4" />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">Docs</TooltipContent>
        </Tooltip>
        <UserAccountNavInline />
      </div>
    </div>
  );
}

export function NavigationRail({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = usePathname();
  const [searchParams] = useRRSearchParams();
  const { links, backLink } = useSidebarLinks();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="sticky top-0 h-full">
        <ScrollArea className="h-full overflow-y-auto border-r">
          <aside
            className={cn(
              collapsed ? "w-[68px]" : "w-[220px]",
              "hidden h-screen transition-[width] duration-200 md:block",
            )}
          >
            <div className="flex h-full max-h-screen flex-1 flex-col gap-2">
              <div className="flex h-14 items-center p-4 lg:h-[60px]">
                <FlowConsoleBrand showText={!collapsed} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-9 lg:size-8"
                  onClick={onToggle}
                >
                  {collapsed ? (
                    <PanelRightClose
                      size={18}
                      className="stroke-muted-foreground"
                    />
                  ) : (
                    <PanelLeftClose
                      size={18}
                      className="stroke-muted-foreground"
                    />
                  )}
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </div>

              <nav className="flex flex-1 flex-col gap-8 px-4 pt-4">
                <SidebarNav
                  links={links}
                  backLink={backLink}
                  isSidebarExpanded={!collapsed}
                  path={path}
                  searchParams={searchParams}
                />
              </nav>

              <div className="mt-auto">
                <SidebarUtilityDock isSidebarExpanded={!collapsed} />
              </div>
            </div>
          </aside>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
