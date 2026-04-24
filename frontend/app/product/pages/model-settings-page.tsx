import { useCallback } from "react";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import { Button } from "@flowconsole/ui/components/ui/button";
import { skipToken } from "@reduxjs/toolkit/query";
import { GitBranch, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import {
  projectsModelsApi,
  useCreateSyncMutation,
  useGetModelQuery,
  useListScansQuery,
  useUpdateModelMutation,
  type GitConfig as GeneratedGitConfig,
} from "@/lib/api/rtk";
import type { SyncStatus, UpdateGitConfigRequest } from "@/lib/api/view-models";
import { useAppDispatch } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GitConfigForm } from "@/components/sources/git-config-form";

function toFormGitConfig(config: GeneratedGitConfig | null) {
  if (!config) {
    return null;
  }

  return {
    repoUrl: config.repoUrl ?? "",
    branch: config.branch ?? "main",
    pathPatterns: {
      dsl: config.pathPatterns?.dsl ?? [],
      code: config.pathPatterns?.code ?? [],
      infra: config.pathPatterns?.infra ?? [],
    },
    providerConfig: config.providerConfig ?? null,
  };
}

export function ModelSettingsPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const { t } = useTranslation("modelSettings");
  const dispatch = useAppDispatch();

  const {
    data: modelData,
    error: modelError,
    isLoading: modelLoading,
  } = useGetModelQuery(modelId ? { id: modelId } : skipToken);
  const { data: scansPage, isLoading: scansLoading } = useListScansQuery(
    modelId ? { id: modelId, page: 1, limit: 50 } : skipToken,
  );
  const [updateModel] = useUpdateModelMutation();
  const [createSync, { isLoading: isCreatingSync }] = useCreateSyncMutation();

  const gitConfig = modelData?.gitConfig ?? null;
  const backendScans = scansPage?.items ?? [];
  const hasRunningSync =
    isCreatingSync ||
    backendScans
      .filter((scan) => scan.scanType === "Git")
      .some((scan) => {
        const status = scan.status?.toLowerCase() as SyncStatus;
        return status === "pending" || status === "running";
      });

  const handleSaveConfig = useCallback(
    async (req: UpdateGitConfigRequest) => {
      if (!modelData) return;

      const updatedConfig: GeneratedGitConfig = {
        repoUrl: req.repoUrl ?? gitConfig?.repoUrl ?? "",
        branch: req.branch ?? gitConfig?.branch ?? "main",
        pathPatterns: req.pathPatterns ??
          gitConfig?.pathPatterns ?? {
            dsl: [],
            code: [],
            infra: [],
          },
        providerConfig:
          req.providerConfig !== undefined
            ? req.providerConfig
            : (gitConfig?.providerConfig ?? null),
      };

      const updated = await updateModel({
        id: modelId!,
        "If-Match": String(modelData.version),
        updateModelRequest: {
          name: modelData.name,
          description: modelData.description,
          gitConfig: updatedConfig,
          driftConfig: modelData.driftConfig,
        },
      }).unwrap();

      dispatch(
        projectsModelsApi.util.upsertQueryData(
          "getModel",
          { id: modelId! },
          updated,
        ),
      );
    },
    [dispatch, gitConfig, modelData, modelId, updateModel],
  );

  const handleTriggerSync = useCallback(async () => {
    if (!modelId || hasRunningSync) return;

    try {
      await createSync({ id: modelId }).unwrap();
    } catch {
      // SignalR will deliver updates
    }
  }, [createSync, hasRunningSync, modelId]);

  if (modelLoading || scansLoading) {
    return (
      <div
        className="flex h-full flex-col"
        data-testid="model-settings-loading"
      >
        <div className="flex items-center gap-3 px-1 pb-4">
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (modelError) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="sources" />
        <EmptyPlaceholder.Title>{t("loadError")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("loadErrorDescription")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6" data-testid="model-settings">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-lg font-semibold">{t("heading")}</h1>
      </div>

      {/* Git Configuration */}
      <section aria-labelledby="git-config-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2
              id="git-config-heading"
              className="flex items-center gap-2 font-heading text-base font-semibold"
            >
              <GitBranch className="size-4 text-muted-foreground" />
              {t("gitConfigHeading")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("gitConfigDescription")}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerSync}
            disabled={hasRunningSync || !gitConfig?.repoUrl}
            data-testid="trigger-sync-button"
          >
            <RefreshCw
              className={cn(
                "mr-1.5 size-3.5",
                hasRunningSync && "animate-spin",
              )}
            />
            {hasRunningSync ? t("syncing") : t("triggerSync")}
          </Button>
        </div>

        <GitConfigForm
          config={toFormGitConfig(gitConfig)}
          onSave={handleSaveConfig}
        />
      </section>
    </div>
  );
}
