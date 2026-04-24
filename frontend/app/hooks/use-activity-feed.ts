import { useMemo } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";

import type { ActivityJob } from "@/lib/api/activity-types";
import { backendScanToActivityJob } from "@/lib/api/activity-types";
import { useListScansQuery } from "@/lib/api/rtk";

export type { ActivityJob };

export const ACTIVITY_FEED_LIMIT = 20;

export interface UseActivityFeedOptions {
  /** Model ID to fetch scans for. */
  modelId?: string;
  /** If false, the query is skipped. Defaults to true. */
  enabled?: boolean;
}

export interface UseActivityFeedReturn {
  jobs: ActivityJob[];
}

/**
 * Manages the workspace activity feed — a chronological list of background
 * operations shown in the activity rail.
 *
 * Subscribes to `useListScansQuery` (RTK Query). Real-time updates arrive via
 * SignalR → `invalidateTags` in ActivityRailSlot, which triggers automatic
 * refetch of active subscriptions.
 */
export function useActivityFeed({
  modelId,
  enabled = true,
}: UseActivityFeedOptions = {}): UseActivityFeedReturn {
  const { data } = useListScansQuery(
    enabled && modelId
      ? { id: modelId, page: 1, limit: ACTIVITY_FEED_LIMIT }
      : skipToken,
  );

  const jobs = useMemo<ActivityJob[]>(() => {
    if (!data?.items?.length || !modelId) return [];
    return data.items
      .map((scan) => backendScanToActivityJob(modelId, scan))
      .sort((a, b) => {
        const ta = a.startedAt ?? a.completedAt ?? "";
        const tb = b.startedAt ?? b.completedAt ?? "";
        return tb.localeCompare(ta);
      })
      .slice(0, ACTIVITY_FEED_LIMIT);
  }, [data, modelId]);

  return { jobs };
}
