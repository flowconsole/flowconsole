import { useEffect, useMemo, useState } from "react";

import { getModelHubUrl } from "@/lib/config/urls";
import { getRealtimeClient } from "@/lib/realtime/signalr-client";
import type { ConnectionState, RealtimeConfig } from "@/lib/realtime/types";

export function useRealtimeConnection(config?: Partial<RealtimeConfig>) {
  const hubUrl = config?.hubUrl ?? getModelHubUrl();

  const client = useMemo(
    () => getRealtimeClient({ hubUrl, accessToken: config?.accessToken }),
    [hubUrl],
  );

  const [state, setState] = useState<ConnectionState>(() => client.getState());

  useEffect(() => {
    setState(client.getState());
    const unsub = client.onStateChange(setState);
    void client.start();
    return unsub;
  }, [client]);

  return { state, client };
}
