import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";

import {
  clearTokens,
  getRefreshToken,
  readAccessToken,
  setTokens,
} from "@/lib/api/auth";
import { getBackendBaseUrl } from "@/lib/api/config";

import type { AuthResponse } from "./auth.generated";

const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBackendBaseUrl(),
  prepareHeaders: (headers) => {
    const token = readAccessToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("accept", "application/json");
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  // Remember the token that failed so we can detect if another
  // request already refreshed while we were waiting for the mutex.
  const failedToken = readAccessToken();

  const release = await mutex.acquire();
  try {
    // If the token changed while we waited, another request already
    // refreshed successfully — just retry with the new token.
    const currentToken = readAccessToken();
    if (currentToken && currentToken !== failedToken) {
      return rawBaseQuery(args, api, extraOptions);
    }

    const refreshToken = getRefreshToken();
    const accessToken = readAccessToken();

    if (!refreshToken || !accessToken) {
      clearTokens();
      return result;
    }

    const refreshResult = await rawBaseQuery(
      {
        url: "/api/v1/auth/refresh",
        method: "POST",
        body: { accessToken, refreshToken } satisfies {
          accessToken: string;
          refreshToken: string;
        },
      },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      const tokens = refreshResult.data as AuthResponse;
      setTokens(tokens.accessToken, tokens.refreshToken);
      return rawBaseQuery(args, api, extraOptions);
    }

    // Refresh failed — clear session
    clearTokens();
    return result;
  } finally {
    release();
  }
};

export const baseApi = createApi({
  reducerPath: "flowconsoleApi",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});
