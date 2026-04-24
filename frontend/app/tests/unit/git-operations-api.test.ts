import { describe, it, expect } from "vitest";
import type {
  GitBranchInfo,
  BranchCreatedResponse,
  CommitResponse,
  CreateBranchRequest,
  EditorCommitRequest,
} from "@/lib/api/rtk/git-operations-api";

/**
 * Type-shape smoke tests — verify that the TypeScript interfaces compile
 * with expected fields. These do NOT test RTK Query endpoint behavior
 * (URL construction, HTTP methods, tag invalidation). For runtime coverage
 * of the API layer, rely on integration/E2E tests.
 */
describe("git-operations-api type shapes", () => {
  it("GitBranchInfo has required fields", () => {
    const branch: GitBranchInfo = {
      name: "main",
      isCurrent: true,
      isRemote: false,
    };
    expect(branch.name).toBe("main");
    expect(branch.isCurrent).toBe(true);
    expect(branch.isRemote).toBe(false);
  });

  it("request/response types have expected structure", () => {
    const createReq: CreateBranchRequest = { name: "feature/test" };
    const commitReq: EditorCommitRequest = {
      branch: "develop",
      message: "fix: update model",
      filePath: "src/model.fc.yaml",
      content: "elements:\n  - name: ServiceA",
    };
    const branchResp: BranchCreatedResponse = { name: "feature/new-branch" };
    const commitResp: CommitResponse = { committed: true };

    expect(createReq.name).toBeDefined();
    expect(commitReq.branch).toBeDefined();
    expect(commitReq.message).toBeDefined();
    expect(commitReq.filePath).toBeDefined();
    expect(commitReq.content).toBeDefined();
    expect(branchResp.name).toBeDefined();
    expect(commitResp.committed).toBeDefined();
  });
});
