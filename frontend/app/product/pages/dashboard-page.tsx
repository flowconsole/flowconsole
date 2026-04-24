import { useCallback, useEffect, useState } from "react";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flowconsole/ui/components/ui/card";
import { AlertTriangle, GitCompareArrows, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { analysisApi, projectsModelsApi } from "@/lib/api/rtk";
import { store } from "@/lib/store";
import { DashboardHeader } from "@/components/dashboard/header";

// Types

interface RecentFailure {
  id: string;
  kind: "validation" | "drift";
  modelId: string;
  modelName: string;
  /** For validation: number of failed rules. For drift: drift score. */
  metric: number;
  timestamp: string;
}

// QuickActionCard

interface QuickActionCardProps {
  to?: string;
  href?: string;
  icon: keyof typeof Icons;
  title: string;
  description: string;
}

function QuickActionCard({
  to,
  href,
  icon,
  title,
  description,
}: QuickActionCardProps) {
  const Icon = Icons[icon];
  const card = (
    <Card className="h-full transition-colors hover:border-foreground/20 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4" />
        </div>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
  if (href)
    return (
      <a href={href} className="block" data-testid={`quick-action-${icon}`}>
        {card}
      </a>
    );
  return (
    <Link to={to!} className="block" data-testid={`quick-action-${icon}`}>
      {card}
    </Link>
  );
}

// FailureRow

function FailureRow({ failure }: { failure: RecentFailure }) {
  const { t } = useTranslation("hub");
  const isValidation = failure.kind === "validation";
  const link = isValidation
    ? `/models/${failure.modelId}/validations`
    : `/models/${failure.modelId}/drift`;

  return (
    <Link
      to={link}
      className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
      data-testid={`failure-row-${failure.id}`}
    >
      {isValidation ? (
        <ShieldAlert className="size-4 shrink-0 text-red-500" />
      ) : (
        <GitCompareArrows className="size-4 shrink-0 text-amber-500" />
      )}
      <div className="min-w-0 flex-1">
        <span className="font-medium">{failure.modelName}</span>
        <span className="ml-2 text-muted-foreground">
          {isValidation
            ? t("validationFailed", { count: failure.metric })
            : t("driftDetected", { score: failure.metric })}
        </span>
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">
        {new Date(failure.timestamp).toLocaleDateString()}
      </time>
    </Link>
  );
}

// Data fetching

const MAX_FAILURES = 10;

async function fetchRecentFailures(): Promise<RecentFailure[]> {
  const projectsRequest = store.dispatch(
    projectsModelsApi.endpoints.listProjects.initiate({ page: 1, limit: 50 }),
  );
  const projectsRes = await projectsRequest.unwrap();
  projectsRequest.unsubscribe();

  // Fetch all models across user's projects
  const modelLists = await Promise.all(
    projectsRes.data.map(async (project) => {
      const request = store.dispatch(
        projectsModelsApi.endpoints.listModels.initiate({
          projectId: project.id,
          page: 1,
          limit: 50,
        }),
      );
      const response = await request.unwrap();
      request.unsubscribe();
      return response;
    }),
  );
  const models = modelLists.flatMap((r) => r.data);
  if (models.length === 0) return [];

  // Fetch latest validation runs + drift snapshots in parallel per model
  const results = await Promise.allSettled(
    models.flatMap((m) => [
      (async () => {
        const request = store.dispatch(
          analysisApi.endpoints.listValidationRuns.initiate({
            modelId: m.id,
            page: 1,
            limit: 3,
          }),
        );
        const response = await request.unwrap();
        request.unsubscribe();
        return { kind: "validation" as const, model: m, data: response.items };
      })(),
      (async () => {
        const request = store.dispatch(
          analysisApi.endpoints.listDriftSnapshots.initiate({
            modelId: m.id,
            page: 1,
            limit: 3,
          }),
        );
        const response = await request.unwrap();
        request.unsubscribe();
        return { kind: "drift" as const, model: m, data: response.items };
      })(),
    ]),
  );

  const failures: RecentFailure[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { kind, model, data } = result.value;

    if (kind === "validation") {
      for (const run of data) {
        if (Number(run.failedRules) > 0) {
          failures.push({
            id: `v-${run.id}`,
            kind: "validation",
            modelId: model.id,
            modelName: model.name,
            metric: Number(run.failedRules),
            timestamp: run.startedAt,
          });
        }
      }
    } else {
      for (const snap of data) {
        if (Number(snap.driftScore) > 0) {
          failures.push({
            id: `d-${snap.id}`,
            kind: "drift",
            modelId: model.id,
            modelName: model.name,
            metric: Number(snap.driftScore),
            timestamp: snap.computedAt,
          });
        }
      }
    }
  }

  // Sort newest first, cap at MAX_FAILURES
  failures.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return failures.slice(0, MAX_FAILURES);
}

// DashboardPage

export function DashboardPage() {
  const { t } = useTranslation("hub");
  const [failures, setFailures] = useState<RecentFailure[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchRecentFailures();
      setFailures(data);
    } catch {
      // Dashboard failures section is non-critical — show empty state on error
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <DashboardHeader heading={t("heading")} text={t("subheading")} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("quickActionsHeading")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            to="/projects"
            icon="projects"
            title={t("actionProjects")}
            description={t("actionProjectsDesc")}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("recentFailuresHeading")}
        </h2>
        {!loaded ? (
          <div className="flex items-center justify-center py-8">
            <AlertTriangle className="mr-2 size-4 animate-pulse text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("loadingFailures")}
            </span>
          </div>
        ) : failures.length === 0 ? (
          <EmptyPlaceholder className="py-8">
            <EmptyPlaceholder.Icon name="validations" />
            <EmptyPlaceholder.Title>
              {t("noFailuresTitle")}
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              {t("noFailuresDescription")}
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        ) : (
          <div className="space-y-2" data-testid="recent-failures-list">
            {failures.map((f) => (
              <FailureRow key={f.id} failure={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
