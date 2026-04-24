import { projectAdminGeneratedApi } from "./project-admin.generated";

export const projectAdminApi = projectAdminGeneratedApi.enhanceEndpoints({
  addTagTypes: ["ProjectMembers", "BuiltinMetaSchemas", "ProjectMetaSchemas"],
  endpoints: {
    listProjectMembers: {
      providesTags: (_result, _error, arg) => [
        { type: "ProjectMembers", id: arg.id },
      ],
    },
    addProjectMember: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProjectMembers", id: arg.id },
      ],
    },
    updateProjectMemberRole: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProjectMembers", id: arg.id },
      ],
    },
    removeProjectMember: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProjectMembers", id: arg.id },
      ],
    },
    listBuiltinMetaSchemas: {
      providesTags: [{ type: "BuiltinMetaSchemas", id: "LIST" }],
    },
    listProjectMetaSchemas: {
      providesTags: (_result, _error, arg) => [
        { type: "ProjectMetaSchemas", id: arg.projectId },
      ],
    },
    createProjectMetaSchema: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "BuiltinMetaSchemas", id: "LIST" },
        { type: "ProjectMetaSchemas", id: arg.projectId },
      ],
    },
    updateProjectMetaSchema: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProjectMetaSchemas", id: arg.projectId },
      ],
    },
    deleteProjectMetaSchema: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProjectMetaSchemas", id: arg.projectId },
      ],
    },
  },
});

export const {
  useListProjectMembersQuery,
  useLazyListProjectMembersQuery,
  useAddProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
  useRemoveProjectMemberMutation,
  useListBuiltinMetaSchemasQuery,
  useLazyListBuiltinMetaSchemasQuery,
  useGetMetaSchemaQuery,
  useListProjectMetaSchemasQuery,
  useLazyListProjectMetaSchemasQuery,
  useCreateProjectMetaSchemaMutation,
  useUpdateProjectMetaSchemaMutation,
  useDeleteProjectMetaSchemaMutation,
} = projectAdminApi;

export type {
  AddMemberRequest,
  CreateMetaSchemaRequest,
  ErrorMessageResponse,
  MemberResponse,
  MetaSchemaResponse,
  UpdateMemberRoleRequest,
  UpdateMetaSchemaRequest,
} from "./project-admin.generated";
