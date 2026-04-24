
import { cn } from "@/lib/utils";
import type { ProjectEvent } from "@/lib/realtime/types";

type Props = {
  /** Recent project events to derive active job state from. */
  events?: ProjectEvent[];
  /** Direct override: show the cue when true. */
  isActive?: boolean;
  /** Label to display. Defaults to context-derived label. */
  label?: string;
  className?: string;
};

/**
 * Returns true when the event stream contains an active scan
 * (ScanStarted with no subsequent ScanCompleted or ScanFailed).
 * Events are ordered newest-first.
 */
function hasActiveScan(events: ProjectEvent[]): boolean {
  const startIdx = events.findIndex((e) => e.type === "ScanStarted");
  if (startIdx === -1) return false;
  // Events before startIdx are newer — check if scan has already finished
  const hasEnd = events
    .slice(0, startIdx)
    .some((e) => e.type === "ScanCompleted" || e.type === "ScanFailed");
  return !hasEnd;
}

/**
 * Non-intrusive live cue for in-progress background jobs.
 * Renders only when there is an active job, disappears when done.
 * Can be driven by a ProjectEvent[] stream or a direct isActive boolean.
 */
export function ActiveJobsCue({ events = [], isActive, label, className }: Props) {
  const active = isActive ?? hasActiveScan(events);

  if (!active) return null;

  const displayLabel = label ?? (hasActiveScan(events) ? "Scan in progress…" : "Job in progress…");

  return (
    <div
      data-testid="active-jobs-cue"
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
        className,
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full bg-sky-500 animate-pulse"
        aria-hidden="true"
      />
      <span data-testid="active-jobs-label">{displayLabel}</span>
    </div>
  );
}
