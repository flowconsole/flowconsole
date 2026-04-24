import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import { Button } from "@flowconsole/ui/components/ui/button";
import { Separator } from "@flowconsole/ui/components/ui/separator";
import { skipToken } from "@reduxjs/toolkit/query";
import { RefreshCw, ScanLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import {
  lifecycleApi,
  toCreateScanRequest,
  toGraphElements,
  toGraphRelationships,
  useCancelScanMutation,
  useCreateScanMutation,
  useCreateSyncMutation,
  useGetLatestDriftSnapshotQuery,
  useGetModelQuery,
  useListElementsQuery,
  useListRelationshipsQuery,
  useListScansQuery,
  useListValidationRunsQuery,
  type ScanResponse,
} from "@/lib/api/rtk";
import { hasRtkErrorStatus, toApiError } from "@/lib/api/rtk/errors";
import { useAppDispatch } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ApiErrorMessage } from "@/components/api-error-message";
import { DashboardHeader } from "@/components/dashboard/header";
import { ModelOverviewSkeleton } from "@/components/model/model-overview-skeleton";
import {
  DriftStatusChip,
  ValidationStatusChip,
} from "@/components/model/model-status-chip";
import { ScanDetailPanel } from "@/components/sources/scan-detail-panel";
import { ScanLauncher } from "@/components/sources/scan-launcher";
import { ScanList } from "@/components/sources/scan-list";
import type {
  ScanLauncherFormState,
  UiScanOperationStatus,
  UiScanRecord,
} from "@/components/sources/scan-types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function mapBackendScan(backend: ScanResponse): UiScanRecord {
  const scanType = backend.scanType as UiScanRecord["scanType"];
  const scannerType =
    scanType === "Git"
      ? "git"
      : (backend.config?.["language"]?.toLowerCase() ??
        backend.config?.["scannerType"]?.toLowerCase() ??
        "unknown");
  const status: UiScanOperationStatus =
    (backend.status?.toLowerCase() as UiScanOperationStatus) ?? "pending";

  return {
    id: backend.id,
    modelId: backend.modelId,
    scanType,
    scannerType,
    status,
    startedAt: backend.startedAt,
    completedAt: backend.completedAt,
    path: backend.config?.["path"] ?? null,
    affectedElementsCount: null,
    errors: backend.errorMessage ? [{ message: backend.errorMessage }] : [],
    isLocked: false,
    isStale: false,
  };
}

