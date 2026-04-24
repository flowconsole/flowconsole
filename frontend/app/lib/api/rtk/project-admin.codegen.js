const { createCodegenConfig } = require("./create-codegen-config");

module.exports = createCodegenConfig({
  exportName: "projectAdminGeneratedApi",
  outputFile: "./project-admin.generated.ts",
  operationIds: [
    "ListProjectMembers",
    "AddProjectMember",
    "UpdateProjectMemberRole",
    "RemoveProjectMember",
    "ListBuiltinMetaSchemas",
    "GetMetaSchema",
    "ListProjectMetaSchemas",
    "CreateProjectMetaSchema",
    "UpdateProjectMetaSchema",
    "DeleteProjectMetaSchema",
  ],
});
