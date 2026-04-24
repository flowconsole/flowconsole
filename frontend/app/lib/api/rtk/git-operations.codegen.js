const { createCodegenConfig } = require("./create-codegen-config");

module.exports = createCodegenConfig({
  exportName: "gitOperationsGeneratedApi",
  outputFile: "./git-operations.generated.ts",
  operationIds: [
    "ListBranches",
    "CreateBranch",
    "CommitFromEditor",
    "GetGitFileContent",
  ],
});
