import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { ApiError } from "@/lib/api/error";
import type { ProblemDetails } from "@/lib/api/view-models";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return isObject(error) && "status" in error;
}

export function hasRtkErrorStatus(error: unknown, status: number): boolean {
  return isFetchBaseQueryError(error) && error.status === status;
}

export function toApiError(error: unknown): unknown {
  if (!isFetchBaseQueryError(error) || typeof error.status !== "number") {
    return error;
  }

  const data = error.data;
  const problem: ProblemDetails = isObject(data)
    ? {
        title:
          typeof data.title === "string" ? data.title : "Request failed",
        status:
          typeof data.status === "number" ? data.status : error.status,
        detail: typeof data.detail === "string" ? data.detail : undefined,
        type: typeof data.type === "string" ? data.type : undefined,
        instance:
          typeof data.instance === "string" ? data.instance : undefined,
        errors: isObject(data.errors)
          ? Object.fromEntries(
              Object.entries(data.errors).filter(([, value]) =>
                Array.isArray(value),
              ) as Array<[string, string[]]>,
            )
          : undefined,
      }
    : {
        title:
          typeof data === "string" && data.length > 0
            ? data
            : "Request failed",
        status: error.status,
      };

  return new ApiError(error.status, problem);
}
