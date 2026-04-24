import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@flowconsole/ui/components/ui/tooltip";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { cn } from "@/lib/utils";

export function CommandBar({
  searchSlot,
  mobileNavSlot,
  inspectorCollapsed,
  onToggleInspector,
}: {
  searchSlot: React.ReactNode;
  mobileNavSlot: React.ReactNode;
  inspectorCollapsed: boolean;
  onToggleInspector: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-x-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-[60px]">
      {mobileNavSlot}

      <div className="flex-1" />

      <TooltipProvider delayDuration={0}>
        <Tooltip>
          {false && (
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("hidden size-9 md:inline-flex")}
                onClick={onToggleInspector}
                aria-label="Toggle inspector panel"
              >
                {inspectorCollapsed ? (
                  <PanelRightOpen
                    size={18}
                    className="stroke-muted-foreground"
                  />
                ) : (
                  <PanelRightClose
                    size={18}
                    className="stroke-muted-foreground"
                  />
                )}
              </Button>
            </TooltipTrigger>
          )}
          <TooltipContent>
            {inspectorCollapsed ? "Open inspector" : "Close inspector"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>
  );
}
