import { skipToken } from "@reduxjs/toolkit/query";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import { Skeleton } from "@flowconsole/ui/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { hasRtkErrorStatus, toApiError, useGetModelQuery } from "@/lib/api/rtk";
import { ApiErrorMessage } from "@/components/api-error-message";
import { ModelEditorShell } from "@/components/editor";

export function ModelEditorPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const { t } = useTranslation("editor");
  const { data: model, error, isLoading, refetch } = useGetModelQuery(
    modelId ? { id: modelId } : skipToken,
  );

  if (isLoading) {
    return (
      <div
        className="flex h-full flex-col gap-2 p-4"
        data-testid="editor-loading"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (hasRtkErrorStatus(error, 404)) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="workbench" />
        <EmptyPlaceholder.Title>{t("notFoundTitle")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("notFoundDescription")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  if (error) {
    return <ApiErrorMessage error={toApiError(error)} onRetry={() => void refetch()} />;
  }

  return (
    <div className="-m-4 h-[calc(100%+2rem)] lg:-mx-6">
      <ModelEditorShell
        modelId={modelId!}
        modelName={model?.name ?? t("unknownModel")}
        branch={model?.gitConfig?.branch ?? "main"}
        modelFiles={model?.modelFiles ?? []}
      />
    </div>
  );
}
