import { Separator } from "@flowconsole/ui/components/ui/separator";
import { Skeleton } from "@flowconsole/ui/components/ui/skeleton";

/**
 * Loading skeleton for the model overview page.
 * Mirrors: header (name + status chips + action), tab strip, stats grid, diagram preview.
 */
export function ModelOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header: name + chips + button */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="ml-2 h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Tab strip */}
      <Skeleton className="h-9 w-48 rounded-md" />

      <Separator />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Diagram preview */}
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
