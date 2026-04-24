import { baseApi as api } from "./base-api";

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<RegisterApiResponse, RegisterApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/auth/register`,
        method: "POST",
        body: queryArg.registerRequest,
      }),
    }),
    login: build.mutation<LoginApiResponse, LoginApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/auth/login`,
        method: "POST",
        body: queryArg.loginRequest,
      }),
    }),
    refreshToken: build.mutation<RefreshTokenApiResponse, RefreshTokenApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/auth/refresh`,
        method: "POST",
        body: queryArg.refreshRequest,
      }),
    }),
    getCurrentUser: build.query<
      GetCurrentUserApiResponse,
      GetCurrentUserApiArg
    >({
      query: () => ({ url: `/api/v1/users/me` }),
    }),
    updateCurrentUser: build.mutation<
      UpdateCurrentUserApiResponse,
      UpdateCurrentUserApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/users/me`,
        method: "PUT",
        body: queryArg.updateUserRequest,
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as authGeneratedApi };
export type RegisterApiResponse = /** status 201 Created */ AuthResponse;
export type RegisterApiArg = {
  registerRequest: RegisterRequest;
};
export type LoginApiResponse = /** status 200 OK */ AuthResponse;
export type LoginApiArg = {
  loginRequest: LoginRequest;
};
export type RefreshTokenApiResponse = /** status 200 OK */ AuthResponse;
export type RefreshTokenApiArg = {
  refreshRequest: RefreshRequest;
};
export type GetCurrentUserApiResponse = /** status 200 OK */ UserResponse;
export type GetCurrentUserApiArg = void;
export type UpdateCurrentUserApiResponse = /** status 200 OK */ UserResponse;
export type UpdateCurrentUserApiArg = {
  updateUserRequest: UpdateUserRequest;
};
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};
export type HttpValidationProblemDetails = {
  type?: null | string;
  title?: null | string;
  status?: null | number | string;
  detail?: null | string;
  instance?: null | string;
  errors?: {
    [key: string]: string[];
  };
};
export type ProblemDetails = {
  type?: null | string;
  title?: null | string;
  status?: null | number | string;
  detail?: null | string;
  instance?: null | string;
};
export type RegisterRequest = {
  email: string;
  password: string;
  displayName?: null | string;
};
export type LoginRequest = {
  email: string;
  password: string;
};
export type RefreshRequest = {
  accessToken: string;
  refreshToken: string;
};
export type UserResponse = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};
export type UpdateUserRequest = {
  displayName: string;
};
export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
} = injectedRtkApi;
