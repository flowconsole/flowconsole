import { Badge } from "@flowconsole/ui/components/ui/badge";

import { cn } from "@/lib/utils";

export type SourceFreshness = "fresh" | "stale" | "syncing" | "unknown";
export type DriftStatus = "clean" | "drifted" | "unknown";
export type ValidationStatus = "passing" | "failing" | "unknown";

interface SourceFreshnessChipProps {
  status: SourceFreshness;
  className?: string;
}

export function SourceFreshnessChip({
  status,
  className,
}: SourceFreshnessChipProps) {
  const labels: Record<SourceFreshness, string> = {
    fresh: "Up to date",
    stale: "Stale",
    syncing: "Syncing",
    unknown: "Unknown",
  };
  const variants: Record<
    SourceFreshness,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    fresh: "default",
    stale: "destructive",
    syncing: "secondary",
    unknown: "outline",
  };
  return (
    <Badge
      variant={variants[status]}
      className={cn("text-[11px]", className)}
      data-testid={`source-freshness-${status}`}
    >
      {labels[status]}
    </Badge>
  );
}

interface DriftStatusChipProps {
  status: DriftStatus;
  className?: string;
}

export function DriftStatusChip({ status, className }: DriftStatusChipProps) {
  const labels: Record<DriftStatus, string> = {
    clean: "No drift",
    drifted: "Drift detected",
    unknown: "Drift unknown",
  };
  const variants: Record<
    DriftStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    clean: "secondary",
    drifted: "destructive",
    unknown: "outline",
  };
  return (
    <Badge
      variant={variants[status]}
      className={cn("text-[11px]", className)}
      data-testid={`drift-status-${status}`}
    >
      {labels[status]}
    </Badge>
  );
}

interface ValidationStatusChipProps {
  status: ValidationStatus;
  className?: string;
}

export function ValidationStatusChip({
  status,
  className,
}: ValidationStatusChipProps) {
  const labels: Record<ValidationStatus, string> = {
    passing: "Passing Validation",
    failing: "Failing Validation",
    unknown: "Not validated",
  };
  const variants: Record<
    ValidationStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    passing: "secondary",
    failing: "destructive",
    unknown: "outline",
  };
  return (
    <Badge
      variant={variants[status]}
      className={cn("text-[11px]", className)}
      data-testid={`validation-status-${status}`}
    >
      {labels[status]}
    </Badge>
  );
}
