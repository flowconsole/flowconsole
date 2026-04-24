import { authGeneratedApi } from "./auth.generated";

export const authApi = authGeneratedApi.enhanceEndpoints({
  addTagTypes: ["CurrentUser"],
  endpoints: {
    getCurrentUser: {
      providesTags: ["CurrentUser"],
    },
    login: {
      invalidatesTags: ["CurrentUser"],
    },
    register: {
      invalidatesTags: ["CurrentUser"],
    },
    refreshToken: {
      invalidatesTags: ["CurrentUser"],
    },
    updateCurrentUser: {
      invalidatesTags: ["CurrentUser"],
    },
  },
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
} = authApi;

export type {
  AuthResponse,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  UpdateUserRequest,
  UserResponse,
} from "./auth.generated";
