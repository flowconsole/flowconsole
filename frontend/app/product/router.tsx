/**
 * ProductRouter — single React Router entry for all product workspace routes.
 */
import { DashboardPage } from "@/product/pages/dashboard-page";
import { LoginPage } from "@/product/pages/login-page";
import { ModelEditorPage } from "@/product/pages/model-editor-page";
import { ModelExplorerPage } from "@/product/pages/model-explorer-page";
import { ModelOverviewPage } from "@/product/pages/model-overview-page";
import { ModelSettingsPage } from "@/product/pages/model-settings-page";
import { ProjectOverviewPage } from "@/product/pages/project-overview-page";
import { ProjectsPage } from "@/product/pages/projects-page";
import { RegisterPage } from "@/product/pages/register-page";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from "react-router-dom";

import { homeSidebarLinks } from "@/config/dashboard";
import { useAuth } from "@/lib/auth";
import { ActivityRailSlot } from "@/components/activity/activity-rail-slot";
import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace";
import { AreaChartStacked } from "@/components/charts/area-chart-stacked";
import { BarChartMixed } from "@/components/charts/bar-chart-mixed";
import { InteractiveBarChart } from "@/components/charts/interactive-bar-chart";
import { LineChartMultiple } from "@/components/charts/line-chart-multiple";
import { RadarChartSimple } from "@/components/charts/radar-chart-simple";
import { RadialChartGrid } from "@/components/charts/radial-chart-grid";
import { RadialShapeChart } from "@/components/charts/radial-shape-chart";
import { RadialStackedChart } from "@/components/charts/radial-stacked-chart";
import { RadialTextChart } from "@/components/charts/radial-text-chart";
import DriftView from "@/components/dashboard/drift-view";
import { DashboardHeader } from "@/components/dashboard/header";
import { SearchCommand } from "@/components/dashboard/search-command";
import { DriftCenter } from "@/components/drift/drift-center";
import { MobileSheetSidebar } from "@/components/layout/dashboard-sidebar";
import { WorkspaceShell } from "@/components/shell";

// Auth guard + workspace shell layout

/** Layout route: auth guard + workspace chrome (nav rail, command bar, activity rail). */
function ProtectedLayout() {
  const { state } = useAuth();
  const { t } = useTranslation("nav");
  if (state === "loading")
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  if (state !== "authorized") return <Navigate to="/login" replace />;
  return (
    <WorkspaceShell
      searchSlot={<SearchCommand links={homeSidebarLinks(t)} />}
      mobileNavSlot={<MobileSheetSidebar />}
      activityRailSlot={<ActivityRailSlot />}
    >
      <Outlet />
    </WorkspaceShell>
  );
}

// Wrappers for prop-based route components (receive modelId via useParams)

function ModelDriftPage() {
  const { modelId } = useParams<{ modelId: string }>();
  return <DriftCenter modelId={modelId!} />;
}

function ModelAnalyticsPage() {
  const { modelId } = useParams<{ modelId: string }>();
  return <AnalyticsWorkspace modelId={modelId!} />;
}

// Simple inline page components

function SettingsPage() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader heading={t("heading")} text={t("description")} />
      {user && (
        <div className="rounded-lg border p-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">{t("emailLabel")}</dt>
            <dd>{user.email}</dd>
            <dt className="text-muted-foreground">{t("roleLabel")}</dt>
            <dd className="capitalize">{user.role}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}

function WorkbenchPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <DashboardHeader
        heading="Explorer"
        text="Full architecture workbench — coming soon."
      />
    </div>
  );
}

function DriftDashboardPage() {
  return <DriftView />;
}

function ChartsPage() {
  return (
    <>
      <DashboardHeader heading="Charts" text="List of charts by shadcn-ui." />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <RadialTextChart />
          <AreaChartStacked />
          <BarChartMixed />
          <RadarChartSimple />
        </div>
        <InteractiveBarChart />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <RadialChartGrid />
          <RadialShapeChart />
          <LineChartMultiple />
          <RadialStackedChart />
        </div>
      </div>
    </>
  );
}

// Router

function ProductRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — wrapped in WorkspaceShell (nav rail, command bar, activity rail) */}
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route path="/dashboard/charts" element={<ChartsPage />} />
        <Route path="/dashboard/drift" element={<DriftDashboardPage />} />
        <Route path="/dashboard/workbench" element={<WorkbenchPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
        <Route path="/models/:modelId" element={<ModelOverviewPage />} />
        <Route
          path="/models/:modelId/explorer"
          element={<ModelExplorerPage />}
        />
        <Route path="/models/:modelId/editor" element={<ModelEditorPage />} />
        <Route
          path="/models/:modelId/settings"
          element={<ModelSettingsPage />}
        />
        <Route path="/models/:modelId/drift" element={<ModelDriftPage />} />
        <Route
          path="/models/:modelId/analytics"
          element={<ModelAnalyticsPage />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export function ProductRouter() {
  return (
    <BrowserRouter basename="/">
      <ProductRoutes />
    </BrowserRouter>
  );
}
