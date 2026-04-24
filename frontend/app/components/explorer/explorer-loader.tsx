
import { Skeleton } from "@flowconsole/ui/components/ui/skeleton";

export function ExplorerLoader() {
  return (
    <div className="flex size-full flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-14" />
          ))}
        </div>
      </div>
      {/* Canvas skeleton */}
      <div className="relative flex-1">
        <Skeleton className="size-full rounded-none" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
        </div>
      </div>
    </div>
  );
}
