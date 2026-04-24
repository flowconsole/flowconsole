
import { cn } from "@/lib/utils";
import { ScrollArea } from "@flowconsole/ui/components/ui/scroll-area";

export function InspectorPanel({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children?: React.ReactNode;
}) {
  if (collapsed) return null;

  return (
    <aside
      className={cn(
        "hidden w-[280px] shrink-0 border-l bg-background md:block lg:w-[320px]",
      )}
    >
      <ScrollArea className="h-full">
        <div className="p-4">
          {children ?? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
              <p>No selection</p>
              <p className="mt-1 text-xs">
                Select an element to view its details
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
