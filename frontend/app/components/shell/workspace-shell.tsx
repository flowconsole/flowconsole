import { Suspense, useCallback, useEffect } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useWorkspacePreferences } from "@/hooks/use-workspace-preferences";

import { CommandBar } from "./command-bar";
import { InspectorPanel } from "./inspector-panel";
import { NavigationRail } from "./navigation-rail";

function WorkspaceShellInner({
  searchSlot,
  mobileNavSlot,
  inspectorContent,
  activityRailSlot,
  children,
}: {
  searchSlot: React.ReactNode;
  mobileNavSlot: React.ReactNode;
  inspectorContent?: React.ReactNode;
  /** Optional activity rail rendered at the bottom of the main area. */
  activityRailSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { preferences, update } = useWorkspacePreferences();
  const { isTablet, isMobile, isSm } = useMediaQuery();

  // On tablet: collapse inspector only (sidebar stays visible for 2-pane layout).
  // On mobile/sm: handled separately via showInspector flag below.
  useEffect(() => {
    if (isTablet) {
      update({ inspectorCollapsed: true });
    }
  }, [isTablet, update]);

  const toggleSidebar = useCallback(() => {
    update({ sidebarCollapsed: !preferences.sidebarCollapsed });
  }, [preferences.sidebarCollapsed, update]);

  const toggleInspector = useCallback(() => {
    update({ inspectorCollapsed: !preferences.inspectorCollapsed });
  }, [preferences.inspectorCollapsed, update]);

  // On mobile/sm, hide the inspector entirely
  const showInspector = false && !(isMobile || isSm);

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <Suspense
        fallback={<div className="hidden w-[68px] border-r md:block" />}
      >
        <NavigationRail
          collapsed={preferences.sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1">
          <div className="min-h-0 flex-1 overflow-auto p-4 lg:px-6">
            {children}
          </div>

          {showInspector && (
            <InspectorPanel collapsed={preferences.inspectorCollapsed}>
              {inspectorContent}
            </InspectorPanel>
          )}
        </main>

        {activityRailSlot && (
          <div
            className="sticky bottom-0 z-20"
            data-testid="activity-rail-area"
          >
            {activityRailSlot}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkspaceShell(props: {
  searchSlot: React.ReactNode;
  mobileNavSlot: React.ReactNode;
  inspectorContent?: React.ReactNode;
  activityRailSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
        </div>
      }
    >
      <WorkspaceShellInner {...props} />
    </Suspense>
  );
}
