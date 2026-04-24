function createCodegenConfig({
  exportName,
  outputFile,
  operationIds,
}) {
  const targetOperationIds = new Set(operationIds);

  /** @type {import("@rtk-query/codegen-openapi").ConfigFile} */
  return {
    apiFile: "./base-api.ts",
    apiImport: "baseApi",
    exportName,
    schemaFile: "../openapi/flowconsole-v1.json",
    outputFile,
    hooks: true,
    flattenArg: false,
    filterEndpoints: (_operationName, operationDefinition) =>
      targetOperationIds.has(operationDefinition.operation.operationId ?? ""),
  };
}

module.exports = { createCodegenConfig };
