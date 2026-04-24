/**
 * Feature-local UI types for the scan feature.
 *
 * These types are UI-only presentation models. The generated RTK/OpenAPI types
 * in `lib/api/rtk/lifecycle.generated.ts` are the source of truth for the
 * backend contract.
 */

export type UiScanType = "CodeScan" | "InfraScan" | "Git";

export type UiCodeScannerType = "csharp";

export type UiInfraScannerType = "helm";

export type UiScannerType = UiCodeScannerType | UiInfraScannerType;

export const SUPPORTED_CODE_SCANNERS_V1: readonly UiCodeScannerType[] = [
  "csharp",
] as const;

export const SUPPORTED_INFRA_SCANNERS_V1: readonly UiInfraScannerType[] = [
  "helm",
] as const;

export type UiScanOperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface UiScanError {
  message: string;
  file?: string;
  line?: number;
  source?: string;
}

export interface UiScanRecord {
  id: string;
  modelId: string;
  scanType: UiScanType;
  scannerType: string;
  status: UiScanOperationStatus;
  startedAt: string | null;
  completedAt: string | null;
  path: string | null;
  affectedElementsCount: number | null;
  errors: UiScanError[];
  isLocked: boolean;
  isStale: boolean;
}

/** Scan types that can be launched via the scan UI (excludes Git which uses sync API) */
export type LaunchableScanType = "CodeScan" | "InfraScan";

export interface ScanLauncherFormState {
  scanType: LaunchableScanType;
  scannerType: UiScannerType;
  path: string;
}
