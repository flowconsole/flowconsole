import { baseApi as api } from "./base-api";

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBlastRadius: build.query<
      GetBlastRadiusApiResponse,
      GetBlastRadiusApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/blast-radius/${queryArg.elementId}`,
        params: {
          depth: queryArg.depth,
        },
      }),
    }),
    getShortestPath: build.query<
      GetShortestPathApiResponse,
      GetShortestPathApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/shortest-path`,
        params: {
          from: queryArg["from"],
          to: queryArg.to,
        },
      }),
    }),
    getDependencies: build.query<
      GetDependenciesApiResponse,
      GetDependenciesApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/dependencies/${queryArg.elementId}`,
      }),
    }),
    getDependents: build.query<GetDependentsApiResponse, GetDependentsApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/dependents/${queryArg.elementId}`,
      }),
    }),
    getAnalyticsSummary: build.query<
      GetAnalyticsSummaryApiResponse,
      GetAnalyticsSummaryApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/summary`,
      }),
    }),
    getCoupling: build.query<GetCouplingApiResponse, GetCouplingApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/coupling`,
      }),
    }),
    getCriticalPath: build.query<
      GetCriticalPathApiResponse,
      GetCriticalPathApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/critical-path`,
      }),
    }),
    getBottlenecks: build.query<
      GetBottlenecksApiResponse,
      GetBottlenecksApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/analytics/bottlenecks`,
      }),
    }),
    detectDrift: build.mutation<DetectDriftApiResponse, DetectDriftApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/drift/detect`,
        method: "POST",
        body: queryArg.detectDriftRequest,
      }),
    }),
    listDriftSnapshots: build.query<
      ListDriftSnapshotsApiResponse,
      ListDriftSnapshotsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/drift/snapshots`,
        params: {
          page: queryArg.page,
          limit: queryArg.limit,
        },
      }),
    }),
    getLatestDriftSnapshot: build.query<
      GetLatestDriftSnapshotApiResponse,
      GetLatestDriftSnapshotApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/drift/snapshots/latest`,
      }),
    }),
    getDriftSnapshot: build.query<
      GetDriftSnapshotApiResponse,
      GetDriftSnapshotApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/drift/snapshots/${queryArg.snapshotId}`,
      }),
    }),
    listValidationRuns: build.query<
      ListValidationRunsApiResponse,
      ListValidationRunsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/validations`,
        params: {
          page: queryArg.page,
          limit: queryArg.limit,
        },
      }),
    }),
    getValidationRun: build.query<
      GetValidationRunApiResponse,
      GetValidationRunApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/validations/${queryArg.runId}`,
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as analysisGeneratedApi };
export type GetBlastRadiusApiResponse = /** status 200 OK */ string[];
export type GetBlastRadiusApiArg = {
  modelId: string;
  elementId: string;
  depth?: number | string;
};
export type GetShortestPathApiResponse = /** status 200 OK */ string[];
export type GetShortestPathApiArg = {
  modelId: string;
  from: string;
  to: string;
};
export type GetDependenciesApiResponse = /** status 200 OK */ string[];
export type GetDependenciesApiArg = {
  modelId: string;
  elementId: string;
};
export type GetDependentsApiResponse = /** status 200 OK */ string[];
export type GetDependentsApiArg = {
  modelId: string;
  elementId: string;
};
export type GetAnalyticsSummaryApiResponse =
  /** status 200 OK */ AnalyticsSummaryResponse;
export type GetAnalyticsSummaryApiArg = {
  modelId: string;
};
export type GetCouplingApiResponse = /** status 200 OK */ CouplingResponse;
export type GetCouplingApiArg = {
  modelId: string;
};
export type GetCriticalPathApiResponse =
  /** status 200 OK */ CriticalPathResponse;
export type GetCriticalPathApiArg = {
  modelId: string;
};
export type GetBottlenecksApiResponse =
  /** status 200 OK */ BottlenecksResponse;
export type GetBottlenecksApiArg = {
  modelId: string;
};
export type DetectDriftApiResponse = /** status 200 OK */ DriftSnapshotResponse;
export type DetectDriftApiArg = {
  modelId: string;
  detectDriftRequest: DetectDriftRequest;
};
export type ListDriftSnapshotsApiResponse =
  /** status 200 OK */ PagedSnapshotResponse;
