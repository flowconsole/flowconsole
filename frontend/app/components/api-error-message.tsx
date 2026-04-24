import { useTranslation } from "react-i18next";

import { Button } from "@flowconsole/ui/components/ui/button";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { ApiError } from "@/lib/api/error";

type IconName = keyof typeof Icons;

interface ErrorDisplay {
  icon: IconName;
  titleKey: string;
  descKey: string;
  detail?: string;
}

function resolveError(error: unknown): ErrorDisplay {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return { icon: "user", titleKey: "unauthorized", descKey: "unauthorizedDescription" };
      case 403:
        return { icon: "validations", titleKey: "forbidden", descKey: "forbiddenDescription" };
      case 404:
        return { icon: "search", titleKey: "notFound", descKey: "notFoundDescription" };
      case 409:
        return { icon: "warning", titleKey: "conflict", descKey: "conflictDescription" };
      case 422:
        return {
          icon: "warning",
          titleKey: "validation",
          descKey: "validationDescription",
          detail: error.problem.detail,
        };
      case 500:
        return { icon: "warning", titleKey: "serverError", descKey: "serverErrorDescription" };
      case 503:
        return { icon: "refresh", titleKey: "serviceUnavailable", descKey: "serviceUnavailableDescription" };
      default:
        return { icon: "warning", titleKey: "unknownError", descKey: "unknownErrorDescription" };
    }
  }
  // TypeError: Failed to fetch or other network errors → backend unavailable
  return { icon: "refresh", titleKey: "backendUnavailable", descKey: "backendUnavailableDescription" };
}

interface ApiErrorMessageProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * Displays a user-facing error message for API failures.
 *
 * Maps HTTP status codes (401/403/404/409/422/500/503) to distinct UI states
 * aligned with RFC 7807 Problem Details. Network errors are presented as
 * "backend unavailable" to distinguish infra failures from application errors.
 */
export function ApiErrorMessage({ error, onRetry, className }: ApiErrorMessageProps) {
  const { t } = useTranslation();
  const tScoped = (key: string) => t(`apiErrors.${key}`);
  const { icon, titleKey, descKey, detail } = resolveError(error);

  return (
    <EmptyPlaceholder className={className}>
      <EmptyPlaceholder.Icon name={icon} />
      <EmptyPlaceholder.Title>{tScoped(titleKey)}</EmptyPlaceholder.Title>
      <EmptyPlaceholder.Description>{detail ?? tScoped(descKey)}</EmptyPlaceholder.Description>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {tScoped("retry")}
        </Button>
      )}
    </EmptyPlaceholder>
  );
}
