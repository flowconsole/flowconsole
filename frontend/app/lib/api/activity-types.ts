/**
 * Activity feed types for the operational activity rail.
 *
 * The activity rail aggregates background jobs — sync, scan, IR load, and
 * graph rebuild — into a single chronological feed visible across workspace
 * pages without requiring navigation.
 */

export type ActivityJobType = "sync" | "scan" | "ir_load" | "graph_rebuild";

export type ActivityJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ActivityJobError {
  message: string;
  detail?: string;
}

export interface ActivityJob {
  /** Unique job identifier (same as the underlying SyncRecord/ScanRecord id). */
  id: string;
  modelId: string;
  type: ActivityJobType;
  /** Short human-readable label, e.g. "TypeScript scan", "Git sync". */
  label: string;
  status: ActivityJobStatus;
  startedAt: string | null;
  completedAt: string | null;
  /**
   * 0–100 progress for running jobs. Undefined when not applicable.
   * Currently a best-effort estimate (not streamed from backend).
   */
  progress?: number;
  /**
   * Brief correlation metadata, e.g. "3 files changed" or "42 elements".
   * Shown as secondary text on the job row.
   */
  correlationMeta?: string;
  /**
   * Deep link to the detail page for this job.
   * Undefined for jobs without a dedicated detail surface.
   */
  deepLink?: string;
  errors?: ActivityJobError[];
}

/** Helper: derive an ActivityJob from a SyncRecord. */
export function syncRecordToActivityJob(
  modelId: string,
  record: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    changedFiles: string[];
    errors: { message: string }[];
  },
): ActivityJob {
  const status = record.status as ActivityJobStatus;
  const changedCount = record.changedFiles?.length ?? 0;

  return {
    id: record.id,
    modelId,
    type: "sync",
    label: "Git sync",
    status,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    correlationMeta:
      status === "completed" && changedCount > 0
        ? `${changedCount} file${changedCount !== 1 ? "s" : ""} changed`
        : undefined,
    deepLink: `/models/${modelId}`,
    errors: record.errors?.map((e) => ({ message: e.message })),
  };
}

/** Helper: derive an ActivityJob from a ScanRecord. */
export function scanRecordToActivityJob(
  modelId: string,
  record: {
    id: string;
    scannerType: string;
    scanType: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    affectedElementsCount: number | null;
    errors: { message: string }[];
  },
): ActivityJob {
  const status = record.status as ActivityJobStatus;
  const count = record.affectedElementsCount;

  return {
    id: record.id,
    modelId,
    type: "scan",
    label: `${record.scannerType} scan`,
    status,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    correlationMeta:
      count != null
        ? `${count} element${count !== 1 ? "s" : ""} affected`
        : undefined,
    deepLink: `/models/${modelId}`,
    errors: record.errors?.map((e) => ({ message: e.message })),
  };
}

/**
 * Derive an ActivityJob from a BackendScanResponse.
 *
 * The backend stores both scans and syncs as ScanResponse records.
 * - scanType "Git" → Git sync
 * - scanType "CodeScan" / "InfraScan" → scan (scanner name from config.language or config.scannerType)
 */
export function backendScanToActivityJob(
  modelId: string,
  record: {
    id: string;
    scanType: string;
    status: string;
    config: Record<string, string>;
    errorMessage: string | null;
    startedAt: string | null;
    completedAt: string | null;
  },
): ActivityJob {
  const isSync = record.scanType === "Git";
  const status = record.status as ActivityJobStatus;
  const scannerName = record.config?.["language"] ?? record.config?.["scannerType"] ?? record.scanType;

  return {
    id: record.id,
    modelId,
    type: isSync ? "sync" : "scan",
    label: isSync ? "Git sync" : `${scannerName} scan`,
    status,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    deepLink: `/models/${modelId}`,
    errors: record.errorMessage
      ? [{ message: record.errorMessage }]
      : undefined,
  };
}