export type ListDriftSnapshotsApiArg = {
  modelId: string;
  page?: number | string;
  limit?: number | string;
};
export type GetLatestDriftSnapshotApiResponse =
  /** status 200 OK */ DriftSnapshotResponse;
export type GetLatestDriftSnapshotApiArg = {
  modelId: string;
};
export type GetDriftSnapshotApiResponse =
  /** status 200 OK */ DriftSnapshotResponse;
export type GetDriftSnapshotApiArg = {
  modelId: string;
  snapshotId: string;
};
export type ListValidationRunsApiResponse =
  /** status 200 OK */ PagedValidationRunResponse;
export type ListValidationRunsApiArg = {
  modelId: string;
  page?: number | string;
  limit?: number | string;
};
export type GetValidationRunApiResponse =
  /** status 200 OK */ ValidationRunResponse;
export type GetValidationRunApiArg = {
  modelId: string;
  runId: string;
};
export type AnalyticsSummaryResponse = {
  totalElements: number | string;
  totalRelationships: number | string;
  avgCoupling: number | string;
  avgCohesion: number | string;
  criticalPath: string[];
  singlePointsOfFailure: string[];
  driftScore: null | number | string;
  validationPassedRules: null | number | string;
  validationFailedRules: null | number | string;
  validationTotalRules: null | number | string;
  communityCount: number | string;
  bottleneckCount: number | string;
  computedAt: null | string;
};
export type ElementCouplingResponse = {
  elementId: string;
  afferentCoupling: number | string;
  efferentCoupling: number | string;
  instability: number | string;
};
export type CouplingResponse = {
  elements: ElementCouplingResponse[];
  avgCoupling: number | string;
  avgCohesion: number | string;
};
export type CommunityResponse = {
  communityId: number | string;
  members: string[];
};
export type CriticalPathResponse = {
  path: string[];
  communities: CommunityResponse[];
};
export type BottlenecksResponse = {
  bottlenecks: string[];
  singlePointsOfFailure: string[];
};
export type DriftItemResponse = {
  elementId: string;
  name: string;
  kind: string;
  diffDescription: null | string;
};
export type DriftResultResponse = {
  driftScore: number | string;
  added: DriftItemResponse[];
  removed: DriftItemResponse[];
  changed: DriftItemResponse[];
};
export type DriftSnapshotResponse = {
  id: string;
  modelId: string;
  scanId: null | string;
  driftScore: number | string;
  addedElements: number | string;
  removedElements: number | string;
  changedElements: number | string;
  details: DriftResultResponse;
  computedAt: string;
};
export type ErrorMessageResponse = {
  error: string;
};
export type DetectDriftRequest = {
  scanSource?: null | string;
};
export type PagedSnapshotResponse = {
  items: DriftSnapshotResponse[];
  totalCount: number | string;
  page: number | string;
  limit: number | string;
};
export type ValidationResultResponse = {
  id: string;
  ruleId: null | string;
  ruleName: string;
  severity: string;
  blocking: boolean;
  message: string;
  elementIds: string[];
  resolved: boolean;
  detectedAt: string;
};
export type ValidationRunResponse = {
  id: string;
  modelId: string;
  source: null | string;
  commitSha: null | string;
  branch: null | string;
  pipelineUrl: null | string;
  driftScore: null | number | string;
  executedAt: null | string;
  totalRules: number | string;
  passedRules: number | string;
  failedRules: number | string;
  startedAt: string;
  completedAt: null | string;
  results: ValidationResultResponse[];
};
export type PagedValidationRunResponse = {
  items: ValidationRunResponse[];
  totalCount: number | string;
  page: number | string;
  limit: number | string;
};
export const {
  useGetBlastRadiusQuery,
  useGetShortestPathQuery,
  useGetDependenciesQuery,
  useGetDependentsQuery,
  useGetAnalyticsSummaryQuery,
  useGetCouplingQuery,
  useGetCriticalPathQuery,
  useGetBottlenecksQuery,
  useDetectDriftMutation,
  useListDriftSnapshotsQuery,
  useGetLatestDriftSnapshotQuery,
  useGetDriftSnapshotQuery,
  useListValidationRunsQuery,
  useGetValidationRunQuery,
} = injectedRtkApi;
