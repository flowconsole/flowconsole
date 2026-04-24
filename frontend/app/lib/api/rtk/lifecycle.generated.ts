import { baseApi as api } from "./base-api";

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    loadModelSnapshot: build.mutation<
      LoadModelSnapshotApiResponse,
      LoadModelSnapshotApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/ir`,
        method: "PUT",
        body: queryArg.jsonDocument,
      }),
    }),
    exportModelSnapshot: build.query<
      ExportModelSnapshotApiResponse,
      ExportModelSnapshotApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/ir`,
        params: {
          source: queryArg.source,
        },
      }),
    }),
    createSync: build.mutation<CreateSyncApiResponse, CreateSyncApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/syncs`,
        method: "POST",
      }),
    }),
    getSync: build.query<GetSyncApiResponse, GetSyncApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/syncs/${queryArg.syncId}`,
      }),
    }),
    createScan: build.mutation<CreateScanApiResponse, CreateScanApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/scans`,
        method: "POST",
        body: queryArg.createScanRequest,
      }),
    }),
    listScans: build.query<ListScansApiResponse, ListScansApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/scans`,
        params: {
          page: queryArg.page,
          limit: queryArg.limit,
          status: queryArg.status,
          type: queryArg["type"],
        },
      }),
    }),
    getScan: build.query<GetScanApiResponse, GetScanApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/scans/${queryArg.scanId}`,
      }),
    }),
    deleteScan: build.mutation<DeleteScanApiResponse, DeleteScanApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/scans/${queryArg.scanId}`,
        method: "DELETE",
      }),
    }),
    cancelScan: build.mutation<CancelScanApiResponse, CancelScanApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/scans/${queryArg.scanId}/cancel`,
        method: "POST",
      }),
    }),
    handleGithubWebhook: build.mutation<
      HandleGithubWebhookApiResponse,
      HandleGithubWebhookApiArg
    >({
      query: () => ({ url: `/api/v1/webhooks/github`, method: "POST" }),
    }),
    handleGitlabWebhook: build.mutation<
      HandleGitlabWebhookApiResponse,
      HandleGitlabWebhookApiArg
    >({
      query: () => ({ url: `/api/v1/webhooks/gitlab`, method: "POST" }),
    }),
    handleCiValidate: build.mutation<
      HandleCiValidateApiResponse,
      HandleCiValidateApiArg
    >({
      query: () => ({ url: `/api/v1/webhooks/ci/validate`, method: "POST" }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as lifecycleGeneratedApi };
export type LoadModelSnapshotApiResponse =
  /** status 200 OK */ SnapshotUploadResponse;
export type LoadModelSnapshotApiArg = {
  id: string;
  jsonDocument: JsonDocument;
};
export type ExportModelSnapshotApiResponse =
  /** status 200 OK */ ModelSnapshotDto;
export type ExportModelSnapshotApiArg = {
  id: string;
  source?: string;
};
export type CreateSyncApiResponse = /** status 202 Accepted */ ScanResponse;
export type CreateSyncApiArg = {
  id: string;
};
export type GetSyncApiResponse = /** status 200 OK */ ScanResponse;
export type GetSyncApiArg = {
  id: string;
  syncId: string;
};
export type CreateScanApiResponse = /** status 202 Accepted */ ScanResponse;
export type CreateScanApiArg = {
  id: string;
  createScanRequest: CreateScanRequest;
};
export type ListScansApiResponse =
  /** status 200 OK */ PagedResultOfScanResponse;
export type ListScansApiArg = {
  id: string;
  page?: number | string;
  limit?: number | string;
  status?: string;
  type?: string;
};
export type GetScanApiResponse = /** status 200 OK */ ScanResponse;
export type GetScanApiArg = {
  id: string;
  scanId: string;
};
export type DeleteScanApiResponse = unknown;
export type DeleteScanApiArg = {
  id: string;
  scanId: string;
};
export type CancelScanApiResponse = /** status 200 OK */ ScanResponse;
export type CancelScanApiArg = {
  id: string;
  scanId: string;
};
export type HandleGithubWebhookApiResponse =
  /** status 200 OK */ WebhookReceivedResponse;
export type HandleGithubWebhookApiArg = void;
export type HandleGitlabWebhookApiResponse =
  /** status 200 OK */ WebhookReceivedResponse;
export type HandleGitlabWebhookApiArg = void;
export type HandleCiValidateApiResponse =
  /** status 200 OK */ CiValidationResult;
export type HandleCiValidateApiArg = void;
export type SnapshotUploadResponse = {
  modelId: string;
  version: number | string;
  warnings: null | string[];
};
export type JsonDocument = any;
export type ElementDto = {
  id?: string;
  kind?: string;
  name?: string;
  description?: null | string;
  technology?: null | string;
  parentId?: null | string;
  source?: null | string;
  canonicalId?: null | string;
  aliases?: null | string[];
  properties?:
    | {
        [key: string]: string;
      }
    | {
        [key: string]: string;
      };
  tags?: null | string[];
};
export type RelationshipDto = {
  id?: string;
  sourceId?: string;
  targetId?: string;
  kind?: string;
  label?: null | string;
  technology?: null | string;
  source?: null | string;
  properties?:
    | {
        [key: string]: string;
      }
    | {
        [key: string]: string;
      };
};
export type FlowStepDto = {
  sourceElementId?: string;
  relationshipId?: null | string;
  label?: null | string;
  properties?:
    | {
        [key: string]: string;
      }
    | {
        [key: string]: string;
      };
};
export type FlowDto = {
  id?: string;
  name?: string;
  description?: null | string;
  steps?: FlowStepDto[];
};
export type ModelSnapshotDto = {
  source?: null | string;
  elements?: ElementDto[];
  relationships?: RelationshipDto[];
  flows?: null | FlowDto[];
};
export type ElementSource =
  | "Git"
  | "CodeScan"
  | "InfraScan"
  | "Observability"
  | "Import";
export type ScanResponse = {
  id: string;
  modelId: string;
  scanType: ElementSource;
  status: string;
  config: {
    [key: string]: string;
  };
  errorMessage: null | string;
  startedAt: null | string;
  completedAt: null | string;
  createdAt: string;
};
export type ErrorMessageResponse = {
  error: string;
};
export type ProblemDetails = {
  type?: null | string;
  title?: null | string;
  status?: null | number | string;
  detail?: null | string;
  instance?: null | string;
};
export type CreateScanType = "CodeScan" | "InfraScan";
export type CreateScanRequest = {
  scanType: CreateScanType;
  config?:
    | {
        [key: string]: string;
      }
    | {
        [key: string]: string;
      };
};
export type PagedResultOfScanResponse = {
  items?: ScanResponse[];
  totalCount?: number | string;
  page?: number | string;
  limit?: number | string;
  totalPages?: number | string;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};
export type WebhookReceivedResponse = {
  received: boolean;
};
export type ModelSnapshotValidationError = {
  code: string;
  message: string;
  path?: null | string;
};
export type CiFitnessFunctionViolation = {
  ruleName: string;
  severity: string;
  message: string;
  elementIds: string[];
};
export type CiFitnessFunctionResult = {
  runId: string;
  totalRules: number | string;
  passedRules: number | string;
  failedRules: number | string;
  violations: CiFitnessFunctionViolation[];
};
export type CiValidationResult = {
  passed: boolean;
  violations: ModelSnapshotValidationError[];
  fitnessFunctions?: null | CiFitnessFunctionResult;
};
export const {
  useLoadModelSnapshotMutation,
  useExportModelSnapshotQuery,
  useCreateSyncMutation,
  useGetSyncQuery,
  useCreateScanMutation,
  useListScansQuery,
  useGetScanQuery,
  useDeleteScanMutation,
  useCancelScanMutation,
  useHandleGithubWebhookMutation,
  useHandleGitlabWebhookMutation,
  useHandleCiValidateMutation,
} = injectedRtkApi;
