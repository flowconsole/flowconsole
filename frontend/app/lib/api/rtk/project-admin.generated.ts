import { baseApi as api } from "./base-api";

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProjectMembers: build.query<
      ListProjectMembersApiResponse,
      ListProjectMembersApiArg
    >({
      query: (queryArg) => ({ url: `/api/v1/projects/${queryArg.id}/members` }),
    }),
    addProjectMember: build.mutation<
      AddProjectMemberApiResponse,
      AddProjectMemberApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.id}/members`,
        method: "POST",
        body: queryArg.addMemberRequest,
      }),
    }),
    updateProjectMemberRole: build.mutation<
      UpdateProjectMemberRoleApiResponse,
      UpdateProjectMemberRoleApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.id}/members/${queryArg.userId}`,
        method: "PUT",
        body: queryArg.updateMemberRoleRequest,
      }),
    }),
    removeProjectMember: build.mutation<
      RemoveProjectMemberApiResponse,
      RemoveProjectMemberApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.id}/members/${queryArg.userId}`,
        method: "DELETE",
      }),
    }),
    listBuiltinMetaSchemas: build.query<
      ListBuiltinMetaSchemasApiResponse,
      ListBuiltinMetaSchemasApiArg
    >({
      query: () => ({ url: `/api/v1/meta-schemas` }),
    }),
    getMetaSchema: build.query<GetMetaSchemaApiResponse, GetMetaSchemaApiArg>({
      query: (queryArg) => ({ url: `/api/v1/meta-schemas/${queryArg.id}` }),
    }),
    listProjectMetaSchemas: build.query<
      ListProjectMetaSchemasApiResponse,
      ListProjectMetaSchemasApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.projectId}/meta-schemas`,
      }),
    }),
    createProjectMetaSchema: build.mutation<
      CreateProjectMetaSchemaApiResponse,
      CreateProjectMetaSchemaApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.projectId}/meta-schemas`,
        method: "POST",
        body: queryArg.createMetaSchemaRequest,
      }),
    }),
    updateProjectMetaSchema: build.mutation<
      UpdateProjectMetaSchemaApiResponse,
      UpdateProjectMetaSchemaApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.projectId}/meta-schemas/${queryArg.schemaId}`,
        method: "PUT",
        body: queryArg.updateMetaSchemaRequest,
      }),
    }),
    deleteProjectMetaSchema: build.mutation<
      DeleteProjectMetaSchemaApiResponse,
      DeleteProjectMetaSchemaApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/projects/${queryArg.projectId}/meta-schemas/${queryArg.schemaId}`,
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as projectAdminGeneratedApi };
export type ListProjectMembersApiResponse =
  /** status 200 OK */ MemberResponse[];
export type ListProjectMembersApiArg = {
  id: string;
};
export type AddProjectMemberApiResponse =
  /** status 201 Created */ MemberResponse;
export type AddProjectMemberApiArg = {
  id: string;
  addMemberRequest: AddMemberRequest;
};
export type UpdateProjectMemberRoleApiResponse = unknown;
export type UpdateProjectMemberRoleApiArg = {
  id: string;
  userId: string;
  updateMemberRoleRequest: UpdateMemberRoleRequest;
};
export type RemoveProjectMemberApiResponse = unknown;
export type RemoveProjectMemberApiArg = {
  id: string;
  userId: string;
};
export type ListBuiltinMetaSchemasApiResponse =
  /** status 200 OK */ MetaSchemaResponse[];
export type ListBuiltinMetaSchemasApiArg = void;
export type GetMetaSchemaApiResponse = /** status 200 OK */ MetaSchemaResponse;
export type GetMetaSchemaApiArg = {
  id: string;
};
export type ListProjectMetaSchemasApiResponse =
  /** status 200 OK */ MetaSchemaResponse[];
export type ListProjectMetaSchemasApiArg = {
  projectId: string;
};
export type CreateProjectMetaSchemaApiResponse =
  /** status 201 Created */ MetaSchemaResponse;
export type CreateProjectMetaSchemaApiArg = {
  projectId: string;
  createMetaSchemaRequest: CreateMetaSchemaRequest;
};
export type UpdateProjectMetaSchemaApiResponse =
  /** status 200 OK */ MetaSchemaResponse;
export type UpdateProjectMetaSchemaApiArg = {
  projectId: string;
  schemaId: string;
  updateMetaSchemaRequest: UpdateMetaSchemaRequest;
};
export type DeleteProjectMetaSchemaApiResponse = unknown;
export type DeleteProjectMetaSchemaApiArg = {
  projectId: string;
  schemaId: string;
};
export type MemberResponse = {
  userId: string;
  role: string;
  createdAt: string;
};
export type ErrorMessageResponse = {
  error: string;
};
export type AddMemberRequest = {
  userId: string;
  role: string;
};
export type UpdateMemberRoleRequest = {
  role: string;
};
export type MetaSchemaResponse = {
  id: string;
  name: string;
  isBuiltin: boolean;
  projectId: null | string;
  extendsSchemaId: null | string;
  elementTypes: string[];
  relationTypes: string[];
};
export type ElementKind =
  | "Class"
  | "Interface"
  | "Endpoint"
  | "Function"
  | "Producer"
  | "Consumer"
  | "Deployment"
  | "Database"
  | "Queue"
  | "Cache"
  | "Ingress"
  | "Namespace"
  | "Broker"
  | "Topic"
  | "Service"
  | "Application"
  | "Module"
  | "External"
  | "Gateway"
  | "Worker";
export type PropertyDefinition = {
  key?: string;
  type?: string;
  required?: boolean;
  defaultValue?: null | string;
  allowedValues?: null | string[];
};
export type MetaElementType = {
  id?: ElementKind;
  name?: string;
  icon?: null | string;
  color?: null | string;
  allowChildren?: boolean;
  allowedChildTypes?: ElementKind[];
  propertyDefinitions?: PropertyDefinition[];
};
export type RelationKind =
  | "Contains"
  | "DeployedOn"
  | "Uses"
  | "Calls"
  | "DependsOn"
  | "Imports"
  | "Implements"
  | "Produces"
  | "Consumes"
  | "Exposes"
  | "RoutesTo";
export type MetaRelationType = {
  id?: RelationKind;
  name?: string;
  allowedSourceTypes?: ElementKind[];
  allowedTargetTypes?: ElementKind[];
  propertyDefinitions?: PropertyDefinition[];
};
export type MetaValidationRule = {
  name?: string;
  ruleType?: string;
  expression?: null | string;
  severity?: string;
  message?: string;
};
export type CreateMetaSchemaRequest = {
  id: string;
  name: string;
  extendsSchemaId: null | string;
  elementTypes: null | MetaElementType[];
  relationTypes: null | MetaRelationType[];
  rules: null | MetaValidationRule[];
};
export type UpdateMetaSchemaRequest = {
  name: string;
  elementTypes: null | MetaElementType[];
  relationTypes: null | MetaRelationType[];
  rules: null | MetaValidationRule[];
};
export const {
  useListProjectMembersQuery,
  useAddProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
  useRemoveProjectMemberMutation,
  useListBuiltinMetaSchemasQuery,
  useGetMetaSchemaQuery,
  useListProjectMetaSchemasQuery,
  useCreateProjectMetaSchemaMutation,
  useUpdateProjectMetaSchemaMutation,
  useDeleteProjectMetaSchemaMutation,
} = injectedRtkApi;
