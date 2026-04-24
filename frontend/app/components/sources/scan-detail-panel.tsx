import { Button } from "@flowconsole/ui/components/ui/button";
import { ScrollArea } from "@flowconsole/ui/components/ui/scroll-area";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Code2,
  FileCode,
  GitBranch,
  Info,
  Loader2,
  RefreshCw,
  Server,
  X,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type {
  UiScanError as ScanError,
  UiScanOperationStatus as ScanOperationStatus,
  UiScanRecord as ScanRecord,
} from "./scan-types";

function statusIcon(status: ScanOperationStatus) {
  switch (status) {
    case "pending":
      return <Clock className="size-4 text-muted-foreground" aria-hidden />;
    case "running":
      return (
        <Loader2 className="size-4 animate-spin text-blue-500" aria-hidden />
      );
    case "completed":
      return <CheckCircle2 className="size-4 text-green-500" aria-hidden />;
    case "failed":
      return <XCircle className="size-4 text-destructive" aria-hidden />;
    case "cancelled":
      return <Ban className="size-4 text-muted-foreground" aria-hidden />;
  }
}

function errorIcon(error: ScanError) {
  if (error.source === "parse" || error.file) {
    return (
      <FileCode className="size-3.5 shrink-0 text-destructive" aria-hidden />
    );
  }
  return (
    <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-hidden />
  );
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface ScanDetailPanelProps {
  record: ScanRecord | null;
  onClose: () => void;
  onCancel: (id: string) => void;
  onRetry: (record: ScanRecord) => void;
  className?: string;
}

/**
 * Detail panel for a selected scan record.
 * Shows result summary, scope, affected elements, errors, and cancel/retry controls.
 * Also surfaces stale/locked scan messaging.
 */
export function ScanDetailPanel({
  record,
  onClose,
  onCancel,
  onRetry,
  className,
}: ScanDetailPanelProps) {
  const { t } = useTranslation("scans");

  if (!record) return null;

  const canCancel = record.status === "pending" || record.status === "running";
  const canRetry = record.status === "failed";
  const statusLabelKey: Record<ScanOperationStatus, string> = {
    pending: "statusPending",
    running: "statusRunning",
    completed: "statusCompleted",
    failed: "statusFailed",
    cancelled: "statusCancelled",
  };

  return (
    <div
      className={cn("flex flex-col rounded-lg border bg-background", className)}
      data-testid="scan-detail-panel"
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        {statusIcon(record.status)}
        <h3 className="flex-1 text-sm font-medium">{t("detailHeading")}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeDetail")}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          data-testid="scan-detail-close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Scan context */}
      <div className="shrink-0 space-y-1 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            {record.scanType === "CodeScan" ? (
              <Code2 className="size-3.5" aria-hidden />
            ) : record.scanType === "Git" ? (
              <GitBranch className="size-3.5" aria-hidden />
            ) : (
              <Server className="size-3.5" aria-hidden />
            )}
            <span data-testid="scan-detail-type">
              {t(
                record.scanType === "CodeScan"
                  ? "scanTypeCode"
                  : record.scanType === "Git"
                    ? "scanTypeSync"
                    : "scanTypeInfra",
              )}
            </span>
          </span>
          <span className="font-mono" data-testid="scan-detail-scanner">
            {record.scannerType}
          </span>
          <span data-testid="scan-detail-status" className="font-medium">
            {t(statusLabelKey[record.status])}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono" data-testid="scan-detail-id">
            {t("scanId")}: {record.id.slice(0, 8)}
          </span>
          {record.startedAt && (
            <span data-testid="scan-detail-started">
              {t("startedAt")}: {formatTimestamp(record.startedAt)}
            </span>
          )}
          {record.completedAt && (
            <span data-testid="scan-detail-completed">
              {t("completedAt")}: {formatTimestamp(record.completedAt)}
            </span>
          )}
        </div>
        {record.path && (
          <p data-testid="scan-detail-scope">
            {t("path")}: <span className="font-mono">{record.path}</span>
          </p>
        )}
      </div>

      {/* Result summary */}
      {record.status === "completed" && (
        <div
          className="shrink-0 border-b px-3 py-2 text-xs"
          data-testid="scan-detail-summary"
        >
          {record.affectedElementsCount !== null ? (
            <p className="text-foreground">
              {t("affectedElements", { count: record.affectedElementsCount })}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("noElementData")}</p>
          )}
        </div>
      )}

      {/* Stale / locked messaging */}
      {(record.isStale || record.isLocked) && (
        <div
          className="shrink-0 border-b bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
          data-testid="scan-detail-constraint-message"
        >
          {record.isLocked ? (
            <p data-testid="scan-detail-locked">{t("lockedMessage")}</p>
          ) : (
            <p data-testid="scan-detail-stale">{t("staleMessage")}</p>
          )}
          <p className="mt-0.5 text-[11px] opacity-80">
            {t("parallelConstraintHint")}
          </p>
        </div>
      )}

      {/* Error list */}
      <ScrollArea className="flex-1" data-testid="scan-detail-errors">
        {record.errors.length === 0 && record.status !== "failed" ? (
          <div className="flex items-center gap-1.5 px-3 py-4 text-sm text-muted-foreground">
            <Info className="size-4" />
            {record.status === "completed"
              ? t("noErrorsCompleted")
              : t("noErrorDetails")}
          </div>
        ) : record.errors.length === 0 && record.status === "failed" ? (
          <div className="flex items-center gap-1.5 px-3 py-4 text-sm text-muted-foreground">
            <Info className="size-4" />
            {t("noErrorDetails")}
          </div>
        ) : (
          <ul className="divide-y" data-testid="scan-error-list">
            {record.errors.map((err, idx) => (
              <li
                key={idx}
                className="flex gap-2.5 px-3 py-2.5"
                data-testid="scan-error-item"
              >
                {errorIcon(err)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{err.message}</p>
                  {(err.file || err.line) && (
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {err.file && <span>{err.file}</span>}
                      {err.line && <span className="ml-1">:{err.line}</span>}
                    </p>
                  )}
                  {err.source && (
                    <span className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {err.source}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      {/* Controls */}
      {(canCancel || canRetry) && (
        <div
          className="flex shrink-0 gap-2 border-t px-3 py-2"
          data-testid="scan-detail-controls"
        >
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(record.id)}
              data-testid="scan-detail-cancel"
            >
              <Ban className="mr-1.5 size-3.5" />
              {t("cancelScan")}
            </Button>
          )}
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(record)}
              data-testid="scan-detail-retry"
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              {t("retryScan")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
