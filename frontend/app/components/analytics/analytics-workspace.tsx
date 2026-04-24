import { useCallback, useEffect, useMemo, useState } from "react";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flowconsole/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@flowconsole/ui/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@flowconsole/ui/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  toApiError,
  useGetAnalyticsSummaryQuery,
  useGetCouplingQuery,
  type AnalyticsSummaryResponse,
  type CouplingResponse,
} from "@/lib/api/rtk";
import type {
  AnalyticsSummary,
  CouplingEntry,
  DependencyConcentration,
} from "@/lib/api/view-models";
import { cn } from "@/lib/utils";

function mapSummary(
  backend: AnalyticsSummaryResponse,
  modelId: string,
): AnalyticsSummary {
  let validationStatus: AnalyticsSummary["validationStatus"] = "unknown";
  if (
    backend.validationFailedRules !== null &&
    Number(backend.validationFailedRules) > 0
  ) {
    validationStatus = "failed";
  } else if (
    backend.validationPassedRules !== null &&
    Number(backend.validationPassedRules) > 0
  ) {
    validationStatus = "passed";
  }

  const snapshotStatus: AnalyticsSummary["snapshotStatus"] = backend.computedAt
    ? "fresh"
    : "missing";

  return {
    modelId,
    elementCount: Number(backend.totalElements),
    relationshipCount: Number(backend.totalRelationships),
    driftScore: backend.driftScore === null ? null : Number(backend.driftScore),
    validationStatus,
    snapshotStatus,
    snapshotAt: backend.computedAt,
  };
}

function mapCoupling(backend: CouplingResponse): CouplingEntry[] {
  return backend.elements.map((el) => ({
    elementId: el.elementId,
    elementName: el.elementId,
    elementType: "unknown",
    fanIn: Number(el.afferentCoupling),
    fanOut: Number(el.efferentCoupling),
    coupling: Number(el.afferentCoupling) + Number(el.efferentCoupling),
  }));
}

function mapDependencies(
  couplingEntries: CouplingEntry[],
  totalRelationships: number,
): DependencyConcentration[] {
  return couplingEntries
    .filter((c) => c.fanOut > 0)
    .sort((a, b) => b.fanOut - a.fanOut)
    .map((c) => ({
      elementId: c.elementId,
      elementName: c.elementName,
      elementType: c.elementType,
      dependencyCount: c.fanOut,
      percentageOfTotal:
        totalRelationships > 0
          ? Math.round((c.fanOut / totalRelationships) * 100)
          : 0,
    }));
}

interface SummaryStatProps {
  "data-testid": string;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  accent?: "default" | "warning" | "danger" | "success";
}

function SummaryStat({
  "data-testid": testId,
  icon,
  label,
  value,
  description,
  accent = "default",
}: SummaryStatProps) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-md p-1.5",
              accent === "danger" && "bg-red-100 text-red-600",
              accent === "warning" && "bg-yellow-100 text-yellow-700",
              accent === "success" && "bg-green-100 text-green-700",
              accent === "default" && "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold" data-testid={`${testId}-value`}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExplorerLink({
  elementId,
  modelId,
  t,
}: {
  elementId: string;
  modelId: string;
  t: (key: string) => string;
}) {
  return (
    <a
      data-testid={`focus-explorer-${elementId}`}
      href={`/models/${modelId}/explorer?element=${elementId}`}
      aria-label={t("focusInExplorer")}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-accent hover:text-accent-foreground"
    >
      <Icons.explorer className="h-3.5 w-3.5" />
    </a>
  );
}

interface AnalyticsWorkspaceProps {
  modelId: string;
  modelName?: string;
}

