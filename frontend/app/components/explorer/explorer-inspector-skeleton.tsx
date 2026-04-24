import { ScrollArea } from "@flowconsole/ui/components/ui/scroll-area";
import { Separator } from "@flowconsole/ui/components/ui/separator";
import { Skeleton } from "@flowconsole/ui/components/ui/skeleton";

/**
 * Loading skeleton for the element inspector panel.
 * Mirrors: section header, title/subtitle, separator, property rows.
 */
export function ExplorerInspectorSkeleton() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Section label + name */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>

        <Separator />

        {/* Meta fields: source, type */}
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>

        <Separator />

        {/* Properties section */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
