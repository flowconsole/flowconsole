import React from "react";
import { useRouter } from "@/i18n/navigation";
import { SidebarNavItem } from "@/types";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@flowconsole/ui/components/ui/command";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import { getModelSidebarLinks, quickActions } from "@/config/dashboard";
import { cn } from "@/lib/utils";
import { useActiveModel } from "@/hooks/use-active-model";

export function SearchCommand({ links }: { links: SidebarNavItem[] }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { t } = useTranslation("search");
  const { setTheme, theme } = useTheme();
  const activeModel = useActiveModel();

  const allLinks = React.useMemo(() => {
    if (!activeModel) return links;
    return [...links, ...getModelSidebarLinks(activeModel.modelId, t)];
  }, [links, activeModel, t]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const handleQuickAction = React.useCallback(
    (actionId: string) => {
      switch (actionId) {
        case "switch-theme":
          setTheme(theme === "dark" ? "light" : "dark");
          break;
        case "open-settings":
          router.push("/dashboard/settings");
          break;
        case "open-docs":
          router.push("/docs");
          break;
        case "new-project":
          router.push("/projects");
          break;
      }
    },
    [router, setTheme, theme],
  );

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-72",
        )}
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.45rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">&#x2318;</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>

          {allLinks
            .filter((section) => section.items.some((item) => !item.disabled))
            .map((section) => (
              <CommandGroup key={section.title} heading={section.title}>
                {section.items
                  .filter((item) => !item.disabled)
                  .map((item) => {
                    const Icon = Icons[item.icon || "arrowRight"];
                    return (
                      <CommandItem
                        key={item.title}
                        onSelect={() => {
                          runCommand(() => router.push(item.href as string));
                        }}
                      >
                        <Icon className="mr-2 size-5" />
                        {item.title}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            ))}

          <CommandSeparator />

          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => {
              const Icon = Icons[action.icon];
              return (
                <CommandItem
                  key={action.id}
                  onSelect={() => {
                    runCommand(() => handleQuickAction(action.id));
                  }}
                  keywords={action.keywords}
                >
                  <Icon className="mr-2 size-5" />
                  {action.title}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
