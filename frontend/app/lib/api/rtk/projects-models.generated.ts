import { baseApi as api } from "./base-api";

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    createProject: build.mutation<
      CreateProjectApiResponse,
      CreateProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects`,
        method: "POST",
        body: queryArg.createProjectRequest,
      }),
    }),
    listProjects: build.query<ListProjectsApiResponse, ListProjectsApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/projects`,
        params: {
          page: queryArg.page,
          limit: queryArg.limit,
        },
      }),
    }),
    getProject: build.query<GetProjectApiResponse, GetProjectApiArg>({
      query: (queryArg) => ({ url: `/api/v1/projects/${queryArg.id}` }),
    }),
    updateProject: build.mutation<
      UpdateProjectApiResponse,
      UpdateProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateProjectRequest,
      }),
    }),
    deleteProject: build.mutation<
      DeleteProjectApiResponse,
      DeleteProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    createModel: build.mutation<CreateModelApiResponse, CreateModelApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.projectId}/models`,
        method: "POST",
        body: queryArg.createModelRequest,
      }),
    }),
    listModels: build.query<ListModelsApiResponse, ListModelsApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.projectId}/models`,
        params: {
          page: queryArg.page,
          limit: queryArg.limit,
        },
      }),
    }),
    getModel: build.query<GetModelApiResponse, GetModelApiArg>({
      query: (queryArg) => ({ url: `/api/v1/models/${queryArg.id}` }),
    }),
    updateModel: build.mutation<UpdateModelApiResponse, UpdateModelApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateModelRequest,
        headers: {
          "If-Match": queryArg["If-Match"],
        },
      }),
    }),
    deleteModel: build.mutation<DeleteModelApiResponse, DeleteModelApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as projectsModelsGeneratedApi };
export type CreateProjectApiResponse =
  /** status 201 Created */ ProjectResponse;
export type CreateProjectApiArg = {
  createProjectRequest: CreateProjectRequest;
};
export type ListProjectsApiResponse =
  /** status 200 OK */ PagedResponseOfProjectResponse;
export type ListProjectsApiArg = {
  page?: number | string;
  limit?: number | string;
};
export type GetProjectApiResponse = /** status 200 OK */ ProjectResponse;
export type GetProjectApiArg = {
  id: string;
};
export type UpdateProjectApiResponse = /** status 200 OK */ ProjectResponse;
export type UpdateProjectApiArg = {
  id: string;
  updateProjectRequest: UpdateProjectRequest;
};
export type DeleteProjectApiResponse = unknown;
export type DeleteProjectApiArg = {
  id: string;
};
export type CreateModelApiResponse = /** status 201 Created */ ModelResponse;
export type CreateModelApiArg = {
  projectId: string;
  createModelRequest: CreateModelRequest;
};
export type ListModelsApiResponse =
  /** status 200 OK */ PagedResponseOfModelResponse;
export type ListModelsApiArg = {
  projectId: string;
  page?: number | string;
  limit?: number | string;
};
export type GetModelApiResponse = /** status 200 OK */ ModelResponse;
export type GetModelApiArg = {
  id: string;
};
export type UpdateModelApiResponse = /** status 200 OK */ ModelResponse;
export type UpdateModelApiArg = {
  id: string;
  "If-Match"?: string;
  updateModelRequest: UpdateModelRequest;
};
export type DeleteModelApiResponse = unknown;
export type DeleteModelApiArg = {
  id: string;
};
export type ProjectResponse = {
  id: string;
  name: string;
  description: null | string;
  ownerId: string;
  defaultMetaSchemaId: string;
  createdAt: string;
  updatedAt: string;
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
export type CreateProjectRequest = {
  name: string;
  description: null | string;
  defaultMetaSchemaId: null | string;
};
export type PagedResponseOfProjectResponse = {
  data: ProjectResponse[];
  total: number | string;
  page: number | string;
  limit: number | string;
  totalPages: number | string;
  hasMore: boolean;
};
export type UpdateProjectRequest = {
  name: string;
  description: null | string;
};
export type PathPatterns = {
  dsl?: string[];
  code?: string[];
  infra?: string[];
};
export type GitProviderConfigDirectGitProviderConfig = {
  type?: "direct";
  username?: null | string;
  password?: null | string;
};
export type GitProviderConfig = GitProviderConfigDirectGitProviderConfig;
export type GitConfig = {
  repoUrl?: string;
  branch?: string;
  pathPatterns?: PathPatterns;
  providerConfig?: null | GitProviderConfig;
};
export type ModelFileRef = {
  branch?: string;
  relativePath?: string;
};
export type DriftConfig = {
  autoEnabled?: boolean;
  sources?: string[];
  threshold?: number | string;
  notifyOnScoreBelow?: null | number | string;
};
export type ModelResponse = {
  id: string;
  name: string;
  description: null | string;
  projectId: string;
  version: number | string;
  metaSchemaId: string;
  gitConfig: null | GitConfig;
  modelFiles: ModelFileRef[];
  driftConfig: null | DriftConfig;
  createdAt: string;
  updatedAt: string;
  warnings?: null | string[];
};
export type CreateModelRequest = {
  name: string;
  description: null | string;
  metaSchemaId: null | string;
  gitConfig: null | GitConfig;
  driftConfig: null | DriftConfig;
};
export type PagedResponseOfModelResponse = {
  data: ModelResponse[];
  total: number | string;
  page: number | string;
  limit: number | string;
  totalPages: number | string;
  hasMore: boolean;
};
export type ProblemDetails = {
  type?: null | string;
  title?: null | string;
  status?: null | number | string;
  detail?: null | string;
  instance?: null | string;
};
export type UpdateModelRequest = {
  name: string;
  description: null | string;
  gitConfig: null | GitConfig;
  driftConfig: null | DriftConfig;
};
export const {
  useCreateProjectMutation,
  useListProjectsQuery,
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useCreateModelMutation,
  useListModelsQuery,
  useGetModelQuery,
  useUpdateModelMutation,
  useDeleteModelMutation,
} = injectedRtkApi;
