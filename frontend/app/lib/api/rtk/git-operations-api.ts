import { gitOperationsGeneratedApi } from "./git-operations.generated";

export const gitOperationsApi = gitOperationsGeneratedApi.enhanceEndpoints({
  addTagTypes: ["GitBranches", "Model"],
  endpoints: {
    listBranches: {
      providesTags: (_result, _error, arg) => [
        { type: "GitBranches", id: arg.id },
      ],
    },
    createBranch: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "GitBranches", id: arg.id },
      ],
    },
    commitFromEditor: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "Model", id: arg.id },
      ],
    },
  },
});

export const {
  useListBranchesQuery,
  useLazyListBranchesQuery,
  useCreateBranchMutation,
  useCommitFromEditorMutation,
  useGetGitFileContentQuery,
  useLazyGetGitFileContentQuery,
} = gitOperationsApi;

export const useCommitToGitMutation = useCommitFromEditorMutation;

export type {
  BranchCreatedResponse,
  CommitResponse,
  CreateBranchApiArg,
  CreateBranchRequest,
  EditorCommitRequest,
  GetGitFileContentApiArg,
  GitBranchInfo,
  GitFileContentResponse,
  ListBranchesApiArg,
} from "./git-operations.generated";
