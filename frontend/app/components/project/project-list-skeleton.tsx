import { Card, CardHeader } from "@flowconsole/ui/components/ui/card";
import { Skeleton } from "@flowconsole/ui/components/ui/skeleton";

interface ProjectListSkeletonProps {
  count?: number;
}

/**
 * Loading skeleton for the project list grid.
 * Mirrors the ProjectCard layout: title + badge row, description line.
 */
export function ProjectListSkeleton({ count = 3 }: ProjectListSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-1 h-4 w-full max-w-[200px]" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