export function ModelOverviewPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const { t } = useTranslation("modelOverview");
  const dispatch = useAppDispatch();

  const [selectedScanRecord, setSelectedScanRecord] =
    useState<UiScanRecord | null>(null);

  const {
    data: model,
    error: modelError,
    isLoading: modelLoading,
    refetch: refetchModel,
  } = useGetModelQuery(modelId ? { id: modelId } : skipToken);
  const {
    data: elementsPage,
    error: elementsError,
    isLoading: elementsLoading,
    refetch: refetchElements,
  } = useListElementsQuery(modelId ? { modelId, limit: 100 } : skipToken);
  const {
    data: relationshipsPage,
    error: relationshipsError,
    isLoading: relationshipsLoading,
    refetch: refetchRelationships,
  } = useListRelationshipsQuery(modelId ? { modelId, limit: 100 } : skipToken);
  const {
    data: scansPage,
    error: scansError,
    isLoading: scansLoading,
  } = useListScansQuery(
    modelId ? { id: modelId, page: 1, limit: 50 } : skipToken,
  );
  const { data: latestDrift } = useGetLatestDriftSnapshotQuery(
    modelId ? { modelId } : skipToken,
  );
  const { data: validationRuns } = useListValidationRunsQuery(
    modelId ? { modelId, page: 1, limit: 1 } : skipToken,
  );

  const [createSync, { isLoading: isCreatingSync }] = useCreateSyncMutation();
  const [createScan] = useCreateScanMutation();
  const [cancelScan] = useCancelScanMutation();

  const elements = modelId
    ? toGraphElements(elementsPage?.data ?? [], modelId)
    : [];
  const relationships = modelId
    ? toGraphRelationships(relationshipsPage?.data ?? [], modelId)
    : [];

  // Top-level counts: exclude child-level elements (Endpoint) and structural relationships (Contains)
  const topLevelElementCount = elements.filter(
    (e) => e.kind !== "Endpoint",
  ).length;
  const excludedElementIds = new Set(
    elements.filter((e) => e.kind === "Endpoint").map((e) => e.id),
  );
  const topLevelRelationshipCount = relationships.filter(
    (r) =>
      r.kind !== "Contains" &&
      !excludedElementIds.has(r.sourceElementId) &&
      !excludedElementIds.has(r.targetElementId),
  ).length;

  const driftStatus: "clean" | "drifted" | "unknown" = latestDrift
    ? Number(latestDrift.driftScore) > 0
      ? "drifted"
      : "clean"
    : "unknown";

  const latestValidation = validationRuns?.items?.[0];
  const validationStatus: "passing" | "failing" | "unknown" = latestValidation
    ? Number(latestValidation.failedRules) > 0
      ? "failing"
      : "passing"
    : "unknown";

  const gitConfig = model?.gitConfig ?? null;
  const backendScans = scansPage?.items ?? [];
  const allRecords = useMemo(
    () => backendScans.map(mapBackendScan),
    [backendScans],
  );
  const hasRunningSync =
    isCreatingSync ||
    allRecords.some(
      (r) =>
        r.scanType === "Git" &&
        (r.status === "pending" || r.status === "running"),
    );
  const hasRunningScan = allRecords.some(
    (r) =>
      r.scanType !== "Git" &&
      (r.status === "pending" || r.status === "running"),
  );

  useEffect(() => {
    if (!selectedScanRecord) return;
    const nextRecord = allRecords.find(
      (record) => record.id === selectedScanRecord.id,
    );
    setSelectedScanRecord(nextRecord ?? null);
  }, [allRecords, selectedScanRecord]);

  const handleTriggerSync = useCallback(async () => {
    if (!modelId || hasRunningSync) return;
    try {
      await createSync({ id: modelId }).unwrap();
    } catch {
      // SignalR will deliver updates
    }
  }, [createSync, hasRunningSync, modelId]);

  const handleLaunchScan = useCallback(
    async (state: ScanLauncherFormState) => {
      if (!modelId) return;
      await createScan({
        id: modelId,
        createScanRequest: toCreateScanRequest(state),
      }).unwrap();
    },
    [createScan, modelId],
  );

  const handleCancelScan = useCallback(
    async (id: string) => {
      if (!modelId) return;
      try {
        await cancelScan({ id: modelId, scanId: id }).unwrap();
        dispatch(
          lifecycleApi.util.updateQueryData(
            "listScans",
            { id: modelId, page: 1, limit: 50 },
            (draft) => {
              const target = draft.items?.find((record) => record.id === id);
              if (!target) return;
              target.status = "cancelled";
              target.completedAt = new Date().toISOString();
            },
          ),
        );
      } catch {
        // best-effort: polling will reconcile state
      }
    },
    [cancelScan, dispatch, modelId],
  );

  const handleRetryScan = useCallback(
    async (record: UiScanRecord) => {
      if (record.scanType === "Git") {
        await handleTriggerSync();
      } else {
        await handleLaunchScan({
          scanType: record.scanType,
          scannerType:
            record.scannerType as ScanLauncherFormState["scannerType"],
          path: record.path ?? "",
        });
      }
      setSelectedScanRecord(null);
    },
    [handleLaunchScan, handleTriggerSync],
  );

  const handleOpenScanDetail = useCallback((record: UiScanRecord) => {
    setSelectedScanRecord(record);
  }, []);

  const handleCloseScanDetail = useCallback(() => {
    setSelectedScanRecord(null);
  }, []);

  if (modelLoading || elementsLoading || relationshipsLoading || scansLoading) {
    return <ModelOverviewSkeleton />;
  }

  if (hasRtkErrorStatus(modelError, 404)) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="workbench" />
        <EmptyPlaceholder.Title>{t("notFoundTitle")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("notFoundDescription")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  const blockingError =
    modelError ?? elementsError ?? relationshipsError ?? scansError;
  if (blockingError) {
    return (
      <ApiErrorMessage
        error={toApiError(blockingError)}
        onRetry={() => {
          void refetchModel();
          void refetchElements();
          void refetchRelationships();
        }}
      />
    );
  }

  const hasOpenPanel = !!selectedScanRecord;

  return (
    <>
      <DashboardHeader
        heading={model?.name ?? t("loadingHeading")}
        text={model?.description ?? undefined}
      >
        <div className="flex items-center gap-2">
          <DriftStatusChip status={driftStatus} />
          <ValidationStatusChip status={validationStatus} />
        </div>
      </DashboardHeader>

      <div className="mt-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label={t("elements")} value={topLevelElementCount} />
          <StatCard
            label={t("relationships")}
            value={topLevelRelationshipCount}
          />
          <StatCard
            label={t("sources")}
            value={
              elements.length === 0
                ? 0
                : new Set(elements.map((e) => e.source)).size
            }
          />
        </div>

        <Separator />

        {/* Operations section */}
        <div
          className={
            hasOpenPanel ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : "space-y-8"
          }
        >
          <div className="space-y-6">
            <section
              aria-labelledby="operations-heading"
              data-testid="operations-section"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2
                    id="operations-heading"
                    className="flex items-center gap-2 font-heading text-base font-semibold"
                  >
                    <ScanLine className="size-4 text-muted-foreground" />
                    {t("operationsHeading")}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("operationsDescription")}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTriggerSync}
                  disabled={hasRunningSync || !gitConfig?.repoUrl}
                  data-testid="trigger-sync-button"
                >
                  <RefreshCw
                    className={cn(
                      "mr-1.5 size-3.5",
                      hasRunningSync && "animate-spin",
                    )}
                  />
                  {hasRunningSync ? t("syncing") : t("triggerSync")}
                </Button>
              </div>

              <ScanLauncher
                onLaunch={handleLaunchScan}
                isRunning={hasRunningScan}
              />

              <div className="mt-6">
                <ScanList
                  records={allRecords}
                  onCancel={handleCancelScan}
                  onRetry={handleRetryScan}
                  onOpenDetail={handleOpenScanDetail}
                />
              </div>
            </section>
          </div>

          {/* Right column: scan detail panel */}
          {selectedScanRecord && (
            <ScanDetailPanel
              record={selectedScanRecord}
              onClose={handleCloseScanDetail}
              onCancel={handleCancelScan}
              onRetry={handleRetryScan}
              className="sticky top-4 h-fit max-h-[70vh]"
            />
          )}
        </div>
      </div>
    </>
  );
}
