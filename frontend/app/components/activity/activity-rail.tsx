import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@flowconsole/ui/components/ui/tooltip";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  ScanLine,
  Upload,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  ActivityJob,
  ActivityJobStatus,
  ActivityJobType,
} from "@/lib/api/activity-types";
import { cn } from "@/lib/utils";

// Status icon

function StatusIcon({
  status,
  className,
}: {
  status: ActivityJobStatus;
  className?: string;
}) {
  const base = cn("size-4 shrink-0", className);
  switch (status) {
    case "running":
      return <Loader2 className={cn(base, "animate-spin text-blue-500")} />;
    case "completed":
      return <CheckCircle2 className={cn(base, "text-green-500")} />;
    case "failed":
      return <XCircle className={cn(base, "text-destructive")} />;
    case "cancelled":
      return <Ban className={cn(base, "text-muted-foreground")} />;
    case "pending":
    default:
      return <Clock className={cn(base, "text-muted-foreground")} />;
  }
}

// Job type icon

function JobTypeIcon({
  type,
  className,
}: {
  type: ActivityJobType;
  className?: string;
}) {
  const base = cn("size-3.5 shrink-0 text-muted-foreground", className);
  switch (type) {
    case "sync":
      return <GitBranch className={base} />;
    case "scan":
      return <ScanLine className={base} />;
    case "ir_load":
      return <Upload className={base} />;
    case "graph_rebuild":
      return <Cpu className={base} />;
  }
}

// Progress bar

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-0.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-blue-500 transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// Relative time helper

function relativeTime(isoString: string | null): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Activity job row

function ActivityJobRow({ job }: { job: ActivityJob }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation("activityRail");
  const hasErrors = (job.errors?.length ?? 0) > 0;
  const timeStr = relativeTime(job.completedAt) || relativeTime(job.startedAt);

  return (
    <div
      className={cn(
        "flex flex-col rounded-md border px-3 py-2 text-xs transition-colors",
        job.status === "failed" && "border-destructive/40 bg-destructive/5",
        job.status === "running" && "border-blue-500/30 bg-blue-500/5",
        job.status === "completed" && "border-border bg-background",
        (job.status === "pending" || job.status === "cancelled") &&
          "border-border bg-muted/30",
      )}
      data-testid={`activity-job-row-${job.status}`}
    >
      {/* Main row */}
      <div className="flex items-center gap-2">
        <StatusIcon status={job.status} />
        <JobTypeIcon type={job.type} />
        <span
          className="min-w-0 flex-1 truncate font-medium"
          data-testid="activity-job-label"
        >
          {job.label}
        </span>

        {job.correlationMeta && (
          <span
            className="shrink-0 text-muted-foreground"
            data-testid="activity-job-meta"
          >
            {job.correlationMeta}
          </span>
        )}

        {timeStr && (
          <span
            className="shrink-0 text-muted-foreground"
            data-testid="activity-job-time"
          >
            {timeStr}
          </span>
        )}

        {job.deepLink && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={job.deepLink}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  data-testid="activity-job-deeplink"
                >
                  <ExternalLink className="size-3.5" />
                  <span className="sr-only">{t("openDetails")}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>{t("openDetails")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {(hasErrors || job.status === "failed") && (
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? t("collapseErrors") : t("expandErrors")}
            data-testid="activity-job-toggle"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Progress bar for running jobs */}
      {job.status === "running" && typeof job.progress === "number" && (
        <div className="mt-1.5" data-testid="activity-job-progress">
          <ProgressBar value={job.progress} />
        </div>
      )}

      {/* Error expansion */}
      {expanded && hasErrors && (
        <div
          className="mt-2 flex flex-col gap-1 border-t pt-2"
          data-testid="activity-job-errors"
        >
          {job.errors!.map((err, i) => (
            <p key={i} className="text-destructive">
              {err.message}
              {err.detail && (
                <span className="ml-1 text-muted-foreground">{err.detail}</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// Empty state

function ActivityRailEmpty() {
  const { t } = useTranslation("activityRail");
  return (
    <div
      className="flex flex-1 items-center justify-center py-2 text-xs text-muted-foreground"
      data-testid="activity-rail-empty"
    >
      {t("noActivity")}
    </div>
  );
}

// Summary badge — shows a count of active (pending + running) + failed jobs

function ActivitySummaryBadge({ jobs }: { jobs: ActivityJob[] }) {
  const active = jobs.filter(
    (j) => j.status === "running" || j.status === "pending",
  ).length;
  const failed = jobs.filter((j) => j.status === "failed").length;

  if (active === 0 && failed === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="activity-summary-badge"
    >
      {active > 0 && (
        <span className="flex items-center gap-0.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
          <Loader2 className="size-3 animate-spin" />
          {active}
        </span>
      )}
      {failed > 0 && (
        <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          <XCircle className="size-3" />
          {failed}
        </span>
      )}
    </div>
  );
}

// Main ActivityRail component

export interface ActivityRailProps {
  jobs: ActivityJob[];
  /** Maximum number of jobs shown in the expanded list. Default: 5. */
  maxVisible?: number;
  className?: string;
}

/**
 * Operational activity rail — a collapsible bottom strip that shows background
 * jobs (sync, scan, IR load, graph rebuild) in a single chronological feed.
 * Provides inline progress, failure expansion, and deep links to detail pages.
 * Rendered at the bottom of the workspace shell, visible across all model pages.
 */
export function ActivityRail({
  jobs,
  maxVisible = 5,
  className,
}: ActivityRailProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("activityRail");

  const visibleJobs = jobs.slice(0, maxVisible);
  const hasJobs = jobs.length > 0;

  return (
    <div
      className={cn(
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
      data-testid="activity-rail"
    >
      {/* Toggle strip */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t("hideRail") : t("showRail")}
        data-testid="activity-rail-toggle"
      >
        <RefreshCw className="size-3.5 shrink-0" />
        <span className="font-medium text-foreground">{t("heading")}</span>

        <ActivitySummaryBadge jobs={jobs} />

        <span className="ml-auto flex items-center gap-1">
          {hasJobs && (
            <span className="text-muted-foreground">
              {jobs.length} {jobs.length === 1 ? t("job") : t("jobs")}
            </span>
          )}
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronUp className="size-3.5" />
          )}
        </span>
      </button>

      {/* Expanded job list */}
      {open && (
        <div
          className="flex flex-col gap-2 border-t px-4 py-3"
          data-testid="activity-rail-content"
        >
          {hasJobs ? (
            <>
              {visibleJobs.map((job) => (
                <ActivityJobRow key={job.id} job={job} />
              ))}
              {jobs.length > maxVisible && (
                <p
                  className="text-center text-xs text-muted-foreground"
                  data-testid="activity-rail-overflow"
                >
                  {t("andMore", { count: jobs.length - maxVisible })}
                </p>
              )}
            </>
          ) : (
            <ActivityRailEmpty />
          )}
        </div>
      )}
    </div>
  );
}
