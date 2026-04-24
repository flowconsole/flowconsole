import type { ScanLauncherFormState } from "@/components/sources/scan-types";

import { lifecycleGeneratedApi, type CreateScanRequest } from "./lifecycle.generated";

export function toCreateScanRequest(
  state: ScanLauncherFormState,
): CreateScanRequest {
  const config: Record<string, string> = {
    path: state.path,
  };

  if (state.scanType === "CodeScan") {
    config.language = state.scannerType;
  } else {
    config.scannerType = state.scannerType;
  }

  return {
    scanType: state.scanType,
    config,
  };
}

export const lifecycleApi = lifecycleGeneratedApi.enhanceEndpoints({
  addTagTypes: [
    "Scan",
    "ScanList",
    "Sync",
  ],
  endpoints: {
    listScans: {
      providesTags: (result, _error, arg) =>
        result
          ? [
              { type: "ScanList", id: arg.id },
              ...(result.items ?? []).map((scan) => ({
                type: "Scan" as const,
                id: scan.id,
              })),
            ]
          : [{ type: "ScanList", id: arg.id }],
    },
    getScan: {
      providesTags: (_result, _error, arg) => [{ type: "Scan", id: arg.scanId }],
    },
    createScan: {
      invalidatesTags: (_result, _error, arg) => [{ type: "ScanList", id: arg.id }],
    },
    cancelScan: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ScanList", id: arg.id },
        { type: "Scan", id: arg.scanId },
      ],
    },
    deleteScan: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ScanList", id: arg.id },
        { type: "Scan", id: arg.scanId },
      ],
    },
    createSync: {
      invalidatesTags: (_result, _error, arg) => [{ type: "ScanList", id: arg.id }],
    },
    getSync: {
      providesTags: (_result, _error, arg) => [{ type: "Sync", id: arg.syncId }],
    },
  },
});

export const {
  useLoadModelSnapshotMutation,
  useExportModelSnapshotQuery,
  useLazyExportModelSnapshotQuery,
  useCreateSyncMutation,
  useGetSyncQuery,
  useLazyGetSyncQuery,
  useCreateScanMutation,
  useListScansQuery,
  useLazyListScansQuery,
  useGetScanQuery,
  useLazyGetScanQuery,
  useDeleteScanMutation,
  useCancelScanMutation,
} = lifecycleApi;

export type {
  CiValidationResult,
  CreateScanRequest,
  ElementDto,
  ListScansApiResponse,
  ModelSnapshotDto,
  PagedResultOfScanResponse,
  RelationshipDto,
  ScanResponse,
} from "./lifecycle.generated";
