import type { ProjectEvent, ProjectEventType } from "@/lib/realtime/types";
import { cn } from "@/lib/utils";

type Props = {
  events: ProjectEvent[];
  className?: string;
  maxVisible?: number;
};

type EventConfig = {
  label: string;
  colorClass: string;
  dotClass: string;
};

const EVENT_CONFIG: Record<ProjectEventType, EventConfig> = {
  DriftDetected: {
    label: "Drift detected",
    colorClass: "text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  ValidationFailed: {
    label: "Validation failed",
    colorClass: "text-red-700 dark:text-red-300",
    dotClass: "bg-red-500",
  },
  ValidationPassed: {
    label: "Validation passed",
    colorClass: "text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  ScanStarted: {
    label: "Scan started",
    colorClass: "text-sky-700 dark:text-sky-300",
    dotClass: "bg-sky-400 animate-pulse",
  },
  ScanCompleted: {
    label: "Scan completed",
    colorClass: "text-sky-700 dark:text-sky-300",
    dotClass: "bg-sky-500",
  },
  ScanFailed: {
    label: "Scan failed",
    colorClass: "text-red-700 dark:text-red-300",
    dotClass: "bg-red-500",
  },
  ImportCompleted: {
    label: "Import completed",
    colorClass: "text-violet-700 dark:text-violet-300",
    dotClass: "bg-violet-500",
  },
  MetricsComputed: {
    label: "Metrics computed",
    colorClass: "text-slate-700 dark:text-slate-300",
    dotClass: "bg-slate-500",
  },
  AdrViolationDetected: {
    label: "ADR violation",
    colorClass: "text-orange-700 dark:text-orange-300",
    dotClass: "bg-orange-500",
  },
};

function eventSummary(event: ProjectEvent): string {
  const base = EVENT_CONFIG[event.type]?.label ?? event.type;
  switch (event.type) {
    case "DriftDetected":
      return event.driftScore != null
        ? `${base}: score ${event.driftScore}`
        : base;
    case "ValidationFailed":
      return event.failCount != null
        ? `${base}: ${event.failCount} rule${event.failCount !== 1 ? "s" : ""}`
        : base;
    case "ScanFailed":
      return event.error ? `${base}: ${event.error}` : base;
    case "ImportCompleted":
      return event.format ? `${base} (${event.format})` : base;
    default:
      return base;
  }
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Activity feed of recent project-level realtime events.
 * Used in the activity rail and notification surfaces.
 */
export function ProjectEventFeed({
  events,
  className,
  maxVisible = 20,
}: Props) {
  const visible = events.slice(0, maxVisible);

  if (visible.length === 0) {
    return (
      <div
        data-testid="project-event-feed-empty"
        className={cn(
          "py-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No recent events
      </div>
    );
  }

  return (
    <ol
      data-testid="project-event-feed"
      aria-label="Project activity feed"
      className={cn("flex flex-col gap-1", className)}
    >
      {visible.map((event, idx) => {
        const config = EVENT_CONFIG[event.type];
        const importLink =
          event.type === "ImportCompleted" ? "/dashboard/imports" : null;
        return (
          <li
            key={`${event.type}-${event.occurredAt}-${idx}`}
            data-testid={`project-event-${event.type}`}
            className="flex items-start gap-2 py-1"
          >
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                config?.dotClass ?? "bg-slate-400",
              )}
              aria-hidden="true"
            />
            <span className={cn("flex-1 text-sm", config?.colorClass ?? "")}>
              {importLink ? (
                <a
                  href={importLink}
                  data-testid="import-event-link"
                  className="underline-offset-2 hover:underline"
                >
                  {eventSummary(event)}
                </a>
              ) : (
                eventSummary(event)
              )}
            </span>
            <time
              dateTime={event.occurredAt}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {formatTime(event.occurredAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
