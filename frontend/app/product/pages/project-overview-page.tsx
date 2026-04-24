import { useState } from "react";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@flowconsole/ui/components/ui/alert-dialog";
import { Button } from "@flowconsole/ui/components/ui/button";
import { Skeleton } from "@flowconsole/ui/components/ui/skeleton";
import { skipToken } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

import {
  useListBuiltinMetaSchemasQuery,
  useListProjectMetaSchemasQuery,
} from "@/lib/api/rtk";
import { hasRtkErrorStatus, toApiError } from "@/lib/api/rtk/errors";
import {
  projectsModelsApi,
  useCreateModelMutation,
  useDeleteModelMutation,
  useGetProjectQuery,
  useListModelsQuery,
} from "@/lib/api/rtk/projects-models-api";
import type { AppDispatch } from "@/lib/store";
import { ApiErrorMessage } from "@/components/api-error-message";
import { DashboardHeader } from "@/components/dashboard/header";
import { ModelCard } from "@/components/model/model-card";
import { CreateModelDialog } from "@/components/project/create-model-dialog";

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function NoModelsPlaceholder({
  t,
  onCreateClick,
}: {
  t: (key: string) => string;
  onCreateClick: () => void;
}) {
  return (
    <EmptyPlaceholder>
      <EmptyPlaceholder.Icon name="workbench" />
      <EmptyPlaceholder.Title>{t("noModelsTitle")}</EmptyPlaceholder.Title>
      <EmptyPlaceholder.Description>
        {t("noModelsDescription")}
      </EmptyPlaceholder.Description>
      <Button size="sm" onClick={onCreateClick}>
        Create Model
      </Button>
    </EmptyPlaceholder>
  );
}

export function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation("projectOverview");
  const dispatch = useDispatch<AppDispatch>();

  // Create model dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDeleteModelId, setPendingDeleteModelId] = useState<
    string | null
  >(null);

  const {
    data: project,
    error: projectError,
    isLoading: projectLoading,
    refetch: refetchProject,
  } = useGetProjectQuery(projectId ? { id: projectId } : skipToken);
  const {
    data: modelsPage,
    error: modelsError,
    isLoading: modelsLoading,
    refetch: refetchModels,
  } = useListModelsQuery(projectId ? { projectId } : skipToken);
  const [createModel, { isLoading: creating }] = useCreateModelMutation();
  const [deleteModel] = useDeleteModelMutation();
  const { data: metaSchemas = [] } = useListProjectMetaSchemasQuery(
    projectId ? { projectId } : skipToken,
  );
  const { data: builtinMetaSchemas = [] } = useListBuiltinMetaSchemasQuery();
  const availableMetaSchemas = [
    ...builtinMetaSchemas,
    ...metaSchemas.filter(
      (schema) =>
        !builtinMetaSchemas.some((builtin) => builtin.id === schema.id),
    ),
  ];

  const models = modelsPage?.data ?? [];

  const openCreateDialog = () => {
    setDialogOpen(true);
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await deleteModel({ id: modelId }).unwrap();
      dispatch(
        projectsModelsApi.util.updateQueryData(
          "listModels",
          { projectId: projectId! },
          (draft) => {
            draft.data = draft.data.filter((model) => model.id !== modelId);
            draft.total = Math.max(Number(draft.total) - 1, 0);
          },
        ),
      );
    } catch {
      // silently ignore — user can reload to retry
    }
  };

  const handleRequestDeleteModel = (modelId: string) => {
    setPendingDeleteModelId(modelId);
  };

  const pendingDeleteModelName =
    models.find((model) => model.id === pendingDeleteModelId)?.name ?? null;

  const isNotFound =
    hasRtkErrorStatus(projectError, 404) || hasRtkErrorStatus(modelsError, 404);
  const blockingError = projectError ?? modelsError;

  if (projectLoading || modelsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <OverviewSkeleton />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="projects" />
        <EmptyPlaceholder.Title>{t("notFoundTitle")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("notFoundDescription")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  if (blockingError) {
    return (
      <ApiErrorMessage
        error={toApiError(blockingError)}
        onRetry={() => {
          void refetchProject();
          void refetchModels();
        }}
      />
    );
  }

  return (
    <>
      <DashboardHeader
        heading={project?.name ?? t("loadingHeading")}
        text={project?.description ?? undefined}
      >
        <Button
          size="sm"
          onClick={openCreateDialog}
          data-testid="new-model-btn"
        >
          New Model
        </Button>
      </DashboardHeader>

      <div className="mt-6">
        {models.length === 0 ? (
          <NoModelsPlaceholder t={t} onCreateClick={openCreateDialog} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onDelete={handleRequestDeleteModel}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={pendingDeleteModelId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteModelId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", {
                modelName:
                  pendingDeleteModelName ?? t("deleteConfirmFallbackName"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-model-btn">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-model-btn"
              onClick={() => {
                if (pendingDeleteModelId) {
                  void handleDeleteModel(pendingDeleteModelId);
                }
                setPendingDeleteModelId(null);
              }}
            >
              {t("deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateModelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultMetaSchemaId={project?.defaultMetaSchemaId}
        metaSchemas={availableMetaSchemas}
        isSubmitting={creating}
        onSubmit={async (createModelRequest) => {
          await createModel({
            projectId: projectId!,
            createModelRequest,
          }).unwrap();
        }}
      />
    </>
  );
}
