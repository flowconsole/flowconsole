
import { useEffect, useState } from "react";

import type { ModelEvent } from "@/lib/realtime/types";
import { useRealtimeConnection } from "./use-realtime-connection";

export type UseModelRoomResult = {
  lastEvent: ModelEvent | null;
  pendingRefresh: boolean;
  clearPendingRefresh: () => void;
};

/**
 * Subscribes to model-level realtime events for the given modelId.
 * Sets pendingRefresh when a ModelUpdated, IRLoaded, or GraphRebuilt event arrives
 * so the caller can decide when to refresh their data.
 */
export function useModelRoom(modelId: string | null): UseModelRoomResult {
  const { client, state } = useRealtimeConnection();
  const [lastEvent, setLastEvent] = useState<ModelEvent | null>(null);
  const [pendingRefresh, setPendingRefresh] = useState(false);

  useEffect(() => {
    if (!client || !modelId) return;

    // Join the model room once connected
    if (state === "connected") {
      void client.joinModelRoom(modelId);
    }

    const unsub = client.onModelEvent((event) => {
      if (event.modelId !== modelId) return;
      setLastEvent(event);
      setPendingRefresh(true);
    });

    return () => {
      unsub();
      void client.leaveModelRoom(modelId);
    };
  }, [client, modelId, state]);

  return {
    lastEvent,
    pendingRefresh,
    clearPendingRefresh: () => setPendingRefresh(false),
  };
}
