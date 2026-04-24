const { createCodegenConfig } = require("./create-codegen-config");

module.exports = createCodegenConfig({
  exportName: "analysisGeneratedApi",
  outputFile: "./analysis.generated.ts",
  operationIds: [
    "GetBlastRadius",
    "GetShortestPath",
    "GetDependencies",
    "GetDependents",
    "GetAnalyticsSummary",
    "GetCoupling",
    "GetCriticalPath",
    "GetBottlenecks",
    "ExecuteQuery",
    "DetectDrift",
    "ListDriftSnapshots",
    "GetLatestDriftSnapshot",
    "GetDriftSnapshot",
    "TriggerValidation",
    "ListValidationRuns",
    "GetValidationRun",
    "ListFitnessFunctions",
    "CreateCustomRule",
    "UpdateCustomRule",
    "DeleteCustomRule",
  ],
});
