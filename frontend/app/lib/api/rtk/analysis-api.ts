import { analysisGeneratedApi } from "./analysis.generated";

export const analysisApi = analysisGeneratedApi.enhanceEndpoints({
  addTagTypes: [
    "AnalyticsSummary",
    "DriftSnapshot",
    "DriftSnapshotList",
    "ValidationRun",
    "ValidationRunList",
  ],
  endpoints: {
    getAnalyticsSummary: {
      providesTags: (_result, _error, arg) => [
        { type: "AnalyticsSummary", id: arg.modelId },
      ],
    },
    listDriftSnapshots: {
      providesTags: (result, _error, arg) =>
        result
          ? [
              { type: "DriftSnapshotList", id: arg.modelId },
              ...result.items.map((snapshot) => ({
                type: "DriftSnapshot" as const,
                id: snapshot.id,
              })),
            ]
          : [{ type: "DriftSnapshotList", id: arg.modelId }],
    },
    getLatestDriftSnapshot: {
      providesTags: (_result, _error, arg) => [
        { type: "DriftSnapshotList", id: arg.modelId },
      ],
    },
    getDriftSnapshot: {
      providesTags: (_result, _error, arg) => [
        { type: "DriftSnapshot", id: arg.snapshotId },
      ],
    },
    detectDrift: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "DriftSnapshotList", id: arg.modelId },
      ],
    },
    listValidationRuns: {
      providesTags: (result, _error, arg) =>
        result
          ? [
              { type: "ValidationRunList", id: arg.modelId },
              ...result.items.map((run) => ({
                type: "ValidationRun" as const,
                id: run.id,
              })),
            ]
          : [{ type: "ValidationRunList", id: arg.modelId }],
    },
    getValidationRun: {
      providesTags: (_result, _error, arg) => [
        { type: "ValidationRun", id: arg.runId },
      ],
    },
  },
});

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
} = analysisApi;
