import { useState } from "react";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  GitBranch,
  Loader2,
  RefreshCw,
  Server,
  X,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type {
  UiScanOperationStatus as ScanOperationStatus,
  UiScanRecord as ScanRecord,
  UiScanType as ScanType,
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

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scanTypeIcon(scanType: ScanType) {
  switch (scanType) {
    case "CodeScan":
      return (
        <Code2
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      );
    case "Git":
      return (
        <GitBranch
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      );
    case "InfraScan":
      return (
        <Server
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      );
  }
}

export interface ScanListFilters {
  status?: ScanOperationStatus | "all";
  scanType?: ScanType | "all";
  scanner?: string | "all";
}

interface ScanFiltersBarProps {
  filters: ScanListFilters;
  onChange: (filters: ScanListFilters) => void;
}

const STATUS_OPTIONS: Array<{
  value: ScanOperationStatus | "all";
  labelKey: string;
}> = [
  { value: "all", labelKey: "filterAll" },
  { value: "pending", labelKey: "statusPending" },
  { value: "running", labelKey: "statusRunning" },
  { value: "completed", labelKey: "statusCompleted" },
  { value: "failed", labelKey: "statusFailed" },
  { value: "cancelled", labelKey: "statusCancelled" },
];

function ScanFiltersBar({ filters, onChange }: ScanFiltersBarProps) {
  const { t } = useTranslation("scans");
  const activeStatus = filters.status ?? "all";
  const activeScanType = filters.scanType ?? "all";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="scan-filters"
    >
      {/* Status pills */}
      <div className="flex flex-wrap gap-1" data-testid="scan-status-filter">
        {STATUS_OPTIONS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange({ ...filters, status: value })}
            data-testid={`scan-filter-status-${value}`}
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs transition-colors",
              activeStatus === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Type pills */}
      <div className="flex gap-1" data-testid="scan-type-filter">
        {(["all", "CodeScan", "InfraScan"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange({ ...filters, scanType: type })}
            data-testid={`scan-filter-type-${type}`}
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs transition-colors",
              activeScanType === type
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {type === "all"
              ? t("filterAll")
              : t(type === "CodeScan" ? "scanTypeCode" : "scanTypeInfra")}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ScanRowProps {
  record: ScanRecord;
  expanded: boolean;
  onToggle: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (record: ScanRecord) => void;
  onOpenDetail: (record: ScanRecord) => void;
}

function ScanRow({
  record,
  expanded,
  onToggle,
  onCancel,
  onRetry,
  onOpenDetail,
}: ScanRowProps) {
  const { t } = useTranslation("scans");

  const canCancel = record.status === "pending" || record.status === "running";
  const canRetry = record.status === "failed";
  const hasDetail = record.status === "completed" || record.status === "failed";

  const statusLabelKey: Record<ScanOperationStatus, string> = {
    pending: "statusPending",
    running: "statusRunning",
    completed: "statusCompleted",
    failed: "statusFailed",
    cancelled: "statusCancelled",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        record.status === "failed" && "border-destructive/40 bg-destructive/5",
        record.status === "running" && "border-blue-500/40 bg-blue-500/5",
        record.isStale && "opacity-60",
      )}
      data-testid={`scan-row-${record.status}`}
    >
      <div className="flex items-center gap-2">
        {statusIcon(record.status)}
        {scanTypeIcon(record.scanType)}
        <span className="font-mono text-xs text-muted-foreground">
          {record.scannerType}
        </span>
        <span className="flex-1 truncate text-sm font-medium">
          {t(statusLabelKey[record.status])}
        </span>
        {record.affectedElementsCount !== null &&
          record.status === "completed" && (
            <span
              className="shrink-0 text-xs text-muted-foreground"
              data-testid="scan-element-count"
            >
              {t("affectedElements", { count: record.affectedElementsCount })}
            </span>
          )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatTimestamp(record.startedAt)}
        </span>

        {/* Action buttons */}
        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(record.id)}
            aria-label={t("cancelScan")}
            className="ml-1 flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="scan-cancel-button"
          >
            <X className="size-3.5" />
          </button>
        )}
        {canRetry && (
          <button
            type="button"
            onClick={() => onRetry(record)}
            aria-label={t("retryScan")}
            className="ml-1 flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="scan-retry-button"
          >
            <RefreshCw className="size-3.5" />
          </button>
        )}

        {/* Expand / detail */}
        {hasDetail && (
          <button
            type="button"
            onClick={() => onToggle(record.id)}
            aria-expanded={expanded}
            aria-label={expanded ? t("collapseRow") : t("expandRow")}
            className="ml-1 flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="scan-row-toggle"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Expanded summary */}
      {expanded && hasDetail && (
        <div className="mt-2 space-y-1 pl-6 text-xs text-muted-foreground">
          {record.path && (
            <p data-testid="scan-scope">
              {t("path")}: <span className="font-mono">{record.path}</span>
            </p>
          )}
          {record.completedAt && (
            <p data-testid="scan-completed-at">
              {t("completedAt")}: {formatTimestamp(record.completedAt)}
            </p>
          )}
          {record.errors.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenDetail(record)}
              className="mt-1 flex items-center gap-1 text-destructive hover:underline focus-visible:outline-none"
              data-testid="scan-open-detail"
            >
              <AlertTriangle className="size-3" />
              {t("openErrors", { count: record.errors.length })}
            </button>
          )}
          {record.isStale && (
            <p
              className="text-amber-600 dark:text-amber-400"
              data-testid="scan-stale-message"
            >
              {t("staleMessage")}
            </p>
          )}
          {record.isLocked && (
            <p
              className="text-amber-600 dark:text-amber-400"
              data-testid="scan-locked-row-message"
            >
              {t("lockedMessage")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface ScanListProps {
  records: ScanRecord[];
  onCancel: (id: string) => void;
  onRetry: (record: ScanRecord) => void;
  onOpenDetail: (record: ScanRecord) => void;
  className?: string;
}

/**
 * Filterable chronological list of scan records.
 * Covers: status filters, type filters, expand/collapse, cancel/retry controls.
 */
export function ScanList({
  records,
  onCancel,
  onRetry,
  onOpenDetail,
  className,
}: ScanListProps) {
  const { t } = useTranslation("scans");
  const [filters, setFilters] = useState<ScanListFilters>({
    status: "all",
    scanType: "all",
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = records.filter((r) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      r.status !== filters.status
    )
      return false;
    if (
      filters.scanType &&
      filters.scanType !== "all" &&
      r.scanType !== filters.scanType
    )
      return false;
    return true;
  });

  return (
    <div className={cn("space-y-3", className)} data-testid="scan-list">
      <ScanFiltersBar filters={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground"
          data-testid="scan-list-empty"
        >
          <Code2 className="mb-2 size-8 opacity-40" />
          <p className="font-medium">{t("noScansTitle")}</p>
          <p className="mt-1 text-xs">{t("noScansDescription")}</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="scan-list-items">
          {filtered.map((record) => (
            <ScanRow
              key={record.id}
              record={record}
              expanded={expandedIds.has(record.id)}
              onToggle={handleToggle}
              onCancel={onCancel}
              onRetry={onRetry}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
