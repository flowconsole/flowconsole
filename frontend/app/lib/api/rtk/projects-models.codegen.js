const { createCodegenConfig } = require("./create-codegen-config");

module.exports = createCodegenConfig({
  exportName: "projectsModelsGeneratedApi",
  outputFile: "./projects-models.generated.ts",
  operationIds: [
    "CreateProject",
    "ListProjects",
    "GetProject",
    "UpdateProject",
    "DeleteProject",
    "CreateModel",
    "ListModels",
    "GetModel",
    "UpdateModel",
    "DeleteModel",
  ],
});
