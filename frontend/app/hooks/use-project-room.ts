import { useEffect, useState } from "react";

import type { ProjectEvent } from "@/lib/realtime/types";

import { useRealtimeConnection } from "./use-realtime-connection";

export type UseProjectRoomResult = {
  events: ProjectEvent[];
  lastEvent: ProjectEvent | null;
};

const MAX_EVENTS = 50;

/**
 * Subscribes to project-level realtime events for the given projectId.
 * Accumulates up to MAX_EVENTS in memory for the activity feed.
 */
export function useProjectRoom(projectId: string | null): UseProjectRoomResult {
  const { client, state } = useRealtimeConnection();
  const [events, setEvents] = useState<ProjectEvent[]>([]);

  useEffect(() => {
    if (!client || !projectId) return;

    if (state === "connected") {
      void client.joinProjectRoom(projectId);
    }

    const unsub = client.onProjectEvent((event) => {
      setEvents((prev) => {
        const next = [event, ...prev];
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
      });
    });

    return () => {
      unsub();
      void client.leaveProjectRoom(projectId);
    };
  }, [client, projectId, state]);

  return {
    events,
    lastEvent: events[0] ?? null,
  };
}
