
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "flowconsole:workspace-preferences";

export type WorkspacePreferences = {
  lastOpenModelId: string | null;
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;
};

const defaultPreferences: WorkspacePreferences = {
  lastOpenModelId: null,
  sidebarCollapsed: false,
  inspectorCollapsed: true,
};

function readPreferences(): WorkspacePreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
}

function writePreferences(prefs: WorkspacePreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function useWorkspacePreferences() {
  const [preferences, setPreferences] =
    useState<WorkspacePreferences>(defaultPreferences);

  useEffect(() => {
    setPreferences(readPreferences());
  }, []);

  const update = useCallback(
    (patch: Partial<WorkspacePreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...patch };
        writePreferences(next);
        return next;
      });
    },
    [],
  );

  return { preferences, update };
}