export function AnalyticsWorkspace({
  modelId,
  modelName,
}: AnalyticsWorkspaceProps) {
  const { t } = useTranslation("analytics");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const summaryQuery = useGetAnalyticsSummaryQuery({ modelId });
  const couplingQuery = useGetCouplingQuery({ modelId });

  const displayName = modelName;

  const loadData = useCallback(() => {
    void summaryQuery.refetch();
    void couplingQuery.refetch();
  }, [couplingQuery, summaryQuery]);

  // Read initial tab from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const validTabs = ["overview", "coupling", "dependencies"];
    if (tab && validTabs.includes(tab)) setActiveTab(tab);
  }, []);

  // Sync active tab to URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    navigate(`?${params.toString()}`, { replace: true });
  }, [activeTab, navigate]);

  const isLoading =
    summaryQuery.isLoading ||
    summaryQuery.isFetching ||
    couplingQuery.isLoading ||
    couplingQuery.isFetching;
  const loadError = useMemo(() => {
    const resolvedError = toApiError(summaryQuery.error ?? couplingQuery.error);
    if (!resolvedError) {
      return null;
    }
    return resolvedError instanceof Error
      ? resolvedError.message
      : "Failed to load analytics";
  }, [couplingQuery.error, summaryQuery.error]);
  const summary = summaryQuery.data
    ? mapSummary(summaryQuery.data, modelId)
    : null;
  const coupling = useMemo(
    () => (couplingQuery.data ? mapCoupling(couplingQuery.data) : []),
    [couplingQuery.data],
  );
  const dependencies = useMemo(
    () =>
      summaryQuery.data
        ? mapDependencies(
            coupling,
            Number(summaryQuery.data.totalRelationships),
          )
        : [],
    [coupling, summaryQuery.data],
  );

  const displaySummary: AnalyticsSummary = summary ?? {
    modelId,
    elementCount: 0,
    relationshipCount: 0,
    driftScore: null,
    validationStatus: "unknown",
    snapshotStatus: "missing",
    snapshotAt: null,
  };

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="analytics-workspace">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1
              className="text-xl font-semibold"
              data-testid="analytics-heading"
            >
              {t("heading")}
              {displayName ? ` — ${displayName}` : ""}
            </h1>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="refresh-button"
          onClick={loadData}
          disabled={isLoading}
        >
          <Icons.refresh className="mr-1 h-4 w-4" />
          {t("refresh")}
        </Button>
      </div>

      {/* Error state */}
      {loadError && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          data-testid="analytics-error"
        >
          {loadError}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="flex items-center justify-center py-12 text-muted-foreground"
          data-testid="analytics-loading"
        >
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      )}

      {/* Summary bar */}
      {!isLoading && (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          data-testid="analytics-summary-bar"
        >
          <SummaryStat
            data-testid="summary-elements"
            icon={<Icons.container className="h-4 w-4" />}
            label={t("summaryElements")}
            value={displaySummary.elementCount}
            description={t("summaryElementsDesc")}
          />
          <SummaryStat
            data-testid="summary-relationships"
            icon={<Icons.gitCommit className="h-4 w-4" />}
            label={t("summaryRelationships")}
            value={displaySummary.relationshipCount}
            description={t("summaryRelationshipsDesc")}
          />
          <SummaryStat
            data-testid="summary-drift-score"
            icon={<Icons.drift className="h-4 w-4" />}
            label={t("summaryDriftScore")}
            value={displaySummary.driftScore ?? "—"}
            description={t("summaryDriftScoreDesc")}
            accent={
              displaySummary.driftScore !== null &&
              displaySummary.driftScore >= 50
                ? "danger"
                : displaySummary.driftScore !== null &&
                    displaySummary.driftScore >= 20
                  ? "warning"
                  : "default"
            }
          />
          <SummaryStat
            data-testid="summary-validation"
            icon={<Icons.validations className="h-4 w-4" />}
            label={t("summaryValidation")}
            value={t(
              `validation${displaySummary.validationStatus.charAt(0).toUpperCase() + displaySummary.validationStatus.slice(1)}`,
            )}
            description={t("summaryValidationDesc")}
            accent={
              displaySummary.validationStatus === "failed"
                ? "danger"
                : displaySummary.validationStatus === "passed"
                  ? "success"
                  : "default"
            }
          />
          <SummaryStat
            data-testid="summary-freshness"
            icon={<Icons.activity className="h-4 w-4" />}
            label={t("summaryFreshness")}
            value={
              displaySummary.snapshotStatus === "fresh"
                ? t("statusFresh")
                : displaySummary.snapshotStatus === "stale"
                  ? t("statusStale")
                  : t("statusMissing")
            }
            description={t("summaryFreshnessDesc")}
            accent={
              displaySummary.snapshotStatus === "stale"
                ? "warning"
                : displaySummary.snapshotStatus === "missing"
                  ? "danger"
                  : "default"
            }
          />
        </div>
      )}

      {/* Tabs */}
      {!isLoading && (
        <Tabs
          data-testid="analytics-tabs"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger data-testid="tab-overview" value="overview">
              {t("tabOverview")}
            </TabsTrigger>
            <TabsTrigger data-testid="tab-coupling" value="coupling">
              {t("tabCoupling")}
            </TabsTrigger>
            <TabsTrigger data-testid="tab-dependencies" value="dependencies">
              {t("tabDependencies")}
            </TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Top Coupling */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("overviewCouplingTitle")}
                  </CardTitle>
                  <CardDescription>{t("overviewCouplingDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {coupling.length === 0 ? (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="overview-coupling-empty"
                    >
                      {t("noData")}
                    </p>
                  ) : (
                    <ul
                      className="space-y-2"
                      data-testid="overview-coupling-list"
                    >
                      {coupling.slice(0, 5).map((entry) => (
                        <li
                          key={entry.elementId}
                          className="flex items-center justify-between text-sm"
                          data-testid={`overview-coupling-${entry.elementId}`}
                        >
                          <span className="truncate font-medium">
                            {entry.elementName}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="tabular-nums">
                              {entry.coupling}
                            </Badge>
                            <ExplorerLink
                              elementId={entry.elementId}
                              modelId={modelId}
                              t={t}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-3 px-0"
                    data-testid="view-all-coupling"
                    onClick={() => setActiveTab("coupling")}
                  >
                    {t("viewAll")}
                  </Button>
                </CardContent>
              </Card>

              {/* Top Dependencies */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("overviewDependenciesTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("overviewDependenciesDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dependencies.length === 0 ? (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="overview-dependency-empty"
                    >
                      {t("noData")}
                    </p>
                  ) : (
                    <ul
                      className="space-y-2"
                      data-testid="overview-dependency-list"
                    >
                      {dependencies.slice(0, 5).map((entry) => (
                        <li
                          key={entry.elementId}
                          className="flex items-center justify-between text-sm"
                          data-testid={`overview-dependency-${entry.elementId}`}
                        >
                          <span className="truncate font-medium">
                            {entry.elementName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-muted-foreground">
                              {entry.dependencyCount} ({entry.percentageOfTotal}
                              %)
                            </span>
                            <ExplorerLink
                              elementId={entry.elementId}
                              modelId={modelId}
                              t={t}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-3 px-0"
                    data-testid="view-all-dependencies"
                    onClick={() => setActiveTab("dependencies")}
                  >
                    {t("viewAll")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Coupling tab */}
          <TabsContent value="coupling">
            <Card>
              <CardHeader>
                <CardTitle>{t("couplingTitle")}</CardTitle>
                <CardDescription>{t("couplingDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {coupling.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="coupling-empty"
                  >
                    {t("noData")}
                  </p>
                ) : (
                  <Table data-testid="coupling-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("couplingColElement")}</TableHead>
                        <TableHead className="text-right">
                          {t("couplingColFanIn")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("couplingColFanOut")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("couplingColScore")}
                        </TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupling.map((entry) => (
                        <TableRow
                          key={entry.elementId}
                          data-testid={`coupling-row-${entry.elementId}`}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span
                                className="font-medium"
                                data-testid={`coupling-name-${entry.elementId}`}
                              >
                                {entry.elementName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {entry.elementType}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.fanIn}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.fanOut}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                entry.coupling >= 10
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="tabular-nums"
                              data-testid={`coupling-score-${entry.elementId}`}
                            >
                              {entry.coupling}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ExplorerLink
                              elementId={entry.elementId}
                              modelId={modelId}
                              t={t}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dependencies tab */}
          <TabsContent value="dependencies">
            <Card>
              <CardHeader>
                <CardTitle>{t("dependenciesTitle")}</CardTitle>
                <CardDescription>
                  {t("dependenciesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dependencies.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="dependency-empty"
                  >
                    {t("noData")}
                  </p>
                ) : (
                  <Table data-testid="dependency-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dependenciesColElement")}</TableHead>
                        <TableHead className="text-right">
                          {t("dependenciesColCount")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("dependenciesColPct")}
                        </TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dependencies.map((entry) => (
                        <TableRow
                          key={entry.elementId}
                          data-testid={`dependency-row-${entry.elementId}`}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span
                                className="font-medium"
                                data-testid={`dependency-name-${entry.elementId}`}
                              >
                                {entry.elementName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {entry.elementType}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.dependencyCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span
                              className={cn(
                                "font-medium",
                                entry.percentageOfTotal >= 20 && "text-red-600",
                                entry.percentageOfTotal >= 10 &&
                                  entry.percentageOfTotal < 20 &&
                                  "text-yellow-700",
                              )}
                            >
                              {entry.percentageOfTotal}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <ExplorerLink
                              elementId={entry.elementId}
                              modelId={modelId}
                              t={t}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
