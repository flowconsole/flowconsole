const { createCodegenConfig } = require("./create-codegen-config");

module.exports = createCodegenConfig({
  exportName: "lifecycleGeneratedApi",
  outputFile: "./lifecycle.generated.ts",
  operationIds: [
    "LoadModelSnapshot",
    "ExportModelSnapshot",
    "CreateScan",
    "ListScans",
    "GetScan",
    "CancelScan",
    "DeleteScan",
    "CreateSync",
    "GetSync",
    "HandleGithubWebhook",
    "HandleGitlabWebhook",
    "HandleCiValidate",
  ],
});
