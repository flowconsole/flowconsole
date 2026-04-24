import { baseApi as api } from "./base-api";

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listBranches: build.query<ListBranchesApiResponse, ListBranchesApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/git/branches`,
      }),
    }),
    createBranch: build.mutation<CreateBranchApiResponse, CreateBranchApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/git/branches`,
        method: "POST",
        body: queryArg.createBranchRequest,
      }),
    }),
    commitFromEditor: build.mutation<
      CommitFromEditorApiResponse,
      CommitFromEditorApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/git/commit`,
        method: "POST",
        body: queryArg.editorCommitRequest,
      }),
    }),
    getGitFileContent: build.query<
      GetGitFileContentApiResponse,
      GetGitFileContentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.id}/git/file`,
        params: {
          branch: queryArg.branch,
          path: queryArg.path,
        },
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as gitOperationsGeneratedApi };
export type ListBranchesApiResponse = /** status 200 OK */ GitBranchInfo[];
export type ListBranchesApiArg = {
  id: string;
};
export type CreateBranchApiResponse =
  /** status 201 Created */ BranchCreatedResponse;
export type CreateBranchApiArg = {
  id: string;
  createBranchRequest: CreateBranchRequest;
};
export type CommitFromEditorApiResponse = /** status 200 OK */ CommitResponse;
export type CommitFromEditorApiArg = {
  id: string;
  editorCommitRequest: EditorCommitRequest;
};
export type GetGitFileContentApiResponse =
  /** status 200 OK */ GitFileContentResponse;
export type GetGitFileContentApiArg = {
  id: string;
  branch: string;
  path: string;
};
export type GitBranchInfo = {
  name?: string;
  isCurrent?: boolean;
  isRemote?: boolean;
};
export type ErrorMessageResponse = {
  error: string;
};
export type BranchCreatedResponse = {
  name: string;
};
export type CreateBranchRequest = {
  name: string;
};
export type CommitResponse = {
  committed: boolean;
};
export type EditorCommitRequest = {
  branch: string;
  message: string;
  filePath: string;
  content: string;
};
export type GitFileContentResponse = {
  path: string;
  content: string;
};
export const {
  useListBranchesQuery,
  useCreateBranchMutation,
  useCommitFromEditorMutation,
  useGetGitFileContentQuery,
} = injectedRtkApi;
