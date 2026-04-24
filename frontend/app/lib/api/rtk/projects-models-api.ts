import { projectsModelsGeneratedApi } from "./projects-models.generated";

const PROJECT_LIST_ID = "LIST";

export const projectsModelsApi = projectsModelsGeneratedApi.enhanceEndpoints({
  addTagTypes: ["Project", "ProjectList", "Model", "ModelList"],
  endpoints: {
    listProjects: {
      providesTags: (result) =>
        result
          ? [
              { type: "ProjectList", id: PROJECT_LIST_ID },
              ...result.data.map((project) => ({ type: "Project" as const, id: project.id })),
            ]
          : [{ type: "ProjectList", id: PROJECT_LIST_ID }],
    },
    getProject: {
      providesTags: (_result, _error, arg) => [{ type: "Project", id: arg.id }],
    },
    createProject: {
      invalidatesTags: [{ type: "ProjectList", id: PROJECT_LIST_ID }],
    },
    updateProject: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "Project", id: arg.id },
        { type: "ProjectList", id: PROJECT_LIST_ID },
      ],
    },
    deleteProject: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "Project", id: arg.id },
        { type: "ProjectList", id: PROJECT_LIST_ID },
      ],
    },
    listModels: {
      providesTags: (result, _error, arg) =>
        result
          ? [
              { type: "ModelList", id: arg.projectId },
              ...result.data.map((model) => ({ type: "Model" as const, id: model.id })),
            ]
          : [{ type: "ModelList", id: arg.projectId }],
    },
    getModel: {
      providesTags: (result, _error, arg) =>
        result
          ? [
              { type: "Model", id: arg.id },
              { type: "ModelList", id: result.projectId },
            ]
          : [{ type: "Model", id: arg.id }],
    },
    createModel: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ModelList", id: arg.projectId },
      ],
    },
    updateModel: {
      invalidatesTags: (result, _error, arg) =>
        result
          ? [
              { type: "Model", id: arg.id },
              { type: "ModelList", id: result.projectId },
            ]
          : [{ type: "Model", id: arg.id }],
    },
    deleteModel: {
      invalidatesTags: (_result, _error, arg) => [{ type: "Model", id: arg.id }],
    },
  },
});

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
} = projectsModelsApi;

export type {
  CreateModelRequest,
  CreateProjectRequest,
  GetModelApiResponse,
  GetProjectApiResponse,
  GitConfig,
  ModelResponse,
  PagedResponseOfModelResponse,
  PagedResponseOfProjectResponse,
  ProjectResponse,
  UpdateModelRequest,
  UpdateProjectRequest,
} from "./projects-models.generated";
