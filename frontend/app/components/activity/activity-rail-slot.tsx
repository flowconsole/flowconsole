import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useParams } from "react-router-dom";

import {
  graphApi,
  lifecycleApi,
  useGetModelQuery,
  type ScanResponse,
} from "@/lib/api/rtk";
import { getNotificationHubUrl } from "@/lib/config/urls";
import type { ProjectEvent } from "@/lib/realtime/types";
import { store } from "@/lib/store";
import {
  ACTIVITY_FEED_LIMIT,
  useActivityFeed,
} from "@/hooks/use-activity-feed";
import { useRealtimeConnection } from "@/hooks/use-realtime-connection";

import { ActivityRail } from "./activity-rail";

/**
 * Workspace slot component that:
 * - Only renders on model workspace routes (`/models/[modelId]/**`)
 * - Subscribes to SignalR events and invalidates RTK cache on scan status changes
 *
 * Rendered as `activityRailSlot` in the protected layout, meaning it is mounted
 * once across all protected routes but is gated by the path check below.
 */
export function ActivityRailSlot() {
  const pathname = usePathname();

  // Only visible on model workspace routes
  const isModelRoute = /\/models\/[^/]+/.test(pathname);
  if (!isModelRoute) return null;

  return <ActivityRailFeed />;
}

/**
 * Inner component (always on a model route). Listens to SignalR events on the
 * notification hub and invalidates RTK Query tags so all subscribers refresh.
 */
function ActivityRailFeed() {
  const { modelId } = useParams<{ modelId: string }>();
  const { data: model } = useGetModelQuery(
    modelId ? { id: modelId } : skipToken,
  );
  const projectId = model?.projectId ?? undefined;
  const { jobs } = useActivityFeed({ modelId, enabled: !!modelId });
  const { client, state: connectionState } = useRealtimeConnection({
    hubUrl: getNotificationHubUrl(),
  });

  // Subscribe to SignalR scan events → optimistic cache patch + invalidate
  useEffect(() => {
    if (!client || !modelId || !projectId) return;

    if (connectionState === "connected") {
      void client.joinProjectRoom(projectId);
    }

    const handleProjectEvent = (event: ProjectEvent) => {
      if (
        event.type !== "ScanStarted" &&
        event.type !== "ScanCompleted" &&
        event.type !== "ScanFailed"
      )
        return;

      // Optimistic cache patch — update immediately so the UI reflects
      // the new status without waiting for the HTTP round-trip.
      const scanId = event.scanId;
      if (scanId) {
        const queryArgs = [
          { id: modelId, page: 1, limit: ACTIVITY_FEED_LIMIT },
          { id: modelId, page: 1, limit: 50 },
        ];

        for (const args of queryArgs) {
          // Only patch entries that already exist in cache
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cached = lifecycleApi.endpoints.listScans.select(args)(
            store.getState() as any,
          );
          if (!cached.data) continue;

          store.dispatch(
            lifecycleApi.util.updateQueryData("listScans", args, (draft) => {
              const existing = draft.items?.find((s) => s.id === scanId);

              if (event.type === "ScanStarted") {
                if (existing) {
                  existing.status = "running";
                  existing.startedAt =
                    event.occurredAt ?? new Date().toISOString();
                } else {
                  // Scan was created in another tab — insert a stub entry
                  const stub: ScanResponse = {
                    id: scanId,
                    modelId,
                    scanType: (event.scanType ?? "CodeScan") as ScanResponse["scanType"],
                    status: "running",
                    config: {},
                    errorMessage: null,
                    startedAt: event.occurredAt ?? new Date().toISOString(),
                    completedAt: null,
                    createdAt: new Date().toISOString(),
                  };
                  draft.items = [stub, ...(draft.items ?? [])];
                }
              } else if (event.type === "ScanCompleted" && existing) {
                existing.status = "completed";
                existing.completedAt =
                  event.occurredAt ?? new Date().toISOString();
              } else if (event.type === "ScanFailed" && existing) {
                existing.status = "failed";
                existing.errorMessage = event.error ?? null;
                existing.completedAt =
                  event.occurredAt ?? new Date().toISOString();
              }
            }),
          );
        }
      }

      // Invalidate to eventually fetch full correct data from backend
      store.dispatch(
        lifecycleApi.util.invalidateTags([
          { type: "ScanList", id: modelId },
          ...(scanId ? [{ type: "Scan" as const, id: scanId }] : []),
        ]),
      );

      // After scan completes the backend rebuilds the graph — refresh explorer data
      if (event.type === "ScanCompleted") {
        store.dispatch(
          graphApi.util.invalidateTags([
            { type: "ModelElements", id: modelId },
            { type: "ModelRelationships", id: modelId },
          ]),
        );
      }
    };

    const unsub = client.onProjectEvent(handleProjectEvent);

    return () => {
      unsub();
      void client.leaveProjectRoom(projectId);
    };
  }, [client, connectionState, modelId, projectId]);

  return <ActivityRail jobs={jobs} />;
}
